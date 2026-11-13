import { TriangleAlert, RefreshCw } from 'lucide-react'
import { useLang } from '@/lib/i18n'

// Generic, i18n'd failure block. Callers may override the copy (the overview
// and a source page fail for different reasons); `onRetry` is required so a
// failure is never a dead end.
export default function ErrorState({ onRetry, title, description }) {
  const { t } = useLang()
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-20 text-center">
      <TriangleAlert className="mb-4 h-10 w-10 text-amber-500" aria-hidden />
      <h2 className="mb-2 text-lg font-semibold">
        {t(title ?? { zh: '資料載入失敗', en: 'Couldn’t load the data' })}
      </h2>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        {t(
          description ?? {
            zh: '可能是網路連線或上游資料來源暫時無回應，請稍後重試。',
            en: 'Your connection or the upstream data source may be temporarily unavailable.',
          }
        )}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity duration-150 hover:opacity-90"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        {t({ zh: '重新載入', en: 'Retry' })}
      </button>
    </div>
  )
}
