import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Login from './Login'
import SettingsWindow from './components/Config/SettingsWindow'
import StandaloneViewCanvas from './components/Editor/StandaloneViewCanvas'
import ErrorBoundary from './components/Common/ErrorBoundary'
import DevConsoleModal from './components/Common/DevConsoleModal'
import './index.css'

const urlParams = new URLSearchParams(window.location.search)
const windowType = urlParams.get('window')
const viewId = urlParams.get('view') || 'all-tasks'

const DesktopApp = () => {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('erpsyn-authenticated') === 'true'
  })

  useEffect(() => {
    // Check session validity with Go backend SQLite cache
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.is_token_valid) {
          localStorage.setItem('erpsyn-authenticated', 'true')
          setAuthenticated(true)
          fetch('/api/window/main', { method: 'POST' }).catch(() => {})
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
      {windowType === 'settings' ? (
        <SettingsWindow />
      ) : windowType === 'view' ? (
        <StandaloneViewCanvas viewId={viewId} />
      ) : (
        <DesktopApp />
      )}

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
