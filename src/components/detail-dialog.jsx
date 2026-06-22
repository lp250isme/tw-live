import * as Dialog from '@radix-ui/react-dialog'
import { X, MapPin } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import DetailGauge from './gauges'
import Sparkline from './sparkline'

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/30 last:border-0 hover:bg-primary/5 px-2 -mx-2 rounded-lg transition-colors">
      <div className="flex shrink-0 items-center gap-2.5 text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 text-primary/50" />}
        <span className="text-sm whitespace-nowrap">{label}</span>
      </div>
      <span className="min-w-0 text-right text-sm font-semibold tabular-nums break-words leading-relaxed">{value}</span>
    </div>
  )
}

export default function DetailDialog({ source, open, onOpenChange, item, detail }) {
  const { t } = useLang()
  if (!item) return null

  const value = detail?.value ?? item.value ?? null
  const fields = source.detailFields ? source.detailFields(item, detail) : []
  const Icon = source.Icon

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto glass-dialog data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-xl font-bold">{item.name}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                {item.group ? <><MapPin className="h-3.5 w-3.5" />{item.group}</> : t(source.name)}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-full p-1.5 hover:bg-muted transition-colors" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="flex justify-center py-4">
            {value != null ? (
              <DetailGauge source={source} value={value} item={item} />
            ) : (
              <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center">
                {Icon && <Icon className="h-12 w-12 text-muted-foreground" />}
              </div>
            )}
          </div>

          {fields.length > 0 && (
            <div className="rounded-xl border border-primary/10 bg-muted/20 backdrop-blur-sm p-4">
              {fields.map((f, i) => (
                <InfoRow key={i} icon={f.icon} label={t(f.label)} value={f.value} />
              ))}
            </div>
          )}

          {item.history?.length > 1 && (
            <div className="mt-4 rounded-xl border border-primary/10 bg-muted/20 backdrop-blur-sm p-4">
              <div className="mb-2 text-sm text-muted-foreground">近 {item.history.length} 週走勢（元/公升）</div>
              <Sparkline data={item.history} />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
