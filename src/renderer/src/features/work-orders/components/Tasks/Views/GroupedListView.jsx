import React, { memo } from 'react'
import { Pin } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow } from '@/shared/ui/table'
import TaskGroupSection from '../TaskGroupSection'

export const GroupedListView = memo(({ groups, toggleGroup, toggleTaskCompleted, addTaskToGroup }) => {
  return (
    <div className="flex-1 w-full overflow-auto custom-scrollbar bg-white dark:bg-black">
      <Table className="min-w-[700px]">
        {/* Table Header */}
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">
              <input type="checkbox" className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-0 cursor-pointer" />
            </TableHead>
            <TableHead className="flex items-center justify-between">
              <span>Name</span>
              <Pin className="w-3 h-3 text-slate-300 dark:text-slate-700" />
            </TableHead>
            <TableHead className="w-36">Due date</TableHead>
            <TableHead className="w-36">Status</TableHead>
            <TableHead className="w-32">Priority</TableHead>
            <TableHead className="w-10 text-center">+</TableHead>
          </TableRow>
        </TableHeader>

        {/* Table Group Sections */}
        <TableBody>
          {groups.map((group) => (
            <TaskGroupSection
              key={group.id}
              group={group}
              onToggleGroup={toggleGroup}
              onToggleCompleted={toggleTaskCompleted}
              onAddTask={addTaskToGroup}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
})

GroupedListView.displayName = 'GroupedListView'
export default GroupedListView
