import React, { memo, useCallback, useMemo } from 'react'
import DataEditor, { GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

export const DEFAULT_COLUMNS = [
  { id: 'docNo', title: 'Số Lệnh (DocNo)', width: 175 },
  { id: 'stt', title: 'Khóa PKV', width: 115 },
  { id: 'docDate', title: 'Ngày Lập', width: 95 },
  { id: 'processCode', title: 'Công Đoạn', width: 85 },
  { id: 'itemCode', title: 'Mã Hàng', width: 120 },
  { id: 'itemName', title: 'Tên Sản Phẩm', width: 220 },
  { id: 'description', title: 'Diễn Giải', width: 220 },
  { id: 'quantity', title: 'Số Lượng', width: 85 },
  { id: 'factoryName', title: 'Nhà Máy', width: 160 },
  { id: 'createdByName', title: 'Người Lập', width: 140 },
  { id: 'status', title: 'Trạng Thái', width: 110 }
]

export const getTaskValueByColId = (task, colId) => {
  if (!task) return ''
  switch (colId) {
    case 'docNo': return task.docNo || ''
    case 'stt': return task.stt || ''
    case 'docDate': return task.docDate || ''
    case 'processCode': return task.processCode || ''
    case 'itemCode': return task.itemCode || ''
    case 'itemName': return task.itemName || ''
    case 'description': return task.description || ''
    case 'quantity': return Number(task.quantity) || 0
    case 'factoryName': return task.factoryName || ''
    case 'createdByName': return task.createdByName || ''
    case 'status': return task.status || ''
    default: return ''
  }
}

export const TableViewGrid = memo(({
  tasks = [],
  columns = DEFAULT_COLUMNS,
  onColumnResize,
  onColumnMoved,
  gridSelection,
  onGridSelectionChange,
  onSelectOrder
}) => {


  const getCellContent = useCallback(([col, row]) => {
    const task = tasks[row]
    if (!task) {
      return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
    }

    const column = columns[col]
    const colId = column?.id || ''

    if (colId === 'quantity') {
      const qty = Number(task.quantity) || 0
      return {
        kind: GridCellKind.Number,
        data: qty,
        displayData: qty.toLocaleString('vi-VN'),
        allowOverlay: false,
        contentAlign: 'right'
      }
    }

    const val = String(getTaskValueByColId(task, colId))
    return {
      kind: GridCellKind.Text,
      data: val,
      displayData: val,
      allowOverlay: false
    }
  }, [tasks, columns])

  const handleCellActivated = useCallback(([col, row]) => {
    const task = tasks[row]
    if (task?.raw && typeof onSelectOrder === 'function') {
      onSelectOrder(task.raw)
    }
  }, [tasks, onSelectOrder])

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-white dark:bg-black m-0 p-0 border-none rounded-none">
      <DataEditor
        getCellContent={getCellContent}
        columns={columns}
        rows={tasks.length}
        smoothScrollX={true}
        smoothScrollY={true}
        headerHeight={23}
        rowHeight={23}
        overscrollY={20}
        overscrollX={50}
        freezeTrailingRows={0}
        rowMarkers="both"
        width="100%"
        height="100%"
        rowSelect="multi"
        columnSelect="single"
        onCellActivated={handleCellActivated}
        onColumnResize={onColumnResize}
        onColumnMoved={onColumnMoved}
        gridSelection={gridSelection}
        onGridSelectionChange={onGridSelectionChange}
        keybindings={{ copy: true }}
        getCellsForSelection={true}
        fillHandle={true}
        isDraggable={false}
        trailingRowOptions={{
          hint: ' ',
          sticky: true,
          tint: true
        }}
      />
    </div>
  )
})

TableViewGrid.displayName = 'TableViewGrid'
export default TableViewGrid