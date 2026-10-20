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
  // Detect dark mode
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  // Theme with bold font by default and compact 23px row styling
  const gridTheme = useMemo(() => {
    if (isDark) {
      return {
        accentColor: '#6366f1',
        accentLight: 'rgba(99, 102, 241, 0.25)',
        bgCell: '#000000',
        bgCellMedium: '#0d0d0f',
        bgHeader: '#141416',
        bgHeaderHasFocus: '#1f1f23',
        bgHeaderHovered: '#27272a',
        bgBubble: '#27272a',
        bgBubbleSelected: '#3f3f46',
        textDark: '#ffffff',       // Đậm trắng sáng nét trên nền đen
        textMedium: '#f4f4f5',
        textLight: '#e4e4e7',
        textBubble: '#ffffff',
        borderColor: '#27272a',
        headerBottomBorderColor: '#3f3f46',
        cellHorizontalPadding: 6,
        cellVerticalPadding: 1,    // Fit 23px height without clipping
        headerIconSize: 10,
        baseFontStyle: '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',   // MÀU CHỮ ĐẬM MẶC ĐỊNH
        headerFontStyle: '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', // TIÊU ĐỀ ĐẬM MẶC ĐỊNH
        editorFontSize: '11px'
      }
    }
    return {
      accentColor: '#4f46e5',
      accentLight: 'rgba(79, 70, 229, 0.12)',
      bgCell: '#ffffff',
      bgCellMedium: '#f8fafc',
      bgHeader: '#f1f5f9',
      bgHeaderHasFocus: '#e2e8f0',
      bgHeaderHovered: '#cbd5e1',
      textDark: '#000000',         // Đậm đen tuyền nét trên nền sáng
      textMedium: '#09090b',
      textLight: '#18181b',
      borderColor: '#cbd5e1',
      headerBottomBorderColor: '#94a3b8',
      cellHorizontalPadding: 6,
      cellVerticalPadding: 1,      // Fit 23px height without clipping
      headerIconSize: 10,
      baseFontStyle: '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',   // MÀU CHỮ ĐẬM MẶC ĐỊNH
      headerFontStyle: '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', // TIÊU ĐỀ ĐẬM MẶC ĐỊNH
      editorFontSize: '11px'
    }
  }, [isDark])

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
        rowMarkers="checkbox-visible"
        headerHeight={23}
        rowHeight={23}
        theme={gridTheme}
        onCellActivated={handleCellActivated}
        onColumnResize={onColumnResize}
        onColumnMoved={onColumnMoved}
        gridSelection={gridSelection}
        onGridSelectionChange={onGridSelectionChange}
        getCellsForSelection={true}
        keybindings={{ copy: true }}
        className="w-full h-full"
      />
    </div>
  )
})

TableViewGrid.displayName = 'TableViewGrid'
export default TableViewGrid
