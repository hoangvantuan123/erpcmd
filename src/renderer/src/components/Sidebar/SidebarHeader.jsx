import React from 'react'
import { Columns } from 'lucide-react'

const requestWindowAction = (action) => {
  fetch(`/api/window/${action}`, { method: 'POST' }).catch(() => {})
}

const SidebarHeader = ({ onToggleCollapse, isMac }) => {
  return (
    <div 
      className={`h-8 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between app-region-drag select-none ${
        isMac ? 'pl-20 pr-3' : 'px-3'
      }`}
      style={{ WebkitAppRegion: 'drag' }}
      onMouseDown={(e) => {
        if (e.button === 0 && !e.target.closest('button')) {
          requestWindowAction('drag')
        }
      }}
    >
      <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 app-region-no-drag">
        <button 
          onClick={onToggleCollapse}
          className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-md transition-colors app-region-no-drag cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" 
          title="Thu gọn Sidebar"
        >
          <Columns className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default SidebarHeader
