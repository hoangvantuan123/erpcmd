import React, { useState, useEffect } from 'react'
import LeftSidebar from './components/Sidebar/LeftSidebar'
import EditorCanvas from './components/Editor/EditorCanvas'
import BottomStatusBar from './components/StatusBar/BottomStatusBar'
import WindowHeader from './components/MenuBar/WindowHeader'
import { useSpaces } from './hooks/useSpaces'

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

  // Persist dark mode state in localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('app-theme') === 'dark'
  })

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light'
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('app-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('app-theme', 'light')
    }
  }, [isDarkMode])

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  const handleOpenSettingsWindow = () => {
    fetch('/api/window/settings', { method: 'POST' }).catch(() => {
      window.open('/?window=settings', 'ERPSYS_SETTINGS', 'width=700,height=520')
    })
  }

  // Shortcut: Ctrl + Shift + N to open current view in a new native window without sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        fetch(`/api/window/new-view?view=${encodeURIComponent(activeItem)}`, { method: 'POST' }).catch(() => {
          window.open(`/?window=view&view=${encodeURIComponent(activeItem)}`, '_blank', 'width=1200,height=750')
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeItem])

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans select-none ${
      isDarkMode ? 'dark bg-black text-neutral-200' : 'bg-white text-slate-900'
    }`}>
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
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenSettings={handleOpenSettingsWindow}
      />
    </div>
  )
}

export default App
