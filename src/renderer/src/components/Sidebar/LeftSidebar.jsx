import React, { useState } from 'react'
import { initialSpaces } from '../../data/spacesData'
import SidebarCollapsed from './SidebarCollapsed'
import SidebarHeader from './SidebarHeader'
import SidebarQuickAccess from './SidebarQuickAccess'
import SidebarSpaces from './SidebarSpaces'

const LeftSidebar = ({ activeItem, onSelectItem, isCollapsed, onToggleCollapse }) => {
  const [sidebarWidth, setSidebarWidth] = useState(270)
  const [isResizing, setIsResizing] = useState(false)
  const [spacesList] = useState(initialSpaces)

  // Track expanded spaces state by Space ID
  const [expandedSpaces, setExpandedSpaces] = useState({
    'quyet-toan-lenh': true
  })

  const toggleSpaceExpand = (spaceId, e) => {
    e?.stopPropagation()
    setExpandedSpaces(prev => ({
      ...prev,
      [spaceId]: !prev[spaceId]
    }))
  }

  // Mouse Drag Handler for Resizing Sidebar Width (Min 180px, Max 450px)
  const startResizing = (mouseDownEvent) => {
    mouseDownEvent.preventDefault()
    setIsResizing(true)

    const startX = mouseDownEvent.clientX
    const startWidth = sidebarWidth

    const onMouseMove = (mouseMoveEvent) => {
      const newWidth = Math.min(Math.max(startWidth + (mouseMoveEvent.clientX - startX), 180), 450)
      setSidebarWidth(newWidth)
    }

    const onMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const isMac = typeof navigator !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform || '') || /Macintosh|Mac OS X/.test(navigator.userAgent || ''))

  if (isCollapsed) {
    return (
      <SidebarCollapsed 
        activeItem={activeItem}
        onSelectItem={onSelectItem}
        onToggleCollapse={onToggleCollapse}
        isMac={isMac}
      />
    )
  }

  return (
    <aside 
      style={{ width: `${sidebarWidth}px` }}
      className={`h-full bg-zinc-50/50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col text-[13px] text-zinc-700 dark:text-zinc-300 select-none shrink-0 relative ${
        isResizing ? '' : ''
      }`}
    >
      {/* 1. Top Header Bar (Fixed) */}
      <SidebarHeader 
        onToggleCollapse={onToggleCollapse} 
        isMac={isMac} 
      />

      {/* 2. Fixed Top Section: Workspace */}
      <div className="p-2.5 shrink-0">
        <SidebarQuickAccess 
          activeItem={activeItem} 
          onSelectItem={onSelectItem} 
        />
      </div>

      <hr className="border-zinc-200 dark:border-zinc-800 mx-2.5 my-1 shrink-0" />

      {/* 3. Bottom Section: Spaces & Dự án - SCROLLABLE */}
      <SidebarSpaces
        spacesList={spacesList}
        activeItem={activeItem}
        onSelectItem={onSelectItem}
        expandedSpaces={expandedSpaces}
        onToggleExpandSpace={toggleSpaceExpand}
      />

      {/* 4. DRAG RESIZE HANDLE BAR */}
      <div 
        onMouseDown={startResizing}
        onDoubleClick={() => setSidebarWidth(270)}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-600 transition-colors z-30 group"
        title="Kéo rê để thay đổi độ rộng Sidebar (Đúp chuột để khôi phục mặc định)"
      />
    </aside>
  )
}

export default LeftSidebar
