import React from 'react'
import { Minus, Square, Settings, X } from 'lucide-react'

const requestWindowAction = (action) => {
  fetch(`/api/window/${action}`, { method: 'POST' }).catch(() => {})
}

const WindowHeader = ({ title = 'ERPSYS', onOpenSettings }) => (
  <header
    className="flex h-8 shrink-0 select-none items-center border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-slate-700 dark:text-neutral-300 text-xs font-sans"
    onMouseDown={(event) => {
      if (event.button === 0 && !event.target.closest('button')) requestWindowAction('drag')
    }}
  >
    <div className="flex min-w-0 flex-1 items-center px-3">
      {title && (
        <span className="truncate text-[11px] font-semibold tracking-wider uppercase text-slate-700 dark:text-neutral-300">
          {title}
        </span>
      )}
    </div>

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
      onClick={() => requestWindowAction('minimize')}
      className="flex h-8 w-9 items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white transition rounded-none cursor-pointer"
    >
      <Minus size={13} />
    </button>

    <button
      type="button"
      aria-label="Phóng to / Khôi phục"
      title="Phóng to / Khôi phục"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={() => requestWindowAction('maximize')}
      className="flex h-8 w-9 items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white transition rounded-none cursor-pointer"
    >
      <Square size={11} />
    </button>

    <button
      type="button"
      aria-label="Đóng ERPSYS"
      title="Đóng"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={() => requestWindowAction('close')}
      className="flex h-8 w-10 items-center justify-center text-slate-500 hover:bg-rose-600 hover:text-white transition rounded-none cursor-pointer"
    >
      <X size={14} />
    </button>
  </header>
)

export default WindowHeader
