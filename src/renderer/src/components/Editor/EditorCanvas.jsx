import React, { useState, useEffect } from 'react'
import { 
  Star, CheckSquare, Code, Columns, AlignLeft, Folder, Trash2, MoreHorizontal,
  Minus, Square, X, Settings
} from 'lucide-react'
import SpaceViewCanvas from '../Spaces/SpaceViewCanvas'
import AllTasksTableGrid from '../Tasks/AllTasksTableGrid'
import ApiLogsTableView from '../Logs/ApiLogsTableView'
import SettleView from '../Settle/SettleView'
import HomeView from '../Home/HomeView'
import NotificationsView from '../Home/NotificationsView'

const requestWindowAction = (action) => {
  fetch(`/api/window/${action}`, { method: 'POST' }).catch(() => {})
}

export const EditorCanvas = ({ activeNavInfo, noteId, onSelectItem, onSelectNote, onAddNote }) => {
  const currentNote = activeNavInfo?.currentNote
  const isHomeView = activeNavInfo?.id === 'home' || activeNavInfo?.type === 'home'
  const isNotificationsView = activeNavInfo?.id === 'notifications' || activeNavInfo?.type === 'notifications'
  const isSettleProcessView = activeNavInfo?.id === 'settle-process' || activeNavInfo?.id === 'all-tasks' || activeNavInfo?.type === 'settle-process'
  const isSettleStepView = activeNavInfo?.id === 'settle-step' || activeNavInfo?.type === 'settle-step'
  const isLogsView = activeNavInfo?.id === 'settle-logs' || activeNavInfo?.type === 'logs' || activeNavInfo?.id === 'api-logs' || activeNavInfo?.id === 'api-logs-realtime'
  const isSpaceView = activeNavInfo?.type === 'space' || activeNavInfo?.id === 'quyet-toan-lenh'

  const [headingText, setHeadingText] = useState(currentNote?.title || 'Heading')
  const [contentText, setContentText] = useState(currentNote?.content || '')

  useEffect(() => {
    if (currentNote) {
      setHeadingText(currentNote.title || 'Heading')
      setContentText(currentNote.content || '')
    }
  }, [currentNote?.id, currentNote?.title, currentNote?.content])

  const handleOpenSettings = () => {
    fetch('/api/window/settings', { method: 'POST' }).catch(() => {
      window.open('/?window=settings', 'ERPSYS_SETTINGS', 'width=700,height=520')
    })
  }

  return (
    <main className="flex-1 h-full bg-white dark:bg-black flex flex-col overflow-hidden relative select-none font-sans">
      {/* 1. SEAMLESS IN-LINE HEADER BAR WITH TITLE & CONTROLS */}
      <header 
        className="h-8 px-3 bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none app-region-drag"
        onMouseDown={(e) => {
          if (e.button === 0 && !e.target.closest('button, input, select')) {
            requestWindowAction('drag')
          }
        }}
      >
        {/* Left: Breadcrumbs & Title */}
        <div className="flex items-center gap-1.5 app-region-no-drag truncate max-w-xl">
          {activeNavInfo?.parentTitle && (
            <>
              <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                {activeNavInfo.parentTitle}
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
            </>
          )}

          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
            {activeNavInfo?.title || '16 PIC'}
          </span>
        </div>

        {/* Right: Action Toolbar Icons + Window Controls */}
        <div className="flex items-center space-x-1.5 text-slate-400 dark:text-slate-500 app-region-no-drag">
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-amber-500 transition-colors cursor-pointer" title="Star Favorite"><Star className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer" title="Check Task"><CheckSquare className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer" title="Code View"><Code className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer" title="Split Panel"><Columns className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer" title="Table of Contents"><AlignLeft className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer" title="Move to Folder"><Folder className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-red-500 transition-colors cursor-pointer" title="Delete Note"><Trash2 className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer" title="More Options"><MoreHorizontal className="w-3.5 h-3.5" /></button>

          {/* Hairline Divider */}
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Window Control Buttons */}
          <button
            onClick={handleOpenSettings}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            title="Cài đặt hệ thống"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => requestWindowAction('minimize')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            title="Thu nhỏ"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => requestWindowAction('maximize')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            title="Phóng to"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => requestWindowAction('close')}
            className="p-1 hover:bg-rose-600 hover:text-white rounded transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <div className={`flex-1 w-full overflow-hidden ${isSettleProcessView || isLogsView ? 'p-0 flex flex-col h-full' : 'overflow-y-auto custom-scrollbar'}`}>
        {isHomeView ? (
          <HomeView onSelectItem={onSelectItem} />
        ) : isNotificationsView ? (
          <NotificationsView />
        ) : isSettleProcessView ? (
          <AllTasksTableGrid />
        ) : isSettleStepView ? (
          <SettleView />
        ) : isLogsView ? (
          <ApiLogsTableView />
        ) : isSpaceView ? (
          <div className="p-4 md:p-6">
            <SpaceViewCanvas
              activeNavInfo={activeNavInfo}
              selectedNoteId={noteId}
              onSelectItem={onSelectItem}
              onSelectNote={onSelectNote}
              onAddNote={onAddNote}
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full p-6 space-y-4">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{headingText}</h1>
            <p className="text-slate-600 dark:text-slate-400">{contentText || 'Nội dung mục làm việc.'}</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default EditorCanvas
