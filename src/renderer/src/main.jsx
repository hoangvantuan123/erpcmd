import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Login from './Login'
import SettingsWindow from './components/Config/SettingsWindow'
import StandaloneViewCanvas from './components/Editor/StandaloneViewCanvas'
import './index.css'

const urlParams = new URLSearchParams(window.location.search)
const windowType = urlParams.get('window')
const viewId = urlParams.get('view') || 'all-tasks'

const DesktopApp = () => {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('erpsyn-authenticated') === 'true'
  })

  React.useEffect(() => {
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {windowType === 'settings' ? (
      <SettingsWindow />
    ) : windowType === 'view' ? (
      <StandaloneViewCanvas viewId={viewId} />
    ) : (
      <DesktopApp />
    )}
  </React.StrictMode>,
)


