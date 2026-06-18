import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { getTier } from '@/lib/tier'
import { useLang } from '@/lib/i18n'
import 'leaflet/dist/leaflet.css'

const TAIWAN_CENTER = [23.7, 120.9]
const TAIWAN_ZOOM = 7

function FitBounds({ items }) {
  const map = useMap()
  useEffect(() => {
    const bounds = items.filter((r) => r.lat && r.lng).map((r) => [r.lat, r.lng])
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30] })
  }, [items, map])
  return null
}

export default function MapView({ source, items, detailMap, onMarkerClick }) {
  const { t } = useLang()
  const valid = items.filter((r) => r.lat && r.lng)

  return (
    <div className="rounded-xl border overflow-hidden" style={{ height: 'calc(100vh - 240px)', minHeight: 400 }}>
      <MapContainer center={TAIWAN_CENTER} zoom={TAIWAN_ZOOM} className="h-full w-full" scrollWheelZoom={true}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds items={valid} />

        {valid.map((item) => {
          const eff = source.hasDetail ? detailMap?.[item.id] : { value: item.value, ts: item.ts, raw: item.raw }
          const value = eff?.value ?? (source.hasDetail ? null : item.value)
          const tier = getTier(value, source.tiers)
          const meta = tier ? source.tierMeta?.[tier] : null
          const color = meta?.color || source.accent || '#38bdf8'
          const radius = value != null ? Math.max(6, Math.min(18, (Math.min(100, Math.abs(value)) / 100) * 18)) : 8

          return (
            <CircleMarker
              key={item.id}
              center={[item.lat, item.lng]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
              eventHandlers={{ click: () => onMarkerClick(item, eff) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-center">
                  <div className="font-semibold">{item.name}</div>
                  {value != null && (
                    <div className="text-sm">
                      {source.formatValue ? source.formatValue(value) : value}{source.unit}
                      {meta ? ` · ${t(meta.label)}` : ''}
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
