import React from 'react'
import { ChevronDown, Users, Plus, Lock, Link2, MoreHorizontal } from 'lucide-react'
import SpaceSubItem from './SpaceSubItem'

const SpaceItem = ({ 
  space, 
  activeItem, 
  onSelectItem, 
  isExpanded, 
  onToggleExpand,
  onOpenContextMenu 
}) => {
  const isSpaceActive = activeItem === space.id

  // Determine privacy badge icon & title
  const getPrivacyBadge = () => {
    switch (space.privacy) {
      case 'private':
        return <Lock className="w-3 h-3 text-amber-500 shrink-0" title="Private space (Invited members only)" />
      case 'shared':
        return <Link2 className="w-3 h-3 text-cyan-500 shrink-0" title="Shared via link" />
      case 'workspace':
      default:
        return null
    }
  }

  return (
    <div className="space-y-0.5">
      <div 
        onClick={() => onSelectItem(space.id)}
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800/60 cursor-pointer text-slate-800 dark:text-slate-200 font-medium transition-all group ${
          isSpaceActive ? 'bg-slate-200/90 dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100' : ''
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <ChevronDown 
            onClick={(e) => onToggleExpand(space.id, e)}
            className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-transform shrink-0 ${
              isExpanded ? '' : '-rotate-90'
            }`} 
          />
          <div className={`w-3.5 h-3.5 rounded ${space.iconColor || 'bg-indigo-600'} flex items-center justify-center text-white shrink-0 shadow-xs text-[9px] font-bold`}>
            <Users className="w-2.5 h-2.5" />
          </div>
          <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
            {space.name}
          </span>
          {getPrivacyBadge()}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button 
            className="p-0.5 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 rounded text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" 
            onClick={(e) => { 
              e.stopPropagation()
              onSelectItem(`${space.id}-add`)
            }}
            title="Thêm mục con"
          >
            <Plus className="w-3 h-3" />
          </button>
          
          <button 
            className="p-0.5 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 rounded text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" 
            onClick={(e) => { 
              e.stopPropagation()
              onOpenContextMenu?.(e, space)
            }}
            title="Tùy chọn khác (...)"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isExpanded && space.subItems && space.subItems.length > 0 && (
        <div className="ml-5 border-l border-slate-200 dark:border-slate-800 pl-2 space-y-0.5 mt-0.5">
          {space.subItems.map((sub) => (
            <SpaceSubItem
              key={sub.id}
              sub={sub}
              activeItem={activeItem}
              onSelectItem={onSelectItem}
              onOpenContextMenu={onOpenContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default SpaceItem
