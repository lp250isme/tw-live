import { createContext, useContext, useState, useCallback } from 'react'

// Shares the user's geolocation across the app. Requested on demand (a user
// gesture), never automatically — geolocation needs permission + a click.
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
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  const clear = useCallback(() => {
    setCoords(null)
    setStatus('idle')
  }, [])

  return <GeoCtx.Provider value={{ coords, status, request, clear }}>{children}</GeoCtx.Provider>
}

export function useGeo() {
  return useContext(GeoCtx) || { coords: null, status: 'idle', request: () => {}, clear: () => {} }
}
