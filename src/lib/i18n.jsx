import { createContext, useContext, useState, useCallback } from 'react'

// Lightweight i18n: strings live inline as { zh, en } objects; t() picks by
// current language. Chrome/UI strings are translated; gov data names stay as-is.
const LangCtx = createContext(null)
const KEY = 'twlive-lang'

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'zh'
  )
  const setLang = useCallback((l) => {
    setLangState(l)
    try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  }, [])
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>
}

export function useLang() {
  const ctx = useContext(LangCtx)
  const lang = ctx?.lang || 'zh'
  const t = useCallback(
    (v) => {
      if (v == null) return ''
      if (typeof v === 'string') return v
      return v[lang] ?? v.zh ?? v.en ?? ''
    },
    [lang]
  )
  return { lang, setLang: ctx?.setLang ?? (() => {}), t }
}
