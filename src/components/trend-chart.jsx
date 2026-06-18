import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useLang } from '@/lib/i18n'

// Generic trend chart. Driven by source.chart ({ title, yLabel, domain, unit,
// color }) and source.fetchTrend(item) returning [{ x, y }].
export default function TrendChart({ source, item }) {
  const { t } = useLang()
  const cfg = source.chart || {}
  const { data, isLoading } = useQuery({
    queryKey: ['trend', source.id, item?.id],
    queryFn: () => source.fetchTrend(item),
    enabled: !!item && typeof source.fetchTrend === 'function',
    staleTime: 30 * 60 * 1000,
  })

  if (isLoading || !data || data.length < 2) return null
  const color = cfg.color || source.accent || '#0ea5e9'
  const unit = cfg.unit || source.unit || ''
  const gid = `trendGrad-${source.id}`

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t(cfg.title) || t(source.metricLabel)}</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="x" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis
            domain={cfg.domain || ['auto', 'auto']}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            width={40}
            tickFormatter={(v) => `${v}${unit}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
            formatter={(value) => [`${value}${unit}`, t(cfg.yLabel) || t(source.metricLabel)]}
          />
          <Area type="monotone" dataKey="y" stroke={color} strokeWidth={2} fill={`url(#${gid})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
