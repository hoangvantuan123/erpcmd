import React, { useMemo, useEffect } from 'react'
import { 
  Minus, Square, X
} from 'lucide-react'
import { initialSpaces } from '../../data/spacesData'
import SpaceViewCanvas from '../Spaces/SpaceViewCanvas'
import AllTasksTableGrid from '../Tasks/AllTasksTableGrid'
import ApiLogsTableView from '../Logs/ApiLogsTableView'
import SettleView from '../Settle/SettleView'
import HomeView from '../Home/HomeView'
import NotificationsView from '../Home/NotificationsView'
import WindowResizeHandles from '../Common/WindowResizeHandles'

const requestWindowAction = (action, winId = 'view') => {
  fetch(`/api/window/${action}?win_id=${encodeURIComponent(winId)}`, { method: 'POST' }).catch(() => {
    if (action === 'close') window.close()
  })
}

export const StandaloneViewCanvas = ({ viewId = 'settle-process' }) => {
  const winId = useMemo(() => {
    return new URLSearchParams(window.location.search).get('win_id') || 'view'
  }, [])

  // Hỗ trợ Ctrl + Shift + N ngay trong Standalone Window
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        fetch(`/api/window/new-view?view=${encodeURIComponent(viewId)}`, { method: 'POST' }).catch(() => {})
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewId])

  // Resolve nav info for viewId
  const navInfo = useMemo(() => {
    if (viewId === 'home') {
      return { id: 'home', title: 'Overview', parentTitle: null, type: 'home' }
    }
    if (viewId === 'notifications') {
      return { id: 'notifications', title: 'Thông Báo', parentTitle: null, type: 'notifications' }
    }
    if (viewId === 'settle-process' || viewId === 'all-tasks') {
      return {
        id: 'settle-process',
        title: 'Quyết toán lệnh công đoạn',
        parentTitle: 'Quyết toán lệnh',
        type: 'settle-process'
      }
    }
    if (viewId === 'settle-step') {
      return {
        id: 'settle-step',
        title: 'Quyết toán lệnh thao tác',
        parentTitle: 'Quyết toán lệnh',
        type: 'settle-step'
      }
    }
    if (viewId === 'settle-logs' || viewId === 'api-logs') {
      return {
        id: 'settle-logs',
        title: 'Nhật ký',
        parentTitle: null,
        type: 'logs'
      }
    }

    const matchedSpace = initialSpaces.find(s => s.id === viewId)
    if (matchedSpace) {
      return {
        id: matchedSpace.id,
        title: matchedSpace.name,
        parentTitle: 'Spaces',
        type: 'space',
        iconColor: matchedSpace.iconColor || 'bg-emerald-600',
        privacy: matchedSpace.privacy,
        accessControl: matchedSpace.accessControl,
        subItems: matchedSpace.subItems || []
      }
    }

    for (const space of initialSpaces) {
      if (space.subItems) {
        const matchedSub = space.subItems.find(sub => sub.id === viewId)
        if (matchedSub) {
          return {
            id: matchedSub.id,
            parentId: space.id,
            title: matchedSub.name,
            parentTitle: space.name,
            type: matchedSub.type || 'list',
            iconColor: space.iconColor || 'bg-emerald-600',
            privacy: space.privacy
          }
        }
      }
    }

    return {
      id: viewId,
      title: viewId,
      parentTitle: 'Cửa sổ độc lập',
      type: 'space'
    }
  }, [viewId])

  const isHomeView = navInfo.id === 'home' || navInfo.type === 'home'
  const isNotificationsView = navInfo.id === 'notifications' || navInfo.type === 'notifications'
  const isSettleProcessView = navInfo.id === 'settle-process' || navInfo.type === 'settle-process' || navInfo.id === 'quyet-toan-lenh'
  const isSettleStepView = navInfo.id === 'settle-step' || navInfo.type === 'settle-step'
  const isLogsView = navInfo.id === 'settle-logs' || navInfo.type === 'logs'
  const isSpaceView = navInfo.type === 'space' && navInfo.id !== 'quyet-toan-lenh'

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col font-sans select-none bg-white dark:bg-black text-slate-900 dark:text-neutral-200 relative">
      <WindowResizeHandles winId={winId} />

      <header 
        className="h-8 pl-3 pr-0 bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none app-region-drag"
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
        {/* Left: Breadcrumbs & View Title */}
        <div className="flex items-center gap-1.5 app-region-no-drag truncate max-w-xl">
          {navInfo.parentTitle && (
            <>
              <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                {navInfo.parentTitle}
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
            </>
          )}
          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
            {navInfo.title}
          </span>
       
        </div>

        {/* Right: Window Controls - Flush, Seamless, No Rounded Corners */}
        <div className="flex items-stretch h-full space-x-0 text-slate-400 dark:text-slate-500 app-region-no-drag">
          <button
            onClick={() => requestWindowAction('minimize', winId)}
            className="w-11 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer rounded-none"
            title="Thu nhỏ"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => requestWindowAction('maximize', winId)}
            className="w-11 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer rounded-none"
            title="Phóng to / Khôi phục"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => requestWindowAction('close', winId)}
            className="w-12 h-full flex items-center justify-center hover:bg-red-600 hover:text-white text-slate-500 transition-colors cursor-pointer rounded-none"
            title="Đóng cửa sổ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main View Area without Sidebar */}
      <div className="flex-1 w-full min-h-0 overflow-hidden relative">
        {isHomeView ? (
          <HomeView onSelectItem={() => {}} />
        ) : isNotificationsView ? (
          <NotificationsView />
        ) : isSettleProcessView ? (
          <AllTasksTableGrid />
        ) : isSettleStepView ? (
          <SettleView />
        ) : isLogsView ? (
          <ApiLogsTableView />
        ) : isSpaceView ? (
          <div className="w-full h-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <SpaceViewCanvas
              activeNavInfo={navInfo}
              selectedNoteId={null}
              onSelectItem={() => {}}
              onSelectNote={() => {}}
              onAddNote={() => {}}
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full p-6 space-y-4">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{navInfo.title}</h1>
            <p className="text-slate-600 dark:text-slate-400">Cửa sổ xem độc lập nội dung.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StandaloneViewCanvas
