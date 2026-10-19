import React from 'react'
import { FileText, Plus } from 'lucide-react'

export const SpaceNotesSection = ({ notes, selectedNoteId, onSelectNote, onAddNote, title }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Nội dung & Tài liệu ({notes.length})
          </h3>
        </div>
        <button
          onClick={onAddNote}
          className="px-2.5 py-1 text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm tài liệu mới</span>
        </button>
      </div>

      {notes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {notes.map((note) => {
            const isSelected = selectedNoteId === note.id
            return (
              <div
                key={note.id}
                onClick={() => onSelectNote?.(note.id)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
                    {note.title}
                  </h4>
                  <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 ml-1.5 mt-0.5" />
                </div>
                {note.content && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 font-normal leading-relaxed">
                    {note.content}
                  </p>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span>Cập nhật: {note.modifiedDate || 'Hôm nay'}</span>
                  <span>{note.createdDate || 'Tạo hôm nay'}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
          <FileText className="w-8 h-8 opacity-40" />
          <p className="text-xs font-medium">Chưa có tài liệu trong {title || 'Space này'}</p>
          <button
            onClick={onAddNote}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
          >
            + Tạo ghi chú mới
          </button>
        </div>
      )}
    </div>
  )
}

export default SpaceNotesSection
