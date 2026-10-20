import React, { useState } from 'react'
import { ChevronDown, UserCheck, Calendar, ListTodo } from 'lucide-react'

const SidebarMyTasks = ({ activeItem, onSelectItem }) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="space-y-0.5">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1 rounded-md text-left cursor-pointer transition-all hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider select-none"
      >
        <div className="flex items-center gap-1.5">
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <UserCheck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
          <span>MY TASKS</span>
        </div>
      </div>

      {isOpen && (
        <div className="ml-3 border-l border-slate-200 dark:border-slate-800 pl-2 space-y-0.5 mt-0.5">
          <button
            onClick={() => onSelectItem('assigned-to-me')}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-all ${
              activeItem === 'assigned-to-me' 
                ? 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold' 
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-bold text-[8px] flex items-center justify-center shrink-0">
              T
            </div>
            <span>Assigned to me</span>
          </button>

          <button
            onClick={() => onSelectItem('today-overdue')}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-all ${
              activeItem === 'today-overdue' 
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold' 
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Today & Overdue</span>
            </div>
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.2 rounded-md">
              1
            </span>
          </button>

          <button
            onClick={() => onSelectItem('personal-list')}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-all ${
              activeItem === 'personal-list' 
                ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-900 dark:text-violet-300 font-semibold' 
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            <span>Personal List</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default SidebarMyTasks
