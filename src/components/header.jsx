import { NavLink } from 'react-router-dom'
import { Sun, Moon, Monitor, Activity, Navigation } from 'lucide-react'
import { sources } from '@/lib/sources'
import { useLang } from '@/lib/i18n'
import { useGeo } from '@/lib/geo-context'
import { cn } from '@/lib/utils'

const themeIcon = { light: Sun, dark: Moon, auto: Monitor }

export default function Header({ theme }) {
  const { lang, setLang, t } = useLang()
  const { coords, status, request, clear } = useGeo()
  const ThemeIcon = themeIcon[theme.choice] ?? Moon

  return (
    <header className="sticky top-0 z-40 header-glass">
      <div className="absolute bottom-0 left-0 right-0 h-[1px] animated-gradient-border" />

      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg border border-border logo-glow">
              <Activity className="h-[18px] w-[18px] text-primary" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary status-dot" />
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground">台灣即時</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">TW Live · Open Data</p>
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
            onClick={() => (coords ? clear() : request())}
            className={cn(
              'rounded-full p-2.5 border transition-all duration-300',
              coords
                ? 'border-primary/60 text-primary shadow-[0_0_12px_rgba(14,165,233,0.25)]'
                : 'border-border/50 hover:border-primary/40',
              status === 'loading' && 'opacity-60'
            )}
            aria-label={t({ zh: '使用我的位置', en: 'Use my location' })}
            title={coords ? t({ zh: '已定位（點擊取消）', en: 'Located (click to clear)' }) : t({ zh: '依距離排序附近資料', en: 'Sort nearby by distance' })}
          >
            <Navigation className={cn('h-4 w-4', status === 'loading' && 'animate-pulse')} />
          </button>
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
