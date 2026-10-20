import React, { useState } from 'react'
import { Calculator, Search, RefreshCw, CheckCircle2, AlertCircle, Layers, Calendar, Factory, User } from 'lucide-react'
import { findWorkSteps } from '../../api/workStepsApi'

export const SettleView = () => {
  const [docNo, setDocNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [steps, setSteps] = useState([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e) => {
    e?.preventDefault()
    const trimmed = docNo.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      const res = await findWorkSteps(trimmed)
      const json = await res.json()
      if (json.success) {
        setSteps(json.data || [])
      } else {
        setError(json.error || 'Không tìm thấy dữ liệu thao tác của lệnh')
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi tra cứu thao tác')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50/50 dark:bg-black overflow-hidden font-sans">
      {/* Top Banner Toolbar */}
      <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <Calculator className="w-4 h-4" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Quyết Toán Công Đoạn & Thao Tác
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tra cứu Master Lệnh thao tác (vB30WorkStep_Explorer) và kiểm tra tiến độ quyết toán
            </p>
          </div>
        </div>

        {/* Search input form */}
        <form onSubmit={handleSearch} className="mt-4 flex items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={docNo}
              onChange={(e) => setDocNo(e.target.value)}
              placeholder="Nhập số lệnh công đoạn (VD: CDSO-1026-0008(997) hoặc CD05)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !docNo.trim()}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Tra Cứu</span>
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-3" />
            <p className="text-sm">Đang truy vấn danh sách Master Thao tác từ Bravo ERP...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        ) : hasSearched && steps.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-sm">Không tìm thấy Lệnh thao tác nào ứng với số lệnh "{docNo}".</p>
          </div>
        ) : steps.length > 0 ? (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tìm thấy {steps.length} Master Lệnh thao tác liên kết
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((st, i) => (
                <div key={st.id || i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-purple-300 dark:hover:border-purple-800 transition">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
                      {st.doc_no}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      Ca: {st.shift_code || '-'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Mã chứng từ:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{st.doc_code || '-'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Ngày lập:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{st.doc_date || '-'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bộ phận:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{st.dept_name || '-'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Nhà máy:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{st.factory_name || '-'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Danh sách công đoạn:</span>
                      <strong className="font-mono text-indigo-600 dark:text-indigo-400">{st.work_step_id_list || '-'}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400">
            <Calculator className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Quyết toán lệnh thao tác sản xuất
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Nhập mã số lệnh sản xuất hoặc công đoạn ở trên để truy xuất các lệnh thao tác tương ứng từ Bravo ERP.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettleView
