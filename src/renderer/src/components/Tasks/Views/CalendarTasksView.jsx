import React, { memo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const CalendarTasksView = memo(({ groups }) => {
  const allTasks = groups.flatMap(g => g.tasks)

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-white dark:bg-black p-4 select-none overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Tháng 7, 2026</h2>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-2">Hôm nay</span>
          <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
        {daysOfWeek.map((day) => (
          <div key={day} className="p-2 border-b border-r border-slate-200 dark:border-slate-800 text-center font-bold text-xs text-slate-400">
            {day}
          </div>
        ))}
        {Array.from({ length: 28 }).map((_, i) => {
          const task = allTasks[i % allTasks.length]
          const isToday = i === 19
          return (
            <div key={i} className={`p-2 border-b border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between ${isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
              <span className={`text-[10px] font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                {i + 1}
              </span>
              {task && (
                <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs text-[10px] truncate font-medium text-slate-700 dark:text-slate-300">
                  {task.name}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

CalendarTasksView.displayName = 'CalendarTasksView'
export default CalendarTasksView
