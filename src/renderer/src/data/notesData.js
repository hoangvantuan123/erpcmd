/**
 * Mock Notes & Content Data Mapped by Space / SubItem / View ID
 */
export const initialNotesData = {
  // Global Navigation Views
  'inbox': [
    {
      id: 'note-inbox-1',
      title: 'Chào mừng đến với TaskHub Spaces',
      content: 'Hệ thống quản lý công việc và tài liệu theo cấu trúc Spaces 3-Panel chuyên nghiệp.',
      modifiedDate: 'Hôm nay, 14:20',
      createdDate: 'Tạo hôm nay'
    },
    {
      id: 'note-inbox-2',
      title: 'Thông báo cập nhật quy trình S&OP Q3',
      content: 'Vui lòng kiểm tra các mục công việc trong Space OC S&OP và phê duyệt báo cáo.',
      modifiedDate: 'Hôm nay, 10:15',
      createdDate: 'Tạo hôm nay'
    }
  ],
  'calendar': [
    {
      id: 'note-cal-1',
      title: 'Họp giao ban điều hành tuần 29',
      content: 'Thời gian: 09:00 - 10:30 AM tại Phòng họp A. Thành phần: Ban Giám đốc và Trưởng phòng.',
      modifiedDate: 'Hôm nay, 08:30',
      createdDate: 'Tạo hôm nay'
    },
    {
      id: 'note-cal-2',
      title: 'Review tiến độ dự án 16 PIC',
      content: 'Đánh giá các mốc công việc Project 1 & Project 2.',
      modifiedDate: 'Hôm qua',
      createdDate: 'Tạo hôm qua'
    }
  ],
  'dashboards': [
    {
      id: 'note-dash-1',
      title: 'Báo cáo Tổng quan KPIs Công ty Q3/2026',
      content: 'Chỉ số hoàn thành kế hoạch điều phối sản xuất đạt 94.2%.',
      modifiedDate: 'Chủ Nhật',
      createdDate: '15/07/2026'
    }
  ],
  'assigned-to-me': [
    {
      id: 'note-assigned-1',
      title: 'Tái cơ cấu quy trình KHĐP - Giai đoạn 1',
      content: 'Hoàn thiện bản khảo sát các phòng ban trước ngày 25/07.',
      modifiedDate: 'Hôm nay, 11:00',
      createdDate: 'Tạo hôm nay'
    },
    {
      id: 'note-assigned-2',
      title: 'Cập nhật tài liệu chuẩn GS1 cho vật tư',
      content: 'Review file quy chuẩn mã vạch và định danh sản phẩm.',
      modifiedDate: '18/07/2026',
      createdDate: '16/07/2026'
    }
  ],
  'all-tasks': [
    {
      id: 'note-all-1',
      title: 'Tất cả nhiệm vụ Workspace - Tổng hợp',
      content: 'Danh sách tổng hợp toàn bộ nhiệm vụ và tài liệu từ tất cả các Spaces.',
      modifiedDate: 'Hôm nay',
      createdDate: 'Tạo hôm nay'
    }
  ],

  // Space: 16 PIC
  '16-pic': [
    {
      id: '1783924896',
      title: 'Quy trình vận hành 16 PIC - Tổng quan',
      content: 'Tài liệu hướng dẫn tổng quan về việc phân công trách nhiệm 16 PIC trong nhà máy.',
      modifiedDate: '13/07/2026',
      createdDate: '13/07/2026'
    },
    {
      id: '1783562732',
      title: 'Kế hoạch triển khai PIC giai đoạn 2',
      content: 'Danh sách các vị trí phụ trách (PIC) và thời hạn hoàn thành các hạng mục chuẩn bị.',
      modifiedDate: '09/07/2026',
      createdDate: '09/07/2026'
    }
  ],
  '16-pic-p1': [
    {
      id: 'note-pic-p1-1',
      title: 'Project 1: Khảo sát hiện trạng dây chuyền',
      content: 'Báo cáo khảo sát thực tế tại nhà máy số 1 và đề xuất cải tiến.',
      modifiedDate: '14/07/2026',
      createdDate: '10/07/2026'
    },
    {
      id: 'note-pic-p1-2',
      title: 'Project 1: Danh mục thiết bị cần nâng cấp',
      content: 'Bảng tổng hợp vật tư và báo giá thiết bị đo lường tự động.',
      modifiedDate: '12/07/2026',
      createdDate: '08/07/2026'
    }
  ],
  '16-pic-p2': [
    {
      id: 'note-pic-p2-1',
      title: 'Project 2: Thử nghiệm tự động hóa kho',
      content: 'Kết quả chạy thử phần mềm quản lý kho tự động kết hợp mã quét GS1.',
      modifiedDate: '11/07/2026',
      createdDate: '05/07/2026'
    }
  ],
  '16-pic-docs': [
    {
      id: 'note-pic-docs-1',
      title: 'Tài liệu kỹ thuật Hướng dẫn sử dụng 16 PIC',
      content: 'File SOP đầy đủ cho đội ngũ vận hành và bảo trì.',
      modifiedDate: '01/07/2026',
      createdDate: '01/07/2026'
    }
  ],

  // Space: Flight Plan GS1
  'flight-plan-gs1': [
    {
      id: 'note-fp-main-1',
      title: 'Kế hoạch Bay GS1 - Lộ trình tổng thể 2026',
      content: 'Chi tiết kế hoạch triển khai chuẩn hóa mã định danh hàng hóa và luồng thông tin sản phẩm.',
      modifiedDate: '16/07/2026',
      createdDate: '12/07/2026'
    }
  ],
  'fp-1': [
    {
      id: 'note-fp-1-1',
      title: 'Chi tiết lộ trình Flight Plan Phase 1',
      content: 'Danh sách nhiệm vụ ưu tiên và mốc thời gian đánh giá định kỳ.',
      modifiedDate: '18/07/2026',
      createdDate: '15/07/2026'
    }
  ],

  // Space: OC S&OP
  'oc-sop': [
    {
      id: 'note-sop-main-1',
      title: 'Chiến lược điều hành S&OP toàn công ty 2026',
      content: 'Tài liệu định hướng cân bằng Cung - Cầu và tối ưu hóa tồn kho sản xuất.',
      modifiedDate: '15/07/2026',
      createdDate: '10/07/2026'
    }
  ],
  'sop-1': [
    {
      id: 'note-sop-1-1',
      title: 'Dự báo Nhu cầu & Cung ứng Q3/2026',
      content: 'Phân tích biến động thị trường và dự báo sản lượng tiêu thụ các dòng sản phẩm chủ lực.',
      modifiedDate: '17/07/2026',
      createdDate: '12/07/2026'
    }
  ],
  'sop-2': [
    {
      id: 'note-sop-2-1',
      title: 'Biên bản cuộc họp S&OP Cấp cao tháng 7',
      content: 'Thống nhất kế hoạch sản xuất tháng 8 và phân bổ ngân sách dự phòng.',
      modifiedDate: '19/07/2026',
      createdDate: '19/07/2026'
    }
  ],

  // Space: Loss Management
  'loss-management': [
    {
      id: 'note-lm-1',
      title: 'Báo cáo Kiểm toán Tổn thất vật tư Q2',
      content: 'Tổng hợp tỷ lệ hao hụt nguyên vật liệu và đề xuất giải pháp khắc phục.',
      modifiedDate: '14/07/2026',
      createdDate: '08/07/2026'
    }
  ],

  // Space: Tái cơ cấu KHĐP
  'tai-co-cau-khdp': [
    {
      id: 'note-khdp-1',
      title: 'Phương án Tái cơ cấu Kế hoạch Điều phối',
      content: 'Mô hình điều phối mới giảm 30% thời gian chờ giữa các công đoạn.',
      modifiedDate: '20/07/2026',
      createdDate: '15/07/2026'
    }
  ]
}
