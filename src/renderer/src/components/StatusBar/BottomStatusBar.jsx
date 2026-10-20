import React, { useState, useEffect } from 'react'
import { 
  CheckCircle2, 
  AlertCircle, 
  Folder, 
  Columns3, 
  Zap, 
  User, 
  History, 
  Bell, 
  Sun, 
  Moon, 
  Settings,
  Wifi,
  WifiOff,
  Tag,
  Activity
} from 'lucide-react'

const BottomStatusBar = ({ 
  isDarkMode, 
  onToggleDarkMode, 
  onOpenSettings,
  defaultMessage = 'Đã sẵn sàng. Danh sách lệnh công đoạn sản xuất'
}) => {
  const [status, setStatus] = useState({
    message: defaultMessage,
    type: 'success', // 'success', 'warning', 'error', 'info'
    stats: 'A:0 / U:0 / E:0',
    rowCount: '0/0',
    colCount: '11 CỘT',
    latency: '0MS',
    isOnline: true,
    username: 'QUẢN TRỊ VIÊN',
    notificationCount: 0,
    version: 'v2.0.6'
  })

  // 1. Fetch live system status (username, online status)
  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus(prev => ({
            ...prev,
            username: data.username ? data.username.toUpperCase() : 'QUẢN TRỊ VIÊN',
            isOnline: Boolean(data.is_token_valid)
          }))
        }
      })
      .catch(() => {})
  }, [])

  // 2. Listen to custom event 'update-status-bar' from any page or table
  useEffect(() => {
    const handleStatusUpdate = (e) => {
      if (e.detail) {
        setStatus(prev => ({
          ...prev,
          ...e.detail
        }))
      }
    }
    window.addEventListener('update-status-bar', handleStatusUpdate)
    return () => window.removeEventListener('update-status-bar', handleStatusUpdate)
  }, [])

  const handleOpenLogsModal = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F12' }))
  }

  return (
    <footer className="h-6.5 bg-white dark:bg-black border-t border-slate-200 dark:border-zinc-800 px-3 flex items-center justify-between text-xs select-none z-30 shrink-0 font-sans">
      {/* LEFT: Page notification / Status message */}
      <div className="flex items-center gap-1.5 truncate max-w-[55%]">
        {status.type === 'error' ? (
          <AlertCircle size={13} className="text-red-500 shrink-0" />
        ) : status.type === 'warning' ? (
          <AlertCircle size={13} className="text-amber-500 shrink-0" />
        ) : (
          <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <span className="text-[11px] font-sans text-slate-700 dark:text-zinc-300 truncate">
          {status.message}
        </span>
      </div>

      {/* RIGHT: Live stats, metrics, connectivity & actions with Lucide icons */}
      <div className="flex items-center divide-x divide-slate-200 dark:divide-zinc-800 text-[11px]">
        {/* A:0 / U:0 / E:0 */}
        <div className="px-2 font-mono text-slate-500 dark:text-zinc-400 hidden sm:flex items-center gap-1">
          <Activity size={11} className="text-slate-400 shrink-0" />
          <span>{status.stats}</span>
        </div>

        {/* Row count */}
        <div className="px-2 font-mono text-slate-700 dark:text-zinc-300 flex items-center gap-1">
          <Folder size={11} className="text-slate-400 shrink-0" />
          <span>{status.rowCount}</span>
        </div>

        {/* Column count */}
        <div className="px-2 font-mono text-slate-700 dark:text-zinc-300 flex items-center gap-1 hidden md:flex">
          <Columns3 size={11} className="text-slate-400 shrink-0" />
          <span>{status.colCount}</span>
        </div>

        {/* Latency */}
        <div className="px-2 font-mono text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
          <Zap size={11} className="text-amber-500 fill-amber-500 shrink-0" />
          <span>{status.latency}</span>
        </div>

        {/* ONLINE / OFFLINE */}
        <div className={`px-2 flex items-center gap-1 text-[10px] font-bold ${
          status.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {status.isOnline ? (
            <Wifi size={11} className="shrink-0" />
          ) : (
            <WifiOff size={11} className="shrink-0" />
          )}
          <span>{status.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </div>

        {/* User */}
        <div className="px-2 font-sans font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1 hidden lg:flex">
          <User size={11} className="text-slate-400 shrink-0" />
          <span>{status.username}</span>
        </div>

        {/* LOGS */}
        <button
          onClick={handleOpenLogsModal}
          className="px-2 h-5 flex items-center gap-1 text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Xem lịch sử API Logs (F12)"
        >
          <History size={11} className="shrink-0" />
          <span>LOGS</span>
        </button>

        {/* Notifications */}
        <div className="px-2 flex items-center gap-1 font-mono text-slate-500 dark:text-zinc-400 hover:text-indigo-600 transition-colors cursor-pointer">
          <Bell size={11} className="shrink-0" />
          <span>{status.notificationCount}</span>
        </div>

        {/* Version */}
        <div className="px-2 font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <Tag size={11} className="shrink-0" />
          <span>{status.version}</span>
        </div>

        {/* Theme & Settings Quick Actions */}
        <div className="pl-1.5 flex items-center gap-1">
          <button 
            onClick={onToggleDarkMode} 
            className="p-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title={isDarkMode ? "Chế độ Sáng" : "Chế độ Tối"}
          >
            {isDarkMode ? <Sun size={12} className="text-amber-400" /> : <Moon size={12} />}
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer" 
            title="Cài đặt hệ thống"
          >
            <Settings size={12} />
          </button>
        </div>
      </div>
    </footer>
  )
}

export default BottomStatusBar
