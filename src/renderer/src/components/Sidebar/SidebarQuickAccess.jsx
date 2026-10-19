import React from 'react'
import { Home, Bell } from 'lucide-react'

const SidebarQuickAccess = ({ activeItem, onSelectItem }) => {
  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onSelectItem('home')}
        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-all ${
          activeItem === 'home' 
            ? 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold' 
            : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
        }`}
      >
        <Home className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
        <span>Home</span>
      </button>

      <button
        onClick={() => onSelectItem('notifications')}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all ${
          activeItem === 'notifications' 
            ? 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold' 
            : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
          <span>Thông báo</span>
        </div>
      </button>
    </div>
  )
}

export default SidebarQuickAccess
