import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const GEO_PREF = 'twlive-geo'

// Shares the user's geolocation across the app. Requested on a user gesture;
// if the user enabled it before AND the permission is still granted, it's
// restored automatically on load (no surprise prompt) so "nearest first" sticks.
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
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('granted')
        try {
          localStorage.setItem(GEO_PREF, '1')
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
      localStorage.removeItem(GEO_PREF)
    } catch {
      /* ignore */
    }
  }, [])

  // Auto-restore: only if previously enabled and the OS permission is still
  // granted — querying first avoids prompting an unsuspecting visitor.
  useEffect(() => {
    let on = true
    try {
      if (localStorage.getItem(GEO_PREF) !== '1') return
    } catch {
      return
    }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (on && p.state === 'granted') request()
      })
      .catch(() => {})
    return () => {
      on = false
    }
  }, [request])

  return <GeoCtx.Provider value={{ coords, status, request, clear }}>{children}</GeoCtx.Provider>
}

export function useGeo() {
  return useContext(GeoCtx) || { coords: null, status: 'idle', request: () => {}, clear: () => {} }
}
