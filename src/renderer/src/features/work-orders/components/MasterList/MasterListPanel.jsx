import React, { useState } from 'react'
import { ArrowDown, Search, ArrowUpDown, Plus, Columns, FileText, Folder } from 'lucide-react'

const MasterListPanel = ({ 
  activeNavInfo, 
  selectedNoteId, 
  onSelectItem,
  onSelectNote, 
  onAddNote,
  isSidebarCollapsed, 
  onToggleSidebarCollapse 
}) => {
  const [activeFilter, setActiveFilter] = useState('open')
  const isMac = typeof navigator !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform || '') || /Macintosh|Mac OS X/.test(navigator.userAgent || ''))

  const notesList = activeNavInfo?.notes || []
  const subItemsList = activeNavInfo?.subItems || []
  const title = activeNavInfo?.title || 'Note'
  const isSpaceType = activeNavInfo?.type === 'space'

  return (
    <div className="w-72 h-full bg-white dark:bg-black border-r border-gray-200 dark:border-slate-800 flex flex-col select-none shrink-0 relative">
      {/* Header Bar */}
      <div 
        className={`h-8 flex items-center justify-between border-b border-gray-200 dark:border-slate-800 shrink-0 text-xs font-semibold text-gray-800 dark:text-slate-200 app-region-drag ${
          isMac && isSidebarCollapsed ? 'pl-8 pr-3' : 'px-3'
        }`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-2 app-region-no-drag truncate flex-1 min-w-0 pr-2">
          {isSidebarCollapsed && (
            <button 
              onClick={onToggleSidebarCollapse}
              className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 app-region-no-drag cursor-pointer shrink-0"
              title="Mở rộng Sidebar"
            >
              <Columns className="w-4 h-4" />
            </button>
          )}
          <span className="font-bold truncate text-slate-800 dark:text-slate-100" title={title}>
            {title}
          </span>
          <button className="flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-slate-500 font-normal hover:text-gray-600 dark:hover:text-slate-300 app-region-no-drag cursor-pointer shrink-0">
            <ArrowDown className="w-3 h-3" /> Modified
          </button>
        </div>

        <div className="flex items-center space-x-1 text-gray-400 dark:text-slate-500 app-region-no-drag shrink-0">
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded hover:text-gray-600 dark:hover:text-slate-200 app-region-no-drag" title="Tìm kiếm"><Search className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded hover:text-gray-600 dark:hover:text-slate-200 app-region-no-drag" title="Sắp xếp"><ArrowUpDown className="w-3.5 h-3.5" /></button>
          <button 
            onClick={() => onAddNote?.()} 
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded hover:text-gray-600 dark:hover:text-slate-200 app-region-no-drag cursor-pointer" 
            title="Thêm ghi chú mới"
          >
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Notes & Documents List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {notesList.length > 0 ? (
            <div className="space-y-1.5">
              {notesList.map((note) => {
                const isSelected = selectedNoteId === note.id
                return (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote?.(note.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#EFEFEF] dark:bg-slate-800 border-gray-300 dark:border-slate-700 shadow-sm'
                        : 'bg-white dark:bg-black border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/60 hover:border-gray-200 dark:hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-bold text-gray-800 dark:text-slate-100 leading-snug line-clamp-2">{note.title}</h4>
                      <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0 ml-1 mt-0.5" />
                    </div>
                    {note.content && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-normal">
                        {note.content}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500 mt-2">
                      <span>{note.modifiedDate || 'Hôm nay'}</span>
                      <span>{note.createdDate || 'Tạo hôm nay'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-slate-500 space-y-2">
              <FileText className="w-8 h-8 opacity-40" />
              <p className="text-xs font-medium">Chưa có ghi chú trong {title}</p>
              <button
                onClick={() => onAddNote?.()}
                className="px-3 py-1.5 text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md font-semibold hover:bg-indigo-100 transition-colors"
              >
                + Tạo ghi chú mới
              </button>
            </div>
          )}
      </div>

      {/* Bottom Floating Filter Pill Bar */}
      <div className="p-2 border-t border-gray-200 dark:border-slate-800 flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 shrink-0 transition-colors">
        <button
          onClick={() => setActiveFilter('open')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === 'open'
              ? 'bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/50'
          }`}
        >
          Open {notesList.length}
        </button>
        <button
          onClick={() => setActiveFilter('archived')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === 'archived'
              ? 'bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-sm'
              : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800/50'
          }`}
        >
          Archived 0
        </button>
      </div>
    </div>
  )
}

export default MasterListPanel
