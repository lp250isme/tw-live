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
      (err) => {
        setStatus('denied')
        // Permission actually revoked (not a timeout) → forget the preference so
        // we don't re-prompt on every reopen.
        if (err?.code === 1) {
          try {
            localStorage.removeItem(GEO_PREF)
          } catch {
            /* ignore */
          }
        }
      },
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

  // Auto-restore if the user enabled location before. Where the Permissions API
  // can confirm 'granted' (desktop) we use it to avoid a surprise prompt; where
  // it can't (iOS Safari has no 'geolocation' permission name → query rejects)
  // we just retry — a still-granted permission resolves silently.
  useEffect(() => {
    let on = true
    try {
      if (localStorage.getItem(GEO_PREF) !== '1') return
    } catch {
      return
    }
    const run = () => {
      if (on) request()
    }
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((p) => {
          if (p.state === 'granted') run()
        })
        .catch(run)
    } else {
      run()
    }
    return () => {
      on = false
    }
  }, [request])

  return <GeoCtx.Provider value={{ coords, status, request, clear }}>{children}</GeoCtx.Provider>
}

export function useGeo() {
  return useContext(GeoCtx) || { coords: null, status: 'idle', request: () => {}, clear: () => {} }
}
