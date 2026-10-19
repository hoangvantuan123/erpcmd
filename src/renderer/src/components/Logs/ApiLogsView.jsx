import React, { useState, useEffect } from 'react'
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'

export const ApiLogsView = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/logs')
      const json = await res.json()
      if (json.success) {
        setLogs(json.data || [])
      } else {
        setError(json.error || 'Không tải được nhật ký API')
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối khi tải logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50/50 dark:bg-black overflow-hidden font-sans">
      {/* Header */}
      <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Nhật Ký Gọi API Gateway
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lịch sử các phiên truy vấn và đồng bộ giữa máy trạm và Bravo ERP Gateway
            </p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Đang tải...' : 'Làm Mới'}</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
            <p className="text-sm">Đang tải nhật ký từ SQLite CSDL...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-sm">Chưa có nhật ký gọi API nào được ghi nhận.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Thời Gian</th>
                  <th className="px-4 py-3">HTTP Status</th>
                  <th className="px-4 py-3">Endpoint API</th>
                  <th className="px-4 py-3">Tóm Tắt Phản Hồi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {logs.map((log) => {
                  const isOk = log.status_code >= 200 && log.status_code < 300
                  const isWarn = log.status_code >= 400 && log.status_code < 500
                  const isErr = log.status_code >= 500 || log.status_code === 0
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-2.5 font-mono text-slate-400">#{log.id}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono whitespace-nowrap">
                        {log.request_time ? new Date(log.request_time).toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono inline-flex items-center gap-1 ${
                          isOk
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                            : isWarn
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300'
                        }`}>
                          {isOk && <CheckCircle2 className="w-3 h-3" />}
                          {isWarn && <AlertTriangle className="w-3 h-3" />}
                          {isErr && <XCircle className="w-3 h-3" />}
                          <span>{log.status_code || 'ERROR'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300 max-w-sm truncate" title={log.endpoint}>
                        {log.endpoint}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-md truncate" title={log.error_msg || log.response_summary}>
                        {log.error_msg ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">{log.error_msg}</span>
                        ) : (
                          log.response_summary || '-'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApiLogsView
