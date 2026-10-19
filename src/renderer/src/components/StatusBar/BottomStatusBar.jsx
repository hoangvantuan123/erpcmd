import React from 'react'
import { Moon, Sun, Settings } from 'lucide-react'

const BottomStatusBar = ({ isDarkMode, onToggleDarkMode, onOpenSettings }) => {
  return (
    <footer className={`h-6 border-t px-2.5 flex items-center justify-between text-[11px] select-none z-30 shrink-0 font-sans ${
      isDarkMode 
        ? 'bg-neutral-950 border-neutral-800 text-neutral-400' 
        : 'bg-white border-slate-200 text-slate-600'
    }`}>
      <div className="flex items-center space-x-2.5">
        <span className="font-semibold text-slate-700 dark:text-neutral-300">ERPSYS</span>
        <span className="text-slate-300 dark:text-neutral-700">•</span>
        <span>Chi nhánh: A01</span>
        <span className="text-slate-300 dark:text-neutral-700">•</span>
        <span>Niên độ: 2026</span>
        <span className="text-slate-300 dark:text-neutral-700">•</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Bravo Gateway Connected</span>
      </div>

      <div className="flex items-center space-x-2">
        <button 
          onClick={onToggleDarkMode} 
          className="hover:text-slate-900 dark:hover:text-white p-0.5 transition cursor-pointer"
          title={isDarkMode ? "Chuyển Chế độ Sáng" : "Chuyển Chế độ Tối"}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
        </button>
        <button 
          onClick={onOpenSettings}
          className="hover:text-slate-900 dark:hover:text-white p-0.5 transition cursor-pointer" 
          title="Cài đặt hệ thống ERPSYS"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  )
}

export default BottomStatusBar
