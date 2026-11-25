// Cloudflare Turnstile 前端（interaction-only：真人通常看不到，有疑慮才跳勾選框）。
// 每次真的送出前呼叫一次；token 一次性。sitekey 為 PENDING 時不取 token（後端 secret 未設也會放行）。
export const TURNSTILE_SITEKEY = '0x4AAAAAAGScfMqD0VH5dO7J'

let tsReady
function loadTurnstile() {
  return (tsReady ||= new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => res(window.turnstile)
    s.onerror = () => { tsReady = undefined; rej(new Error('turnstile load')) }
    document.head.appendChild(s)
  }))
}

export async function getTurnstileToken(action = 'turnstile-spin-v1') {
  if (TURNSTILE_SITEKEY === 'PENDING_SITEKEY') return ''
  const ts = await loadTurnstile()
  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483647'
  document.body.appendChild(box)
  try {
    return await new Promise((res, rej) => {
      ts.render(box, {
        sitekey: TURNSTILE_SITEKEY, action, appearance: 'interaction-only',
        callback: res, 'error-callback': () => rej(new Error('turnstile')), 'timeout-callback': () => rej(new Error('turnstile timeout')),
      })
    })
  } finally { setTimeout(() => box.remove(), 0) }
}

// 帶 token 的 header（跨網域 live-api：worker/src/cors.js Allow-Headers 已放行 cf-turnstile-response）。取不到回空物件。
export async function tsHeaders() {
  try { const t = await getTurnstileToken(); return t ? { 'cf-turnstile-response': t } : {} } catch { return {} }
}
