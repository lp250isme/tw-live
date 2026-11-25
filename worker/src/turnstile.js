// turnstile.mjs — 只在瀏覽器請求強制；原生 App / 捷徑 / cron 不帶 Origin 與 Sec-Fetch-Site，照舊只靠限流與 shield。
// ponytail: 拿掉 Origin/Sec-Fetch-Site 就能繞過＝只擋瀏覽器自動化；要擋腳本得讓 App 走 Passkey 或 mTLS（另開任務）。
const OWN = ['kvcc.me', 'gohref.cc', 'apage.cc', 'kvcc.dpdns.org'];
const isOwnHost = (h) => OWN.some((d) => h === d || h.endsWith('.' + d));

export function isBrowserRequest(request) {
  const sfs = request.headers.get('Sec-Fetch-Site');
  if (sfs === 'same-origin' || sfs === 'same-site') return true;
  const o = request.headers.get('Origin');
  if (!o) return false;
  try { return isOwnHost(new URL(o).hostname); } catch { return false; }
}

// token 來源：header `cf-turnstile-response` > body 欄位（呼叫端傳入）> query `cf-turnstile-response`
export function turnstileTokenFrom(request, bodyToken) {
  return request.headers.get('cf-turnstile-response')
    || (typeof bodyToken === 'string' ? bodyToken : '')
    || new URL(request.url).searchParams.get('cf-turnstile-response') || '';
}

// 回 null＝放行；回 Response＝擋下
export async function turnstileGate(env, request, token, { fetchImpl = fetch } = {}) {
  if (!isBrowserRequest(request)) return null;
  if (!env.TURNSTILE_SECRET) { console.warn('[turnstile] TURNSTILE_SECRET 未設，放行'); return null; }
  const fail = () => new Response(JSON.stringify({ error: 'turnstile_failed', code: 'turnstile_failed' }), {
    status: 403, headers: { 'content-type': 'application/json' },
  });
  if (!token) return fail();
  try {
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) form.append('remoteip', ip);
    const r = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const d = await r.json();
    if (d.success === true && (!d.hostname || isOwnHost(d.hostname))) return null;
    console.log('[turnstile] fail', JSON.stringify(d['error-codes'] || []));
    return fail();
  } catch (e) {
    console.warn('[turnstile] siteverify 連不上，放行', String(e));
    return null;
  }
}
