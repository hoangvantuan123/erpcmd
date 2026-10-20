import React from 'react'
import { ChevronDown, FolderOpenDot, Lock, Link2 } from 'lucide-react'
import SpaceSubItem from './SpaceSubItem'

const SpaceItem = ({ 
  space, 
  activeItem, 
  onSelectItem, 
  isExpanded, 
  onToggleExpand
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
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer text-zinc-700 dark:text-zinc-300 font-medium transition-all text-xs group ${
          isSpaceActive ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100 shadow-2xs' : ''
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <ChevronDown 
            onClick={(e) => onToggleExpand(space.id, e)}
            className={`w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-transform shrink-0 ${
              isExpanded ? '' : '-rotate-90'
            }`} 
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          />
          <div className="   flex items-center justify-center text-zinc-700 ">
            <FolderOpenDot className="w-4 h-4" />
          </div>
          <span className="truncate font-semibold text-zinc-800 dark:text-zinc-200">
            {space.name}
          </span>
          {getPrivacyBadge()}
        </div>
      </div>

      {isExpanded && space.subItems && space.subItems.length > 0 && (
        <div className="ml-4 border-l border-zinc-200 dark:border-zinc-800 pl-1.5 space-y-0.5 mt-0.5">
          {space.subItems.map((sub) => (
            <SpaceSubItem
              key={sub.id}
              sub={sub}
              activeItem={activeItem}
              onSelectItem={onSelectItem}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default SpaceItem
