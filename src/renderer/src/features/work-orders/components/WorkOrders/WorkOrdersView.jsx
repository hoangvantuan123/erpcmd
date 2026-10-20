import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, RefreshCw, Filter, Layers, CheckCircle2, Clock, 
  AlertCircle, ChevronRight, Eye, Calculator, Factory, User, Calendar
} from 'lucide-react'
import WorkOrderDetailModal from './WorkOrderDetailModal'
import { getWorkOrders } from '../../api/workOrdersApi'

export const WorkOrdersView = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [latency, setLatency] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const fetchWorkOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getWorkOrders()
      const json = await res.json()
      if (json.success) {
        setOrders(json.data || [])
        setLatency(json.latency || '')
      } else {
        setError(json.error || 'Không tải được danh sách lệnh sản xuất')
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối khi gọi API Lệnh sản xuất')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  // Filtered orders based on search and status
  const filteredOrders = useMemo(() => {
    return orders.filter(item => {
      const term = searchTerm.toLowerCase().trim()
      const matchesSearch = !term || 
        (item.doc_no && item.doc_no.toLowerCase().includes(term)) ||
        (item.stt && item.stt.toLowerCase().includes(term)) ||
        (item.item_code && item.item_code.toLowerCase().includes(term)) ||
        (item.item_name && item.item_name.toLowerCase().includes(term)) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        (item.created_by_name && item.created_by_name.toLowerCase().includes(term)) ||
        (item.factory_name && item.factory_name.toLowerCase().includes(term))

      let matchesStatus = true
      if (statusFilter === 'RUNNING') {
        matchesStatus = item.doc_status === 1
      } else if (statusFilter === 'COMPLETED') {
        matchesStatus = item.doc_status === 2
      } else if (statusFilter === 'PENDING') {
        matchesStatus = item.doc_status === 0
      }

      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  // Status counts
  const counts = useMemo(() => {
    const total = orders.length
    const running = orders.filter(o => o.doc_status === 1).length
    const completed = orders.filter(o => o.doc_status === 2).length
    const pending = orders.filter(o => o.doc_status === 0).length
    return { total, running, completed, pending }
  }, [orders])

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50/50 dark:bg-black overflow-hidden font-sans">
      {/* Top Banner Toolbar */}
      <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <Layers className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Lệnh Sản Xuất Bravo ERP
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dữ liệu trực tiếp từ Explorer Gateway (vB30WorkProcess_Explorer) · {orders.length} lệnh
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {latency && (
              <span className="text-[11px] px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                Độ trễ: {latency}
              </span>
            )}
            <button
              onClick={fetchWorkOrders}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Đang đồng bộ...' : 'Đồng Bộ ERP'}</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả ({counts.total})
            </button>
            <button
              onClick={() => setStatusFilter('RUNNING')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'RUNNING'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đang sản xuất ({counts.running})
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'COMPLETED'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hoàn thành ({counts.completed})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'PENDING'
                  ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chờ thực hiện ({counts.pending})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo số lệnh, mã hàng, PKV..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-6">
        {loading && orders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm">Đang tải danh sách lệnh từ máy chủ Bravo ERP Gateway...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Lỗi kết nối Bravo ERP</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchWorkOrders}
              className="px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
            >
              Thử lại
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <p className="text-sm">Không tìm thấy Lệnh sản xuất phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Số Lệnh (DocNo)</th>
                  <th className="px-4 py-3">Khóa PKV</th>
                  <th className="px-4 py-3">Ngày Lập</th>
                  <th className="px-4 py-3">Công Đoạn</th>
                  <th className="px-4 py-3">Mã Hàng & Diễn Giải</th>
                  <th className="px-4 py-3 text-right">Số Lượng</th>
                  <th className="px-4 py-3">Nhà Máy</th>
                  <th className="px-4 py-3">Người Lập</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {filteredOrders.map((wo, idx) => (
                  <tr 
                    key={wo.stt || idx} 
                    onClick={() => setSelectedOrder(wo)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      #{idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                      {wo.doc_no}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {wo.stt}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {wo.doc_date || '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                        {wo.process_code || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {wo.item_code && (
                        <span className="font-mono text-slate-500 font-semibold block text-[11px]">
                          {wo.item_code}
                        </span>
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate block" title={wo.description || wo.item_name}>
                        {wo.description || wo.item_name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {(wo.quantity || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-[140px]" title={wo.factory_name}>
                      {wo.factory_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-[120px]" title={wo.created_by_name}>
                      {wo.created_by_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                        wo.doc_status === 2
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                          : wo.doc_status === 1
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {wo.doc_status === 2 && <CheckCircle2 className="w-3 h-3" />}
                        {wo.doc_status === 1 && <Clock className="w-3 h-3" />}
                        <span>{wo.status_text || 'Chờ thực hiện'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedOrder(wo)}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Settle Modal */}
      {selectedOrder && (
        <WorkOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}

export default WorkOrdersView
