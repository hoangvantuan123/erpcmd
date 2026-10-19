import React, { useMemo } from 'react'
import { 
  Star, CheckSquare, Code, Minus, Square, X
} from 'lucide-react'
import { initialSpaces } from '../../data/spacesData'
import SpaceViewCanvas from '../Spaces/SpaceViewCanvas'
import AllTasksTableGrid from '../Tasks/AllTasksTableGrid'
import ApiLogsTableView from '../Logs/ApiLogsTableView'
import SettleView from '../Settle/SettleView'
import HomeView from '../Home/HomeView'
import NotificationsView from '../Home/NotificationsView'

const requestWindowAction = (action) => {
  fetch(`/api/window/${action}`, { method: 'POST' }).catch(() => {
    if (action === 'close') window.close()
  })
}

export const StandaloneViewCanvas = ({ viewId = 'settle-process' }) => {
  // Resolve nav info for viewId
  const navInfo = useMemo(() => {
    if (viewId === 'home') {
      return { id: 'home', title: 'Home', parentTitle: 'Trang Chủ', type: 'home' }
    }
    if (viewId === 'notifications') {
      return { id: 'notifications', title: 'Thông Báo', parentTitle: 'Hệ Thống', type: 'notifications' }
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
        title: 'Nhật ký quyết toán',
        parentTitle: 'Quyết toán lệnh',
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
  const isSettleProcessView = navInfo.id === 'settle-process' || navInfo.type === 'settle-process'
  const isSettleStepView = navInfo.id === 'settle-step' || navInfo.type === 'settle-step'
  const isLogsView = navInfo.id === 'settle-logs' || navInfo.type === 'logs'
  const isSpaceView = navInfo.type === 'space' || navInfo.id === 'quyet-toan-lenh'

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col font-sans select-none bg-white dark:bg-black text-slate-900 dark:text-neutral-200">
      {/* Seamless Window Header for Standalone View */}
      <header 
        className="h-8 px-3 bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none app-region-drag"
        onMouseDown={(e) => {
          if (e.button === 0 && !e.target.closest('button, input, select')) {
            requestWindowAction('drag')
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
          <span className="ml-2 text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
            Standalone View
          </span>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center space-x-1.5 text-slate-400 dark:text-slate-500 app-region-no-drag">
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-amber-500 transition cursor-pointer" title="Star Favorite">
            <Star className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer" title="Check Task">
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer" title="Code View">
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

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
