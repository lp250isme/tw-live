import { handleOil } from './sources/oil'
import { pushToAll } from './push'
import { json } from './cors'

// HTTP entry for the check (called by the shortlink worker's daily cron, since
// this account is at its cron-trigger limit). Lightly gated by a shared key.
export async function handleOilCron(request, ctx, env) {
  if (env.OIL_CRON_KEY && request.headers.get('x-cron-key') !== env.OIL_CRON_KEY) {
    return json({ error: 'forbidden' }, 403)
  }
  await checkOilUpdate(env, ctx)
  return json({ ok: true })
}

const SHORT = { '92無鉛汽油': '92', '95無鉛汽油': '95', '98無鉛汽油': '98', '超級柴油': '柴油' }

// Cron: detect a CPC price change (the effective date moves) and push it to all
// subscribers with the per-fuel up/down move. A snapshot in KV (oil:snap) keeps
// the prior week's prices so the delta can be shown — CPC's feed carries none.
// First run only seeds the baseline so it doesn't fire a spurious "update".
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

  // Changed: compare against the prices current before this change (snap.prices).
  const prev = snap.prices || {}
  let ups = 0
  let downs = 0
  const parts = Object.keys(SHORT)
    .map((name) => {
      const cur = prices[name]
      if (cur == null) return null
      const was = prev[name]
      if (was == null) return `${SHORT[name]} ${cur}`
      const d = Math.round((cur - was) * 10) / 10
      if (d > 0) { ups++; return `${SHORT[name]} ▲${d}→${cur}` }
      if (d < 0) { downs++; return `${SHORT[name]} ▼${Math.abs(d)}→${cur}` }
      return `${SHORT[name]} —${cur}`
    })
    .filter(Boolean)

  const dir = ups && downs ? '漲跌互見' : ups ? '調漲' : downs ? '調降' : '更新'
  const [, m, dd] = ts.split('-')
  const md = m && dd ? `${+m}/${+dd}` : ts

  await pushToAll(env, {
    title: `⛽ 油價 ${md} 起${dir}`,
    body: `${parts.join('　')}（元/公升）`,
    url: 'https://live.kvcc.me/oil',
  })
  await env.TDX_KV.put('oil:snap', JSON.stringify({ ts, prices, prevTs: snap.ts, prevPrices: snap.prices }))
}
