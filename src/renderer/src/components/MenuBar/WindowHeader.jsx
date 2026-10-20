import React from 'react'
import { Minus, Square, Settings, X } from 'lucide-react'

const requestWindowAction = (action, winId = 'main') => {
  fetch(`/api/window/${action}?win_id=${encodeURIComponent(winId)}`, { method: 'POST' }).catch(() => {})
}

const WindowHeader = ({ title = 'ERPSYS', onOpenSettings, winId = 'main' }) => (
  <header
    className="flex h-8 shrink-0 select-none items-center justify-between border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-slate-700 dark:text-neutral-300 text-xs font-sans pl-3 pr-0"
    onMouseDown={(event) => {
      if (event.button === 0 && !event.target.closest('button')) requestWindowAction('drag', winId)
    }}
    onDoubleClick={(event) => {
      if (!event.target.closest('button')) requestWindowAction('maximize', winId)
    }}
  >
    <div className="flex min-w-0 flex-1 items-center">
      {title && (
        <span className="truncate text-[11px] font-semibold tracking-wider uppercase text-slate-700 dark:text-neutral-300">
          {title}
        </span>
      )}
    </div>

    <div className="flex items-stretch h-full space-x-0">
      {onOpenSettings && (
        <button
          type="button"
          aria-label="Cài đặt kết nối"
          title="Cài đặt kết nối hệ thống"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={onOpenSettings}
          className="flex h-8 w-9 items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white transition rounded-none cursor-pointer"
        >
          <Settings size={13} />
        </button>
      )}

      <button
        type="button"
        aria-label="Thu nhỏ cửa sổ"
        title="Thu nhỏ"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => requestWindowAction('minimize', winId)}
        className="flex h-8 w-11 items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white transition rounded-none cursor-pointer"
      >
        <Minus size={13} />
      </button>

      <button
        type="button"
        aria-label="Phóng to / Khôi phục"
        title="Phóng to / Khôi phục"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => requestWindowAction('maximize', winId)}
        className="flex h-8 w-11 items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white transition rounded-none cursor-pointer"
      >
        <Square size={11} />
      </button>

      <button
        type="button"
        aria-label="Đóng ERPSYS"
        title="Đóng"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => requestWindowAction('close', winId)}
        className="flex h-8 w-12 items-center justify-center text-slate-500 hover:bg-rose-600 hover:text-white transition rounded-none cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  </header>
)

export default WindowHeader
