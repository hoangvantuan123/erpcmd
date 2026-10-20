import React, { useMemo } from 'react'
import { ClipboardPaste, ListChecks, Search, RotateCcw } from 'lucide-react'

const readRows = value => {
  const rows = String(value || '').replace(/\r/g, '').split('\n').map(row => row.split('\t')[0].trim())
  while (rows.length && !rows[rows.length - 1]) rows.pop()
  return rows
}

export const BatchSettleView = ({
  input = '',
  setInput,
  onPaste,
  onSearch,
  onClear,
  loading = false,
  searchSummary = null
}) => {
  const values = useMemo(() => readRows(input), [input])
  const rowCount = Math.max(5, values.length + 1)

  const updateCell = (rowIndex, value) => {
    const next = [...values]
    next[rowIndex] = value
    setInput(next.join('\n'))
  }

  const pasteIntoCell = (event, rowIndex) => {
    const pasted = event.clipboardData?.getData('text') || ''
    if (!pasted.includes('\n') && !pasted.includes('\t')) return
    event.preventDefault()
    const pastedRows = pasted.replace(/\r/g, '').split('\n').map(row => row.split('\t')[0].trim())
    while (pastedRows.length && !pastedRows[pastedRows.length - 1]) pastedRows.pop()
    const next = [...values]
    pastedRows.forEach((value, index) => { next[rowIndex + index] = value })
    setInput(next.join('\n'))
  }

  return (
    <section className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-zinc-100">
            <ListChecks size={16} className="text-indigo-600" /> Danh sách lệnh cần quyết toán
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">Dán trực tiếp một cột mã lệnh từ Excel vào ô đầu tiên của bảng.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onPaste} className="inline-flex h-7 items-center gap-1.5 rounded border border-slate-300 px-2.5 text-xs font-medium hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            <ClipboardPaste size={13} /> Dán clipboard
          </button>
          <button onClick={onClear} className="inline-flex h-7 items-center gap-1.5 rounded border border-slate-300 px-2.5 text-xs font-medium hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            <RotateCcw size={13} /> Xóa danh sách
          </button>
          <button disabled={!input.trim() || loading} onClick={onSearch} className="inline-flex h-7 items-center gap-1.5 rounded bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Search size={13} /> {loading ? 'Đang tải…' : 'Tìm kiếm'}
          </button>
        </div>
      </div>

      <div className="max-h-40 overflow-auto rounded-md border border-slate-300 dark:border-zinc-700">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-600 dark:bg-zinc-900 dark:text-zinc-300">
            <tr>
              <th className="w-12 border-b border-r border-slate-200 px-3 py-1.5 text-right font-semibold dark:border-zinc-800">#</th>
              <th className="border-b border-slate-200 px-3 py-1.5 font-semibold dark:border-zinc-800">Số lệnh công đoạn</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <tr key={rowIndex} className="group hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20">
                <td className="w-12 border-b border-r border-slate-200 bg-slate-50 px-3 py-0 text-right font-mono text-[11px] text-slate-400 dark:border-zinc-800 dark:bg-zinc-900/50">{rowIndex + 1}</td>
                <td className="border-b border-slate-200 p-0 dark:border-zinc-800">
                  <input
                    aria-label={`Số lệnh dòng ${rowIndex + 1}`}
                    value={values[rowIndex] || ''}
                    onChange={event => updateCell(rowIndex, event.target.value)}
                    onPaste={event => pasteIntoCell(event, rowIndex)}
                    placeholder={rowIndex === 0 && values.length === 0 ? 'Dán danh sách mã lệnh vào đây…' : ''}
                    className="h-7 w-full bg-transparent px-3 font-mono text-xs outline-none focus:bg-indigo-50/70 dark:focus:bg-indigo-950/30"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
        <span>Hỗ trợ dán nhiều dòng hoặc một cột từ Excel. Nhập xong bấm Tìm kiếm để nạp kết quả vào bảng bên dưới.</span>
        {searchSummary && <span className="font-medium text-slate-700 dark:text-zinc-300">
          Đã tìm {searchSummary.requested} mã · <span className="text-emerald-700 dark:text-emerald-400">{searchSummary.found} khớp</span> · <span className="text-rose-700 dark:text-rose-400">{searchSummary.missing} không tìm thấy</span>{searchSummary.duplicates > 0 ? ` · ${searchSummary.duplicates} mã trùng` : ''}
        </span>}
      </div>
      {searchSummary?.missingNumbers?.length > 0 && <div className="mt-1 truncate text-[11px] text-rose-700 dark:text-rose-400" title={searchSummary.missingNumbers.join(', ')}>
        Không tìm thấy: {searchSummary.missingNumbers.join(', ')}
      </div>}
    </section>
  )
}

export default BatchSettleView
