import React from 'react'
import { FileText, ListTodo, Eye, MoreHorizontal, FileSpreadsheet, Calculator, Activity } from 'lucide-react'

const SpaceSubItem = ({ sub, activeItem, onSelectItem, onOpenContextMenu }) => {
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
      className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-all cursor-pointer group ${
        isSubActive 
          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-semibold' 
          : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
      }`}
      title={permission ? `Permissions: ${permission.replace('_', ' ')}` : undefined}
    >
      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
        {getSubIcon()}
        <span className="truncate">{sub.name}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {permission === 'view_only' && (
          <Eye className="w-3 h-3 text-slate-400" title="View only access" />
        )}
        {sub.count !== undefined && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-1">
            {sub.count}
          </span>
        )}
        <button
          className="p-0.5 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 rounded text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onOpenContextMenu?.(e, sub)
          }}
          title="Tùy chọn khác"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export default SpaceSubItem
