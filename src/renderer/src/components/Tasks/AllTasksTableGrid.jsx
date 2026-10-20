import React, { useState, useMemo, useCallback, useEffect } from 'react'
import useGroupedTasks from '../../hooks/useGroupedTasks'
import SettleActionBar from './SettleActionBar'
import SettleQueryBar from './SettleQueryBar'
import TableViewGrid, { DEFAULT_COLUMNS, getTaskValueByColId } from './Views/TableViewGrid'
import GroupedListView from './Views/GroupedListView'
import KanbanBoardView from './Views/KanbanBoardView'
import CalendarTasksView from './Views/CalendarTasksView'
import WorkOrderDetailModal from '../WorkOrders/WorkOrderDetailModal'
import { exportWorkOrdersToExcel } from '../../utils/exportToExcel'

export const AllTasksTableGrid = () => {
  const [activeTab, setActiveTab] = useState('Table')
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [gridSelection, setGridSelection] = useState(undefined)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  const { 
    groups, 
    rawOrders,
    filteredOrders,
    loading,
    error,
    latency,
    refetch,
    searchTerm, 
    setSearchTerm, 
    filterProcess,
    setFilterProcess,
    filterFactory,
    setFilterFactory,
    filterDocNo,
    setFilterDocNo,
    filterStatus,
    setFilterStatus,
    filterCreatedBy,
    setFilterCreatedBy,
    filterItemCode,
    setFilterItemCode,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    dynamicFilters,
    setDynamicFilterValue,
    removeDynamicFilter,
    addOrFocusDynamicFilter,
    resetFilters,
    uniqueProcesses,
    uniqueFactories,
    toggleGroup, 
    toggleTaskCompleted, 
    addTaskToGroup,
    selectedOrder,
    setSelectedOrder
  } = useGroupedTasks()

  // Flatten all tasks for table display
  const allTasks = useMemo(() => {
    return groups.flatMap(g => g.tasks)
  }, [groups])

  // Count selected rows in gridSelection
  const selectedCount = useMemo(() => {
    if (gridSelection?.rows) {
      return gridSelection.rows.length
    }
    if (gridSelection?.current?.range) {
      return gridSelection.current.range.height
    }
    return 0
  }, [gridSelection])

  // 1. Column resize handler
  const handleColumnResize = useCallback((column, newSize) => {
    setColumns(prev => 
      prev.map(c => (c.id === column.id || c.title === column.title) 
        ? { ...c, width: Math.max(45, Math.round(newSize)) } 
        : c
      )
    )
  }, [])

  // 2. Column moved / reordered handler
  const handleColumnMoved = useCallback((startIndex, endIndex) => {
    setColumns(prev => {
      const next = [...prev]
      const [removed] = next.splice(startIndex, 1)
      next.splice(endIndex, 0, removed)
      return next
    })
  }, [])

  // 3. Auto fit columns handler
  const handleAutoFitColumns = useCallback(() => {
    setColumns(prevCols => {
      return prevCols.map(col => {
        let maxLen = col.title.length
        allTasks.forEach(task => {
          const val = String(getTaskValueByColId(task, col.id) || '')
          if (val.length > maxLen) maxLen = val.length
        })
        const fitted = Math.min(420, Math.max(65, maxLen * 8.5 + 24))
        return { ...col, width: Math.round(fitted) }
      })
    })
    setFeedbackMsg('Đã tự động căn chỉnh dãn cột')
    setTimeout(() => setFeedbackMsg(null), 2500)
  }, [allTasks])

  // 4. Reset columns handler
  const handleResetColumns = useCallback(() => {
    setColumns(DEFAULT_COLUMNS)
    setFeedbackMsg('Đã khôi phục kích thước cột mặc định')
    setTimeout(() => setFeedbackMsg(null), 2500)
  }, [])

  // 5. Export Excel handler
  const handleExportExcel = useCallback(() => {
    // If rows are selected, export selected rows; otherwise export all currently filtered tasks
    let tasksToExport = allTasks
    if (gridSelection?.rows && gridSelection.rows.length > 0) {
      const selectedIndices = gridSelection.rows.toArray()
      tasksToExport = selectedIndices.map(i => allTasks[i]).filter(Boolean)
    }

    const ok = exportWorkOrdersToExcel(tasksToExport, 'Quyet_Toan_Lenh_Cong_Doan')
    if (ok) {
      setFeedbackMsg(`Đã xuất ${tasksToExport.length} lệnh ra Excel`)
      setTimeout(() => setFeedbackMsg(null), 2500)
    }
  }, [allTasks, gridSelection])

  // 6. Copy selection to clipboard in TSV format
  const handleCopySelection = useCallback(() => {
    let textToCopy = ''

    if (gridSelection?.rows && gridSelection.rows.length > 0) {
      const selectedIndices = gridSelection.rows.toArray()
      const headerRow = columns.map(c => c.title).join('\t')
      const dataRows = selectedIndices.map(i => {
        const task = allTasks[i]
        if (!task) return ''
        return columns.map(c => getTaskValueByColId(task, c.id)).join('\t')
      })
      textToCopy = [headerRow, ...dataRows].join('\n')
    } else if (gridSelection?.current?.range) {
      const { x, y, width, height } = gridSelection.current.range
      const rows = []
      for (let r = y; r < y + height; r++) {
        const task = allTasks[r]
        const cells = []
        for (let c = x; c < x + width; c++) {
          const col = columns[c]
          cells.push(task ? getTaskValueByColId(task, col.id) : '')
        }
        rows.push(cells.join('\t'))
      }
      textToCopy = rows.join('\n')
    } else if (allTasks.length > 0) {
      const task = allTasks[0]
      textToCopy = columns.map(c => getTaskValueByColId(task, c.id)).join('\t')
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setFeedbackMsg('Đã sao chép vào Clipboard (dán Excel trực tiếp)!')
          setTimeout(() => setFeedbackMsg(null), 2500)
        })
        .catch(() => {
          setFeedbackMsg('Lỗi truy cập Clipboard')
          setTimeout(() => setFeedbackMsg(null), 2500)
        })
    } else {
      setFeedbackMsg('Chưa chọn vùng dữ liệu để sao chép')
      setTimeout(() => setFeedbackMsg(null), 2000)
    }
  }, [gridSelection, columns, allTasks])

  // 7. Paste from clipboard to search input
  const handlePasteClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        const cleanText = text.trim().split(/[\t\n,]/)[0].trim()
        if (cleanText) {
          setSearchTerm(cleanText)
          setFeedbackMsg(`Đã dán "${cleanText}" vào ô tìm kiếm`)
          setTimeout(() => setFeedbackMsg(null), 2500)
        }
      }
    } catch {
      setFeedbackMsg('Trình duyệt chưa cho phép đọc Clipboard')
      setTimeout(() => setFeedbackMsg(null), 2500)
    }
  }, [setSearchTerm])

  // 8. Settle selected order
  const handleSettleSelected = useCallback(() => {
    let targetTask = null
    if (gridSelection?.rows && gridSelection.rows.length > 0) {
      const idx = gridSelection.rows.first()
      targetTask = allTasks[idx]
    } else if (gridSelection?.current?.cell) {
      const rowIdx = gridSelection.current.cell[1]
      targetTask = allTasks[rowIdx]
    } else if (allTasks.length > 0) {
      targetTask = allTasks[0]
    }

    if (targetTask?.raw) {
      setSelectedOrder(targetTask.raw)
    } else {
      setFeedbackMsg('Vui lòng chọn 1 dòng lệnh để quyết toán')
      setTimeout(() => setFeedbackMsg(null), 2500)
    }
  }, [gridSelection, allTasks, setSelectedOrder])

  // 9. Hotkey Ctrl + F: Tự sinh hoặc focus bộ lọc theo cột hiện tại đang đứng
  const handleCtrlF = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault()
      e.stopPropagation()

      let targetCol = null
      let cellVal = ''

      if (gridSelection?.current?.cell) {
        const [colIdx, rowIdx] = gridSelection.current.cell
        targetCol = columns[colIdx]
        const task = allTasks[rowIdx]
        if (task && targetCol) {
          cellVal = String(getTaskValueByColId(task, targetCol.id) || '')
        }
      } else if (gridSelection?.columns && gridSelection.columns.length > 0) {
        const colIdx = gridSelection.columns.first()
        targetCol = columns[colIdx]
      }

      if (!targetCol) {
        targetCol = columns[0] || { id: 'docNo', title: 'Số Lệnh (DocNo)' }
      }

      const res = addOrFocusDynamicFilter(targetCol.id, targetCol.title, cellVal)
      setFeedbackMsg(`Đã tạo bộ lọc: ${targetCol.title} (Ctrl+F)`)
      setTimeout(() => setFeedbackMsg(null), 3000)

      setTimeout(() => {
        const el = document.getElementById(res.id)
        if (el) {
          el.focus()
          if (typeof el.select === 'function') el.select()
        }
      }, 60)
    }
  }, [gridSelection, columns, allTasks, addOrFocusDynamicFilter])

  useEffect(() => {
    window.addEventListener('keydown', handleCtrlF)
    return () => window.removeEventListener('keydown', handleCtrlF)
  }, [handleCtrlF])

  // 10. Gửi thông tin trạng thái trang & số liệu tổng quan xuống BottomStatusBar
  useEffect(() => {
    const latStr = latency ? latency.replace(/ms/i, '').trim().toUpperCase() + 'MS' : '0MS'
    const factoryNote = filterFactory ? ` - Nhà máy: ${filterFactory}` : ''
    window.dispatchEvent(new CustomEvent('update-status-bar', {
      detail: {
        message: `Đã nạp ${filteredOrders.length} / ${allTasks.length} lệnh sản xuất${factoryNote}`,
        type: 'success',
        stats: 'A:0 / U:0 / E:0',
        rowCount: `${filteredOrders.length}/${allTasks.length}`,
        colCount: `${columns.length} CỘT`,
        latency: latStr,
        isOnline: true
      }
    }))
  }, [allTasks.length, filteredOrders.length, columns.length, latency, filterFactory])

  // 11. Gửi thông báo toast hành động xuống BottomStatusBar
  useEffect(() => {
    if (feedbackMsg) {
      window.dispatchEvent(new CustomEvent('update-status-bar', {
        detail: {
          message: feedbackMsg,
          type: 'success'
        }
      }))
    }
  }, [feedbackMsg])

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black text-slate-800 dark:text-slate-200 select-none overflow-hidden m-0 p-0 border-none rounded-none font-sans relative">
      {/* KHU VỰC 1: ACTION TOOLBAR (Thanh thao tác dạng Tab/Pill chuẩn ERP) */}
      <SettleActionBar
        totalCount={allTasks.length}
        selectedCount={selectedCount}
        latency={latency}
        loading={loading}
        refetch={refetch}
        onQueryClick={() => {
          const el = document.getElementById('filter-docNo')
          if (el) el.focus()
          refetch()
        }}
        onExportExcel={handleExportExcel}
        onCopy={handleCopySelection}
        onPaste={handlePasteClipboard}
        onSettleSelected={handleSettleSelected}
        onViewDetail={handleSettleSelected}
        onAutoFitColumns={handleAutoFitColumns}
        onResetColumns={handleResetColumns}
        feedbackMsg={feedbackMsg}
      />

      {/* KHU VỰC 2: ERP GRID FORM QUERY SEARCH BAR (Bảng ô lưới tiêu chí truy vấn có lưu SQLite) */}
      <SettleQueryBar
        filterFactory={filterFactory}
        setFilterFactory={setFilterFactory}
        filterDocNo={filterDocNo}
        setFilterDocNo={setFilterDocNo}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterCreatedBy={filterCreatedBy}
        setFilterCreatedBy={setFilterCreatedBy}
        filterProcess={filterProcess}
        setFilterProcess={setFilterProcess}
        filterItemCode={filterItemCode}
        setFilterItemCode={setFilterItemCode}
        dynamicFilters={dynamicFilters}
        setDynamicFilterValue={setDynamicFilterValue}
        removeDynamicFilter={removeDynamicFilter}
        resetFilters={resetFilters}
        uniqueProcesses={uniqueProcesses}
        uniqueFactories={uniqueFactories}
        filteredCount={filteredOrders.length}
      />

      {/* KHU VỰC 3: TABLE GRID ZONE (Bảng dữ liệu liền mạch, cao 23px, chữ đậm, dãn cột, copy/paste) */}
      <div className="flex-1 w-full h-full min-h-0 overflow-hidden relative m-0 p-0 rounded-none border-none">
        {activeTab === 'Table' ? (
          <TableViewGrid 
            tasks={allTasks}
            columns={columns}
            onColumnResize={handleColumnResize}
            onColumnMoved={handleColumnMoved}
            gridSelection={gridSelection}
            onGridSelectionChange={setGridSelection}
            onSelectOrder={setSelectedOrder}
          />
        ) : activeTab === 'List' ? (
          <GroupedListView
            groups={groups}
            toggleGroup={toggleGroup}
            toggleTaskCompleted={toggleTaskCompleted}
            addTaskToGroup={addTaskToGroup}
          />
        ) : activeTab === 'Board' ? (
          <KanbanBoardView groups={groups} />
        ) : (
          <CalendarTasksView groups={groups} />
        )}
      </div>

      {/* MODAL CHI TIẾT & QUYẾT TOÁN CÔNG ĐOẠN */}
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
