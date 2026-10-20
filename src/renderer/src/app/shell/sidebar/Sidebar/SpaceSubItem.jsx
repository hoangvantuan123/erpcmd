import React from 'react'
import { FileText, ListTodo, Eye, FileSpreadsheet, Calculator, Activity } from 'lucide-react'

const SpaceSubItem = ({ sub, activeItem, onSelectItem }) => {
  const isSubActive = activeItem === sub.id
  const permission = sub.accessControl?.defaultPermission

  const getSubIcon = () => {
    if (sub.id === 'settle-process') {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    }
    if (sub.id === 'settle-step') {
      return <Calculator className="w-3.5 h-3.5 text-purple-500 shrink-0" />
    }
    if (sub.id === 'settle-logs') {
      return <Activity className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
    }
    if (sub.type === 'doc') {
      return <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
    }
    return <ListTodo className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
  }

  return (
    <div
      onClick={() => onSelectItem(sub.id)}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all cursor-pointer text-xs group ${
        isSubActive 
          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs' 
          : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 font-medium'
      }`}
      title={permission ? `Permissions: ${permission.replace('_', ' ')}` : undefined}
    >
      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
        <span className="truncate">{sub.name}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        
        {sub.count !== undefined && (
          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-medium px-1">
            {sub.count}
          </span>
        )}
      </div>
    </div>
  )
}

export default SpaceSubItem
