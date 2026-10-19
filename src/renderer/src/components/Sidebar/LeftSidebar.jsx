import React, { useState } from 'react'
import { initialSpaces } from '../../data/spacesData'
import SidebarCollapsed from './SidebarCollapsed'
import SidebarHeader from './SidebarHeader'
import SidebarQuickAccess from './SidebarQuickAccess'
import SidebarDashboards from './SidebarDashboards'
import SidebarMyTasks from './SidebarMyTasks'
import SidebarSpaces from './SidebarSpaces'
import CreateSpaceModal from './CreateSpaceModal'
import SpaceContextMenu from './SpaceContextMenu'
import SharePermissionsModal from './SharePermissionsModal'

const LeftSidebar = ({ activeItem, onSelectItem, isCollapsed, onToggleCollapse }) => {
  const [sidebarWidth, setSidebarWidth] = useState(270)
  const [isResizing, setIsResizing] = useState(false)
  const [spacesList, setSpacesList] = useState(initialSpaces)

  // Track expanded spaces state by Space ID
  const [expandedSpaces, setExpandedSpaces] = useState({
    'quyet-toan-lenh': true
  })

  // Modal & Popup States
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [sharingTargetItem, setSharingTargetItem] = useState(null)
  
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    targetItem: null
  })

  const toggleSpaceExpand = (spaceId, e) => {
    e?.stopPropagation()
    setExpandedSpaces(prev => ({
      ...prev,
      [spaceId]: !prev[spaceId]
    }))
  }

  // Handle adding a new Space
  const handleCreateSpace = (newSpace) => {
    setSpacesList(prev => [newSpace, ...prev])
    setExpandedSpaces(prev => ({
      ...prev,
      [newSpace.id]: true
    }))
  }

  // Handle opening context menu on ... click
  const handleOpenContextMenu = (e, targetItem) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({
      isOpen: true,
      position: { x: rect.right + 5, y: rect.top },
      targetItem
    })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }

  // Handle opening sharing modal
  const handleOpenSharingModal = (item) => {
    setSharingTargetItem(item)
    setIsShareModalOpen(true)
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
      className={`h-full bg-white dark:bg-black border-r border-slate-200 dark:border-slate-800 flex flex-col text-[13px] text-slate-700 dark:text-slate-300 select-none shrink-0 relative ${
        isResizing ? '' : ''
      }`}
    >
      {/* 1. Top Header Bar (Fixed) */}
      <SidebarHeader 
        onToggleCollapse={onToggleCollapse} 
        isMac={isMac} 
      />

      {/* 2. Fixed Top Section: Home & Thông báo */}
      <div className="p-2.5 shrink-0">
        <SidebarQuickAccess 
          activeItem={activeItem} 
          onSelectItem={onSelectItem} 
        />
      </div>

      <hr className="border-slate-200 dark:border-slate-800 mx-2.5 my-1 shrink-0" />

      {/* 3. Bottom Section: Spaces & Dự án - SCROLLABLE */}
      <SidebarSpaces
        spacesList={spacesList}
        activeItem={activeItem}
        onSelectItem={onSelectItem}
        expandedSpaces={expandedSpaces}
        onToggleExpandSpace={toggleSpaceExpand}
        onOpenCreateSpaceModal={() => setIsCreateSpaceOpen(true)}
        onOpenContextMenu={handleOpenContextMenu}
      />

      {/* 4. DRAG RESIZE HANDLE BAR */}
      <div 
        onMouseDown={startResizing}
        onDoubleClick={() => setSidebarWidth(270)}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-600 transition-colors z-30 group"
        title="Kéo rê để thay đổi độ rộng Sidebar (Đúp chuột để khôi phục mặc định)"
      />

      {/* 5. MODALS & POPUPS */}
      <CreateSpaceModal
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        onCreateSpace={handleCreateSpace}
      />

      <SpaceContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        targetItem={contextMenu.targetItem}
        onClose={handleCloseContextMenu}
        onOpenSharing={handleOpenSharingModal}
      />

      <SharePermissionsModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        targetItem={sharingTargetItem}
      />
    </aside>
  )
}

export default LeftSidebar
