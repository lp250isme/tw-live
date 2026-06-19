import { withEdgeCache } from '../cache'
import { tdxGet } from '../lib/tdx'

// TDX off-street parking. Join realtime availability + car-park metadata
// (name/coords) by CarParkID, for the two biggest metros.
const CITIES = [
  { code: 'Taipei', label: '臺北市' },
  { code: 'NewTaipei', label: '新北市' },
]

async function buildCity(env, city) {
  const [avail, parks] = await Promise.all([
    tdxGet(env, `/v1/Parking/OffStreet/ParkingAvailability/City/${city.code}?$format=JSON`),
    tdxGet(env, `/v1/Parking/OffStreet/CarPark/City/${city.code}?$format=JSON`),
  ])
  const availArr = avail.ParkingAvailabilities || (Array.isArray(avail) ? avail : [])
  const parkArr = parks.CarParks || (Array.isArray(parks) ? parks : [])
  const availMap = new Map()
  for (const a of availArr) if (a.CarParkID != null) availMap.set(String(a.CarParkID), a)

  const items = []
  for (const p of parkArr) {
    const id = String(p.CarParkID ?? '')
    const pos = p.CarParkPosition || {}
    if (!id || pos.PositionLat == null || pos.PositionLon == null) continue
    const a = availMap.get(id)
    let avail_ = a ? a.AvailableSpaces : null
    if (avail_ != null && avail_ < 0) avail_ = null // -9 = unknown
    items.push({
      id: `${city.code}-${id}`,
      name: p.CarParkName?.Zh_tw || p.CarParkName || id,
      group: city.label,
      lat: pos.PositionLat,
      lng: pos.PositionLon,
      value: avail_,
      ts: a?.DataCollectTime || null,
      meta: { total: a?.TotalSpaces ?? null, address: p.Address || null },
    })
  }
  return items
}

async function build(env) {
  const results = await Promise.allSettled(CITIES.map((c) => buildCity(env, c)))
  const items = results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value)
  return items.filter((x) => x.value != null).sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
}

export function handleParking(request, ctx, env) {
  return withEdgeCache('parking', 60, () => build(env), ctx)
}
