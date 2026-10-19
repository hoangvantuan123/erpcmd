import React, { useState, memo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import TaskRowItem from './TaskRowItem'

export const TaskGroupSection = memo(({ group, onToggleGroup, onToggleCompleted, onAddTask }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    onAddTask(group.id, newTitle)
    setNewTitle('')
    setIsAdding(false)
  }

  return (
    <React.Fragment>
      {/* Group Header Row */}
      <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80 font-bold select-none">
        <td colSpan={6} className="px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleGroup(group.id)}
              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 cursor-pointer"
            >
              {group.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${group.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>{group.name}</span>
            </span>

            <span className="text-xs font-bold text-slate-400">
              {group.tasks.length}
            </span>
          </div>
        </td>
      </tr>

      {/* Task Rows */}
      {!group.collapsed && (
        <>
          {group.tasks.map((task, idx) => (
            <TaskRowItem
              key={task.id}
              task={task}
              idx={idx}
              groupId={group.id}
              groupColor={group.color}
              onToggleCompleted={onToggleCompleted}
            />
          ))}

          {/* Add Task Input Row */}
          {isAdding ? (
            <tr className="bg-slate-50 dark:bg-slate-900/80">
              <td className="px-3 py-2 text-center text-slate-400">+</td>
              <td colSpan={5} className="px-3 py-2">
                <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Nhập tên công việc mới và nhấn Enter..."
                    className="w-full text-xs bg-white dark:bg-slate-950 border border-purple-300 dark:border-purple-700 px-3 py-1 rounded focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                  <button type="submit" className="px-2.5 py-1 text-xs bg-purple-600 text-white font-bold rounded hover:bg-purple-700 cursor-pointer">
                    Lưu
                  </button>
                  <button type="button" onClick={() => setIsAdding(false)} className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
                    Hủy
                  </button>
                </form>
              </td>
            </tr>
          ) : (
            <tr 
              onClick={() => setIsAdding(true)}
              className="hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer text-slate-400 hover:text-purple-600 transition-colors"
            >
              <td className="px-3 py-2 text-center text-xs">+</td>
              <td colSpan={5} className="px-3 py-2 text-xs font-medium">
                + Thêm công việc vào mục {group.name}...
              </td>
            </tr>
          )}
        </>
      )}
    </React.Fragment>
  )
})

TaskGroupSection.displayName = 'TaskGroupSection'
export default TaskGroupSection
