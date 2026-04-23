import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { AppHeader } from './components/AppHeader'

import { NotFoundPage } from './pages/NotFoundPage'

import { ToastProvider, ToastContainer } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { getRouteComponent } from './routes/route-components'
import { getRouteMetaList } from './routes/route-meta'

/**
 * 组装渲染进程的应用骨架与页面路由。
 */
function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <AppHeader />
            <main style={{ flex: 1, overflow: 'auto' }}>
              <ErrorBoundary>
                <Routes>
                  {getRouteMetaList().map(({ path }) => {
                    const RouteComponent = getRouteComponent(path)
                    if (!RouteComponent) return null

                    return <Route key={path} path={path} element={<RouteComponent />} />
                  })}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </ErrorBoundary>
            </main>
          </div>
        </div>
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
