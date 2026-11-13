import { lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lockViewport } from 'viewport-lock'
import { LangProvider } from '@/lib/i18n'
import { GeoProvider } from '@/lib/geo-context'
import { FavoritesProvider } from '@/lib/favorites'
import Layout from '@/components/layout'
import './index.css'

// Route-level code splitting: the shell (layout + header + source configs) is
// all the first paint needs. Each route's own tree — and its radix/leaflet
// dependencies — loads on navigation, behind <Suspense> inside Layout.
const Overview = lazy(() => import('@/pages/overview'))
const SourcePage = lazy(() => import('@/pages/source-page'))

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
        <FavoritesProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Overview />} />
                <Route path=":sourceId" element={<SourcePage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </FavoritesProvider>
      </GeoProvider>
    </LangProvider>
  </QueryClientProvider>
)
