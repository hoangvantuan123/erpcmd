import React, { useState, useEffect } from 'react'
import { Settings, Shield, User, Building, Calendar, Server, Key, RefreshCw, CheckCircle2 } from 'lucide-react'

export const SystemConfigView = () => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/status')
      const json = await res.json()
      if (json.success) {
        setStatus(json)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50/50 dark:bg-black overflow-hidden font-sans">
      <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <Settings className="w-4 h-4" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Cấu Hình & Trạng Thái Hệ Thống
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thông tin phiên làm việc, thiết lập máy trạm và Bravo API Gateway
            </p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm Mới</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-4xl space-y-6">
        {/* Account card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Tài Khoản Đăng Nhập ERP
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block mb-1">Tên đăng nhập:</span>
              <strong className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {status?.username || '(Chưa đăng nhập)'}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block mb-1">Trạng thái Bearer Token:</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold ${
                status?.is_token_valid
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{status?.is_token_valid ? `Hợp lệ (${Math.round((status?.expires_in || 0) / 60)} phút còn lại)` : 'Hết hạn hoặc chưa cấp'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bravo Context */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Building className="w-5 h-5 text-purple-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Ngữ Cảnh Doanh Nghiệp (Bravo Context)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block mb-1">Mã đơn vị / Chi nhánh:</span>
              <strong className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {status?.branch_code || 'A01'}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block mb-1">Năm tài chính:</span>
              <strong className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {status?.fiscal_year || '2026'}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block mb-1">Chế độ máy trạm:</span>
              <strong className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                {status?.client_mode === 'winform' ? 'Winform (Máy trạm)' : 'Web Browser'}
              </strong>
            </div>
          </div>
        </div>

        {/* Server Endpoint */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Server className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Cổng Kết Nối Bravo API Gateway
            </h2>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500 block mb-1">Địa chỉ Gateway xác thực (Auth URL):</span>
              <code className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-mono block text-xs break-all border border-slate-200 dark:border-slate-800">
                {status?.api_url || 'https://bravo.goldsunpackaging.vn:5051/fa837234b0b27bc02365a940995bdc24'}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemConfigView
