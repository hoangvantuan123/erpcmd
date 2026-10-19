import React, { useState, useEffect } from 'react'
import { Bell, CheckCircle2, Clock, Info } from 'lucide-react'

export const NotificationsView = () => {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    fetch('/api/logs')
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.data)) setLogs(d.data.slice(0, 15)) })
      .catch(() => {})
  }, [])

  return (
    <div className="w-full h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-4 font-sans select-none custom-scrollbar">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-neutral-800">
        <Bell className="w-4 h-4 text-slate-700 dark:text-neutral-300" />
        <h1 className="text-base font-bold text-slate-900 dark:text-white">
          Thông Báo Hệ Thống & Tiến Độ Quyết Toán
        </h1>
      </div>

      <div className="space-y-2">
        <div className="p-3 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-slate-800 dark:text-neutral-200">
              Kết nối Bravo ERP Gateway thành công
            </p>
            <p className="text-slate-500 dark:text-neutral-400">
              Hệ thống đã sẵn sàng thực hiện các thao tác quyết toán lệnh công đoạn và thao tác.
            </p>
          </div>
        </div>

        {logs.map((log) => (
          <div key={log.id} className="p-3 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 flex items-start justify-between text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                  {log.endpoint}
                </span>
                <p className="text-slate-500 dark:text-neutral-400 mt-0.5">
                  {log.response_summary || 'Thực thi API'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0 text-[11px] font-mono">
              <Clock size={11} />
              <span>{log.request_time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NotificationsView
