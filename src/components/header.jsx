import { NavLink } from 'react-router-dom'
import { Sun, Moon, Monitor, Activity } from 'lucide-react'
import { sources } from '@/lib/sources'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const themeIcon = { light: Sun, dark: Moon, auto: Monitor }

export default function Header({ theme }) {
  const { lang, setLang, t } = useLang()
  const ThemeIcon = themeIcon[theme.choice] ?? Moon

  return (
    <header className="sticky top-0 z-40 header-glass">
      <div className="absolute bottom-0 left-0 right-0 h-[1px] animated-gradient-border" />

      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 logo-glow">
              <Activity className="h-5 w-5 text-primary drop-shadow-[0_0_6px_rgba(14,165,233,0.5)]" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary status-dot" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
                台灣即時
              </span>
            </h1>
            <p className="text-[10px] text-muted-foreground/60 tracking-widest uppercase">TW Live · Open Data</p>
          </div>
        </NavLink>

        {/* Source nav */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {sources.map((s) => {
            const Icon = s.Icon
            return (
              <NavLink
                key={s.id}
                to={`/${s.id}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs whitespace-nowrap transition-colors',
                    isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {t(s.name)}
              </NavLink>
            )
          })}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="rounded-full px-2.5 py-2 border border-border/50 hover:border-primary/40 transition-all duration-300 text-xs font-semibold w-9"
            aria-label="Toggle language"
          >
            {lang === 'zh' ? '中' : 'EN'}
          </button>
          <button
            onClick={theme.cycle}
            className="rounded-full p-2.5 border border-border/50 hover:border-primary/40 hover:shadow-[0_0_12px_rgba(14,165,233,0.2)] transition-all duration-300"
            aria-label="Toggle theme"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
