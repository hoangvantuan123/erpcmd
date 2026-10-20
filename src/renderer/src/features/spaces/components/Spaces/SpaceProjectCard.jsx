import React from 'react'
import { Folder, FileText, ChevronRight } from 'lucide-react'

export const SpaceProjectCard = ({ sub, onSelectItem }) => {
  const isDoc = sub.type === 'doc'

  return (
    <div
      onClick={() => onSelectItem?.(sub.id)}
      className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg ${isDoc ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'} flex items-center justify-center shrink-0`}>
            {isDoc ? <FileText className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
              {sub.name}
            </h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {isDoc ? 'Tài liệu SOP' : 'Danh sách công việc'}
            </span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400">
        <span>{sub.count !== undefined ? `${sub.count} hạng mục` : 'Chi tiết'}</span>
        <span className="font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
          Xem dự án &rarr;
        </span>
      </div>
    </div>
  )
}

export default SpaceProjectCard
