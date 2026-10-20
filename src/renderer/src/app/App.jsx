import React, { useState, useEffect, useLayoutEffect } from 'react'
import LeftSidebar from '@/app/shell/sidebar/Sidebar/LeftSidebar'
import EditorCanvas from '@/app/shell/editor/Editor/EditorCanvas'
import BottomStatusBar from '@/app/shell/status/StatusBar/BottomStatusBar'
import WindowResizeHandles from '@/app/shell/window/WindowResizeHandles'
import { useSpaces } from '@/features/spaces/hooks/useSpaces'
import { createViewWindow, openSettingsWindow } from '@/features/system/api/systemApi'

const App = () => {
  const {
    activeItem,
    activeNavInfo,
    selectedNoteId,
    selectItem,
    selectNote,
    addNote
  } = useSpaces()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useLayoutEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('app-theme')
  }, [])

  const handleOpenSettingsWindow = () => {
    openSettingsWindow().catch(() => {
      window.open('/?window=settings', 'ERPSYS_SETTINGS', 'width=700,height=520')
    })
  }

  // Shortcut: Ctrl + Shift + N to open current view in a new native window without sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        createViewWindow(activeItem).catch(() => {
          window.open(`/?window=view&view=${encodeURIComponent(activeItem)}`, '_blank', 'width=1200,height=750')
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeItem])

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col font-sans select-none relative bg-white text-slate-900">
      <WindowResizeHandles winId="main" />
      {/* Main Layout: Sidebar (Left) + Full Width Grid Workspace (Right) - Headers form one continuous seamless top bar */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <LeftSidebar
          activeItem={activeItem}
          onSelectItem={selectItem}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <EditorCanvas
          activeNavInfo={activeNavInfo}
          noteId={selectedNoteId}
          onSelectItem={selectItem}
          onSelectNote={selectNote}
          onAddNote={addNote}
        />
      </div>

      {/* Bottom Status Bar */}
      <BottomStatusBar
        onOpenSettings={handleOpenSettingsWindow}
      />
    </div>
  )
}

export default App
