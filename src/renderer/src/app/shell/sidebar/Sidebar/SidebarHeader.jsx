import React from 'react'
import { Activity, ChevronDown, PanelLeftClose } from 'lucide-react'
import { windowAction } from '@/features/system/api/systemApi'

const requestWindowAction = (action, winId = 'main') => {
  windowAction(action, winId).catch(() => {})
}

const SidebarHeader = ({ onToggleCollapse, isMac, winId = 'main' }) => {
  return (
    <div 
      className={`h-8 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between app-region-drag select-none px-3 bg-zinc-50/50 dark:bg-zinc-950 ${
        isMac ? 'pl-20' : ''
      }`}
      style={{ WebkitAppRegion: 'drag' }}
      onMouseDown={(e) => {
        if (e.button === 0 && !e.target.closest('button')) {
          requestWindowAction('drag', winId)
        }
      }}
    >
      {/* Workspace Switcher / Brand */}
      <div className="flex items-center gap-2 app-region-no-drag">
        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 tracking-tight">
        GoldsunPackaging
        </span>
      </div>

      {/* Collapse Toggle Button */}
      <button 
        onClick={onToggleCollapse}
        className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200/70 dark:hover:bg-zinc-800 rounded-none text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors app-region-no-drag cursor-pointer" 
        title="Thu gọn Sidebar"
      >
        <PanelLeftClose className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default SidebarHeader
