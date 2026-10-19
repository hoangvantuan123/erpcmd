import React, { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, UserRound, Settings, AlertCircle, RefreshCw, X, Minus } from 'lucide-react'

const requestWindowAction = (action) => {
  fetch(`/api/window/${action}`, { method: 'POST' }).catch(() => {})
}

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(() => localStorage.getItem('erpsyn-username') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOpenSettingsWindow = () => {
    fetch('/api/window/settings', { method: 'POST' }).catch(() => {
      window.open('/?window=settings', 'ERPSYS_SETTINGS', 'width=700,height=520')
    })
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const result = await response.json()
      if (!result?.success) {
        setError(result?.error || 'Thông tin đăng nhập không chính xác.')
        setLoading(false)
        return
      }
      localStorage.setItem('erpsyn-username', username.trim())
      localStorage.setItem('erpsyn-authenticated', 'true')
      const resized = await fetch('/api/window/main', { method: 'POST' })
      if (!resized.ok) throw new Error('Không thể phóng to cửa sổ chính.')
      onLoginSuccess?.()
    } catch (loginError) {
      setError(loginError.message || 'Không kết nối được máy chủ đăng nhập.')
      setLoading(false)
    }
  }

  const handleWindowDrag = (e) => {
    if (e.button === 0 && !e.target.closest('button, input, select, form')) {
      requestWindowAction('drag')
    }
  }

  return (
    <div 
      className="flex h-screen w-screen flex-col justify-between overflow-hidden bg-white text-slate-800 select-none font-sans text-xs m-0 p-0"
      onMouseDown={handleWindowDrag}
    >
      {/* Top Header / Window Controls */}
      <div 
        className="flex h-8 items-center justify-between px-3 border-b border-slate-200 shrink-0 select-none app-region-drag"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase app-region-no-drag">
          ERPSYS
        </span>

        <div className="flex items-center">
          <button
            type="button"
            title="Cài đặt kết nối"
            onClick={handleOpenSettingsWindow}
            className="flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition rounded-none cursor-pointer"
          >
            <Settings size={13} />
          </button>
          <button
            type="button"
            title="Thu nhỏ"
            onClick={() => requestWindowAction('minimize')}
            className="flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition rounded-none cursor-pointer"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            title="Đóng"
            onClick={() => requestWindowAction('close')}
            className="flex h-7 w-8 items-center justify-center text-slate-500 hover:bg-rose-600 hover:text-white transition rounded-none cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Main Login Form */}
      <div className="flex flex-1 items-center justify-center px-6 pb-4">
        <div className="w-full max-w-[280px]">
          <div className="mb-4 text-center">
            <h1 className="text-lg font-bold tracking-wide uppercase text-slate-900">
              ERPSYS
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Hệ thống điều hành sản xuất
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div>
              <label htmlFor="username" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tài khoản ERP
              </label>
              <div className="flex h-8 items-center gap-1.5 border border-slate-300 bg-white px-2 focus-within:border-slate-900">
                <UserRound size={13} className="shrink-0 text-slate-400" />
                <input
                  id="username"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tên tài khoản"
                  className="h-full min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Mật khẩu
              </label>
              <div className="flex h-8 items-center gap-1.5 border border-slate-300 bg-white px-2 focus-within:border-slate-900">
                <LockKeyhole size={13} className="shrink-0 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="h-full min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="mt-1 flex h-8 w-full items-center justify-center bg-slate-900 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer rounded-none"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Đang đăng nhập...</span>
                </span>
              ) : (
                'Đăng Nhập'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pb-2 text-center text-[10px] text-slate-400">
        ERPSYS Client
      </div>
    </div>
  )
}

export default Login
