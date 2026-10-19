import React, { useState, useEffect } from 'react'
import { FileSpreadsheet, Calculator, Activity, ArrowRight, CheckCircle2, ShieldCheck, Database } from 'lucide-react'

export const HomeView = ({ onSelectItem }) => {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => { if (d.success) setStatus(d) })
      .catch(() => {})
  }, [])

  return (
    <div className="w-full h-full overflow-y-auto p-6 max-w-5xl mx-auto space-y-6 font-sans text-slate-800 dark:text-neutral-200 custom-scrollbar select-none">
      {/* Banner */}
      <div className="p-6 border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/60 rounded-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm shrink-0">
            ERP
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              ERPSYS — Hệ Thống Điều Hành & Quyết Toán Lệnh
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Kết nối trực tiếp Bravo ERP Gateway · Phiên bản Desktop tích hợp
            </p>
          </div>
        </div>

        {status && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 dark:text-neutral-500 block text-[10px] uppercase font-bold">Người dùng</span>
              <strong className="text-slate-800 dark:text-neutral-200 font-mono">{status.username || 'Admin'}</strong>
            </div>
            <div>
              <span className="text-slate-400 dark:text-neutral-500 block text-[10px] uppercase font-bold">Chi nhánh</span>
              <strong className="text-slate-800 dark:text-neutral-200 font-mono">{status.branch_code || '00'}</strong>
            </div>
            <div>
              <span className="text-slate-400 dark:text-neutral-500 block text-[10px] uppercase font-bold">Năm tài chính</span>
              <strong className="text-slate-800 dark:text-neutral-200 font-mono">{status.fiscal_year || '2026'}</strong>
            </div>
            <div>
              <span className="text-slate-400 dark:text-neutral-500 block text-[10px] uppercase font-bold">Trạng thái Token</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 size={12} />
                {status.is_token_valid ? `Hợp lệ (${Math.round(status.expires_in / 60)} phút)` : 'Hoạt động'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Action Hub */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-3">
          Không Gian Làm Việc Quyết Toán
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Quyết toán lệnh công đoạn */}
          <div
            onClick={() => onSelectItem('settle-process')}
            className="p-4 border border-slate-200 dark:border-neutral-800 bg-white dark:bg-black hover:border-slate-400 dark:hover:border-neutral-600 transition cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <FileSpreadsheet size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Quyết toán lệnh công đoạn
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                Xem bảng dữ liệu Lệnh sản xuất thực tế từ Bravo ERP, theo dõi trạng thái và thực hiện quyết toán công đoạn.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-900 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Mở bảng công đoạn</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Quyết toán lệnh thao tác */}
          <div
            onClick={() => onSelectItem('settle-step')}
            className="p-4 border border-slate-200 dark:border-neutral-800 bg-white dark:bg-black hover:border-slate-400 dark:hover:border-neutral-600 transition cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                <Calculator size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Quyết toán lệnh thao tác
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                Tra cứu Master Thao tác (vB30WorkStep_Explorer) theo số lệnh công đoạn, kiểm tra phân bổ theo ca và bộ phận.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-900 text-xs font-semibold text-purple-600 dark:text-purple-400">
              <span>Tra cứu thao tác</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Nhật ký quyết toán */}
          <div
            onClick={() => onSelectItem('settle-logs')}
            className="p-4 border border-slate-200 dark:border-neutral-800 bg-white dark:bg-black hover:border-slate-400 dark:hover:border-neutral-600 transition cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold">
                <Activity size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                Nhật ký quyết toán
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                Theo dõi tiến độ API Gateway thời gian thực, nhật ký phản hồi và lịch sử thực thi của toàn bộ quy trình.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-900 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              <span>Xem nhật ký API</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomeView
