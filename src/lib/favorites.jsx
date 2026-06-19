import { createContext, useContext, useState, useCallback, useEffect } from 'react'

// Per-device favourites (source ids), persisted to localStorage. No backend,
// no cross-device sync — purely a local convenience for pinning common sources.
const KEY = 'twlive-favs'
const FavCtx = createContext(null)

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function FavoritesProvider({ children }) {
  const [favs, setFavs] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(favs))
    } catch {
      /* storage unavailable — favourites just won't persist */
    }
  }, [favs])

  // Toggle keeps insertion order so the pinned section reflects pin order.
  const toggle = useCallback((id) => {
    setFavs((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }, [])

  const isFav = useCallback((id) => favs.includes(id), [favs])

  return <FavCtx.Provider value={{ favs, isFav, toggle }}>{children}</FavCtx.Provider>
}

export function useFavorites() {
  return useContext(FavCtx) || { favs: [], isFav: () => false, toggle: () => {} }
}
