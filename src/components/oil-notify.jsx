import { useEffect, useState } from 'react'
import { Bell, BellRing, Check, Share, Loader2 } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import { pushSupported, isIOS, isStandalone, getSubscription, subscribe, unsubscribe, sendTest } from '@/lib/push'

// Oil-page only: opt into a Web Push when CPC fuel prices change. Self-hosted
// push (VAPID) — no app, no SMS. On iPhone this requires the PWA be added to
// the Home Screen first (iOS 16.4+), so we guide that case explicitly.
export default function OilNotify() {
  const { t } = useLang()
  const [state, setState] = useState('loading') // loading|idle|subscribed|denied|working
  const [tested, setTested] = useState(false)

  useEffect(() => {
    if (!pushSupported()) {
      setState('idle')
      return
    }
    getSubscription()
      .then((s) => setState(s ? 'subscribed' : Notification.permission === 'denied' ? 'denied' : 'idle'))
      .catch(() => setState('idle'))
  }, [])

  // iPhone in a normal Safari tab can't push — must install to Home Screen.
  if (isIOS() && !isStandalone()) {
    return (
      <Card>
        <div className="flex items-start gap-2.5">
          <Share className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t({
              zh: 'iPhone 開啟通知前，請用 Safari 點下方「分享」→「加入主畫面」，再從主畫面打開本站即可開啟油價更新通知。',
              en: 'On iPhone, tap Share → Add to Home Screen in Safari, then open the app from the Home Screen to enable fuel-price alerts.',
            })}
          </p>
        </div>
      </Card>
    )
  }

  if (!pushSupported()) return null

  const enable = async () => {
    setState('working')
    try {
      await subscribe()
      setState('subscribed')
    } catch (e) {
      setState(e?.message === 'denied' ? 'denied' : 'idle')
    }
  }
  const off = async () => {
    try {
      await unsubscribe()
    } catch {
      /* ignore */
    }
    setState('idle')
    setTested(false)
  }
  const test = async () => {
    try {
      await sendTest()
      setTested(true)
    } catch {
      /* ignore */
    }
  }

  if (state === 'loading') return null

  if (state === 'denied') {
    return (
      <Card>
        <p className="text-xs text-muted-foreground">
          {t({ zh: '通知已被封鎖，請到瀏覽器/系統設定中允許本站通知。', en: 'Notifications are blocked — allow them for this site in settings.' })}
        </p>
      </Card>
    )
  }

  if (state === 'subscribed') {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Check className="h-4 w-4" />
            {t({ zh: '已開啟油價更新通知', en: 'Fuel-price alerts on' })}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={test} className="rounded-full border border-primary/20 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {tested ? t({ zh: '已送出 ✓', en: 'Sent ✓' }) : t({ zh: '傳測試', en: 'Test' })}
            </button>
            <button onClick={off} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors">
              {t({ zh: '關閉', en: 'Turn off' })}
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <button
        onClick={enable}
        disabled={state === 'working'}
        className="flex items-center gap-2 text-sm font-medium text-primary disabled:opacity-60"
      >
        {state === 'working' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
        {t({ zh: '開啟油價更新通知', en: 'Notify me when fuel prices change' })}
      </button>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
        <Bell className="h-3 w-3" />
        {t({ zh: '每週中油調價時推播到本裝置，免費、不用 App。', en: 'Pushed to this device when CPC adjusts prices — free, no app.' })}
      </p>
    </Card>
  )
}

function Card({ children }) {
  return <div className="mb-5 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">{children}</div>
}
