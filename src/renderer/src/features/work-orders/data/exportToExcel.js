import * as XLSX from 'xlsx'

/**
 * Xuất danh sách lệnh công đoạn ra file Excel chuẩn Microsoft Excel (.xlsx)
 * @param {Array} tasks - Danh sách lệnh cần xuất
 * @param {string} fileName - Tên file xuất mặc định
 */
export function exportWorkOrdersToExcel(tasks, fileName = 'Quyet_Toan_Lenh_Cong_Doan') {
  if (!tasks || tasks.length === 0) {
    alert('Không có dữ liệu để xuất Excel')
    return false
  }

  // Chuyển đổi dữ liệu sang định dạng tiếng Việt rõ ràng, chuẩn mực
  const exportData = tasks.map((t, idx) => ({
    'STT': idx + 1,
    'Số Lệnh (DocNo)': t.docNo || '',
    'Khóa PKV (STT)': t.stt || '',
    'Ngày Lập': t.docDate || '',
    'Công Đoạn': t.processCode || '',
    'Mã Hàng': t.itemCode || '',
    'Tên Sản Phẩm': t.itemName || '',
    'Diễn Giải': t.description || '',
    'Số Lượng': Number(t.quantity) || 0,
    'Nhà Máy': t.factoryName || '',
    'Người Lập': t.createdByName || '',
    'Trạng Thái': t.status || ''
  }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)

  // Cấu hình độ rộng cột tối ưu cho xem trên Excel
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 22 }, // Số Lệnh
    { wch: 14 }, // Khóa PKV
    { wch: 12 }, // Ngày Lập
    { wch: 12 }, // Công Đoạn
    { wch: 16 }, // Mã Hàng
    { wch: 32 }, // Tên Sản Phẩm
    { wch: 32 }, // Diễn Giải
    { wch: 12 }, // Số Lượng
    { wch: 26 }, // Nhà Máy
    { wch: 22 }, // Người Lập
    { wch: 16 }  // Trạng Thái
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lệnh Sản Xuất')

  const now = new Date()
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const fullFileName = `${fileName}_${timestamp}.xlsx`

  XLSX.writeFile(workbook, fullFileName)
  return true
}

export default exportWorkOrdersToExcel
