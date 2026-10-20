import React from 'react'
import { AlertCircle, RefreshCw, Copy, Check, Terminal } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      copied: false
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled React error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleCopy = () => {
    const { error, errorInfo } = this.state
    const text = `ERROR: ${error?.toString()}\n\nSTACK TRACE:\n${error?.stack || ''}\n\nCOMPONENT STACK:\n${errorInfo?.componentStack || ''}`
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, copied } = this.state
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 font-sans select-none">
          <div className="w-full max-w-3xl bg-slate-950 border border-rose-800 rounded-none shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400 border-b border-rose-900/60 pb-3">
              <AlertCircle size={28} className="shrink-0 text-rose-500" />
              <div>
                <h1 className="text-base font-bold uppercase tracking-wider">Đã phát hiện lỗi giao diện (React Error)</h1>
                <p className="text-xs text-slate-400">Hệ thống đã bắt được ngoại lệ để ngăn chặn treo ứng dụng.</p>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-rose-950/30 border border-rose-800/80 p-3 rounded-none font-mono text-xs text-rose-200 select-text break-all">
              <strong>{error?.name || 'Error'}:</strong> {error?.message || String(error)}
            </div>

            {/* Stack trace */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Chi tiết Stack Trace:</div>
              <pre className="bg-black border border-slate-800 p-3 text-[11px] font-mono text-slate-300 max-h-56 overflow-y-auto select-text whitespace-pre-wrap custom-scrollbar">
                {error?.stack || errorInfo?.componentStack || 'Không có stack trace.'}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Bấm <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 font-mono text-[10px]">F12</kbd> để mở Developer Console xem toàn bộ logs.
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleCopy}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-none flex items-center gap-1.5 cursor-pointer transition"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép chi tiết lỗi'}</span>
                </button>

                <button
                  onClick={this.handleReload}
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-none flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                >
                  <RefreshCw size={12} />
                  <span>Tải lại ứng dụng</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
