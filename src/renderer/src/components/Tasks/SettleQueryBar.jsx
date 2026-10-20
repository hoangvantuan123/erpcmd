import React, { memo, useState } from 'react'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'

export const SettleQueryBar = memo(({
  filterFactory = '',
  setFilterFactory,
  filterDocNo = '',
  setFilterDocNo,
  dateFrom = '',
  setDateFrom,
  dateTo = '',
  setDateTo,
  filterStatus = '',
  setFilterStatus,
  filterCreatedBy = '',
  setFilterCreatedBy,
  filterProcess = '',
  setFilterProcess,
  filterItemCode = '',
  setFilterItemCode,
  dynamicFilters = [],
  setDynamicFilterValue,
  removeDynamicFilter,
  resetFilters,
  uniqueProcesses = [],
  uniqueFactories = [],
  filteredCount = 0
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const hasActiveFilters = Boolean(
    filterFactory || filterDocNo || dateFrom || dateTo || filterStatus !== '' ||
    filterCreatedBy || filterProcess || filterItemCode ||
    dynamicFilters.some(df => df.value && df.value.trim() !== '')
  )

  return (
    <div className="w-full bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 shrink-0 text-xs font-sans select-none">
      <div className="h-8 px-3 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-indigo-600 dark:bg-indigo-500 inline-block shrink-0" />
          <h2 className="text-xs font-semibold italic tracking-wide text-indigo-700 dark:text-indigo-400 ">
             Bộ lọc & tiêu chí truy vấn
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
              title="Xóa tất cả điều kiện lọc và đặt lại mặc định"
            >
              <X size={12} />
              <span>Xóa lọc</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
            title={isCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
          >
            <Filter size={12} />
            <span>Bộ lọc</span>
            {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>
      </div>

      {/* 2. BẢNG Ô LƯỚI TRUY VẤN CHUẨN ERP CHO LỆNH SẢN XUẤT */}
      {!isCollapsed && (
        <div className="w-full overflow-x-auto  border-slate-200 dark:border-zinc-800">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {/* HÀNG 1: Nhà máy | Số lệnh (DocNo) | Công đoạn | Trạng thái */}
              <tr className="border-b border-slate-200 dark:border-zinc-800">
                {/* 1.1 Nhà máy Label */}
                <td className="w-24 px-3 py-1 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-600 dark:text-zinc-400 border-r border-slate-200 dark:border-zinc-800 text-left whitespace-nowrap">
                  Nhà máy
                </td>
                {/* 1.1 Nhà máy Value */}
                <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800">
                  <select
                    id="filter-factory"
                    value={filterFactory}
                    onChange={(e) => setFilterFactory(e.target.value)}
                    className="w-full h-6.5 text-xs text-slate-800 dark:text-zinc-200 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="">Tất cả nhà máy</option>
                    {uniqueFactories.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </td>

                {/* 1.2 Số lệnh (DocNo) Label */}
                <td className="w-24 px-3 py-1 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-600 dark:text-zinc-400 border-r border-slate-200 dark:border-zinc-800 text-left whitespace-nowrap">
                  Số lệnh (DocNo)
                </td>
                {/* 1.2 Số lệnh (DocNo) Value */}
                <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800">
                  <input
                    id="filter-docNo"
                    type="text"
                    value={filterDocNo}
                    onChange={(e) => setFilterDocNo(e.target.value)}
                    placeholder="Mã số lệnh (VD: CD02-0626-...)"
                    className="w-full h-6.5 text-xs text-slate-800 dark:text-zinc-200 bg-transparent placeholder-slate-400 focus:outline-none"
                  />
                </td>

                {/* 1.3 Công đoạn Label */}
                <td className="w-24 px-3 py-1 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-600 dark:text-zinc-400 border-r border-slate-200 dark:border-zinc-800 text-left whitespace-nowrap">
                  Công đoạn
                </td>
                {/* 1.3 Công đoạn Value */}
                <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800">
                  <select
                    id="filter-process"
                    value={filterProcess}
                    onChange={(e) => setFilterProcess(e.target.value)}
                    className="w-full h-6.5 text-xs text-slate-800 dark:text-zinc-200 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="">Tất cả công đoạn</option>
                    {uniqueProcesses.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </td>

                {/* 1.4 Trạng thái Label */}
                <td className="w-24 px-3 py-1 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-600 dark:text-zinc-400 border-r border-slate-200 dark:border-zinc-800 text-left whitespace-nowrap">
                  Trạng thái
                </td>
                {/* 1.4 Trạng thái Value */}
                <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950">
                  <select
                    id="filter-status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full h-6.5 text-xs text-slate-800 dark:text-zinc-200 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="1">Đang sản xuất (1)</option>
                    <option value="2">Đã hoàn tất / Chốt quyết toán (2)</option>
                    <option value="0">Chờ thực hiện (0)</option>
                  </select>
                </td>
              </tr>

              {/* HÀNG 2: Từ ngày | Đến ngày | Mã hàng / SP | Người lập */}
              <tr className="border-b border-slate-200 dark:border-zinc-800">
                {/* 2.1 Từ ngày Label */}
                <td className="w-24 px-3 py-1 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-600 dark:text-zinc-400 border-r border-slate-200 dark:border-zinc-800 text-left whitespace-nowrap">
                  Từ ngày
                </td>
                {/* 2.1 Từ ngày Value */}
                <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800">
                  <input
                    id="filter-dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-6.5 text-xs text-slate-800 dark:text-zinc-200 bg-transparent focus:outline-none cursor-pointer"
                  />
                </td>

                {/* 2.2 Đến ngày Label */}
                <td className="w-24 px-3 py-1 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-600 dark:text-zinc-400 border-r border-slate-200 dark:border-zinc-800 text-left whitespace-nowrap">
                  Đến ngày
                </td>
                {/* 2.2 Đến ngày Value */}
                <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800">
                  <input
                    id="filter-dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-6.5 text-xs text-slate-800 dark:text-zinc-200 bg-transparent focus:outline-none cursor-pointer"
                  />
                </td>

                {/* 2.3 Mã hàng / SP Label */}
                <td className="w-24 px-3 py-1 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-600 dark:text-zinc-400 border-r border-slate-200 dark:border-zinc-800 text-left whitespace-nowrap">
                  Mã hàng / SP
                </td>
                {/* 2.3 Mã hàng / SP Value */}
                <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800">
                  <input
                    id="filter-itemCode"
                    type="text"
                    value={filterItemCode}
                    onChange={(e) => setFilterItemCode(e.target.value)}
                    placeholder="Mã sản phẩm hoặc tên sản phẩm..."
                    className="w-full h-6.5 text-xs text-slate-800 dark:text-zinc-200 bg-transparent placeholder-slate-400 focus:outline-none"
                  />
                </td>

                {/* 2.4 Người lập Label */}
                <td className="w-24 px-3 py-1 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-600 dark:text-zinc-400 border-r border-slate-200 dark:border-zinc-800 text-left whitespace-nowrap">
                  Người lập
                </td>
                {/* 2.4 Người lập Value */}
                <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950">
                  <input
                    id="filter-createdBy"
                    type="text"
                    value={filterCreatedBy}
                    onChange={(e) => setFilterCreatedBy(e.target.value)}
                    placeholder="Tên hoặc mã người lập lệnh..."
                    className="w-full h-6.5 text-xs text-slate-800 dark:text-zinc-200 bg-transparent placeholder-slate-400 focus:outline-none"
                  />
                </td>
              </tr>

              {/* HÀNG 3+: TIÊU CHÍ LỌC ĐỘNG TỰ SINH KHI BẤM CTRL + F */}
              {dynamicFilters.length > 0 && (
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-amber-50/20 dark:bg-amber-950/10">
                  {dynamicFilters.slice(0, 4).map((df) => (
                    <React.Fragment key={df.id}>
                      <td className="w-24 px-3 py-1 bg-amber-50/70 dark:bg-amber-950/30 font-semibold text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-zinc-800 text-left whitespace-nowrap">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate" title={df.title}>{df.title}</span>
                          <button
                            onClick={() => removeDynamicFilter(df.id)}
                            className="text-amber-700 hover:text-red-600 p-0.5 cursor-pointer rounded"
                            title="Xóa tiêu chí lọc này"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </td>
                      <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800">
                        <input
                          id={`dyn-filter-${df.id}`}
                          type="text"
                          value={df.value || ''}
                          onChange={(e) => setDynamicFilterValue(df.id, e.target.value)}
                          placeholder={`Lọc theo ${df.title}...`}
                          className="w-full h-6.5 text-xs text-slate-800 dark:text-zinc-200 bg-transparent placeholder-slate-400 focus:outline-none"
                        />
                      </td>
                    </React.Fragment>
                  ))}
                  {/* Fill empty cells if fewer than 4 dynamic filters */}
                  {Array.from({ length: Math.max(0, 4 - dynamicFilters.length) }).map((_, i) => (
                    <React.Fragment key={`empty-${i}`}>
                      <td className="w-24 px-3 py-1 bg-slate-50 dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800" />
                      <td className="w-[22%] px-2 py-0.5 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800" />
                    </React.Fragment>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. TIÊU ĐỀ KHU VỰC BẢNG: DANH SÁCH LỆNH CÔNG ĐOẠN SẢN XUẤT */}
      <div className="h-8 px-3 flex items-center justify-between bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-1 h-3.5 bg-indigo-600 dark:bg-indigo-500 inline-block shrink-0" />
          <h2 className="text-xs font-semibold italic tracking-wide text-indigo-700 dark:text-indigo-400 ">
             Danh sách lệnh công đoạn sản xuất
          </h2>
        </div>

       
      </div>
    </div>
  )
})

SettleQueryBar.displayName = 'SettleQueryBar'
export default SettleQueryBar
