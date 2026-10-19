import React, { memo } from 'react'
import { Plus } from 'lucide-react'
import PriorityBadge from '../PriorityBadge'

export const KanbanBoardView = memo(({ groups }) => {
  return (
    <div className="flex-1 w-full overflow-x-auto p-4 bg-slate-50/70 dark:bg-slate-950 flex gap-4 custom-scrollbar">
      {groups.map((group) => (
        <div key={group.id} className="w-72 shrink-0 flex flex-col max-h-full bg-slate-100/80 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {/* Column Header */}
          <div className="p-3 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${group.color}`}>
                {group.name}
              </span>
              <span className="text-xs font-bold text-slate-400">{group.tasks.length}</span>
            </div>
            <button className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {group.tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition-all space-y-2"
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm shrink-0">{task.icon || '⚙️'}</span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
                    {task.name}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                  <span className="text-slate-400 font-medium">{task.dueDate}</span>
                  <PriorityBadge priority={task.priority} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})

KanbanBoardView.displayName = 'KanbanBoardView'
export default KanbanBoardView
