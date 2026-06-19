import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const COORDS_KEY = 'twlive-coords'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // reuse a cached location for up to 7 days

// Shares the user's geolocation across the app. The last fix is cached on-device
// and reloaded instantly on next open (no re-prompt, no iOS gesture/permission
// quirks) so "nearest first" persists; tapping the button refreshes it. Cached
// coords are plenty accurate for distance sorting.
const GeoCtx = createContext(null)

export function GeoProvider({ children }) {
  const [coords, setCoords] = useState(null) // { lat, lng }
  const [status, setStatus] = useState('idle') // idle | loading | granted | denied | unsupported

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(c)
        setStatus('granted')
        try {
          localStorage.setItem(COORDS_KEY, JSON.stringify({ ...c, t: Date.now() }))
        } catch {
          /* ignore */
        }
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  const clear = useCallback(() => {
    setCoords(null)
    setStatus('idle')
    try {
      localStorage.removeItem(COORDS_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  // Restore the last cached location on open — instant and reliable, regardless
  // of how iOS handles geolocation permission persistence.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COORDS_KEY)
      if (!raw) return
      const c = JSON.parse(raw)
      if (typeof c?.lat === 'number' && typeof c?.lng === 'number' && (!c.t || Date.now() - c.t < MAX_AGE)) {
        setCoords({ lat: c.lat, lng: c.lng })
        setStatus('granted')
      }
    } catch {
      /* ignore */
    }
  }, [])

  return <GeoCtx.Provider value={{ coords, status, request, clear }}>{children}</GeoCtx.Provider>
}

export function useGeo() {
  return useContext(GeoCtx) || { coords: null, status: 'idle', request: () => {}, clear: () => {} }
}
