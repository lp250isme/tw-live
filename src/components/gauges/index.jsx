import { getTier } from '@/lib/tier'
import { useLang } from '@/lib/i18n'
import { fmtValue, unitOf } from '@/lib/summary'
import RadialGauge from './radial-gauge'
import ScaleBar from './scale-bar'
import ThresholdGauge from './threshold-gauge'
import StatBlock from './stat-block'

// Detail-dialog hero gauge. Each source declares `detailGauge` to pick the
// representation that fits what its value *means* — a proportional ring only
// where value/max is genuinely "how full", a banded scale for standardised
// indices, a gradient spectrum for temperature, alert thresholds for rivers,
// a plain stat for scaleless quantities like price.
//   radial | scale | spectrum | threshold | stat
export default function DetailGauge({ source, value, item }) {
  const { t } = useLang()

  const tier = getTier(value, source.tiers)
  const meta = (tier && source.tierMeta?.[tier]) || { color: source.accent || '#7c7dff', label: source.metricLabel }
  const common = {
    source,
    value,
    item,
    color: meta.color,
    label: t(meta.label),
    display: fmtValue(source, value),
    unit: unitOf(source, t),
    t,
  }

  const kind =
    source.detailGauge ||
    (source.gauge === 'fill' || source.max || source.gaugeMax ? 'radial' : 'stat')

  switch (kind) {
    case 'scale': return <ScaleBar {...common} />
    case 'spectrum': return <ScaleBar {...common} spectrum />
    case 'threshold': return <ThresholdGauge {...common} />
    case 'stat': return <StatBlock {...common} />
    case 'radial':
    default: return <RadialGauge {...common} />
  }
}
