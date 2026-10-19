import React, { useState } from 'react'
import useGroupedTasks from '../../hooks/useGroupedTasks'
import Tabs, { TabsContent } from '../ui/tabs'
import TaskTableToolbar from './TaskTableToolbar'
import GroupedListView from './Views/GroupedListView'
import TableViewGrid from './Views/TableViewGrid'
import KanbanBoardView from './Views/KanbanBoardView'
import CalendarTasksView from './Views/CalendarTasksView'
import WorkOrderDetailModal from '../WorkOrders/WorkOrderDetailModal'

export const AllTasksTableGrid = () => {
  const [activeTab, setActiveTab] = useState('Table')
  const { 
    groups, 
    searchTerm, 
    setSearchTerm, 
    toggleGroup, 
    toggleTaskCompleted, 
    addTaskToGroup,
    loading,
    error,
    latency,
    refetch,
    selectedOrder,
    setSelectedOrder
  } = useGroupedTasks()

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black text-slate-800 dark:text-slate-200 select-none overflow-hidden m-0 p-0 border-none rounded-none font-sans relative">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full h-full flex flex-col bg-transparent m-0 p-0 border-none rounded-none flex-1 overflow-hidden"
      >
        {/* 1 & 2. Toolbar & View Switcher */}
        <TaskTableToolbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          loading={loading}
          refetch={refetch}
          latency={latency}
        />

        {/* 3. Standardized shadcn TabsContent Dynamic Views */}
        <div className="flex-1 w-full h-full min-h-0 overflow-hidden relative">
          <TabsContent value="List" className="m-0 p-0 overflow-hidden flex flex-col w-full h-full">
            <GroupedListView
              groups={groups}
              toggleGroup={toggleGroup}
              toggleTaskCompleted={toggleTaskCompleted}
              addTaskToGroup={addTaskToGroup}
            />
          </TabsContent>

          <TabsContent value="Table" className="m-0 p-0 overflow-hidden flex flex-col w-full h-full">
            <TableViewGrid 
              groups={groups} 
              onSelectOrder={setSelectedOrder}
            />
          </TabsContent>

          <TabsContent value="Board" className="m-0 p-0 overflow-hidden flex flex-col w-full h-full">
            <KanbanBoardView groups={groups} />
          </TabsContent>

          <TabsContent value="Calendar" className="m-0 p-0 overflow-hidden flex flex-col w-full h-full">
            <CalendarTasksView groups={groups} />
          </TabsContent>

          <TabsContent value="Channel" className="m-0 p-0 overflow-hidden flex flex-col w-full h-full">
            <GroupedListView
              groups={groups}
              toggleGroup={toggleGroup}
              toggleTaskCompleted={toggleTaskCompleted}
              addTaskToGroup={addTaskToGroup}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Detail and Settle Modal */}
      {selectedOrder && (
        <WorkOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}

export default AllTasksTableGrid
