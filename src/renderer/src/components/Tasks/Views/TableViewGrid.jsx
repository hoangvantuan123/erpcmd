import React, { memo, useCallback, useMemo } from 'react'
import DataEditor, { GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

const columns = [
  { title: 'Số Lệnh (DocNo)', width: 165 },
  { title: 'Khóa PKV', width: 120 },
  { title: 'Ngày Lập', width: 105 },
  { title: 'Công Đoạn', width: 90 },
  { title: 'Mã Hàng', width: 130 },
  { title: 'Tên Sản Phẩm / Diễn Giải', width: 280 },
  { title: 'Số Lượng', width: 100 },
  { title: 'Nhà Máy', width: 160 },
  { title: 'Người Lập', width: 130 },
  { title: 'Trạng Thái', width: 120 }
]

export const TableViewGrid = memo(({ groups, onSelectOrder }) => {
  // Flatten all tasks across groups
  const allTasks = useMemo(() => groups.flatMap(g => g.tasks), [groups])

  // Detect dark mode
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  const gridTheme = useMemo(() => {
    if (isDark) {
      return {
        accentColor: '#6366f1',
        accentLight: 'rgba(99, 102, 241, 0.25)',
        bgCell: '#09090b',
        bgCellMedium: '#18181b',
        bgHeader: '#09090b',
        bgHeaderHasFocus: '#18181b',
        bgHeaderHovered: '#27272a',
        bgBubble: '#27272a',
        bgBubbleSelected: '#3f3f46',
        textDark: '#f4f4f5',
        textMedium: '#a1a1aa',
        textLight: '#71717a',
        textBubble: '#f4f4f5',
        borderColor: '#27272a',
        headerBottomBorderColor: '#27272a',
        cellHorizontalPadding: 8,
        cellVerticalPadding: 3,
        headerIconSize: 13,
        baseFontStyle: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        headerFontStyle: '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        editorFontSize: '11px'
      }
    }
    return {
      accentColor: '#4f46e5',
      accentLight: 'rgba(79, 70, 229, 0.1)',
      bgCell: '#ffffff',
      bgCellMedium: '#f8fafc',
      bgHeader: '#f8fafc',
      bgHeaderHasFocus: '#f1f5f9',
      bgHeaderHovered: '#e2e8f0',
      textDark: '#0f172a',
      textMedium: '#475569',
      textLight: '#94a3b8',
      borderColor: '#e2e8f0',
      headerBottomBorderColor: '#cbd5e1',
      cellHorizontalPadding: 8,
      cellVerticalPadding: 3,
      headerIconSize: 13,
      baseFontStyle: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      headerFontStyle: '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      editorFontSize: '11px'
    }
  }, [isDark])

  const getCellContent = useCallback(([col, row]) => {
    const task = allTasks[row]
    if (!task) {
      return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
    }

    switch (col) {
      case 0:
        return { kind: GridCellKind.Text, data: task.docNo || '', displayData: task.docNo || '', allowOverlay: false }
      case 1:
        return { kind: GridCellKind.Text, data: task.stt || '', displayData: task.stt || '', allowOverlay: false }
      case 2:
        return { kind: GridCellKind.Text, data: task.docDate || '', displayData: task.docDate || '', allowOverlay: false }
      case 3:
        return { kind: GridCellKind.Text, data: task.processCode || '', displayData: task.processCode || '', allowOverlay: false }
      case 4:
        return { kind: GridCellKind.Text, data: task.itemCode || '', displayData: task.itemCode || '', allowOverlay: false }
      case 5:
        return { kind: GridCellKind.Text, data: task.description || '', displayData: task.description || '', allowOverlay: false }
      case 6:
        const qty = Number(task.quantity) || 0
        return { kind: GridCellKind.Number, data: qty, displayData: qty.toLocaleString(), allowOverlay: false }
      case 7:
        return { kind: GridCellKind.Text, data: task.factoryName || '', displayData: task.factoryName || '', allowOverlay: false }
      case 8:
        return { kind: GridCellKind.Text, data: task.createdByName || '', displayData: task.createdByName || '', allowOverlay: false }
      case 9:
        return { kind: GridCellKind.Text, data: task.status || '', displayData: task.status || '', allowOverlay: false }
      default:
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
    }
  }, [allTasks])

  const handleCellActivated = useCallback(([col, row]) => {
    const task = allTasks[row]
    if (task?.raw && typeof onSelectOrder === 'function') {
      onSelectOrder(task.raw)
    }
  }, [allTasks, onSelectOrder])

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-white dark:bg-black m-0 p-0 border-none">
      <DataEditor
        getCellContent={getCellContent}
        columns={columns}
        rows={allTasks.length}
        smoothScrollX={true}
        smoothScrollY={true}
        rowMarkers="checkbox-visible"
        headerHeight={32}
        rowHeight={32}
        theme={gridTheme}
        onCellActivated={handleCellActivated}
        className="w-full h-full"
      />
    </div>
  )
})

TableViewGrid.displayName = 'TableViewGrid'
export default TableViewGrid
