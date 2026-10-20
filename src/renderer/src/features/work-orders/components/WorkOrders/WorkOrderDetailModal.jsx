import React, { useState, useEffect } from 'react'
import { X, RefreshCw, CheckCircle2, AlertCircle, Calculator, Calendar, Factory, User, Layers } from 'lucide-react'

export const WorkOrderDetailModal = ({ order, onClose }) => {
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [settleRow, setSettleRow] = useState(null)
  const [settleForm, setSettleForm] = useState({
    quantity_adj: 0,
    quantity_after_adj: 0,
    quantity_produce: 0,
    quantity_pass: 0,
    is_settle_closed: 1,
    note: 'Quyết toán qua ERPSYS'
  })
  const [settleSubmitting, setSettleSubmitting] = useState(false)
  const [settleMessage, setSettleMessage] = useState(null)

  const fetchDetails = async () => {
    if (!order?.stt) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/work-orders/details?stt=${encodeURIComponent(order.stt)}`)
      const json = await res.json()
      if (json.success) {
        setDetails(json.data || [])
      } else {
        setError(json.error || 'Không tải được chi tiết công đoạn')
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối khi tải chi tiết')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [order?.stt])

  const openSettleDialog = (row) => {
    setSettleRow(row)
    setSettleForm({
      quantity_adj: row.quantity_adj || 0,
      quantity_after_adj: row.quantity_after_adj || 0,
      quantity_produce: row.quantity_produce || 0,
      quantity_pass: row.quantity_pass || 0,
      is_settle_closed: 1,
      note: 'Quyết toán công đoạn ' + (order.doc_no || '')
    })
    setSettleMessage(null)
  }

  const handleSettleSubmit = async (e) => {
    e.preventDefault()
    if (!settleRow) return
    setSettleSubmitting(true)
    setSettleMessage(null)
    try {
      const res = await fetch('/api/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_stt: order.stt,
          master_doc_no: order.doc_no,
          row_id_cd: settleRow.row_id,
          pkv_id: Number(settleRow.id || 0),
          quantity_adj: Number(settleForm.quantity_adj || 0),
          quantity_after_adj: Number(settleForm.quantity_after_adj || 0),
          quantity_produce: Number(settleForm.quantity_produce || 0),
          quantity_pass: Number(settleForm.quantity_pass || 0),
          is_settle_closed: Number(settleForm.is_settle_closed || 1),
          note: settleForm.note
        })
      })
      const json = await res.json()
      if (json.success) {
        setSettleMessage({ type: 'success', text: 'Quyết toán công đoạn thành công!' })
        setTimeout(() => {
          setSettleRow(null)
          fetchDetails()
        }, 800)
      } else {
        setSettleMessage({ type: 'error', text: json.error || 'Quyết toán thất bại' })
      }
    } catch (err) {
      setSettleMessage({ type: 'error', text: err.message || 'Lỗi gửi yêu cầu quyết toán' })
    } finally {
      setSettleSubmitting(false)
    }
  }

  if (!order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 select-none font-sans text-xs">
      <div className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden rounded-none shadow-md">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-950 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Lệnh: {order.doc_no}
            </h2>
            <span className="text-[11px] px-1.5 py-0.5 bg-slate-200 dark:bg-neutral-800 font-mono text-slate-700 dark:text-neutral-300">
              PKV: {order.stt}
            </span>
            <span className="text-[11px] px-2 py-0.5 font-medium border border-slate-300 dark:border-neutral-700">
              {order.status_text || 'Chờ thực hiện'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchDetails}
              disabled={loading}
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200 hover:bg-slate-200 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Tải lại chi tiết"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-rose-600 transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Master Info Strip */}
        <div className="px-4 py-1.5 bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 grid grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-neutral-400 shrink-0">
          <div>Ngày: <strong className="text-slate-800 dark:text-neutral-200">{order.doc_date || '-'}</strong></div>
          <div className="truncate">Nhà máy: <strong className="text-slate-800 dark:text-neutral-200">{order.factory_name || '-'}</strong></div>
          <div className="truncate">Người lập: <strong className="text-slate-800 dark:text-neutral-200">{order.created_by_name || '-'}</strong></div>
          <div>Số lượng: <strong className="text-slate-800 dark:text-neutral-200 font-mono">{(order.quantity || 0).toLocaleString()}</strong></div>
        </div>

        {/* Detail Content Table */}
        <div className="flex-1 overflow-auto p-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw size={18} className="animate-spin text-slate-600" />
              <span>Đang tải chi tiết công đoạn...</span>
            </div>
          ) : error ? (
            <div className="p-2.5 border border-rose-300 bg-rose-50 text-rose-700 text-xs">
              {error}
            </div>
          ) : details.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              Lệnh này chưa có dòng chi tiết công đoạn nào trên ERP.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-neutral-800 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-neutral-950 text-slate-700 dark:text-neutral-300 font-semibold border-b border-slate-200 dark:border-neutral-800 text-[11px]">
                  <tr>
                    <th className="px-2.5 py-1.5">STT</th>
                    <th className="px-2.5 py-1.5">Mã Chi Tiết</th>
                    <th className="px-2.5 py-1.5">Tên Sản Phẩm / BTP</th>
                    <th className="px-2.5 py-1.5">ĐVT</th>
                    <th className="px-2.5 py-1.5 text-right">SL Kế Hoạch</th>
                    <th className="px-2.5 py-1.5 text-right">SL Đạt</th>
                    <th className="px-2.5 py-1.5 text-right">SL Điều Chỉnh</th>
                    <th className="px-2.5 py-1.5 text-right">SL Sản Xuất</th>
                    <th className="px-2.5 py-1.5 text-center">Trạng Thái</th>
                    <th className="px-2.5 py-1.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                  {details.map((d, idx) => (
                    <tr key={d.id || idx} className="hover:bg-slate-50 dark:hover:bg-neutral-800/60 transition">
                      <td className="px-2.5 py-1.5 text-slate-400 font-mono">#{idx + 1}</td>
                      <td className="px-2.5 py-1.5 font-mono font-semibold text-slate-900 dark:text-neutral-200">
                        {d.doc_no_detail || d.item_code || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-800 dark:text-neutral-300 max-w-xs truncate" title={d.item_name}>
                        {d.item_name || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-500">{d.unit || 'Cái'}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{(d.quantity_so || 0).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono text-emerald-600 font-semibold">{(d.quantity_pass || 0).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono text-amber-600">{(d.quantity_adj || 0).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-bold text-slate-900 dark:text-white">{(d.quantity_produce || 0).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 text-center">
                        <span className="text-[10px] px-1.5 py-0.5 border border-slate-300 dark:border-neutral-700">
                          {d.closed === 1 ? 'Đã đóng QT' : 'Đang mở'}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-center">
                        <button
                          onClick={() => openSettleDialog(d)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-white transition rounded-none cursor-pointer"
                        >
                          Quyết toán
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Quyết toán dòng chi tiết */}
        {settleRow && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 w-full max-w-md p-4 rounded-none shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-neutral-800">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-slate-900 dark:text-white">
                  <Calculator size={13} />
                  <span>Quyết Toán Công Đoạn</span>
                </div>
                <button onClick={() => setSettleRow(null)} className="text-slate-400 hover:text-slate-700">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSettleSubmit} className="mt-3 space-y-2.5">
                <div className="text-[11px] bg-slate-50 dark:bg-neutral-950 p-2 border border-slate-200 dark:border-neutral-800 space-y-0.5">
                  <div>Mã: <strong className="text-slate-800 dark:text-neutral-200">{settleRow.doc_no_detail || settleRow.item_code}</strong></div>
                  <div className="truncate">Tên: <strong className="text-slate-800 dark:text-neutral-200">{settleRow.item_name}</strong></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">SL Điều Chỉnh</label>
                    <input
                      type="number"
                      step="any"
                      value={settleForm.quantity_adj}
                      onChange={(e) => setSettleForm(prev => ({ ...prev, quantity_adj: e.target.value }))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-neutral-700 font-mono rounded-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">SL Sau ĐC</label>
                    <input
                      type="number"
                      step="any"
                      value={settleForm.quantity_after_adj}
                      onChange={(e) => setSettleForm(prev => ({ ...prev, quantity_after_adj: e.target.value }))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-neutral-700 font-mono rounded-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">SL Đạt (Pass)</label>
                    <input
                      type="number"
                      step="any"
                      value={settleForm.quantity_pass}
                      onChange={(e) => setSettleForm(prev => ({ ...prev, quantity_pass: e.target.value }))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-neutral-700 font-mono rounded-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">SL Sản Xuất</label>
                    <input
                      type="number"
                      step="any"
                      value={settleForm.quantity_produce}
                      onChange={(e) => setSettleForm(prev => ({ ...prev, quantity_produce: e.target.value }))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-neutral-700 font-mono rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Trạng Thái Đóng</label>
                  <select
                    value={settleForm.is_settle_closed}
                    onChange={(e) => setSettleForm(prev => ({ ...prev, is_settle_closed: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-none"
                  >
                    <option value="1">Đóng quyết toán (Closed = 1)</option>
                    <option value="0">Giữ mở (Closed = 0)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Ghi Chú</label>
                  <input
                    type="text"
                    value={settleForm.note}
                    onChange={(e) => setSettleForm(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-neutral-700 rounded-none"
                  />
                </div>

                {settleMessage && (
                  <div className={`p-2 text-xs border ${
                    settleMessage.type === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}>
                    {settleMessage.text}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSettleRow(null)}
                    disabled={settleSubmitting}
                    className="px-3 py-1 text-xs border border-slate-300 rounded-none"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={settleSubmitting}
                    className="px-4 py-1 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-none cursor-pointer"
                  >
                    {settleSubmitting ? 'Đang gửi...' : 'Lưu Quyết Toán'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkOrderDetailModal