import React, { memo } from 'react'
import { CheckCircle2, Clock, Cog, Plus } from 'lucide-react'
import { TableRow, TableCell } from '../ui/table'
import Badge from '../ui/badge'
import PriorityBadge from './PriorityBadge'

export const TaskRowItem = memo(({ task, idx, groupId, onToggleCompleted, groupColor }) => {
  return (
    <TableRow className="group">
      {/* Checkbox & Row # */}
      <TableCell className="text-center text-slate-400 text-[11px] font-medium w-12">
        <div className="flex items-center justify-center gap-1">
          <input 
            type="checkbox" 
            checked={task.completed}
            onChange={() => onToggleCompleted?.(groupId, task.id)}
            className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-0 cursor-pointer" 
          />
          <span className="text-[10px] text-slate-400 group-hover:hidden">{idx + 1}</span>
        </div>
      </TableCell>

      {/* Task Name */}
      <TableCell className="font-medium text-slate-800 dark:text-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          {task.completed || task.docStatus === 2 ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          ) : task.docStatus === 1 ? (
            <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          ) : (
            <Cog className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span className={`truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>
            {task.name}
          </span>
        </div>
      </TableCell>

      {/* Due date */}
      <TableCell className="text-slate-600 dark:text-slate-400 text-xs font-medium w-36">
        {task.dueDate}
      </TableCell>

      {/* Status Badge */}
      <TableCell className="w-36">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${groupColor}`}>
          <span>{task.status}</span>
        </span>
      </TableCell>

      {/* Priority */}
      <TableCell className="w-32">
        <PriorityBadge priority={task.priority} />
      </TableCell>

      {/* Action Plus */}
      <TableCell className="text-center text-slate-300 dark:text-slate-700 group-hover:text-slate-500 cursor-pointer w-10">
        <Plus className="w-3.5 h-3.5 mx-auto" />
      </TableCell>
    </TableRow>
  )
})

TaskRowItem.displayName = 'TaskRowItem'
export default TaskRowItem
