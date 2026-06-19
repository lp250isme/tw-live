import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lockViewport } from 'viewport-lock'
import { LangProvider } from '@/lib/i18n'
import { GeoProvider } from '@/lib/geo-context'
import Layout from '@/components/layout'
import Overview from '@/pages/overview'
import SourcePage from '@/pages/source-page'
import 'more-by-kv/styles.css'
import './index.css'

// Block pinch / double-tap zoom on mobile while keeping scroll (family-wide).
lockViewport()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <LangProvider>
      <GeoProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path=":sourceId" element={<SourcePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </GeoProvider>
    </LangProvider>
  </QueryClientProvider>
)
