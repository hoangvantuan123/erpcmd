import React from 'react'
import SpaceItem from './SpaceItem'

const SidebarSpaces = ({ 
  spacesList, 
  activeItem, 
  onSelectItem, 
  expandedSpaces, 
  onToggleExpandSpace
}) => {


  return (
    <div className="flex-1 flex flex-col min-h-0 px-2.5 py-1">
      {/* Header: Monitors */}
      <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tracking-normal select-none">
        Monitors
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
            />
          )
        })}

     
      </div>
    </div>
  )
}

export default SidebarSpaces
