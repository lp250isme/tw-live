import { Outlet } from 'react-router-dom'
import AnimatedBackground from '@/components/animated-background'
import Header from '@/components/header'
import { useTheme } from '@/lib/theme'

export default function Layout() {
  const theme = useTheme()
  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header theme={theme} />
        <main className="container mx-auto px-4 py-6 flex-1 w-full">
          <Outlet />
        </main>
        <footer className="container mx-auto px-4 py-8 text-center text-xs text-muted-foreground/50">
          資料來源：政府開放資料平臺 · Built by kv
        </footer>
      </div>
    </div>
  )
}
