import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { AppHeader } from './components/AppHeader'

import { ConfigsPage } from './pages/ConfigsPage'
import { ProductsPage } from './pages/ProductsPage'
import { AgentConfigPage } from './pages/AgentConfigPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { NotFoundPage } from './pages/NotFoundPage'

import { ToastProvider, ToastContainer } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <AppHeader />
            <main style={{ flex: 1, overflow: 'auto' }}>
              <Routes>
                <Route path="/" element={<ConfigsPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/agent-config" element={<AgentConfigPage />} />
                <Route path="/conversations" element={<ConversationsPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
          </div>
        </div>
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
