import React from 'react'
import { Columns, LayoutDashboard, Terminal, Bell, FileSpreadsheet, Calculator } from 'lucide-react'

const SidebarCollapsed = ({ activeItem, onSelectItem, onToggleCollapse, isMac }) => {
  return (
    <aside className="w-12 h-full bg-white dark:bg-zinc-950 flex flex-col items-center select-none shrink-0 relative overflow-x-hidden border-r border-zinc-200 dark:border-zinc-800">
      <div 
        className="h-8 w-full flex items-center justify-center border-b border-zinc-200 dark:border-zinc-800 shrink-0 app-region-drag"
        style={{ WebkitAppRegion: 'drag' }}
      >
        {!isMac && (
          <button 
            onClick={onToggleCollapse}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 app-region-no-drag cursor-pointer"
            title="Mở rộng Sidebar"
          >
            <Columns className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 w-full p-2 space-y-1.5 flex flex-col items-center pt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Workspace: Overview, Nhật ký, Thông báo */}
        <button 
          onClick={() => onSelectItem('home')} 
          className={`p-2 rounded-md transition-all cursor-pointer ${
            activeItem === 'home' 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs' 
              : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`} 
          title="Overview"
        >
          <LayoutDashboard className="w-4 h-4" />
        </button>

        <button 
          onClick={() => onSelectItem('settle-logs')} 
          className={`p-2 rounded-md transition-all cursor-pointer ${
            activeItem === 'settle-logs' 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs' 
              : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`} 
          title="Nhật ký"
        >
          <Terminal className="w-4 h-4" />
        </button>

        <button 
          onClick={() => onSelectItem('notifications')} 
          className={`p-2 rounded-md transition-all cursor-pointer ${
            activeItem === 'notifications' 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs' 
              : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`} 
          title="Thông báo"
        >
          <Bell className="w-4 h-4" />
        </button>

        <hr className="w-6 border-zinc-200 dark:border-zinc-800 my-1 shrink-0" />

        {/* Monitors: Lệnh công đoạn, Lệnh thao tác */}
        <button 
          onClick={() => onSelectItem('settle-process')} 
          className={`p-2 rounded-md transition-all cursor-pointer ${
            activeItem === 'settle-process' || activeItem === 'all-tasks'
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs' 
              : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`} 
          title="Quyết toán lệnh công đoạn"
        >
          <FileSpreadsheet className="w-4 h-4" />
        </button>

        <button 
          onClick={() => onSelectItem('settle-step')} 
          className={`p-2 rounded-md transition-all cursor-pointer ${
            activeItem === 'settle-step' 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs' 
              : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`} 
          title="Quyết toán lệnh thao tác"
        >
          <Calculator className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}

export default SidebarCollapsed
