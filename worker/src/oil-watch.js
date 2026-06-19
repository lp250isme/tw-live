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
// subscribers. First run only seeds the baseline so it doesn't fire a spurious
// "update" for the current price.
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
  const prev = await env.TDX_KV.get('oil:lastTs')
  if (ts === prev) return // unchanged
  if (!prev) {
    await env.TDX_KV.put('oil:lastTs', ts) // seed baseline silently
    return
  }

  const line = Object.keys(SHORT)
    .map((name) => {
      const v = items.find((i) => i.name === name)?.value
      return v != null ? `${SHORT[name]} ${v}` : null
    })
    .filter(Boolean)
    .join(' / ')

  await pushToAll(env, {
    title: '⛽ 中油油價更新',
    body: `${ts} 起　${line}（元/公升）`,
    url: 'https://live.kvcc.me/oil',
  })
  await env.TDX_KV.put('oil:lastTs', ts)
}
