import React, { useState, useEffect } from 'react'
import { ArrowRight, Clock, AlertCircle } from 'lucide-react'

export const HomeView = ({ onSelectItem }) => {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => { if (d.success) setStatus(d) })
      .catch(() => {})
  }, [])

  // 36 bars simulating regional/interval ping responses like OpenStatus screenshot
  const bars = [
    { h: 88, status: 'ok' }, { h: 92, status: 'ok' }, { h: 90, status: 'ok' }, { h: 95, status: 'ok' },
    { h: 86, status: 'ok' }, { h: 92, status: 'ok' }, { h: 89, status: 'ok' }, { h: 94, status: 'ok' },
    { h: 91, status: 'ok' }, { h: 87, status: 'ok' }, { h: 93, status: 'ok' }, { h: 90, status: 'ok' },
    { h: 92, status: 'ok' }, { h: 89, status: 'ok' }, { h: 94, status: 'ok' }, { h: 91, status: 'ok' },
    { h: 93, status: 'ok' }, { h: 88, status: 'ok' }, { h: 95, status: 'ok' }, { h: 90, status: 'ok' },
    { h: 92, status: 'degraded' }, { h: 94, status: 'ok' }, { h: 89, status: 'ok' }, { h: 91, status: 'ok' },
    { h: 88, status: 'ok' }, { h: 93, status: 'ok' }, { h: 90, status: 'ok' }, { h: 95, status: 'ok' },
    { h: 89, status: 'error' }, { h: 92, status: 'ok' }, { h: 91, status: 'ok' }, { h: 94, status: 'ok' },
    { h: 90, status: 'ok' }, { h: 93, status: 'ok' }, { h: 88, status: 'ok' }, { h: 95, status: 'ok' }
  ]

  const isTokenValid = status?.is_token_valid ?? true
  const tokenExpiresMins = status?.expires_in ? Math.round(status.expires_in / 60) : 120

  return (
    <div className="w-full h-full overflow-y-auto bg-white dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 custom-scrollbar select-none">
      <div className="max-w-6xl mx-auto border-x border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 min-h-full">
        
        {/* 1. Page Title Header Block (OpenStatus style) */}
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  ERPSYN Gateway API
                </h1>
              </div>
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center gap-2">
                <span>http://127.0.0.1:5184/api</span>
                <span>·</span>
                <span className="text-zinc-400 dark:text-zinc-500">
                  {status ? `User: ${status.username || 'Admin'} | Chi nhánh: ${status.branch_code || '00'}` : 'Bravo ERP Explorer Direct'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
                FY {status?.fiscal_year || '2026'}
              </span>
              <span className="font-mono text-xs px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {isTokenValid ? `Token ${tokenExpiresMins}m` : 'Session OK'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Connected Bento Metric Grid - Row 1 (Uptime & Fails) */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          {/* Uptime Box */}
          <div className="p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Uptime / Sẵn sàng</span>
              {/* Corner bracketed stopwatch icon matching OpenStatus */}
              <div className="w-7 h-7 border border-dashed border-zinc-300 dark:border-zinc-700 rounded flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-4 text-3xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              99.99%
            </div>
          </div>

          {/* Fails Box */}
          <div className="p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Fails / Lỗi phát sinh</span>
              {/* Pink bracketed warning icon matching OpenStatus */}
              <div className="w-7 h-7 border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 rounded flex items-center justify-center text-rose-500">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-4 text-3xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              0
            </div>
          </div>
        </div>

        {/* 3. Connected Bento Metric Grid - Row 2 (P50, P75, P90 Latency) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          {/* P50 */}
          <div className="p-6">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>P50</span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-200">
                ▲ 100%
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              150<span className="text-sm font-normal text-zinc-500 ml-0.5">ms</span>
            </div>
          </div>

          {/* P75 */}
          <div className="p-6">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>P75</span>
              <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                0%
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              274<span className="text-sm font-normal text-zinc-500 ml-0.5">ms</span>
            </div>
          </div>

          {/* P90 */}
          <div className="p-6">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>P90</span>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              397<span className="text-sm font-normal text-zinc-500 ml-0.5">ms</span>
            </div>
          </div>
        </div>

        {/* 4. Uptime across all the regions Bar Chart (Exact match to OpenStatus) */}
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Uptime
              </h2>
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Uptime across all the regions &amp; gateway endpoints
              </p>
            </div>

            {/* Legend badges */}
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white dark:bg-black rounded-xs" />
                Ok
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-xs" />
                Error
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-xs" />
                Degraded
              </span>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="relative pt-4">
            <div className="flex items-end justify-between h-32 gap-1 px-1">
              {bars.map((bar, idx) => {
                let barColor = 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-700'
                if (bar.status === 'degraded') barColor = 'bg-amber-400 dark:bg-amber-400'
                if (bar.status === 'error') barColor = 'bg-rose-500 dark:bg-rose-500'

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                  >
                    <div
                      style={{ height: `${bar.h}%` }}
                      className={`w-full max-w-[14px] ${barColor} rounded-none transition-all`}
                    />
                    {/* Micro tooltip */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[9px] bg-zinc-900 text-white px-1.5 py-0.5 pointer-events-none z-10 whitespace-nowrap">
                      {bar.h * 2}ms
                    </div>
                  </div>
                )
              })}

              {/* Y-axis indicator */}
              <div className="flex flex-col justify-between h-full pl-3 text-right font-mono text-[10px] text-zinc-400 select-none shrink-0">
                <span>186</span>
                <span>100</span>
                <span>0</span>
              </div>
            </div>

            {/* X-axis Timestamps */}
            <div className="flex items-center justify-between pt-3 text-[10px] font-mono text-zinc-400 select-none">
              <span>8/7, 4:58 PM</span>
              <span>8/7, 10:38 PM</span>
              <span>8/9, 4:58 PM</span>
              <span>8/10, 3:22 PM</span>
            </div>
          </div>
        </div>

        {/* 5. Connected Navigation Cards (Quyết toán công đoạn, thao tác, nhật ký) */}
        <div>
          <div className="px-8 py-3 bg-zinc-50/60 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Workspaces &amp; Hành động quyết toán
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
            {/* Card 1: Quyết toán lệnh công đoạn */}
            <div
              onClick={() => onSelectItem('settle-process')}
              className="p-6 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    vB30WorkOrders
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">Active</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Quyết toán lệnh công đoạn
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Xem bảng dữ liệu lệnh sản xuất thực tế từ Bravo ERP, theo dõi tiến độ và thực hiện quyết toán.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                <span>Mở bảng công đoạn</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Quyết toán lệnh thao tác */}
            <div
              onClick={() => onSelectItem('settle-step')}
              className="p-6 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    vB30WorkStep
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">Active</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Quyết toán lệnh thao tác
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Tra cứu Master Thao tác theo số lệnh công đoạn, kiểm tra phân bổ theo ca và bộ phận thực hiện.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                <span>Tra cứu thao tác</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Nhật ký quyết toán */}
            <div
              onClick={() => onSelectItem('settle-logs')}
              className="p-6 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    Gateway Stream
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">Live</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Nhật ký quyết toán &amp; API
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Theo dõi phản hồi Gateway thời gian thực, độ trễ từng yêu cầu và lịch sử ghi SQLite nội bộ.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                <span>Xem nhật ký API</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default HomeView
