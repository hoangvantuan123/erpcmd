import React, { useState, useEffect, useCallback, useMemo } from 'react'
import DataEditor, { GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { Activity, RefreshCw, Play, Pause, Search } from 'lucide-react'

const columns = [
  { title: 'ID', width: 60 },
  { title: 'Thời Gian', width: 90 },
  { title: 'Mã HTTP', width: 85 },
  { title: 'Endpoint API Gateway', width: 340 },
  { title: 'Tiến Độ & Phản Hồi Từ Bravo Gateway', width: 480 }
]

export const ApiLogsTableView = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [autoPoll, setAutoPoll] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data)
      }
    } catch (e) {
      console.error('Không tải được logs:', e)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Real-time polling every 2s
  useEffect(() => {
    if (!autoPoll) return
    const interval = setInterval(() => {
      fetchLogs()
    }, 2000)
    return () => clearInterval(interval)
  }, [autoPoll, fetchLogs])

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs
    const term = searchTerm.toLowerCase()
    return logs.filter(l => 
      (l.endpoint || '').toLowerCase().includes(term) ||
      (l.response_summary || '').toLowerCase().includes(term) ||
      String(l.status_code || '').includes(term)
    )
  }, [logs, searchTerm])

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  const gridTheme = useMemo(() => {
    if (isDark) {
      return {
        accentColor: '#6366f1',
        bgCell: '#09090b',
        bgCellMedium: '#18181b',
        bgHeader: '#09090b',
        bgHeaderHovered: '#27272a',
        textDark: '#f4f4f5',
        textMedium: '#a1a1aa',
        textLight: '#71717a',
        borderColor: '#27272a',
        headerBottomBorderColor: '#27272a',
        cellHorizontalPadding: 8,
        cellVerticalPadding: 3,
        baseFontStyle: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        headerFontStyle: '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }
    }
    return {
      accentColor: '#4f46e5',
      bgCell: '#ffffff',
      bgCellMedium: '#f8fafc',
      bgHeader: '#f8fafc',
      bgHeaderHovered: '#e2e8f0',
      textDark: '#0f172a',
      textMedium: '#475569',
      textLight: '#94a3b8',
      borderColor: '#e2e8f0',
      headerBottomBorderColor: '#cbd5e1',
      cellHorizontalPadding: 8,
      cellVerticalPadding: 3,
      baseFontStyle: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      headerFontStyle: '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  }, [isDark])

  const getCellContent = useCallback(([col, row]) => {
    const item = filteredLogs[row]
    if (!item) return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }

    switch (col) {
      case 0:
        return { kind: GridCellKind.Text, data: `#${item.id}`, displayData: `#${item.id}`, allowOverlay: false }
      case 1:
        return { kind: GridCellKind.Text, data: item.request_time || '', displayData: item.request_time || '', allowOverlay: false }
      case 2:
        const code = String(item.status_code || '')
        return { kind: GridCellKind.Text, data: code, displayData: code, allowOverlay: false }
      case 3:
        return { kind: GridCellKind.Text, data: item.endpoint || '', displayData: item.endpoint || '', allowOverlay: false }
      case 4:
        return { kind: GridCellKind.Text, data: item.response_summary || '', displayData: item.response_summary || '', allowOverlay: false }
      default:
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
    }
  }, [filteredLogs])

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black font-sans text-xs select-none">
      {/* Toolbar */}
      <div className="h-8 px-2.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wide text-slate-900 dark:text-white">
            <Activity size={13} className="text-emerald-500 animate-pulse" />
            <span>Nhật Ký Dữ Liệu & Tiến Độ API Bravo</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            ({filteredLogs.length} bản ghi)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search size={12} className="text-slate-400 absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Lọc endpoint, tóm tắt..."
              className="pl-6 pr-2 py-0.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-none focus:outline-none w-44 text-slate-800 dark:text-neutral-200"
            />
          </div>

          <button
            onClick={() => setAutoPoll(!autoPoll)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold border transition cursor-pointer rounded-none ${
              autoPoll 
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' 
                : 'border-slate-300 text-slate-600 dark:border-neutral-700 dark:text-neutral-400'
            }`}
            title={autoPoll ? 'Tạm dừng auto-refresh' : 'Bật tự động theo dõi'}
          >
            {autoPoll ? <Pause size={10} /> : <Play size={10} />}
            <span>{autoPoll ? 'Live 2s' : 'Đã dừng'}</span>
          </button>

          <button
            onClick={() => {
              setLoading(true)
              fetchLogs().finally(() => setLoading(false))
            }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer rounded-none"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* Glide Data Grid Table */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <DataEditor
          getCellContent={getCellContent}
          columns={columns}
          rows={filteredLogs.length}
          smoothScrollX={true}
          smoothScrollY={true}
          rowMarkers="checkbox-visible"
          headerHeight={32}
          rowHeight={30}
          theme={gridTheme}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}

export default ApiLogsTableView
