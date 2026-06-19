import { API_BASE } from '@/lib/config'

// VAPID public key (uncompressed P-256 point, base64url). Public by design.
const VAPID_PUBLIC = 'BC28FnUR2aib6I8NPg_94qj-UyYtSRLRdMcnTSt2AooeopNp3bgOS9HzGZIMITK5-p_Iq5wrrRefYYF2pdSDYaw'

function urlB64ToUint8(base64) {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(padded)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export const pushSupported = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '')

// iOS only allows push when the PWA is launched from the Home Screen.
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

export async function getSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

export async function subscribe() {
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  let perm = Notification.permission
  if (perm === 'default') perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'denied' : 'dismissed')
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(VAPID_PUBLIC) })
  }
  const res = await fetch(`${API_BASE}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(sub),
  })
  if (!res.ok) throw new Error('subscribe failed')
  return sub
}

export async function unsubscribe() {
  const sub = await getSubscription()
  if (sub) await sub.unsubscribe()
}

export async function sendTest() {
  const sub = await getSubscription()
  if (!sub) throw new Error('not subscribed')
  const res = await fetch(`${API_BASE}/api/push/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(sub),
  })
  return res.json()
}
