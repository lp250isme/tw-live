import { Outlet } from 'react-router-dom'
import AnimatedBackground from '@/components/animated-background'
import Header from '@/components/header'
import { useTheme } from '@/lib/theme'
import { useLang } from '@/lib/i18n'

export default function Layout() {
  const theme = useTheme()
  const { t } = useLang()
  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header theme={theme} />
        <main className="container mx-auto px-4 py-6 flex-1 w-full">
          <Outlet />
        </main>
        <footer className="container mx-auto px-4 pb-10 pt-4 w-full">
          <p className="text-center text-xs text-muted-foreground/50">
            {t({ zh: '資料來源：政府資料開放平臺 · Built by kv', en: 'Data: Taiwan Open Data · Built by kv' })}
          </p>
        </footer>
      </div>
    </div>
  )
}
