import { useState, useEffect, useCallback } from 'react'

// Family theme system: choice ∈ {light, dark, auto}; the RESOLVED value is
// written to <html data-theme> (the CSS keys all material off that), and the
// <meta theme-color> is kept in sync. A pre-paint inline script in index.html
// applies the initial value to avoid a flash. Dark-first (cyberpunk war-room).
const KEY = 'twlive-theme'
const DARK_BG = '#08090a'
const LIGHT_BG = '#fbfbfc'

const mq = () => window.matchMedia('(prefers-color-scheme: dark)')
const resolve = (choice) => (choice === 'auto' ? (mq().matches ? 'dark' : 'light') : choice)

function apply(choice) {
  const r = resolve(choice)
  document.documentElement.dataset.theme = r
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', r === 'dark' ? DARK_BG : LIGHT_BG)
}

export function useTheme() {
  const [choice, setChoice] = useState(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'dark'
  )

  useEffect(() => {
    apply(choice)
    if (choice === 'auto') {
      const m = mq()
      const onChange = () => apply('auto')
      m.addEventListener('change', onChange)
      return () => m.removeEventListener('change', onChange)
    }
  }, [choice])

  const set = useCallback((c) => {
    try { localStorage.setItem(KEY, c) } catch { /* ignore */ }
    setChoice(c)
  }, [])

  const cycle = useCallback(() => {
    setChoice((c) => {
      const next = c === 'light' ? 'dark' : c === 'dark' ? 'auto' : 'light'
      try { localStorage.setItem(KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [])

  return { choice, resolved: resolve(choice), set, cycle }
}
