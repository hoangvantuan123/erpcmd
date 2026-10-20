import React, { lazy, Suspense, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import ErrorBoundary from '@/shared/runtime/ErrorBoundary'
import DevConsoleModal from '@/shared/runtime/DevConsoleModal'
import { getSystemStatus } from '@/features/system/api/systemApi'
import './index.css'

const App = lazy(() => import('@/app/App'))
const Login = lazy(() => import('@/features/auth/components/Login'))
const SettingsWindow = lazy(() => import('@/features/settings/components/Config/SettingsWindow'))
const StandaloneViewCanvas = lazy(() => import('@/app/shell/editor/Editor/StandaloneViewCanvas'))

const PageLoading = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-white text-xs text-slate-500 dark:bg-black dark:text-slate-400">
    Đang tải giao diện…
  </div>
)

const urlParams = new URLSearchParams(window.location.search)
const windowType = urlParams.get('window')
const viewId = urlParams.get('view') || 'all-tasks'

const DesktopApp = () => {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('erpsyn-authenticated') === 'true'
  })

  useEffect(() => {
    // Check session validity with Go backend SQLite cache
    getSystemStatus()
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.is_token_valid) {
          localStorage.setItem('erpsyn-authenticated', 'true')
          setAuthenticated(true)
        } else if (data.success && !data.is_token_valid) {
          localStorage.removeItem('erpsyn-authenticated')
          setAuthenticated(false)
        }
      })
      .catch(() => {})
  }, [])

  return authenticated
    ? <App />
    : <Login onLoginSuccess={() => setAuthenticated(true)} />
}

const Root = () => {
  const [showConsole, setShowConsole] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle DevConsole on F12 or Ctrl+Shift+I or Ctrl+`
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i'))) {
        e.preventDefault()
        setShowConsole(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
        {windowType === 'settings' ? (
          <SettingsWindow />
        ) : windowType === 'view' ? (
          <StandaloneViewCanvas viewId={viewId} />
        ) : (
          <DesktopApp />
        )}
      </Suspense>

      {/* In-app developer console accessible via F12 anytime */}
      <DevConsoleModal isOpen={showConsole} onClose={() => setShowConsole(false)} />
    </ErrorBoundary>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
