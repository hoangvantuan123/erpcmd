import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Terminal, X, Trash2, Copy, AlertTriangle, AlertCircle, Info, Check } from 'lucide-react'

// Global in-memory log buffer so logs persist across renders
const logBuffer = []
const listeners = new Set()

function notifyListeners() {
  listeners.forEach(fn => fn([...logBuffer]))
}

// Hook into native console and window errors once
if (typeof window !== 'undefined' && !window.__dev_console_hooked) {
  window.__dev_console_hooked = true

  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  const originalInfo = console.info

  const addLog = (type, args) => {
    try {
      const time = new Date().toLocaleTimeString('vi-VN')
      const msg = args.map(a => {
        if (typeof a === 'string') return a
        if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack || ''}`
        try {
          return JSON.stringify(a, null, 2)
        } catch {
          return String(a)
        }
      }).join(' ')

      logBuffer.push({ id: Date.now() + Math.random(), type, time, message: msg })
      if (logBuffer.length > 500) logBuffer.shift()
      notifyListeners()
    } catch {}
  }

  console.log = (...args) => {
    originalLog.apply(console, args)
    addLog('log', args)
  }

  console.error = (...args) => {
    originalError.apply(console, args)
    addLog('error', args)
  }

  console.warn = (...args) => {
    originalWarn.apply(console, args)
    addLog('warn', args)
  }

  console.info = (...args) => {
    originalInfo.apply(console, args)
    addLog('info', args)
  }

  window.addEventListener('error', (event) => {
    addLog('error', [event.error || event.message || 'Window Error'])
  })

  window.addEventListener('unhandledrejection', (event) => {
    addLog('error', ['Unhandled Promise Rejection:', event.reason])
  })
}

export const DevConsoleModal = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState(() => [...logBuffer])
  const [filterType, setFilterType] = useState('all') // all, error, warn, log
  const [searchTerm, setSearchTerm] = useState('')
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const handleUpdate = (updatedLogs) => setLogs(updatedLogs)
    listeners.add(handleUpdate)
    return () => listeners.delete(handleUpdate)
  }, [])

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isOpen, logs.length])

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (filterType !== 'all' && l.type !== filterType) return false
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        return l.message.toLowerCase().includes(term)
      }
      return true
    })
  }, [logs, filterType, searchTerm])

  const errorCount = useMemo(() => logs.filter(l => l.type === 'error').length, [logs])
  const warnCount = useMemo(() => logs.filter(l => l.type === 'warn').length, [logs])

  const handleCopyAll = () => {
    const text = filteredLogs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleClear = () => {
    logBuffer.length = 0
    setLogs([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/60 backdrop-blur-sm select-none font-sans text-xs">
      {/* Dev Console Window Container */}
      <div className="absolute bottom-0 left-0 right-0 h-[65vh] bg-neutral-950 text-neutral-200 border-t border-neutral-700 flex flex-col rounded-none shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="h-8 px-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-emerald-400" />
            <span className="font-bold text-neutral-100 uppercase tracking-wide">Developer Console & Logs (F12)</span>
            <div className="flex items-center gap-1.5 ml-3 font-mono text-[11px]">
              {errorCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 font-bold">
                  <AlertCircle size={10} /> {errorCount} Errors
                </span>
              )}
              {warnCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                  <AlertTriangle size={10} /> {warnCount} Warns
                </span>
              )}
              <span className="text-neutral-500 font-sans">({logs.length} logs)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyAll}
              className="h-6 px-2 text-[11px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-none flex items-center gap-1 cursor-pointer transition"
              title="Sao chép toàn bộ logs vào Clipboard"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
            <button
              onClick={handleClear}
              className="h-6 px-2 text-[11px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-none flex items-center gap-1 cursor-pointer transition"
              title="Xóa danh sách logs"
            >
              <Trash2 size={11} />
              <span>Xóa</span>
            </button>
            <button
              onClick={onClose}
              className="h-6 w-7 flex items-center justify-center hover:bg-rose-700 hover:text-white text-neutral-400 rounded-none cursor-pointer transition"
              title="Đóng Console"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="h-7 px-3 bg-neutral-900/60 border-b border-neutral-800 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {['all', 'error', 'warn', 'log'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`h-5 px-2 text-[10px] uppercase font-bold rounded-none border cursor-pointer transition ${
                  filterType === type 
                    ? 'bg-neutral-200 text-neutral-900 border-neutral-200' 
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                }`}
              >
                {type === 'all' ? 'Tất cả' : type}
              </button>
            ))}
          </div>

          <div className="flex-1 max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm trong logs..."
              className="w-full h-5 px-2 text-[11px] bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-none focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        {/* Logs Stream Content */}
        <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 select-text custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 font-sans">
              Chưa có log hoặc lỗi nào được ghi lại.
            </div>
          ) : (
            filteredLogs.map(l => (
              <div
                key={l.id}
                className={`p-1.5 border-l-2 leading-relaxed break-all rounded-none ${
                  l.type === 'error'
                    ? 'bg-rose-950/25 border-rose-500 text-rose-300'
                    : l.type === 'warn'
                    ? 'bg-amber-950/20 border-amber-500 text-amber-300'
                    : 'bg-neutral-900/40 border-neutral-600 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 pb-0.5">
                  <span>[{l.time}]</span>
                  <span className="uppercase font-bold">[{l.type}]</span>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] select-text">
                  {l.message}
                </pre>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}

export default DevConsoleModal
