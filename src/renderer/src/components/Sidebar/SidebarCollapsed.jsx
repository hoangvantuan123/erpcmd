import React from 'react'
import { Columns, Inbox, Calendar, LayoutDashboard, UserCheck, Users } from 'lucide-react'

const SidebarCollapsed = ({ activeItem, onSelectItem, onToggleCollapse, isMac }) => {
  return (
    <aside className="w-12 h-full bg-white dark:bg-black flex flex-col items-center select-none shrink-0 relative overflow-x-hidden">
      <div 
        className="h-8 w-full flex items-center justify-center border-b border-slate-200 dark:border-slate-800 shrink-0 app-region-drag"
        style={{ WebkitAppRegion: 'drag' }}
      >
        {!isMac && (
          <button 
            onClick={onToggleCollapse}
            className="p-1.5 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 app-region-no-drag cursor-pointer"
            title="Mở rộng Sidebar"
          >
            <Columns className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 w-full border-r border-slate-200 dark:border-slate-800 p-2 space-y-2 flex flex-col items-center pt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <button 
          onClick={() => onSelectItem('inbox')} 
          className={`p-2 rounded-md transition-all ${
            activeItem === 'inbox' 
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold' 
              : 'text-indigo-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`} 
          title="Inbox"
        >
          <Inbox className="w-4 h-4 text-indigo-500" />
        </button>

        <button 
          onClick={() => onSelectItem('calendar')} 
          className={`p-2 rounded-md transition-all ${
            activeItem === 'calendar' 
              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold' 
              : 'text-sky-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`} 
          title="Calendar"
        >
          <Calendar className="w-4 h-4 text-sky-500" />
        </button>

        <button 
          onClick={() => onSelectItem('dashboards')} 
          className={`p-2 rounded-md transition-all ${
            activeItem?.includes('analytics') || activeItem?.includes('dashboard') 
              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-semibold' 
              : 'text-purple-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`} 
          title="Dashboards"
        >
          <LayoutDashboard className="w-4 h-4 text-purple-500" />
        </button>

        <button 
          onClick={() => onSelectItem('assigned-to-me')} 
          className={`p-2 rounded-md transition-all ${
            activeItem === 'assigned-to-me' 
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' 
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`} 
          title="Assigned to me"
        >
          <UserCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>

        <button 
          onClick={() => onSelectItem('16-pic')} 
          className={`p-2 rounded-md transition-all ${
            activeItem === '16-pic' 
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' 
              : 'text-blue-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`} 
          title="16 PIC"
        >
          <Users className="w-4 h-4 text-blue-600" />
        </button>
      </div>
    </aside>
  )
}

export default SidebarCollapsed
