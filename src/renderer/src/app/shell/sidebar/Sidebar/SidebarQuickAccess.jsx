import React from 'react'
import { LayoutDashboard, Terminal, Bell } from 'lucide-react'

const SidebarQuickAccess = ({ activeItem, onSelectItem }) => {
  const items = [
    { id: 'home', label: 'Overview', icon: LayoutDashboard },
    { id: 'settle-logs', label: 'Nhật ký', icon: Terminal },
    { id: 'notifications', label: 'Thông báo', icon: Bell }
  ]

  return (
    <div className="space-y-1">
      {/* Section Header: Workspace */}
      <div className="px-2 pt-1 pb-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tracking-normal select-none">
        Workspace
      </div>

      <div className="space-y-0.5">
        {items.map((it) => {
          const Icon = it.icon
          const isActive = activeItem === it.id
          return (
            <button
              key={it.id}
              onClick={() => onSelectItem(it.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-all text-xs cursor-pointer ${
                isActive 
                  ? 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs' 
                  : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 font-medium'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span className="truncate">{it.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default SidebarQuickAccess
