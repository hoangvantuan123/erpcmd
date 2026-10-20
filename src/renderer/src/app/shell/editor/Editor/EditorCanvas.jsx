import React, { lazy, Suspense, useState, useEffect } from 'react'
import { 
  Minus, Square, X, Settings
} from 'lucide-react'
import { createViewWindow, openSettingsWindow, windowAction } from '@/features/system/api/systemApi'

const SpaceViewCanvas = lazy(() => import('@/features/spaces/components/Spaces/SpaceViewCanvas'))
const AllTasksTableGrid = lazy(() => import('@/features/work-orders/components/Tasks/AllTasksTableGrid'))
const ApiLogsTableView = lazy(() => import('@/features/api-logs/components/Logs/ApiLogsTableView'))
const SettleView = lazy(() => import('@/features/work-steps/components/Settle/SettleView'))
const HomeView = lazy(() => import('@/features/home/components/Home/HomeView'))
const NotificationsView = lazy(() => import('@/features/home/components/Home/NotificationsView'))

const requestWindowAction = (action, winId = 'main') => {
  windowAction(action, winId).catch(() => {})
}

export const EditorCanvas = ({ activeNavInfo, noteId, onSelectItem, onSelectNote, onAddNote, winId = 'main' }) => {
  const currentNote = activeNavInfo?.currentNote
  const isHomeView = activeNavInfo?.id === 'home' || activeNavInfo?.type === 'home'
  const isNotificationsView = activeNavInfo?.id === 'notifications' || activeNavInfo?.type === 'notifications'
  const isSettleProcessView = activeNavInfo?.id === 'settle-process' || activeNavInfo?.id === 'all-tasks' || activeNavInfo?.type === 'settle-process' || activeNavInfo?.id === 'quyet-toan-lenh'
  const isSettleStepView = activeNavInfo?.id === 'settle-step' || activeNavInfo?.type === 'settle-step'
  const isLogsView = activeNavInfo?.id === 'settle-logs' || activeNavInfo?.type === 'logs' || activeNavInfo?.id === 'api-logs' || activeNavInfo?.id === 'api-logs-realtime'
  const isSpaceView = activeNavInfo?.type === 'space' && activeNavInfo?.id !== 'quyet-toan-lenh'

  const [headingText, setHeadingText] = useState(currentNote?.title || 'Heading')
  const [contentText, setContentText] = useState(currentNote?.content || '')

  useEffect(() => {
    if (currentNote) {
      setHeadingText(currentNote.title || 'Heading')
      setContentText(currentNote.content || '')
    }
  }, [currentNote?.id, currentNote?.title, currentNote?.content])

  const handleOpenSettings = () => {
    openSettingsWindow().catch(() => {
      window.open('/?window=settings', 'ERPSYS_SETTINGS', 'width=700,height=520')
    })
  }

  return (
    <main className="flex-1 h-full bg-white dark:bg-black flex flex-col overflow-hidden relative select-none font-sans">
      {/* 1. SEAMLESS IN-LINE HEADER BAR WITH TITLE & CONTROLS */}
      <header 
        className="h-8 pl-3 pr-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 select-none app-region-drag"
        onMouseDown={(e) => {
          if (e.button === 0 && !e.target.closest('button, input, select')) {
            requestWindowAction('drag', winId)
          }
        }}
        onDoubleClick={(e) => {
          if (!e.target.closest('button, input, select')) {
            requestWindowAction('maximize', winId)
          }
        }}
      >
        {/* Left: OpenStatus-style Breadcrumbs */}
        <div className="flex items-center gap-1.5 app-region-no-drag truncate max-w-xl text-xs font-mono">
          <span className="text-zinc-400 dark:text-zinc-500 font-sans">
            Workspace
          </span>
          <span className="text-zinc-300 dark:text-zinc-700 font-sans">&gt;</span>

          {activeNavInfo?.parentTitle && (
            <>
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-sans">
                <span className="truncate">{activeNavInfo.parentTitle}</span>
              </div>
              <span className="text-zinc-300 dark:text-zinc-700 font-sans">&gt;</span>
            </>
          )}

          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-sans font-semibold truncate">
            {!activeNavInfo?.parentTitle && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
            <span className="truncate">{activeNavInfo?.title || 'Overview'}</span>
          </div>
        </div>

        {/* Right: Window Controls - Flush, Seamless, No Rounded Corners */}
        <div className="flex items-stretch h-full space-x-0 text-zinc-400 dark:text-zinc-500 app-region-no-drag">
          <button
            onClick={handleOpenSettings}
            className="w-9 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer rounded-none"
            title="Cài đặt hệ thống"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => requestWindowAction('minimize', winId)}
            className="w-11 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer rounded-none"
            title="Thu nhỏ"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => requestWindowAction('maximize', winId)}
            className="w-11 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer rounded-none"
            title="Phóng to / Khôi phục"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => requestWindowAction('close', winId)}
            className="w-12 h-full flex items-center justify-center hover:bg-red-600 hover:text-white text-zinc-500 transition-colors cursor-pointer rounded-none"
            title="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <div className={`flex-1 w-full overflow-hidden ${isSettleProcessView || isLogsView ? 'p-0 flex flex-col h-full' : 'overflow-y-auto custom-scrollbar'}`}>
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-slate-500">Đang tải nội dung…</div>}>
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
          <div className="w-full p-6 space-y-4">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{headingText}</h1>
            <p className="text-slate-600 dark:text-slate-400">{contentText || 'Nội dung mục làm việc.'}</p>
          </div>
        )}
        </Suspense>
      </div>
    </main>
  )
}

export default EditorCanvas
