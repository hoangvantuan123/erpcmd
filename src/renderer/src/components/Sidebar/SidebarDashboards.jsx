import React, { useState } from 'react'
import { ChevronDown, LayoutDashboard, User, Building2, Briefcase } from 'lucide-react'

const SidebarDashboards = ({ activeItem, onSelectItem }) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="space-y-0.5">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1 rounded-md text-left cursor-pointer transition-all hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider select-none"
      >
        <div className="flex items-center gap-1.5">
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <LayoutDashboard className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>DASHBOARDS / PHÂN TÍCH</span>
        </div>
      </div>

      {isOpen && (
        <div className="ml-3 border-l border-slate-200 dark:border-slate-800 pl-2 space-y-0.5 mt-0.5">
          <button
            onClick={() => onSelectItem('analytics-personal')}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-all ${
              activeItem === 'analytics-personal' 
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300 font-semibold' 
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Phân tích Cá nhân</span>
            </div>
            <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-900/60 px-1 rounded">
              Cá nhân
            </span>
          </button>

          <button
            onClick={() => onSelectItem('analytics-team')}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-all ${
              activeItem === 'analytics-team' 
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-semibold' 
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Phân tích Tập thể</span>
            </div>
            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-1 rounded">
              Tập thể
            </span>
          </button>

          <button
            onClick={() => onSelectItem('analytics-executive')}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-all ${
              activeItem === 'analytics-executive' 
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold' 
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Báo cáo Sếp lớn (BOD)</span>
            </div>
            <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1 rounded">
              VIP
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

export default SidebarDashboards
