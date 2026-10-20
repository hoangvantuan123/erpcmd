import React, { memo } from 'react'
import {
  Search,
  Play,

} from 'lucide-react'

export const SettleActionBar = memo(({
  totalCount = 0,
  selectedCount = 0,
  latency = '',
  loading = false,
  refetch,
  onQueryClick,
  onExportExcel,
  onCopy,
  onPaste,
  onSettleSelected,
  onViewDetail,
  onAutoFitColumns,
  onResetColumns,
  feedbackMsg = null
}) => {
  return (
    <div className="h-8 px-3 flex items-center justify-between bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 shrink-0 text-xs font-sans select-none">
      {/* Left: Action Bar Buttons matching user screenshot */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {/* 1. TRUY VẤN (Active pill tab button) */}

        <button
          nClick={onQueryClick || refetch}
          className="h-7 px-2 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800  flex items-center gap-1 transition-all cursor-pointer shrink-0"
          title="Truy vấn"
        >
          <Search size={12} className="text-slate-500" />
          <span>Truy vấn</span>
        </button>
        <button
          onClick={onSettleSelected}
          className="h-7 px-2 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800  flex items-center gap-1 transition-all cursor-pointer shrink-0"
          title="Qyết toán lệnh"
        >
          <Play size={12} className="text-slate-500" />
          <span>Quyết toán lệnh</span>
        </button>







      </div>


    </div>
  )
})

SettleActionBar.displayName = 'SettleActionBar'
export default SettleActionBar
