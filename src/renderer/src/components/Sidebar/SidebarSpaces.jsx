import React from 'react'
import { Plus, Share2, Activity } from 'lucide-react'
import SpaceItem from './SpaceItem'

const SidebarSpaces = ({ 
  spacesList, 
  activeItem, 
  onSelectItem, 
  expandedSpaces, 
  onToggleExpandSpace,
  onOpenCreateSpaceModal,
  onOpenContextMenu
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 p-2.5 pt-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mb-1">
        <span>Spaces & Dự án</span>
        <button 
          onClick={onOpenCreateSpaceModal}
          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 transition-colors" 
          title="Thêm Space mới (+)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Spaces List - Independent Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
        {spacesList.map((space) => {
          const isExpanded = !!expandedSpaces[space.id]
          return (
            <SpaceItem
              key={space.id}
              space={space}
              activeItem={activeItem}
              onSelectItem={onSelectItem}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpandSpace}
              onOpenContextMenu={onOpenContextMenu}
            />
          )
        })}
      </div>
    </div>
  )
}

export default SidebarSpaces
