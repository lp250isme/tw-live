import { handleOil } from './sources/oil'
import { refreshOilHistory } from './sources/oil-history'
import { fetchPrediction } from './sources/oil-predict'
import { pushToAll } from './push'
import { json } from './cors'

// HTTP entries (called by the shortlink worker's cron, since this account is at
// its cron-trigger limit). Lightly gated by a shared key.
export async function handleOilCron(request, ctx, env) {
  if (env.OIL_CRON_KEY && request.headers.get('x-cron-key') !== env.OIL_CRON_KEY) {
    return json({ error: 'forbidden' }, 403)
  }
  await checkOilUpdate(env, ctx)
  return json({ ok: true })
}

export async function handleOilPredictCron(request, ctx, env) {
  if (env.OIL_CRON_KEY && request.headers.get('x-cron-key') !== env.OIL_CRON_KEY) {
    return json({ error: 'forbidden' }, 403)
  }
  const r = await checkOilPredict(env, ctx)
  return json({ ok: true, ...r }) // includes parsed prediction — curl this to tune the parser
}

const SHORT = { '92無鉛汽油': '92', '95無鉛汽油': '95', '98無鉛汽油': '98', '超級柴油': '柴油' }
const GASOLINE = '92無鉛汽油' // representative — all gasoline grades move by the same amount
const DIESEL = '超級柴油'

const r1 = (n) => Math.round(n * 10) / 10
const eqDelta = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) <= 0.05)
const arrow = (d) => (d > 0 ? '▲' : d < 0 ? '▼' : '—')
const dirWord = (ds) => {
  const v = ds.filter((x) => x != null)
  const up = v.some((x) => x > 0)
  const dn = v.some((x) => x < 0)
  return up && dn ? '漲跌互見' : up ? '調漲' : dn ? '調降' : '不調整'
}
const mdOf = (ts) => {
  const [, m, dd] = String(ts).split('-')
  return m && dd ? `${+m}/${+dd}` : ts
}

// ── Prediction (days before the official Sunday-noon announcement) ─────────────
function predMessage(pred) {
  const g = pred.byFuel.gasoline
  const d = pred.byFuel.diesel
  const tag = (label, x) => (x == null ? null : x === 0 ? `${label} 估持平` : `${label} 估${arrow(x)}${Math.abs(x)}`)
  const parts = [tag('汽油', g), tag('柴油', d)].filter(Boolean)
  const note = pred.sources.length < 2 ? '（單源）' : ''
  return {
    title: `⛽ 油價預測・下週估${dirWord([g, d])}`,
    body: `${parts.join('　')}${note}（預估・週日中午官方公告為準）`,
  }
}

// Cron (Fri–Sun): fetch the formula-based forecast and push it early. Dedupes
// against the last pushed prediction so a stable forecast isn't re-sent.
export async function checkOilPredict(env, ctx) {
  if (!env.TDX_KV) return { pushed: false, reason: 'no-kv', prediction: null }
  let pred = null
  try {
    pred = await fetchPrediction()
  } catch {
    /* fail-safe */
  }
  if (!pred) return { pushed: false, reason: 'no-prediction', prediction: null }

  const last = JSON.parse((await env.TDX_KV.get('oil:predict')) || 'null')
  if (last?.byFuel && eqDelta(last.byFuel.gasoline, pred.byFuel.gasoline) && eqDelta(last.byFuel.diesel, pred.byFuel.diesel)) {
    return { pushed: false, reason: 'unchanged', prediction: pred }
  }

  const { title, body } = predMessage(pred)
  await pushToAll(env, { title, body, url: 'https://live.kvcc.me/oil' })
  await env.TDX_KV.put('oil:predict', JSON.stringify({ byFuel: pred.byFuel, sources: pred.sources, pushedAt: new Date().toISOString() }))
  return { pushed: true, prediction: pred }
}

// ── Official CPC change ────────────────────────────────────────────────────────
// Detect a price change (effective date moves), keep a KV snapshot so deltas can
// be shown, and push to all subscribers. If a prediction was already pushed this
// week: same as predicted -> stay silent; differs -> push a correction. First run
// only seeds the baseline.
export async function checkOilUpdate(env, ctx) {
  if (!env.TDX_KV) return
  let items
  try {
    const res = await handleOil(new Request('https://tw-live/api/oil'), ctx, env)
    items = await res.json()
  } catch {
    return
  }
  if (!Array.isArray(items) || !items.length) return

  await refreshOilHistory(env).catch(() => {}) // keep the weekly sparkline series fresh

  const ts = items.map((i) => i.ts).filter(Boolean).sort().pop() || ''
  if (!ts) return
  const prices = {}
  for (const i of items) if (i.value != null) prices[i.name] = i.value

  const snap = JSON.parse((await env.TDX_KV.get('oil:snap')) || 'null')
  if (snap && ts === snap.ts) return // unchanged
  if (!snap) {
    await env.TDX_KV.put('oil:snap', JSON.stringify({ ts, prices, prevTs: null, prevPrices: null }))
    return // seed baseline silently
  }

  // CPC re-affirms the effective date weekly even when prices don't move; only
  // treat it as a real change (and notify) if a price actually differs.
  if (!Object.keys(prices).some((n) => snap.prices?.[n] !== prices[n])) {
    await env.TDX_KV.put('oil:snap', JSON.stringify({ ...snap, ts })) // advance ts, stay silent
    return
  }

  const prev = snap.prices || {}
  const dOf = (name) => (prices[name] != null && prev[name] != null ? r1(prices[name] - prev[name]) : null)
  const offGas = dOf(GASOLINE)
  const offDie = dOf(DIESEL)

  // Did we already push a prediction for this change?
  const predict = JSON.parse((await env.TDX_KV.get('oil:predict')) || 'null')
  const writeSnap = () => env.TDX_KV.put('oil:snap', JSON.stringify({ ts, prices, prevTs: snap.ts, prevPrices: snap.prices }))

  if (predict?.byFuel && eqDelta(predict.byFuel.gasoline, offGas) && eqDelta(predict.byFuel.diesel, offDie)) {
    // Matched the forecast — don't push again, just commit and clear.
    await writeSnap()
    await env.TDX_KV.delete('oil:predict')
    return
  }

  let ups = 0
  let downs = 0
  const parts = Object.keys(SHORT)
    .map((name) => {
      const cur = prices[name]
      if (cur == null) return null
      const was = prev[name]
      if (was == null) return `${SHORT[name]} ${cur}`
      const d = r1(cur - was)
      if (d > 0) ups++
      else if (d < 0) downs++
      return `${SHORT[name]} ${arrow(d)}${d === 0 ? '' : Math.abs(d)}→${cur}`
    })
    .filter(Boolean)
  const dir = ups && downs ? '漲跌互見' : ups ? '調漲' : downs ? '調降' : '更新'
  const corrected = predict?.byFuel != null // a prediction existed but didn't match
  const title = corrected ? `⛽ 油價公告・與預測不同（${mdOf(ts)} 起${dir}）` : `⛽ 油價 ${mdOf(ts)} 起${dir}`

  await pushToAll(env, { title, body: `${parts.join('　')}（元/公升）`, url: 'https://live.kvcc.me/oil' })
  await writeSnap()
  if (predict) await env.TDX_KV.delete('oil:predict')
}
