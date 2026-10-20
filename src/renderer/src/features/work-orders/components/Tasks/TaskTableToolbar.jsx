import React, { memo } from 'react'
import { Search, RefreshCw, Table as TableIcon } from 'lucide-react'

export const TaskTableToolbar = memo(({ 
  activeTab, 
  setActiveTab, 
  searchTerm, 
  setSearchTerm,
  loading,
  refetch,
  latency 
}) => {
  return (
    <div className="h-8 px-2.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-950 shrink-0 text-xs font-sans">
      {/* Left: View Title & Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">
          <TableIcon size={13} className="text-slate-700 dark:text-neutral-300" />
          <span>Danh Sách Lệnh Công Đoạn</span>
        </div>
        {latency && (
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            ({latency})
          </span>
        )}
      </div>

      {/* Right: Search & Sync Action */}
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <Search size={12} className="text-slate-400 absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm số lệnh, mã hàng..."
            className="pl-6 pr-2 py-0.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-none focus:outline-none focus:border-slate-800 w-44 text-slate-800 dark:text-neutral-200"
          />
        </div>

        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-none bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Đang tải...' : 'Đồng Bộ'}</span>
        </button>
      </div>
    </div>
  )
})

TaskTableToolbar.displayName = 'TaskTableToolbar'
export default TaskTableToolbar
