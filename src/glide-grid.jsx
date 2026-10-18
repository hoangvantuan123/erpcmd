import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import DataEditor, {
  GridCellKind,
  CompactSelection
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";

// Terminal 16-Color Palette based on User Specification
const COLORS = {
  black: "#1e1e1e",
  brightBlack: "#767676",
  red: "#c50f1f",
  brightRed: "#e74856",
  green: "#13a10e",
  brightGreen: "#16c60c",
  yellow: "#c19c00",
  brightYellow: "#f9f1a5",
  blue: "#0037da",
  brightBlue: "#3b78ff",
  purple: "#881798",
  brightPurple: "#b4009e",
  cyan: "#3a96dd",
  brightCyan: "#61d6d6",
  white: "#cccccc",
  brightWhite: "#f2f2f2"
};

// Slate / Navy Dark Theme for Glide Data Grid (#0f172a / #1e293b)
const darkTheme = {
  accentColor: COLORS.brightBlue,
  accentFg: "#ffffff",
  accentLight: "rgba(59, 120, 255, 0.25)",
  textDark: COLORS.brightWhite,
  textMedium: COLORS.brightWhite,
  textLight: COLORS.brightBlack,
  textBubble: COLORS.brightWhite,
  bgIconHeader: COLORS.brightBlack,
  fgIconHeader: COLORS.brightWhite,
  textHeader: COLORS.brightYellow,
  textGroupHeader: COLORS.brightCyan,
  textHeaderSelected: "#ffffff",
  bgCell: "#0f172a",
  bgCellMedium: "#16223b",
  bgHeader: "#131d35",
  bgHeaderHasFocus: "#1e293b",
  bgHeaderHovered: "#27354f",
  bgBubble: "#1e293b",
  bgBubbleSelected: COLORS.brightBlue,
  bgSearchResult: "rgba(193, 156, 0, 0.35)",
  borderColor: "#243452",
  drilldownBorder: "#334155",
  linkColor: COLORS.brightCyan,
  headerFontStyle: "800 11px 'Fira Code', Consolas, monospace",
  baseFontStyle: "700 11px 'Fira Code', Consolas, monospace",
  editorFontSize: "11px",
  lineHeight: 1.2
};

// ==========================================
// 1. WORK ORDERS GLIDE GRID COMPONENT
// ==========================================
export function WorkOrdersGlideGrid({
  orders = [],
  onUpdateOrder,
  onSelectionChange,
  onRowClick,
  onLoadMore
}) {
  const [gridData, setGridData] = useState(orders);
  const [gridSelection, setGridSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  });

  // Column definitions with default Groups and Resizing
  const initialColumns = useMemo(
    () => [
      { title: "STT", id: "stt_col", width: 45, group: "Hệ thống" },
      // Quyết toán lệnh & thao tác (Editable group)
      { title: "Q.Toán CĐ", id: "quyet_toan_cd", width: 85, group: "Quyết toán CĐ & Thao tác (Edit)" },
      { title: "SL Quyết Toán", id: "sl_quyet_toan", width: 110, group: "Quyết toán CĐ & Thao tác (Edit)" },
      // Thông tin lệnh công đoạn
      { title: "Lệnh Công Đoạn", id: "lenh_cong_doan", width: 175, group: "Thông tin Lệnh CĐ" },
      { title: "Mặt Hàng", id: "mat_hang", width: 130, group: "Thông tin Lệnh CĐ" },
      { title: "Tên Vật Tư, Hàng Hóa", id: "ten_vat_tu", width: 165, group: "Thông tin Lệnh CĐ" },
      { title: "Số Chi Tiết", id: "so_chi_tiet", width: 145, group: "Thông tin Lệnh CĐ" },
      { title: "Mã TT", id: "ma_tt", width: 90, group: "Thông tin Lệnh CĐ" },
      // Kế hoạch & Sản lượng
      { title: "SL Theo DO", id: "sl_can_dat_do", width: 90, group: "Kế hoạch & Sản lượng" },
      { title: "SL Điều Chỉnh", id: "sl_dieu_chinh_bd", width: 95, group: "Kế hoạch & Sản lượng" },
      { title: "SL Sau Đ/C", id: "sl_can_dat_sau_dc", width: 95, group: "Kế hoạch & Sản lượng" },
      { title: "SL Bù Hao", id: "sl_bu_hao", width: 85, group: "Kế hoạch & Sản lượng" },
      { title: "SL Cần SX", id: "sl_can_sx", width: 100, group: "Kế hoạch & Sản lượng" },
      // Thống kê & Tiến độ TT
      { title: "SL Đạt Lên TT", id: "sl_dat_da_len_tt", width: 105, group: "Thống kê TT & Nhập kho" },
      { title: "SL SX Lên TT", id: "sl_sx_da_len_tt", width: 105, group: "Thống kê TT & Nhập kho" },
      { title: "SL Đạt Thống Kê", id: "sl_dat_da_thong_ke", width: 115, group: "Thống kê TT & Nhập kho" },
      { title: "SL SX Thống Kê", id: "sl_sx_da_thong_ke", width: 115, group: "Thống kê TT & Nhập kho" },
      { title: "Q.Toán TT", id: "quyet_toan_tt", width: 85, group: "Thống kê TT & Nhập kho" },
      { title: "SL Nhập Kho", id: "sl_nhap_kho", width: 100, group: "Thống kê TT & Nhập kho" },
      // Trạng thái phần mềm & Ghi chú
      { title: "Trạng Thái", id: "trang_thai", width: 120, group: "Trạng thái & Nghiệp vụ" },
      { title: "Ngày QT Lệnh", id: "ngay_quyet_toan", width: 110, group: "Trạng thái & Nghiệp vụ" },
      { title: "Ghi Chú Quyết Toán", id: "ghi_chu_quyet_toan", width: 160, group: "Trạng thái & Nghiệp vụ" }
    ],
    []
  );

  const [columns, setColumns] = useState(initialColumns);

  // Sorting state
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Row grouping / Tree hierarchy state
  const [groupByCol, setGroupByCol] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchTargetCol, setSearchTargetCol] = useState("all");

  // Context Menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Synchronize incoming orders
  useEffect(() => {
    setGridData(orders);
  }, [orders]);

  // Handle Ctrl+F for Table Column Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  // Column Resizing Handler
  const onColumnResize = useCallback((column, newSize) => {
    setColumns(prev =>
      prev.map(c => (c.id === column.id ? { ...c, width: Math.max(30, newSize) } : c))
    );
  }, []);

  // Header Clicked Handler (Sorting)
  const onHeaderClicked = useCallback(
    (colIndex) => {
      const col = columns[colIndex];
      if (!col || col.id === "stt_col") return;
      const isSame = sortCol === col.id;
      const nextAsc = isSame ? !sortAsc : true;
      setSortCol(col.id);
      setSortAsc(nextAsc);
    },
    [columns, sortCol, sortAsc]
  );

  // Build sorted and hierarchically grouped display rows
  const displayRows = useMemo(() => {
    // 1. Filter by search if active
    let list = [...gridData];
    if (searchValue.trim()) {
      const q = searchValue.trim().toLowerCase();
      list = list.filter(item => {
        if (searchTargetCol && searchTargetCol !== "all") {
          const val = String(item[searchTargetCol] || "").toLowerCase();
          return val.includes(q);
        }
        return Object.values(item).some(v => String(v || "").toLowerCase().includes(q));
      });
    }

    // 2. Sort if active
    if (sortCol) {
      list.sort((a, b) => {
        let valA = a[sortCol];
        let valB = b[sortCol];
        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        let cmp = 0;
        if (!isNaN(numA) && !isNaN(numB)) {
          cmp = numA - numB;
        } else {
          cmp = String(valA).localeCompare(String(valB), "vi");
        }
        return sortAsc ? cmp : -cmp;
      });
    }

    // 3. Tree Grouping if groupByCol is active
    if (!groupByCol) {
      return list.map((item, idx) => ({ ...item, _isGroupHeader: false, _originalIndex: idx }));
    }

    // Grouping into tree branches
    const groups = new Map();
    list.forEach((item, idx) => {
      const gKey = String(item[groupByCol] || "Không xác định");
      if (!groups.has(gKey)) {
        groups.set(gKey, []);
      }
      groups.get(gKey).push({ ...item, _isGroupHeader: false, _originalIndex: idx });
    });

    const result = [];
    groups.forEach((items, gKey) => {
      const isCollapsed = collapsedGroups.has(gKey);
      result.push({
        _isGroupHeader: true,
        _groupKey: gKey,
        _groupCount: items.length,
        _isCollapsed: isCollapsed,
        lenh_cong_doan: `${isCollapsed ? "▶" : "▼"} [NHÓM] ${gKey} (${items.length} dòng)`
      });
      if (!isCollapsed) {
        items.forEach(child => result.push(child));
      }
    });

    return result;
  }, [gridData, searchValue, searchTargetCol, sortCol, sortAsc, groupByCol, collapsedGroups]);

  // Cell Content Callback
  const getCellContent = useCallback(
    ([col, row]) => {
      const record = displayRows[row];
      if (!record) {
        return {
          kind: GridCellKind.Text,
          allowOverlay: false,
          data: "",
          displayData: ""
        };
      }

      const colDef = columns[col];
      const colId = colDef ? colDef.id : "";

      // Group Header Row rendering
      if (record._isGroupHeader) {
        if (colId === "lenh_cong_doan" || colId === "stt_col") {
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: record.lenh_cong_doan,
            displayData: colId === "stt_col" ? "[+]" : record.lenh_cong_doan,
            themeOverride: {
              textDark: COLORS.brightYellow,
              bgCell: "#1e293b",
              baseFontStyle: "800 11px 'Fira Code', Consolas, monospace"
            }
          };
        }
        return {
          kind: GridCellKind.Text,
          allowOverlay: false,
          data: "",
          displayData: "",
          themeOverride: { bgCell: "#1e293b" }
        };
      }

      // Standard Data Row
      switch (colId) {
        case "stt_col": {
          const stt = record._originalIndex !== undefined ? record._originalIndex + 1 : row + 1;
          return {
            kind: GridCellKind.Number,
            allowOverlay: false,
            data: stt,
            displayData: String(stt),
            contentAlign: "center",
            themeOverride: {
              textMedium: COLORS.brightBlack,
              baseFontStyle: "700 11px 'Fira Code', Consolas, monospace"
            }
          };
        }

        case "quyet_toan_cd": {
          const isChecked = String(record.quyet_toan_cd) === "1";
          return {
            kind: GridCellKind.Boolean,
            data: isChecked,
            allowOverlay: false,
            contentAlign: "center"
          };
        }

        case "sl_quyet_toan": {
          const val = record.sl_quyet_toan !== undefined ? String(record.sl_quyet_toan) : "";
          return {
            kind: GridCellKind.Text,
            allowOverlay: true,
            data: val,
            displayData: val || "0",
            contentAlign: "right",
            themeOverride: {
              textDark: COLORS.brightYellow,
              baseFontStyle: "800 11px 'Fira Code', Consolas, monospace"
            }
          };
        }

        case "lenh_cong_doan": {
          const doc = record.lenh_cong_doan || record.doc_no || "";
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: doc,
            displayData: doc,
            themeOverride: {
              textDark: COLORS.brightCyan,
              baseFontStyle: "800 11px 'Fira Code', Consolas, monospace"
            }
          };
        }

        case "mat_hang": {
          const val = String(record.mat_hang || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            themeOverride: {
              textDark: COLORS.brightWhite,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        case "ten_vat_tu": {
          const val = String(record.ten_vat_tu || record.item_name || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            themeOverride: {
              textDark: COLORS.brightWhite,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        case "sl_can_dat_do": {
          const val = String(record.sl_can_dat_do || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            contentAlign: "right",
            themeOverride: {
              textDark: COLORS.white,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        case "sl_dieu_chinh_bd": {
          const val = String(record.sl_dieu_chinh_bd || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            contentAlign: "right",
            themeOverride: {
              textDark: COLORS.brightRed,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        case "sl_can_dat_sau_dc": {
          const val = String(record.sl_can_dat_sau_dc || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            contentAlign: "right",
            themeOverride: {
              textDark: COLORS.brightYellow,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        case "sl_can_sx": {
          const val = String(record.sl_can_sx || "0");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            contentAlign: "right",
            themeOverride: {
              textDark: COLORS.brightWhite,
              baseFontStyle: "800 11px 'Fira Code', Consolas, monospace"
            }
          };
        }

        case "so_chi_tiet": {
          const val = String(record.so_chi_tiet || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            themeOverride: {
              textDark: COLORS.brightPurple,
              baseFontStyle: "800 11px 'Fira Code', monospace"
            }
          };
        }

        case "ma_tt": {
          const val = String(record.ma_tt || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            themeOverride: {
              textDark: COLORS.brightCyan,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        case "sl_dat_da_len_tt":
        case "sl_dat_da_thong_ke": {
          const val = String(record[colId] || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            contentAlign: "right",
            themeOverride: {
              textDark: COLORS.brightGreen,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        case "sl_nhap_kho": {
          const val = String(record.sl_nhap_kho || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            contentAlign: "right",
            themeOverride: {
              textDark: COLORS.brightCyan,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        // Cột Trạng Thái: Trạng thái phần mềm / dây chuyền (Đang sản xuất, Đã hoàn thiện, Chờ thực hiện)
        case "trang_thai": {
          const st = record.trang_thai || "Đang sản xuất";
          const isDone = st.includes("hoàn thiện") || st.includes("Hoàn tất");
          const isWorking = st.includes("sản xuất");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: st,
            displayData: `[${st}]`,
            themeOverride: {
              textDark: isDone ? COLORS.brightGreen : isWorking ? COLORS.brightBlue : COLORS.brightYellow,
              baseFontStyle: "800 11px 'Fira Code', monospace"
            }
          };
        }

        case "ngay_quyet_toan": {
          const val = String(record.ngay_quyet_toan || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            themeOverride: {
              textDark: COLORS.brightYellow,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        case "quyet_toan_tt": {
          const isChecked = String(record.quyet_toan_tt) === "1";
          return {
            kind: GridCellKind.Boolean,
            data: isChecked,
            allowOverlay: false,
            contentAlign: "center"
          };
        }

        default: {
          const rawVal = record[colId] !== undefined ? String(record[colId]) : "";
          const isNumCol = colId.startsWith("sl_");
          return {
            kind: GridCellKind.Text,
            allowOverlay: true,
            data: rawVal,
            displayData: rawVal,
            contentAlign: isNumCol ? "right" : "left",
            themeOverride: {
              textDark: isNumCol ? COLORS.white : COLORS.brightWhite,
              baseFontStyle: "700 11px 'Fira Code', Consolas, monospace"
            }
          };
        }
      }
    },
    [displayRows, columns]
  );

  // Cell Edited Callback (Editable for Quyết toán CĐ & SL Quyết Toán)
  const onCellEdited = useCallback(
    ([col, row], newVal) => {
      const record = displayRows[row];
      if (!record || record._isGroupHeader) return;

      const colDef = columns[col];
      if (!colDef) return;
      const colId = colDef.id;

      // Identify record in master gridData
      const origIdx = record._originalIndex !== undefined ? record._originalIndex : row;

      setGridData(prev => {
        const next = [...prev];
        const updated = { ...next[origIdx] };

        if (colId === "quyet_toan_cd") {
          const checked = Boolean(newVal.data);
          updated.quyet_toan_cd = checked ? "1" : "0";
          if (checked) {
            updated.ngay_quyet_toan = new Date().toLocaleDateString("vi-VN");
            if (!updated.sl_quyet_toan || updated.sl_quyet_toan === "0") {
              updated.sl_quyet_toan = updated.sl_can_sx || updated.sl_can_dat_sau_dc || "0";
            }
          }
        } else if (colId === "sl_quyet_toan") {
          const val = String(newVal.data || "").trim();
          updated.sl_quyet_toan = val;
          const num = parseFloat(val) || 0;
          if (num > 0 && updated.quyet_toan_cd !== "1") {
            updated.quyet_toan_cd = "1";
            updated.ngay_quyet_toan = new Date().toLocaleDateString("vi-VN");
          }
        } else {
          updated[colId] = newVal.data;
        }

        next[origIdx] = updated;

        if (onUpdateOrder) {
          onUpdateOrder(updated, origIdx);
        }

        return next;
      });
    },
    [displayRows, columns, onUpdateOrder]
  );

  // Selection change
  const handleGridSelectionChange = useCallback(
    newSelection => {
      setGridSelection(newSelection);
      if (onSelectionChange && newSelection.rows) {
        const selectedIndices = newSelection.rows.toArray();
        const selectedRows = selectedIndices
          .map(idx => displayRows[idx])
          .filter(r => r && !r._isGroupHeader);
        onSelectionChange(selectedRows, selectedIndices);
      }
    },
    [displayRows, onSelectionChange]
  );

  // Expand / Collapse Group or Click Row
  const onCellClicked = useCallback(
    ([col, row], e) => {
      const record = displayRows[row];
      if (!record) return;

      if (record._isGroupHeader) {
        const gKey = record._groupKey;
        setCollapsedGroups(prev => {
          const next = new Set(prev);
          if (next.has(gKey)) next.delete(gKey);
          else next.add(gKey);
          return next;
        });
        return;
      }

      if (onRowClick) {
        onRowClick(record, row);
      }
    },
    [displayRows, onRowClick]
  );

  // Right-Click Context Menu for Grouping and Column Operations
  const onCellContextMenu = useCallback(
    ([col, row], e) => {
      e.preventDefault();
      const colDef = columns[col];
      const targetColId = colDef ? colDef.id : null;
      const targetColTitle = colDef ? colDef.title : "";

      setContextMenu({
        x: e.bounds ? e.bounds.x + 20 : 150,
        y: e.bounds ? e.bounds.y + 20 : 100,
        colId: targetColId,
        colTitle: targetColTitle,
        row
      });
    },
    [columns]
  );

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [contextMenu]);

  // Infinite Scroll Trigger
  const onVisibleRegionChanged = useCallback(
    range => {
      if (!onLoadMore) return;
      if (range.y + range.height >= displayRows.length - 5) {
        onLoadMore();
      }
    },
    [displayRows.length, onLoadMore]
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* SEARCH OVERLAY (Ctrl+F or Search Bar) */}
      {showSearch && (
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 15,
            zIndex: 100,
            background: "#131d35",
            border: `1px solid ${COLORS.brightBlue}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.8)",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "11px",
            fontFamily: "'Fira Code', Consolas, monospace"
          }}
        >
          <span style={{ color: COLORS.brightYellow, fontWeight: 800 }}>[TIM KIEM - Ctrl+F]:</span>
          <select
            value={searchTargetCol}
            onChange={e => setSearchTargetCol(e.target.value)}
            style={{
              background: "#0f172a",
              color: COLORS.brightWhite,
              border: `1px solid ${COLORS.brightBlack}`,
              padding: "2px 6px",
              fontSize: "11px",
              fontWeight: 700
            }}
          >
            <option value="all">-- Toàn bộ các cột --</option>
            {columns.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            autoFocus
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            placeholder="Nhập từ khóa tìm..."
            style={{
              background: "#0f172a",
              color: COLORS.brightWhite,
              border: `1px solid ${COLORS.brightCyan}`,
              padding: "2px 8px",
              fontSize: "11px",
              fontWeight: 700,
              width: "180px",
              outline: "none"
            }}
          />
          <button
            onClick={() => {
              setSearchValue("");
              setShowSearch(false);
            }}
            style={{
              background: COLORS.red,
              color: "#fff",
              border: "none",
              padding: "2px 8px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "11px"
            }}
            title="Đóng tìm kiếm (Esc)"
          >
            [X]
          </button>
        </div>
      )}

      {/* ACTIVE GROUP INDICATOR BAR */}
      {groupByCol && (
        <div
          style={{
            padding: "2px 10px",
            background: "#16223b",
            borderBottom: "1px solid #243452",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "11px",
            color: COLORS.brightCyan,
            fontWeight: 700
          }}
        >
          <span>[NHOM] Đang phân nhóm theo: <strong>{columns.find(c => c.id === groupByCol)?.title || groupByCol}</strong></span>
          <button
            onClick={() => {
              setGroupByCol(null);
              setCollapsedGroups(new Set());
            }}
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.brightRed}`,
              color: COLORS.brightRed,
              padding: "1px 6px",
              fontSize: "10px",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            [Hủy nhóm]
          </button>
        </div>
      )}

      {/* GLIDE DATA GRID HIGH-PERFORMANCE CANVAS */}
      <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
        <DataEditor
          width="100%"
          height="100%"
          rows={displayRows.length}
          columns={columns}
          headerHeight={23}
          rowHeight={23}
          groupHeaderHeight={23}
          copyHeaders={true}
          getCellsForSelection={true}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          onCellClicked={onCellClicked}
          onCellContextMenu={onCellContextMenu}
          onColumnResize={onColumnResize}
          onHeaderClicked={onHeaderClicked}
          gridSelection={gridSelection}
          onGridSelectionChange={handleGridSelectionChange}
          onVisibleRegionChanged={onVisibleRegionChanged}
          rowMarkers="both"
          theme={darkTheme}
          smoothScrollX={true}
          smoothScrollY={true}
          keybindings={{ search: true }}
        />
      </div>

      {/* RIGHT-CLICK CONTEXT MENU (Tree Grouping, Resizing, Sorting) */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
            background: "#131d35",
            border: `1px solid ${COLORS.brightBlue}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.85)",
            padding: "4px 0",
            minWidth: "190px",
            fontFamily: "'Fira Code', Consolas, monospace",
            fontSize: "11px"
          }}
        >
          <div
            style={{
              padding: "4px 10px",
              color: COLORS.brightYellow,
              fontWeight: 800,
              borderBottom: "1px solid #243452"
            }}
          >
            Cột: {contextMenu.colTitle}
          </div>
          {contextMenu.colId && contextMenu.colId !== "stt_col" && (
            <div
              onClick={() => {
                setGroupByCol(contextMenu.colId);
                setCollapsedGroups(new Set());
                setContextMenu(null);
              }}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                color: COLORS.brightWhite,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#1e293b")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span>[+]</span> Nhóm theo cột này (Tạo cây)
            </div>
          )}
          {groupByCol && (
            <div
              onClick={() => {
                setGroupByCol(null);
                setCollapsedGroups(new Set());
                setContextMenu(null);
              }}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                color: COLORS.brightRed,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#1e293b")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span>[-]</span> Bỏ nhóm (Hiển thị phẳng)
            </div>
          )}
          <div
            onClick={() => {
              if (contextMenu.colId) {
                setSortCol(contextMenu.colId);
                setSortAsc(true);
              }
              setContextMenu(null);
            }}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
              color: COLORS.brightCyan,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#1e293b")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span>[^]</span> Sắp xếp tăng dần (A-Z)
          </div>
          <div
            onClick={() => {
              if (contextMenu.colId) {
                setSortCol(contextMenu.colId);
                setSortAsc(false);
              }
              setContextMenu(null);
            }}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
              color: COLORS.brightCyan,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#1e293b")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span>[v]</span> Sắp xếp giảm dần (Z-A)
          </div>
          <div
            onClick={() => {
              setSearchTargetCol(contextMenu.colId || "all");
              setShowSearch(true);
              setContextMenu(null);
            }}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
              color: COLORS.brightYellow,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#1e293b")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span>[*]</span> Tìm kiếm theo cột này (Ctrl+F)
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. ROLL LOADING GLIDE GRID COMPONENT
// ==========================================
export function RollsGlideGrid({ rolls = [], onUpdateRoll, onActionRoll }) {
  const [data, setData] = useState(rolls);

  useEffect(() => {
    setData(rolls);
  }, [rolls]);

  const columns = useMemo(
    () => [
      { title: "STT", id: "stt", width: 50, group: "Hệ thống" },
      { title: "Mã Cuộn (Roll ID)", id: "rollId", width: 160, group: "Thông tin cuộn" },
      { title: "Vị Trí Trục Cấp", id: "stand", width: 170, group: "Thông tin cuộn" },
      { title: "Loại Giấy", id: "paper", width: 140, group: "Thông tin cuộn" },
      { title: "Khổ (mm)", id: "width", width: 90, group: "Quy cách" },
      { title: "Định Lượng", id: "gsm", width: 100, group: "Quy cách" },
      { title: "Khối Lượng Ban Đầu", id: "initKg", width: 130, group: "Khối lượng (kg)" },
      { title: "Đã Xả (kg)", id: "usedKg", width: 110, group: "Khối lượng (kg)" },
      { title: "Còn Lại (kg)", id: "remKg", width: 120, group: "Khối lượng (kg)" },
      { title: "Trạng Thái Cuộn", id: "status", width: 160, group: "Vận hành giàn sóng" },
      { title: "Thời Gian Lên Giàn", id: "loadedAt", width: 140, group: "Vận hành giàn sóng" }
    ],
    []
  );

  const [cols, setCols] = useState(columns);

  const onColumnResize = useCallback((column, newSize) => {
    setCols(prev =>
      prev.map(c => (c.id === column.id ? { ...c, width: Math.max(30, newSize) } : c))
    );
  }, []);

  const getCellContent = useCallback(
    ([col, row]) => {
      const record = data[row];
      if (!record) {
        return {
          kind: GridCellKind.Text,
          allowOverlay: false,
          data: "",
          displayData: ""
        };
      }

      const colDef = cols[col];
      const colId = colDef ? colDef.id : "";

      switch (colId) {
        case "stt":
          return {
            kind: GridCellKind.Number,
            allowOverlay: false,
            data: row + 1,
            displayData: String(row + 1),
            contentAlign: "center",
            themeOverride: {
              textMedium: COLORS.brightBlack,
              baseFontStyle: "700 11px 'Fira Code', Consolas, monospace"
            }
          };

        case "rollId":
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: record.rollId || "",
            displayData: record.rollId || "",
            themeOverride: {
              textDark: COLORS.brightYellow,
              baseFontStyle: "800 11px 'Fira Code', Consolas, monospace"
            }
          };

        case "stand":
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: record.stand || "",
            displayData: record.stand || "",
            themeOverride: {
              textDark: COLORS.brightWhite,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };

        case "paper":
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: record.paper || "",
            displayData: record.paper || "",
            themeOverride: {
              textDark: COLORS.white,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };

        case "gsm":
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: `${record.gsm} gsm`,
            displayData: `${record.gsm} gsm`,
            contentAlign: "right",
            themeOverride: {
              textDark: COLORS.white,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };

        case "initKg":
        case "usedKg": {
          const num = Number(record[colId]) || 0;
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: String(num),
            displayData: `${num.toLocaleString()} kg`,
            contentAlign: "right",
            themeOverride: {
              textDark: COLORS.white,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        case "remKg": {
          const num = Number(record.remKg) || 0;
          const isWarning = (record.status || "").includes("Sắp hết");
          return {
            kind: GridCellKind.Text,
            allowOverlay: true,
            data: String(num),
            displayData: `${num.toLocaleString()} kg`,
            contentAlign: "right",
            themeOverride: {
              textDark: isWarning ? COLORS.brightRed : COLORS.brightGreen,
              baseFontStyle: "800 11px 'Fira Code', Consolas, monospace"
            }
          };
        }

        case "status": {
          const st = record.status || "";
          const isWarning = st.includes("Sắp hết") || st.includes("CẢNH BÁO");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: st,
            displayData: `[${st}]`,
            themeOverride: {
              textDark: isWarning ? COLORS.brightRed : COLORS.brightGreen,
              baseFontStyle: "800 11px 'Fira Code', monospace"
            }
          };
        }

        case "loadedAt": {
          const val = String(record.loadedAt || "");
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: val,
            displayData: val,
            themeOverride: {
              textDark: COLORS.brightYellow,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }

        default: {
          const val = record[colId] !== undefined ? String(record[colId]) : "";
          return {
            kind: GridCellKind.Text,
            allowOverlay: true,
            data: val,
            displayData: val,
            themeOverride: {
              textDark: COLORS.white,
              baseFontStyle: "700 11px 'Fira Code', monospace"
            }
          };
        }
      }
    },
    [data, cols]
  );

  const onCellEdited = useCallback(
    ([col, row], newVal) => {
      const colDef = cols[col];
      if (!colDef) return;
      const colId = colDef.id;

      setData(prev => {
        const next = [...prev];
        const record = { ...next[row] };

        if (colId === "remKg" || colId === "usedKg" || colId === "initKg") {
          const num = parseFloat(newVal.data) || 0;
          record[colId] = num;
          if (colId === "usedKg") {
            record.remKg = Math.max(0, record.initKg - num);
          } else if (colId === "remKg") {
            record.usedKg = Math.max(0, record.initKg - num);
          }
          if (record.remKg < 200) {
            record.status = "Sắp hết (Cần nối)";
          } else {
            record.status = "Đang cấp giàn sóng";
          }
        } else {
          record[colId] = newVal.data;
        }

        next[row] = record;
        if (onUpdateRoll) onUpdateRoll(record, row);
        return next;
      });
    },
    [cols, onUpdateRoll]
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <DataEditor
        width="100%"
        height="100%"
        rows={data.length}
        columns={cols}
        headerHeight={23}
        rowHeight={23}
        groupHeaderHeight={23}
        copyHeaders={true}
        getCellsForSelection={true}
        getCellContent={getCellContent}
        onCellEdited={onCellEdited}
        onColumnResize={onColumnResize}
        rowMarkers="both"
        theme={darkTheme}
        smoothScrollX={true}
        smoothScrollY={true}
      />
    </div>
  );
}

// Global Bridge for Native / Vanilla JS Integration
window.GlideDataGridMount = {
  renderWorkOrders: (container, props) => {
    ReactDOM.render(React.createElement(WorkOrdersGlideGrid, props), container);
  },
  renderRolls: (container, props) => {
    ReactDOM.render(React.createElement(RollsGlideGrid, props), container);
  },
  unmount: container => {
    ReactDOM.unmountComponentAtNode(container);
  }
};
