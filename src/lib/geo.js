// Great-circle distance (km) between two lat/lng points.
export function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || Number.isNaN(v))) return null
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function formatDistance(km) {
  if (km == null) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

// distance from a {lat,lng} origin to an item with lat/lng; null if either missing
export function itemDistance(coords, item) {
  if (!coords || item?.lat == null || item?.lng == null) return null
  return haversineKm(coords.lat, coords.lng, item.lat, item.lng)
}

// Deep-link an item to Google Maps. Prefer name+address so it lands on the real
// place card (the landmark); fall back to raw coords for stations that only
// carry lat/lng. null = nothing to locate → no map link shown.
export function mapsUrl(item) {
  if (!item) return null
  const addr = item.meta?.address || item.meta?.addr
  const query = addr
    ? [item.name, addr].filter(Boolean).join(' ')
    : item.lat != null && item.lng != null
      ? `${item.lat},${item.lng}`
      : null
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null
}
