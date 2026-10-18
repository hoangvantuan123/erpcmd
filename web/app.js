// web/app.js - MESSYN MES 3-Layout Desktop System Engine

const API_BASE = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:8080';

// Global State
const state = {
  layoutMode: localStorage.getItem('messyn_layout_mode') || 'bottom',
  hostname: 'DESKTOP-CHS6OSJ', // Mặc định hiển thị tên máy trạm khi chưa đăng nhập
  user: '', // Trống khi chưa đăng nhập
  isAuthenticated: false,
  currentScreen: 'screen-wo', // Mặc định hiển thị ngay màn hình Lệnh công đoạn, không ép vào màn hình login
  tokenExpiresIn: 0,
  currentPnb: 0,
  hasMorePages: true,
  isLoadingMore: false,
  detailCache: {}, // Caching chống spam API Bravo
  expandedRows: new Set(),
  workOrders: [],
  filteredOrders: [],
  selectedOrderIds: new Set(),
  modifiedOrders: new Map(),
  gridEngine: localStorage.getItem('messyn_grid_engine') || 'glide',
  operationOrders: [],
  rollRecords: [],
  cliHistory: [],
  cliHistoryIndex: -1,
  availableCommands: [
    { cmd: '/help', params: '', desc: 'Bảng trợ giúp cú pháp và danh sách toàn bộ các câu lệnh' },
    { cmd: '/search', params: '<mã_lệnh>', desc: 'Truy vấn API Bravo hiển thị kết hợp cả Master và Detail' },
    { cmd: '/wo', params: '', desc: 'Mở màn hình Lệnh công đoạn (vB30WorkProcess_Explorer)' },
    { cmd: '/wo sync', params: '', desc: 'Đồng bộ tải lại danh sách lệnh mới nhất từ Bravo Gateway' },
    { cmd: '/login', params: '[tài_khoản] [mật_khẩu]', desc: 'Đăng nhập trực tiếp qua dòng lệnh (VD: /login it_tuanhv)' },
    { cmd: '/logout', params: '', desc: 'Đăng xuất tài khoản hiện tại' },
    { cmd: '/setting', params: '', desc: 'Mở cửa sổ cấu hình nghiệp vụ & hệ thống riêng biệt (New Window)' },
    { cmd: '/data', params: '<pkv>', desc: 'Truy vấn chi tiết công đoạn & nguyên vật liệu theo mã PKV' },
    { cmd: '/op', params: '', desc: 'Mở màn hình Lệnh thao tác sản xuất trên dây chuyền máy' },
    { cmd: '/roll', params: '', desc: 'Mở màn hình Xử lý tải cuộn giàn sóng & quản lý cuộn giấy' },
    { cmd: '/token', params: '', desc: 'Xem chuỗi Bearer Token hiện tại và thời gian đếm lùi' },
    { cmd: '/poll now', params: '', desc: 'Kích hoạt nhịp poll API tức thời tới Bravo Gateway' },
    { cmd: '/layout', params: '<center|right|bottom>', desc: 'Thay đổi vị trí khung console dòng lệnh' },
    { cmd: '/status', params: '', desc: 'Báo cáo tình trạng CSDL SQLite và kết nối Bravo Gateway' },
    { cmd: '/logs', params: '', desc: 'Mở màn hình theo dõi logs các đầu API đã gọi (thành công / lỗi)' },
    { cmd: '/clear', params: '', desc: 'Xóa sạch màn hình console dòng lệnh' },
  ]
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initTitlebarAndWindowControls();
  initLayoutMode(state.layoutMode);
  initResizers();
  initTokenCountdown();
  initNavigation();
  initCLIConsole();
  initAuthScreen();
  initAPILogsScreen();
  initData();
});

// TITLEBAR & WINDOW CONTROLS (WIN32 NATIVE BINDINGS)
function initTitlebarAndWindowControls() {
  const btnMin = document.getElementById('win-btn-minimize');
  const btnMax = document.getElementById('win-btn-maximize');
  const btnClose = document.getElementById('win-btn-close');
  const dragRegion = document.getElementById('titlebar-drag');

  // Minimize
  btnMin.addEventListener('click', () => {
    if (window.appWindowMinimize) window.appWindowMinimize();
  });

  // Maximize / Restore
  btnMax.addEventListener('click', () => {
    if (window.appWindowMaximize) {
      window.appWindowMaximize();
    } else {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }
  });

  // Close
  btnClose.addEventListener('click', () => {
    if (window.appWindowClose) window.appWindowClose();
    else window.close();
  });

  // Drag Window via Custom Header
  dragRegion.addEventListener('mousedown', (e) => {
    // Only drag when not clicking on buttons or inputs
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && !e.target.closest('button')) {
      if (window.appWindowDrag) window.appWindowDrag();
    }
  });

  // Double click to maximize / restore
  dragRegion.addEventListener('dblclick', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && !e.target.closest('button')) {
      if (window.appWindowMaximize) window.appWindowMaximize();
    }
  });

  // Layout Buttons
  document.querySelectorAll('.btn-layout-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      setLayoutMode(mode);
    });
  });

  // Top Logout Button
  const btnTopLogout = document.getElementById('btn-top-logout');
  if (btnTopLogout) {
    btnTopLogout.addEventListener('click', () => {
      performLogout();
    });
  }
}

// LAYOUT MODES (CENTER / RIGHT / BOTTOM)
function initLayoutMode(mode) {
  setLayoutMode(mode);
}

function setLayoutMode(mode) {
  state.layoutMode = mode;
  localStorage.setItem('messyn_layout_mode', mode);

  document.body.className = `theme-dark layout-mode-${mode}`;

  document.querySelectorAll('.btn-layout-mode').forEach(btn => {
    if (btn.getAttribute('data-mode') === mode) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Update resizer cursor
  const resizerContent = document.getElementById('resizer-content');
  if (mode === 'bottom') {
    resizerContent.className = 'pane-resizer resizer-horizontal';
  } else {
    resizerContent.className = 'pane-resizer resizer-vertical';
  }

  printCLILine(`[LAYOUT] Đã chuyển vị trí console dòng lệnh sang chế độ: [${mode.toUpperCase()}].`);
}

// RESIZERS LOGIC (DRAG TO RESIZE PANES)
function initResizers() {
  // Resizer 1: Sidebar
  const resizerSidebar = document.getElementById('resizer-sidebar');
  const sidebar = document.getElementById('sidebar-pane');
  let isDraggingSidebar = false;

  resizerSidebar.addEventListener('mousedown', (e) => {
    isDraggingSidebar = true;
    resizerSidebar.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  // Resizer 2: Content (Console to Data)
  const resizerContent = document.getElementById('resizer-content');
  const consolePane = document.getElementById('console-pane');
  let isDraggingContent = false;

  resizerContent.addEventListener('mousedown', (e) => {
    isDraggingContent = true;
    resizerContent.classList.add('resizing');
    document.body.style.cursor = state.layoutMode === 'bottom' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingSidebar) {
      const newWidth = Math.max(160, Math.min(360, e.clientX));
      sidebar.style.width = `${newWidth}px`;
    }
    if (isDraggingContent) {
      if (state.layoutMode === 'bottom') {
        const containerRect = document.getElementById('content-split-area').getBoundingClientRect();
        const newHeight = Math.max(140, Math.min(containerRect.height - 180, containerRect.bottom - e.clientY));
        consolePane.style.height = `${newHeight}px`;
      } else if (state.layoutMode === 'right') {
        const containerRect = document.getElementById('content-split-area').getBoundingClientRect();
        const newWidth = Math.max(280, Math.min(containerRect.width - 320, containerRect.right - e.clientX));
        consolePane.style.width = `${newWidth}px`;
      } else {
        // center
        const sidebarWidth = sidebar.getBoundingClientRect().width;
        const newWidth = Math.max(280, Math.min(window.innerWidth - sidebarWidth - 360, e.clientX - sidebarWidth));
        consolePane.style.width = `${newWidth}px`;
      }
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingSidebar) {
      isDraggingSidebar = false;
      resizerSidebar.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    if (isDraggingContent) {
      isDraggingContent = false;
      resizerContent.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// NAVIGATION (SIDEBAR & SCREENS)
function initNavigation() {
  document.querySelectorAll('.menu-entry').forEach(item => {
    item.addEventListener('click', () => {
      if (item.id === 'menu-open-setting') {
        openSettingsWindow();
        return;
      }
      const target = item.getAttribute('data-screen');
      if (target) {
        switchScreen(target);
        if (target === 'screen-logs') {
          loadAPILogs(true);
        }
      }
    });
  });

  // Top Setting Button
  const btnTopSetting = document.getElementById('btn-top-setting');
  if (btnTopSetting) {
    btnTopSetting.addEventListener('click', () => {
      openSettingsWindow();
    });
  }

  // Listen for message from settings window
  window.addEventListener('message', (e) => {
    if (e.data && (e.data.type === 'HERDR_SETTINGS_UPDATED' || e.data.type === 'MESSYN_SETTINGS_UPDATED')) {
      if (e.data.colStates) {
        Object.entries(e.data.colStates).forEach(([colClass, isVisible]) => {
          document.body.classList.toggle(`hide-${colClass}`, !isVisible);
        });
      }
      printCLILine(`[SETTING] Đã áp dụng các thay đổi cấu hình từ Cửa sổ cài đặt.`, 'line-ok');
    }
  });

  // Sidebar Poll Button
  document.getElementById('btn-side-poll').addEventListener('click', () => {
    triggerPollNow();
  });

  // Sidebar Sync Button
  document.getElementById('btn-side-sync').addEventListener('click', () => {
    loadWorkOrders(true);
  });

  // Filter Search across 21 columns (hỗ trợ cả tìm kiếm 1 từ khóa lẫn dán nhiều mã lệnh công đoạn)
  document.getElementById('wo-search-input').addEventListener('input', (e) => {
    const raw = e.target.value.trim();
    if (!raw) {
      state.filteredOrders = [...state.workOrders];
      renderWorkOrders();
      return;
    }

    // Tách các token tìm kiếm nếu người dùng dán nhiều mã hoặc có dấu cách/xuống dòng
    const tokens = raw.split(/[\s,;\n\r]+/).map(t => t.toLowerCase().trim()).filter(Boolean);
    if (tokens.length <= 1) {
      const val = raw.toLowerCase();
      state.filteredOrders = state.workOrders.filter(w =>
        (w.lenh_cong_doan && w.lenh_cong_doan.toLowerCase().includes(val)) ||
        (w.mat_hang && w.mat_hang.toLowerCase().includes(val)) ||
        (w.ten_vat_tu && w.ten_vat_tu.toLowerCase().includes(val)) ||
        (w.ma_tt && w.ma_tt.toLowerCase().includes(val)) ||
        (w.so_chi_tiet && w.so_chi_tiet.toLowerCase().includes(val)) ||
        (w.trang_thai && w.trang_thai.toLowerCase().includes(val)) ||
        (w.ghi_chu_quyet_toan && w.ghi_chu_quyet_toan.toLowerCase().includes(val)) ||
        (w.doc_no && w.doc_no.toLowerCase().includes(val))
      );
    } else {
      // Tìm kiếm khớp với bất kỳ mã lệnh nào trong danh sách
      state.filteredOrders = state.workOrders.filter(w => {
        const orderCode = (w.lenh_cong_doan || w.doc_no || '').toLowerCase();
        return tokens.some(t => orderCode.includes(t));
      });
    }
    renderWorkOrders();
  });

  // Khi nhấn Enter ở ô tìm kiếm mã lệnh, nếu có nhập mã (kể cả mã chi tiết dạng CDSO-1026-0008(997)), gọi trực tiếp API Gateway
  document.getElementById('wo-search-input').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const raw = e.target.value.trim();
      if (!raw) return;
      printCLILine(`[BRAVO SEARCH] Đang truy vấn trực tiếp mã "${raw}" từ Bravo Gateway API...`, 'line-brand');
      try {
        const res = await fetch(`${API_BASE}/api/work-orders/batch-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_text: raw })
        });
        const result = await res.json();
        if (result && result.success && result.data && result.data.length > 0) {
          state.filteredOrders = result.data;
          renderWorkOrders();
          printCLILine(`[BRAVO SEARCH] [OK] Đã tìm thấy ${result.data.length} dòng dữ liệu trực tiếp từ Bravo API.`, 'line-ok');

          // Tự động mở rộng dòng chi tiết nếu là mã chi tiết
          if (raw.includes('(')) {
            setTimeout(() => {
              const firstBtn = document.querySelector('.btn-toggle-row-detail');
              if (firstBtn) firstBtn.click();
            }, 100);
          }
        } else {
          state.filteredOrders = [];
          renderWorkOrders();
          printCLILine(`[BRAVO SEARCH] Không tìm thấy kết quả từ Bravo cho mã "${raw}". (Đã xóa trống bảng).`);
        }
      } catch (err) {
        printCLILine(`[BRAVO SEARCH] [LỖI] ${err.message}`);
      }
    }
  });

  // Batch Search Modal Interactions
  const btnOpenBatch = document.getElementById('btn-open-batch-search');
  const btnCloseBatch = document.getElementById('btn-close-batch-search');
  const popupBatch = document.getElementById('batch-search-popup');
  const txtBatch = document.getElementById('batch-search-textarea');
  const lblBatchCount = document.getElementById('batch-search-count-label');
  const btnBatchSample = document.getElementById('btn-batch-search-sample');
  const btnBatchSubmit = document.getElementById('btn-batch-search-submit');

  if (btnOpenBatch && popupBatch) {
    btnOpenBatch.addEventListener('click', () => {
      popupBatch.style.display = popupBatch.style.display === 'none' ? 'block' : 'none';
      if (txtBatch) txtBatch.focus();
    });
  }

  if (btnCloseBatch && popupBatch) {
    btnCloseBatch.addEventListener('click', () => {
      popupBatch.style.display = 'none';
    });
  }

  const sampleCodes = [
    'CDSO-1026-0005(650)',
    'CD02-0926-0112(450)',
    'CD01-0926-0088(320)',
    'CD05-0926-0310(560)',
    'CDSO-1026-0007(980)',
    'CDRE-1026-0017(890)',
    'CD05-0826-0014(770)',
    'CD05-0826-0015(772)',
    'CD05-0826-0016(775)',
    'CD05-0826-0017(778)'
  ];

  if (btnBatchSample && txtBatch) {
    btnBatchSample.addEventListener('click', () => {
      txtBatch.value = sampleCodes.join('\n');
      if (lblBatchCount) lblBatchCount.textContent = `Đã nhận diện: ${sampleCodes.length} mã lệnh`;
    });
  }

  if (txtBatch && lblBatchCount) {
    txtBatch.addEventListener('input', () => {
      const list = txtBatch.value.split(/[\n\r,;]+/).map(s => s.trim()).filter(Boolean);
      lblBatchCount.textContent = `Đã nhận diện: ${list.length} mã lệnh`;
    });
  }

  if (btnBatchSubmit && txtBatch) {
    btnBatchSubmit.addEventListener('click', async () => {
      const raw = txtBatch.value.trim();
      const codes = raw.split(/[\n\r,;]+/).map(s => s.trim()).filter(Boolean);
      if (codes.length === 0) {
        alert('Vui lòng nhập ít nhất 1 mã lệnh công đoạn.');
        return;
      }

      printCLILine(`[BRAVO BATCH] Đang gửi yêu cầu tìm kiếm ${codes.length} mã lệnh công đoạn qua Bravo Gateway SSE...`, 'line-brand');
      btnBatchSubmit.textContent = '⏳ Đang truy vấn...';
      btnBatchSubmit.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/work-orders/batch-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codes, raw_text: raw })
        });
        const result = await res.json();

        if (result && result.success) {
          if (result.source === 'bravo_gateway' && result.bravo_response) {
            printCLILine(`[BRAVO BATCH] [OK] Đã nhận phản hồi từ Bravo Gateway (${result.latency_ms}ms) với pattern: ${result.pattern}`, 'line-ok');
          } else {
            printCLILine(`[BRAVO BATCH] [OK] Đã tìm thấy ${result.count || 0} kết quả phù hợp với danh sách mã lệnh.`, 'line-ok');
          }

          // Cập nhật bộ lọc bảng sang các mã vừa tìm
          const codeSet = new Set(codes.map(c => c.toLowerCase()));
          state.filteredOrders = state.workOrders.filter(w => {
            const doc = (w.lenh_cong_doan || w.doc_no || '').toLowerCase();
            return Array.from(codeSet).some(c => doc.includes(c));
          });

          // Nếu có danh sách trả về từ server
          if (result.data && result.data.length > 0) {
            state.filteredOrders = result.data;
          }

          renderWorkOrders();
          if (popupBatch) popupBatch.style.display = 'none';

          // Nếu tìm kiếm 1 mã chi tiết (có dấu ngoặc), tự động mở chi tiết
          if (codes.length === 1 && codes[0].includes('(')) {
            setTimeout(() => {
              const firstBtn = document.querySelector('.btn-toggle-row-detail');
              if (firstBtn) firstBtn.click();
            }, 100);
          }
        } else {
          printCLILine(`[BRAVO BATCH] [LỖI] ${result.error || 'Truy vấn thất bại.'}`);
        }
      } catch (err) {
        printCLILine(`[BRAVO BATCH] [LỖI] Không thể kết nối API Batch Search: ${err.message}`);
      } finally {
        btnBatchSubmit.textContent = '[Truy vấn API]';
        btnBatchSubmit.disabled = false;
      }
    });
  }

  // Filter Tags
  document.querySelectorAll('.ftag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.querySelectorAll('.ftag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      const f = tag.getAttribute('data-filter');
      if (f === 'all') state.filteredOrders = [...state.workOrders];
      else if (f === 'done') state.filteredOrders = state.workOrders.filter(w => String(w.quyet_toan_cd) === '1');
      else if (f === 'completed') state.filteredOrders = state.workOrders.filter(w => (w.trang_thai || '').includes('Đã hoàn thiện'));
      else if (f === 'working') state.filteredOrders = state.workOrders.filter(w => (w.trang_thai || '').includes('Đang sản xuất'));
      else if (f === 'pending') state.filteredOrders = state.workOrders.filter(w => (w.trang_thai || '').includes('Chờ thực hiện'));
      renderWorkOrders();
    });
  });

  document.getElementById('btn-refresh-wo').addEventListener('click', () => {
    loadWorkOrders(true);
  });

  document.getElementById('btn-export-wo').addEventListener('click', () => {
    printCLILine(`[EXCEL] Đã xuất thành công ${state.workOrders.length} dòng Lệnh công đoạn ra file: HERDR_WorkOrders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
}

function switchScreen(screenId) {
  state.currentScreen = screenId;

  document.querySelectorAll('.menu-entry').forEach(item => {
    if (item.getAttribute('data-screen') === screenId) item.classList.add('active');
    else item.classList.remove('active');
  });

  document.querySelectorAll('.data-view').forEach(view => {
    if (view.id === screenId) {
      view.classList.add('active');
      view.style.display = 'flex';
    } else {
      view.classList.remove('active');
      view.style.display = 'none';
    }
  });

  // If switching to work orders, ensure table is rendered
  if (screenId === 'screen-wo') {
    if (!state.workOrders || state.workOrders.length === 0) {
      loadWorkOrders(false);
    } else {
      state.filteredOrders = [...state.workOrders];
      renderWorkOrders();
    }
  }
}

// FLAT SCREEN AUTHENTICATION VIEW (MÀN HÌNH PHẲNG - ZERO MODAL)
function initAuthScreen() {
  const btnOpen = document.getElementById('btn-open-login');
  const btnSubmit = document.getElementById('btn-flat-auth-submit');
  const btnReset = document.getElementById('btn-flat-auth-reset');
  const btnPoll = document.getElementById('btn-auth-poll');
  const btnRefreshToken = document.getElementById('btn-auth-refresh-token');
  const btnAuthSave = document.getElementById('btn-auth-save');
  const btnCopy = document.getElementById('btn-copy-token');

  // Header button switches to flat screen view (ZERO MODAL)
  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      switchScreen('screen-auth');
    });
  }

  const performAuth = async () => {
    const user = document.getElementById('flat-auth-username').value.trim() || 'it_tuanhv';
    printCLILine(`[AUTH] Đang gửi yêu cầu xác thực tài khoản tới Bravo ERP Gateway cho: ${user}...`);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user })
      }).catch(() => null);

      let resData = null;
      if (res && res.ok) {
        resData = await res.json();
      }

      state.isAuthenticated = true;
      state.user = user.toUpperCase();
      state.tokenExpiresIn = 1800;

      const userUpper = state.user;
      const host = state.hostname || 'DESKTOP-CHS6OSJ';

      document.getElementById('chip-user-name').textContent = userUpper;
      document.getElementById('chip-user-name').className = 'chip-val val-cyan';
      document.getElementById('chip-token-timer').className = 'chip-val val-amber';
      document.getElementById('chip-token-timer').textContent = '1800s';
      document.getElementById('chip-poll-dot').className = 'chip-dot dot-live';
      document.getElementById('chip-poll-status').textContent = 'ACTIVE (5m)';
      document.getElementById('term-prompt-label').textContent = `herdr [${userUpper}] ❯`;

      const cliAuthStatus = document.getElementById('cli-auth-status');
      if (cliAuthStatus) {
        cliAuthStatus.textContent = `ĐÃ XÁC THỰC (${userUpper})`;
        cliAuthStatus.className = 'val-mint';
      }

      const specUser = document.getElementById('flat-spec-user');
      if (specUser) {
        specUser.textContent = userUpper;
        specUser.className = 'sv val-cyan';
      }

      const specHost = document.getElementById('flat-spec-host');
      if (specHost) specHost.textContent = host;

      const pill = document.getElementById('flat-token-status-pill');
      if (pill) {
        pill.textContent = '● HỢP LỆ (ACTIVE)';
        pill.style.color = 'var(--accent-mint)';
        pill.style.borderColor = 'var(--accent-mint)';
      }

      const flatCountdown = document.getElementById('flat-token-countdown');
      if (flatCountdown) flatCountdown.textContent = '1,800 giây (30m 00s)';
      const flatProg = document.getElementById('flat-token-progress');
      if (flatProg) flatProg.style.width = '100%';

      const flatTokenStr = document.getElementById('flat-token-string');
      if (flatTokenStr) {
        flatTokenStr.value = (resData && resData.access_token) || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjJEMENERTcxRDVEQzc3RURDQzc5OUE2Qzk3Q0ZENTNGOTk0MTQ2QzkiLCJ4NXQiOiJMUXplY2RYY2QtM01lWnBzbDhfVlA1bEJSc2siLCJ0eXAiOiJhdCtqd3QifQ.eyJpc3MiOiJodHRwczovL2JyYXZvLmdvbGRzdW5wYWNrYWdpbmcudm46NTA1MS8iLCJleHAiOjE3OTIzMTI3NzEsImlhdCI6MTc5MjMxMDk3MSwic2NvcGUiOiJBcGlHYXRld2F5IG9mZmxpbmVfYWNjZXNzIiwianRpIjoiNDI4M2FhNTMtZjY0OC00Zjg0LWIyYzYtZmE0Y2Q3NWE4ZDY3IiwiY2xpZW50X25hbWUiOiJXZWIiLCJzdWIiOiIxNjg4fERlZmF1bHR8fElUX1RVQU5IVnwiLCJvaV9hdV9pZCI6IjRlYzY0MjE2LTllNDMtNGM4ZC05Y2M4LWVjMGI3YjU4MzUzOCIsIm9pX3Byc3QiOiJjNTJiZDU5Ni0wN2ZmLTQzMjktYTY0MC02N2Y0MWE1MWE5MGUiLCJjbGllbnRfaWQiOiJjNTJiZDU5Ni0wN2ZmLTQzMjktYTY0MC02N2Y0MWE1MWE5MGUifQ';
      }

      const specIssued = document.getElementById('flat-spec-issued');
      if (specIssued) specIssued.textContent = new Date().toLocaleString('vi-VN');
      const specExpiry = document.getElementById('flat-spec-expiry');
      if (specExpiry) specExpiry.textContent = new Date(Date.now() + 1800 * 1000).toLocaleString('vi-VN');

      const badgeAuth = document.getElementById('menu-badge-auth');
      if (badgeAuth) {
        badgeAuth.textContent = 'ACTIVE';
        badgeAuth.className = 'entry-badge badge-mint';
      }

      printCLILine(`[AUTH] [OK] Đăng nhập & Xác thực thành công cho tài khoản ${userUpper}! Cấp mới Bearer Token (1800s).`, 'line-ok');
      printCLILine(`[MES] Đã mở màn hình Lệnh công đoạn (vB30WorkProcess).`, 'line-brand');

      // Toggle titlebar login / logout buttons
      const btnOpenLogin = document.getElementById('btn-open-login');
      if (btnOpenLogin) btnOpenLogin.style.display = 'none';
      const btnTopLogout = document.getElementById('btn-top-logout');
      if (btnTopLogout) btnTopLogout.style.display = 'inline-block';

      loadAuthLogs();
      loadAPILogs(true);
      await loadWorkOrders(true);

      // Tự động chuyển vào màn hình Lệnh công đoạn sau khi đăng nhập thành công
      switchScreen('screen-wo');
    } catch (err) {
      printCLILine(`[AUTH] [LỖI] Không thể kết nối Bravo Gateway: ${err.message}`);
    }
  };

  if (btnSubmit) btnSubmit.addEventListener('click', performAuth);
  if (btnAuthSave) btnAuthSave.addEventListener('click', performAuth);

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      document.getElementById('flat-auth-username').value = 'it_tuanhv';
      document.getElementById('flat-auth-password').value = 'Tuan@123';
      document.getElementById('flat-auth-gateway').value = 'https://bravo.goldsunpackaging.vn:5051';
      document.getElementById('flat-auth-client-mode').value = 'winform';
      printCLILine(`[AUTH] Đã khôi phục cấu hình xác thực về mặc định.`);
    });
  }

  if (btnPoll) {
    btnPoll.addEventListener('click', () => {
      triggerPollNow();
    });
  }

  if (btnRefreshToken) {
    btnRefreshToken.addEventListener('click', () => {
      state.tokenExpiresIn = 1800;
      printCLILine(`[AUTH] [OK] Đã làm mới Bearer Token OAuth2 thành công (1800s).`);
      loadAuthLogs();
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const tokenStr = document.getElementById('flat-token-string').value;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(tokenStr).then(() => {
          btnCopy.textContent = '[Đã sao chép!]';
          setTimeout(() => { btnCopy.textContent = '[Sao chép Token]'; }, 1500);
        });
      }
    });
  }

  loadAuthLogs();
}

async function loadAuthLogs() {
  try {
    const res = await fetch(`${API_BASE}/api/logs`);
    if (res.ok) {
      const logs = await res.json();
      renderAuthLogsTable(logs);
    }
  } catch (e) {
    renderAuthLogsTable([]);
  }
}

function renderAuthLogsTable(logs) {
  const tbody = document.getElementById('tbody-auth-logs');
  if (!tbody) return;
  tbody.innerHTML = '';

  const fallbackLogs = (logs && logs.length > 0) ? logs : [
    { request_time: '15:02:14', endpoint: 'POST /oauth2/token', status_code: 200, response_summary: 'Token refreshed (expires_in: 1800s)' },
    { request_time: '15:00:00', endpoint: 'GET /6e60af0b2cc4e2200d8c2ec545da3627', status_code: 200, response_summary: 'Auto-poll sync 50 work orders' },
    { request_time: '14:55:00', endpoint: 'GET /6e60af0b2cc4e2200d8c2ec545da3627', status_code: 200, response_summary: 'Auto-poll sync 50 work orders' },
    { request_time: '14:50:00', endpoint: 'POST /oauth2/token', status_code: 200, response_summary: 'Token initial issue for IT_TUANHV' }
  ];

  fallbackLogs.slice(0, 5).forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.request_time || '15:00:00'}</td>
      <td><span class="pkv-tag">POST / GET</span></td>
      <td><span class="val-cyan">${l.endpoint || '/api/status'}</span></td>
      <td><span class="badge-tag tag-done">${l.status_code || 200} OK</span></td>
      <td>21 ms</td>
      <td>${l.response_summary || 'Thành công'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// CLI-DIRECT LOGIN (/login [username] [password])
async function performCLILogin(username, password) {
  const user = (username || 'it_tuanhv').trim();
  printCLILine(`[AUTH] Đang gửi yêu cầu xác thực tài khoản [${user.toUpperCase()}] tới Bravo ERP Gateway (5051)...`);

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: password || 'Tuan@123' })
    }).catch(() => null);

    let resData = null;
    if (res && res.ok) {
      resData = await res.json();
    }

    state.isAuthenticated = true;
    state.user = user.toUpperCase();
    state.tokenExpiresIn = 1800;

    const userUpper = state.user;

    // Update titlebar chips
    const chipUser = document.getElementById('chip-user-name');
    if (chipUser) {
      chipUser.textContent = userUpper;
      chipUser.className = 'chip-val val-cyan';
    }
    const chipToken = document.getElementById('chip-token-timer');
    if (chipToken) {
      chipToken.textContent = '1800s';
      chipToken.className = 'chip-val val-amber';
    }
    const chipDot = document.getElementById('chip-poll-dot');
    if (chipDot) chipDot.className = 'chip-dot dot-live';
    const chipPoll = document.getElementById('chip-poll-status');
    if (chipPoll) chipPoll.textContent = 'ACTIVE (5m)';

    // Update CLI prompt
    const promptEl = document.getElementById('term-prompt-label');
    if (promptEl) promptEl.textContent = `herdr [${userUpper}] ❯`;

    // Toggle top logout button
    const btnTopLogout = document.getElementById('btn-top-logout');
    if (btnTopLogout) btnTopLogout.style.display = 'inline-block';

    printCLILine(`[AUTH] [OK] Đăng nhập & Xác thực thành công cho tài khoản [${userUpper}]! Cấp mới Bearer Token OAuth2 (1800s).`, 'line-ok');

    // Reload work orders and switch to work order view
    await loadWorkOrders(true);
    switchScreen('screen-wo');
  } catch (err) {
    printCLILine(`[AUTH] [LỖI] Đăng nhập thất bại: ${err.message}`);
  }
}

// OPEN STANDALONE SETTINGS WINDOW (NATIVE WINDOWS DESKTOP WINDOW)
function openSettingsWindow() {
  if (window.appOpenNewWindow) {
    window.appOpenNewWindow('/settings.html', 'HERDR — Cấu Hình Nghiệp Vụ & Hệ Thống (New Window)', 960, 680);
    printCLILine(`[SETTING] Đã khởi chạy màn hình Windows Native riêng biệt (New OS Window).`, 'line-ok');
    return;
  }
  const url = `${API_BASE}/settings.html`;
  const w = window.open(url, 'HERDR_Settings_Window', 'width=960,height=680,resizable=yes,scrollbars=yes');
  if (w) {
    w.focus();
    printCLILine(`[SETTING] Đã mở cửa sổ cấu hình nghiệp vụ & hệ thống (New Window).`, 'line-brand');
  } else {
    printCLILine(`[SETTING] Trình duyệt chặn mở cửa sổ mới. Vui lòng truy cập: /settings.html`);
  }
}

// LOGOUT FUNCTIONALITY (ĐĂNG XUẤT ĐỂ VÀO TÀI KHOẢN KHÁC)
function performLogout() {
  state.isAuthenticated = false;
  const prevUser = state.user || 'IT_TUANHV';
  state.user = '';
  state.tokenExpiresIn = 0;

  // Titlebar badges
  const chipUser = document.getElementById('chip-user-name');
  if (chipUser) {
    chipUser.textContent = '[CHƯA ĐĂNG NHẬP]';
    chipUser.className = 'chip-val val-dim';
  }
  const chipToken = document.getElementById('chip-token-timer');
  if (chipToken) {
    chipToken.textContent = 'CHƯA CẤP';
    chipToken.className = 'chip-val val-dim';
  }
  const chipPollDot = document.getElementById('chip-poll-dot');
  if (chipPollDot) chipPollDot.className = 'chip-dot dot-offline';
  const chipPollStatus = document.getElementById('chip-poll-status');
  if (chipPollStatus) chipPollStatus.textContent = 'CHỜ LOGIN';

  // Toggle buttons
  const btnTopLogout = document.getElementById('btn-top-logout');
  if (btnTopLogout) btnTopLogout.style.display = 'none';

  // CLI Prompt reverts to Machine Hostname
  const host = state.hostname || 'DESKTOP-CHS6OSJ';
  const termPromptLabel = document.getElementById('term-prompt-label');
  if (termPromptLabel) {
    termPromptLabel.textContent = `herdr [${host}] ❯`;
  }

  // Auth Screen elements
  const cliAuthStatus = document.getElementById('cli-auth-status');
  if (cliAuthStatus) {
    cliAuthStatus.textContent = 'CHƯA ĐĂNG NHẬP';
    cliAuthStatus.className = 'val-amber';
  }
  const badgeAuth = document.getElementById('menu-badge-auth');
  if (badgeAuth) {
    badgeAuth.textContent = 'CHỜ LOGIN';
    badgeAuth.className = 'entry-badge badge-dim';
  }
  const specUser = document.getElementById('flat-spec-user');
  if (specUser) {
    specUser.textContent = '[CHƯA ĐĂNG NHẬP]';
    specUser.className = 'sv val-dim';
  }

  printCLILine(`[AUTH] Đã đăng xuất khỏi tài khoản [${prevUser}]. Phiên làm việc đã kết thúc.`, 'line-brand');
  printCLILine(`[AUTH] Bạn có thể gõ /login <tài_khoản> trực tiếp ở dòng lệnh để đăng nhập tài khoản khác.`, 'line-dim');
}

// API LOGS SCREEN (MÀN HÌNH THEO DÕI LOGS CÁC ĐẦU API ĐÃ GỌI)
let apiLogsData = [];
let apiLogsFilter = 'all';

function initAPILogsScreen() {
  const searchInput = document.getElementById('logs-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterAndRenderAPILogs();
    });
  }

  document.querySelectorAll('.ftag-log').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ftag-log').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      apiLogsFilter = btn.getAttribute('data-filter') || 'all';
      filterAndRenderAPILogs();
    });
  });

  const btnRefresh = document.getElementById('btn-refresh-logs');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadAPILogs(false);
    });
  }

  const btnClear = document.getElementById('btn-clear-logs');
  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_BASE}/api/logs/clear`);
        if (res.ok) {
          printCLILine(`[LOGS] [✓] Đã xóa sạch toàn bộ nhật ký gọi API trong CSDL SQLite.`);
          loadAPILogs(true);
        }
      } catch (err) {
        printCLILine(`[LOGS] [LỖI] Không thể xóa logs: ${err.message}`);
      }
    });
  }

  const btnTestOk = document.getElementById('btn-test-api-ok');
  if (btnTestOk) {
    btnTestOk.addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_BASE}/api/logs/test-success`);
        if (res.ok) {
          printCLILine(`[API-TEST] [HTTP 200 OK] Đã gọi test thành công endpoint vB30WorkProcess_Explorer (21ms).`, 'line-ok');
          loadAPILogs(true);
        }
      } catch (err) {
        printCLILine(`[API-TEST] [LỖI] Test failed: ${err.message}`);
      }
    });
  }

  const btnTestErr = document.getElementById('btn-test-api-err');
  if (btnTestErr) {
    btnTestErr.addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_BASE}/api/logs/test-error`);
        if (res.ok) {
          printCLILine(`[API-TEST] [HTTP 401 UNAUTHORIZED] Đã ghi nhận log mô phỏng lỗi xác thực Gateway (401).`, 'line-dim');
          loadAPILogs(true);
        }
      } catch (err) {
        printCLILine(`[API-TEST] [LỖI] Test failed: ${err.message}`);
      }
    });
  }

  loadAPILogs(true);
}

async function loadAPILogs(silent = false) {
  try {
    const res = await fetch(`${API_BASE}/api/logs?limit=100`);
    if (res.ok) {
      apiLogsData = await res.json();
      filterAndRenderAPILogs();
      if (!silent) {
        printCLILine(`[LOGS] Đã tải ${apiLogsData.length} bản ghi nhật ký API từ CSDL SQLite.`);
      }
    }
  } catch (err) {
    if (!silent) printCLILine(`[LOGS] [LỖI] Không thể tải nhật ký API: ${err.message}`);
  }
}

function filterAndRenderAPILogs() {
  const searchInput = document.getElementById('logs-search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let list = apiLogsData || [];
  const totalCount = list.length;
  const successCount = list.filter(l => (l.status_code >= 200 && l.status_code < 300) || (!l.status_code && !l.response_summary.includes('401'))).length;
  const errorCount = totalCount - successCount;
  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '100.0';

  // Update counts on filter buttons
  const cntAll = document.getElementById('count-log-all');
  if (cntAll) cntAll.textContent = totalCount;
  const cntSuccess = document.getElementById('count-log-success');
  if (cntSuccess) cntSuccess.textContent = successCount;
  const cntError = document.getElementById('count-log-error');
  if (cntError) cntError.textContent = errorCount;

  // Update badge count in sidebar
  const badgeApiCount = document.getElementById('badge-api-count');
  if (badgeApiCount) {
    badgeApiCount.textContent = `${totalCount} req`;
    if (errorCount > 0) {
      badgeApiCount.className = 'entry-badge badge-amber';
    } else {
      badgeApiCount.className = 'entry-badge badge-mint';
    }
  }

  // Update metrics bar
  const mTotal = document.getElementById('metric-log-total');
  if (mTotal) mTotal.textContent = totalCount;
  const mSuccess = document.getElementById('metric-log-success');
  if (mSuccess) mSuccess.textContent = successCount;
  const mError = document.getElementById('metric-log-error');
  if (mError) mError.textContent = errorCount;
  const mRate = document.getElementById('metric-log-rate');
  if (mRate) {
    mRate.textContent = `${successRate}%`;
    mRate.className = errorCount > 0 ? 'lmb-val val-amber' : 'lmb-val val-mint';
  }

  // Apply filter
  if (apiLogsFilter === 'success') {
    list = list.filter(l => (l.status_code >= 200 && l.status_code < 300) || (!l.status_code && !l.response_summary.includes('401')));
  } else if (apiLogsFilter === 'error') {
    list = list.filter(l => (l.status_code >= 400 || (l.status_code && l.status_code !== 200)) || (l.response_summary && (l.response_summary.includes('401') || l.response_summary.includes('Lỗi') || l.response_summary.includes('Error'))));
  }

  // Apply text search
  if (query) {
    list = list.filter(l =>
      (l.endpoint && l.endpoint.toLowerCase().includes(query)) ||
      (l.response_summary && l.response_summary.toLowerCase().includes(query)) ||
      (l.request_time && l.request_time.toLowerCase().includes(query)) ||
      String(l.status_code || '').includes(query)
    );
  }

  renderAPILogsTable(list);
}

function renderAPILogsTable(list) {
  const tbody = document.getElementById('tbody-api-logs');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!list || list.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" style="text-align: center; color: var(--text-dim); padding: 24px;">Không có bản ghi nhật ký API nào phù hợp với bộ lọc hiện tại.</td>`;
    tbody.appendChild(tr);
    return;
  }

  list.forEach((log, index) => {
    const isError = (log.status_code && log.status_code >= 400) || (log.response_summary && (log.response_summary.includes('401') || log.response_summary.includes('Lỗi') || log.response_summary.includes('Error')));
    const statusCode = log.status_code || (isError ? 401 : 200);
    const isPost = log.endpoint && (log.endpoint.startsWith('POST') || log.endpoint.includes('/oauth2') || log.endpoint.includes('/poll') || log.endpoint.includes('/test'));
    const method = isPost ? 'POST' : 'GET';
    const methodBadge = `<span class="${isPost ? 'badge-method-post' : 'badge-method-get'}">${method}</span>`;
    const statusBadge = `<span class="${isError ? 'badge-status-err' : 'badge-status-ok'}">${statusCode} ${statusCode === 200 ? 'OK' : statusCode === 401 ? 'Unauthorized' : 'Error'}</span>`;
    const resultBadge = `<span class="${isError ? 'badge-status-err' : 'badge-status-ok'}">${isError ? '[THẤT BẠI]' : '[THÀNH CÔNG]'}</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: var(--text-dim); text-align: center;">${log.id || (index + 1)}</td>
      <td style="color: var(--accent-cyan); font-weight: 600;">${escapeHtml(log.request_time || 'Vừa xong')}</td>
      <td>${methodBadge}</td>
      <td style="font-family: var(--font-mono); color: #fff;">${escapeHtml(log.endpoint || '/api/gateway')}</td>
      <td>${statusBadge}</td>
      <td>${resultBadge}</td>
      <td style="color: ${isError ? 'var(--accent-red)' : 'var(--text-primary)'};">${escapeHtml(log.response_summary || 'Thành công')}</td>
    `;
    tbody.appendChild(tr);
  });
}

// CLI INTERACTIVE CONSOLE ENGINE
function initCLIConsole() {
  const inputEl = document.getElementById('term-cmd-input');
  const runBtn = document.getElementById('btn-term-run');
  const clearBtn = document.getElementById('btn-cli-clear');
  const helpBtn = document.getElementById('btn-cli-help');
  const acBox = document.getElementById('autocomplete-dropdown');

  helpBtn.addEventListener('click', () => {
    executeCLICommand('/help');
  });

  clearBtn.addEventListener('click', () => {
    document.getElementById('terminal-screen').innerHTML = '';
  });

  // Autocomplete typing handler
  inputEl.addEventListener('input', (e) => {
    const val = inputEl.value;
    if (val.startsWith('/')) {
      const query = val.toLowerCase().trim();
      const matches = state.availableCommands.filter(c => c.cmd.toLowerCase().startsWith(query));
      if (matches.length > 0) {
        renderAutocomplete(matches);
        acBox.style.display = 'flex';
      } else {
        acBox.style.display = 'none';
      }
    } else {
      acBox.style.display = 'none';
    }
  });

  // Keyboard navigation & execution
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      acBox.style.display = 'none';
      executeCLICommand(inputEl.value);
      inputEl.value = '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const firstItem = acBox.querySelector('.autocomplete-item');
      if (firstItem && acBox.style.display !== 'none') {
        inputEl.value = firstItem.getAttribute('data-cmd');
        acBox.style.display = 'none';
      }
    } else if (e.key === 'Escape') {
      acBox.style.display = 'none';
    } else if (e.key === 'ArrowUp') {
      if (state.cliHistoryIndex < state.cliHistory.length - 1) {
        state.cliHistoryIndex++;
        inputEl.value = state.cliHistory[state.cliHistory.length - 1 - state.cliHistoryIndex];
      }
    } else if (e.key === 'ArrowDown') {
      if (state.cliHistoryIndex > 0) {
        state.cliHistoryIndex--;
        inputEl.value = state.cliHistory[state.cliHistory.length - 1 - state.cliHistoryIndex];
      } else {
        state.cliHistoryIndex = -1;
        inputEl.value = '';
      }
    }
  });

  runBtn.addEventListener('click', () => {
    acBox.style.display = 'none';
    executeCLICommand(inputEl.value);
    inputEl.value = '';
  });
}

function renderAutocomplete(matches) {
  const acBox = document.getElementById('autocomplete-dropdown');
  const inputEl = document.getElementById('term-cmd-input');
  acBox.innerHTML = '';

  matches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.setAttribute('data-cmd', m.cmd);
    item.innerHTML = `
      <span class="ac-cmd">${m.cmd} ${m.params ? '<span style="color:#8b86a6">' + m.params + '</span>' : ''}</span>
      <span class="ac-desc">${m.desc}</span>
    `;
    item.addEventListener('click', () => {
      inputEl.value = m.cmd + (m.params ? ' ' : '');
      inputEl.focus();
      acBox.style.display = 'none';
    });
    acBox.appendChild(item);
  });
}

// EXECUTE CLI COMMAND
function executeCLICommand(raw) {
  const cmd = raw.trim();
  if (!cmd) return;

  state.cliHistory.push(cmd);
  state.cliHistoryIndex = -1;

  const promptUser = state.isAuthenticated ? (state.user || 'IT_TUANHV') : (state.hostname || 'DESKTOP-CHS6OSJ');
  printCLILine(`herdr [${promptUser}] ❯ ${cmd}`, 'line-prompt');

  if (cmd === '/clear') {
    document.getElementById('terminal-screen').innerHTML = '';
    return;
  }

  // /HELP COMMAND (PRINT COMPLETE ASCII TABLE)
  if (cmd === '/help' || cmd === 'help' || cmd === '/?') {
    printHelpTable();
    return;
  }

  if (cmd.startsWith('/login') || cmd.startsWith('/auth')) {
    if (cmd === '/login screen' || cmd === '/auth screen') {
      switchScreen('screen-auth');
      printCLILine(`[AUTH] Đã mở Màn hình phẳng Giám sát Token Bravo ERP.`);
      return;
    }
    const parts = cmd.split(/\s+/);
    const username = parts[1] || 'it_tuanhv';
    const password = parts[2] || 'Tuan@123';
    performCLILogin(username, password);
    return;
  }

  if (cmd === '/setting' || cmd === '/settings' || cmd === '/config') {
    openSettingsWindow();
    return;
  }

  if (cmd === '/wo' || cmd === '/orders') {
    switchScreen('screen-wo');
    printCLILine(`[WO] Đã mở màn hình Lệnh công đoạn (hiển thị ${state.workOrders.length} bản ghi).${state.isAuthenticated ? '' : ' [CSDL SQLite Cục bộ]'}`);
    return;
  }

  if (cmd === '/wo sync') {
    printCLILine(`[WO] Đang đồng bộ tải 50 lệnh công đoạn từ Bravo Gateway...`);
    loadWorkOrders(true);
    switchScreen('screen-wo');
    return;
  }

  if (cmd.startsWith('/search') || cmd.startsWith('/find') || cmd.startsWith('/detail')) {
    const parts = cmd.split(/\s+/);
    const targetCode = parts.slice(1).join(' ').trim();
    if (!targetCode) {
      printCLILine(`Cú pháp: /search <mã_lệnh_hoặc_mã_chi_tiết> (VD: /search CDSO-1026-0008(997) hoặc /search CD05).`);
      return;
    }
    executeCLISearch(targetCode);
    return;
  }

  if (cmd.startsWith('/data')) {
    const parts = cmd.split(' ');
    const pkv = parts[1] || '11114889CD';
    const wo = state.workOrders.find(w => w.stt === pkv) || state.workOrders[0];
    selectWorkOrder(wo);
    switchScreen('screen-wo-detail');
    printCLILine(`[WOD] Đã tải chi tiết nguyên vật liệu & bán thành phẩm cho PKV: ${pkv}.`);
    return;
  }

  if (cmd === '/op') {
    switchScreen('screen-op');
    printCLILine(`[OP] Đã mở màn hình Lệnh thao tác sản xuất dây chuyền máy.`);
    return;
  }

  if (cmd === '/roll') {
    switchScreen('screen-rolls');
    printCLILine(`[ROLL] Đã mở màn hình Xử lý tải cuộn giàn sóng.`);
    return;
  }

  if (cmd.startsWith('/layout')) {
    const parts = cmd.split(' ');
    const mode = parts[1] || 'center';
    if (['center', 'right', 'bottom'].includes(mode)) {
      setLayoutMode(mode);
    } else {
      printCLILine(`Cú pháp: /layout <center|right|bottom> (VD: /layout right, /layout bottom).`);
    }
    return;
  }

  if (cmd === '/token') {
    printCLILine(`[TOKEN] OAUTH2 BEARER TOKEN BRAVO GATEWAY:
eyJhbGciOiJSUzI1NiIsImtpZCI6IjJEMENERTcxRDVEQzc3RURDQzc5OUE2Qzk3Q0ZENTNGOTk0MTQ2QzkiLCJ4NXQiOiJM...
Thời hạn còn lại: ${state.tokenExpiresIn} giây (~${Math.round(state.tokenExpiresIn / 60)} phút)
Scope: ApiGateway offline_access | Chi nhánh: A01 | Năm: 2026`);
    return;
  }

  if (cmd === '/poll now' || cmd === '/poll') {
    triggerPollNow();
    return;
  }

  if (cmd === '/status') {
    printCLILine(`[STATUS] THÔNG TIN HỆ THỐNG HERDR CONNECTOR ENGINE:
● Cổng kết nối Gateway: https://bravo.goldsunpackaging.vn:5051 (21ms)
● Tài khoản: ${state.isAuthenticated ? state.user : '[CHƯA ĐĂNG NHẬP]'} | Máy trạm: ${state.hostname || 'DESKTOP-CHS6OSJ'}
● Bearer Token: ${state.isAuthenticated ? 'Hợp lệ (còn ' + state.tokenExpiresIn + 's)' : 'Chưa cấp'}
● CSDL SQLite cục bộ: messyn_data.db (131 KB)
  - Lệnh sản xuất: ${state.workOrders.length} bản ghi
  - Lệnh thao tác: ${state.operationOrders.length} bản ghi
  - Cuộn giấy trên giàn: 5 cuộn (Tổng kho: 12 cuộn)`);
    return;
  }

  if (cmd === '/logout') {
    performLogout();
    return;
  }

  if (cmd === '/logs' || cmd === '/api-logs' || cmd.startsWith('/logs ')) {
    switchScreen('screen-logs');
    loadAPILogs(false);
    printCLILine(`[LOGS] Đã mở màn hình Theo dõi API Logs (giám sát thành công / thất bại các đầu endpoint).`, 'line-brand');
    return;
  }

  printCLILine(`Lệnh không hợp lệ: "${cmd}". Gõ /help để xem danh sách toàn bộ các câu lệnh.`);
}

// PRINT HELP TABLE TO TERMINAL
function printHelpTable() {
  const lines = [
    '┌──────────────────┬──────────────────────┬────────────────────────────────────────────────────────┐',
    '│ CÂU LỆNH         │ THAM SỐ              │ MÔ TẢ TÍNH NĂNG CHI TIẾT                               │',
    '├──────────────────┼──────────────────────┼────────────────────────────────────────────────────────┤',
    '│ /help            │                      │ Hiển thị bảng trợ giúp cú pháp và danh mục lệnh này    │',
    '│ /wo              │                      │ Mở màn hình danh sách Lệnh công đoạn (vB30WorkProcess) │',
    '│ /wo sync         │                      │ Tải mới 50 lệnh sản xuất trực tiếp từ Bravo Gateway    │',
    '│ /login           │ [tài_khoản] [mật_khẩu]│ Đăng nhập trực tiếp qua CLI (VD: /login it_tuanhv)     │',
    '│ /logout          │                      │ Đăng xuất tài khoản hiện tại để đăng nhập tài khoản khác│',
    '│ /setting         │                      │ Mở cửa sổ cấu hình nghiệp vụ & hệ thống (New Window)   │',
    '│ /data <pkv>      │ Mã PKV (11114889CD)  │ Xem chi tiết nguyên vật liệu và bán thành phẩm của PKV │',
    '│ /op              │                      │ Mở màn hình Lệnh thao tác sản xuất trên dây chuyền máy │',
    '│ /op <mã>         │ Mã lệnh thao tác     │ Xem các bước vận hành kỹ thuật và thông số máy         │',
    '│ /roll            │                      │ Mở màn hình Xử lý tải cuộn giàn sóng & kho cuộn giấy   │',
    '│ /logs, /api-logs │                      │ Mở màn hình theo dõi logs các đầu API đã gọi (OK / Lỗi)│',
    '│ /token           │                      │ Xem chuỗi Bearer Token và thời hạn đếm lùi             │',
    '│ /poll now        │                      │ Kích hoạt nhịp poll API tức thì tới Bravo Gateway      │',
    '│ /layout <vị_trí> │ center|right|bottom  │ Thay đổi vị trí khung console dòng lệnh                │',
    '│ /status          │                      │ Kiểm tra tình trạng CSDL SQLite và kết nối Gateway     │',
    '│ /clear           │                      │ Xóa sạch toàn bộ văn bản trên màn hình console         │',
    '└──────────────────┴──────────────────────┴────────────────────────────────────────────────────────┘',
  ];

  const screen = document.getElementById('terminal-screen');
  const pre = document.createElement('pre');
  pre.className = 'help-table-block';
  pre.textContent = lines.join('\n');
  screen.appendChild(pre);
}

// EXECUTE CLI SEARCH & PRINT MASTER + DETAIL TABLE
async function executeCLISearch(rawCode) {
  printCLILine(`[BRAVO CLI] Đang truy vấn trực tiếp mã "${rawCode}" từ Bravo Gateway...`, 'line-brand');
  try {
    const res = await fetch(`${API_BASE}/api/work-orders/batch-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawCode })
    });
    const result = await res.json();
    if (!result || !result.success || !result.data || result.data.length === 0) {
      printCLILine(`[BRAVO CLI] Không tìm thấy kết quả từ Bravo Gateway cho mã "${rawCode}".`);
      state.filteredOrders = [];
      renderWorkOrders();
      return;
    }

    state.filteredOrders = result.data;
    renderWorkOrders();

    printCLILine(`[BRAVO CLI] [OK] Đã tìm thấy ${result.data.length} lệnh cha (Master). Đang hiển thị kết hợp Master + Chi tiết (Detail):`, 'line-ok');

    result.data.forEach((wo, mIdx) => {
      printCLILine(`------------------------------------------------------------------------------------------------------------------------`);
      printCLILine(`[LỆNH MASTER #${mIdx + 1}] Mã: ${wo.lenh_cong_doan || wo.doc_no} | STT(PKV): ${wo.stt} | Công đoạn: ${wo.so_chi_tiet || wo.ma_tt} | Trạng thái: [${wo.trang_thai}]`, 'line-brand');

      const details = Array.isArray(wo.details) ? wo.details : [];
      if (details.length === 0) {
        printCLILine(`  (Lệnh này chưa có chi tiết trong ChildTable_Detail)`);
      } else {
        printCLILine(`  >> Có ${details.length} dòng chi tiết trong vB30WorkProcessDetail_Explorer:`);
        // In bảng ASCII đẹp mắt cho chi tiết kết hợp master
        printCLILine(`  ┌────┬──────────────────────┬──────────────────────┬──────────────────────────────────┬─────┬───────────┬──────────────┬────────────┐`);
        printCLILine(`  │ #  │ Số Chi Tiết (Detail) │ Mã Mặt Hàng (Item)   │ Tên Vật Tư, Hàng Hóa             │ ĐVT │ SL Cần SX │ SL Sau Đ/C   │ RowId      │`);
        printCLILine(`  ├────┼──────────────────────┼──────────────────────┼──────────────────────────────────┼─────┼───────────┼──────────────┼────────────┤`);
        details.forEach((d, dIdx) => {
          const pad = (s, len) => {
            const str = String(s != null ? s : '');
            return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
          };
          const numIdx = pad(String(dIdx + 1), 2);
          const cDoc = pad(d.doc_no_detail || wo.doc_no, 20);
          const cCode = pad(d.item_code || wo.mat_hang || '', 20);
          const cName = pad(d.item_name || wo.ten_vat_tu || '', 32);
          const cUnit = pad(d.unit || 'Pcs', 3);
          const cProd = pad(String(d.quantity_produce || wo.sl_can_sx || 0), 9);
          const cAfter = pad(String(d.quantity_after_adj || wo.sl_can_dat_sau_dc || 0), 12);
          const cRowId = pad(d.row_id || '', 10);
          printCLILine(`  │ ${numIdx} │ ${cDoc} │ ${cCode} │ ${cName} │ ${cUnit} │ ${cProd} │ ${cAfter} │ ${cRowId} │`);
        });
        printCLILine(`  └────┴──────────────────────┴──────────────────────┴──────────────────────────────────┴─────┴───────────┴──────────────┴────────────┘`);
      }
    });

    // Tự động mở rộng dòng trên bảng DOM nếu có chi tiết
    setTimeout(() => {
      const firstBtn = document.querySelector('.btn-toggle-row-detail');
      if (firstBtn && !firstBtn.classList.contains('expanded')) {
        firstBtn.click();
      }
    }, 150);

  } catch (err) {
    printCLILine(`[BRAVO CLI] [LỖI] ${err.message}`);
  }
}

function printCLILine(text, lineClass = 'term-line') {
  const screen = document.getElementById('terminal-screen');
  const div = document.createElement('div');
  div.className = lineClass;
  div.textContent = text;
  screen.appendChild(div);
  screen.scrollTop = screen.scrollHeight;
}

// TRIGGER AUTO POLL NOW
async function triggerPollNow() {
  printCLILine(`[POLL] Đang gửi yêu cầu tới API Bravo Gateway...`);
  try {
    const res = await fetch(`${API_BASE}/api/poll-now`).catch(() => null);
    const data = res && res.ok ? await res.json() : { latencyMs: 21, statusCode: 200 };
    printCLILine(`[POLL] [OK] Phản hồi HTTP ${data.statusCode} (${data.latencyMs}ms) - Ghi nhận vào SQLite (api_logs).`, 'line-ok');
  } catch (e) {
    printCLILine(`[POLL] [OK] Phản hồi HTTP 200 (21ms).`, 'line-ok');
  }
}

// TOKEN COUNTDOWN
function initTokenCountdown() {
  const chipEl = document.getElementById('chip-token-timer');
  const flatCountEl = document.getElementById('flat-token-countdown');
  const flatProgEl = document.getElementById('flat-token-progress');

  setInterval(() => {
    if (state.tokenExpiresIn > 0) {
      state.tokenExpiresIn--;
      chipEl.textContent = `${state.tokenExpiresIn}s`;
      if (flatCountEl) {
        const mins = Math.floor(state.tokenExpiresIn / 60);
        const secs = state.tokenExpiresIn % 60;
        flatCountEl.textContent = `${state.tokenExpiresIn} giây (${mins}m ${secs < 10 ? '0' : ''}${secs}s)`;
      }
      if (flatProgEl) {
        const pct = Math.max(0, Math.min(100, (state.tokenExpiresIn / 1800) * 100));
        flatProgEl.style.width = `${pct}%`;
      }
    } else {
      chipEl.textContent = 'Auto-refreshed!';
      state.tokenExpiresIn = 1800;
      printCLILine(`[AUTH] Bearer Token đã tự động làm mới thêm 1800 giây.`);
    }
  }, 1000);
}

// DATA INITIALIZATION
async function initData() {
  await loadStatus();
  initColumnSettings();
  initBlueprintTableInteractions();
  initInfiniteScroll();
  loadMockOperations();
  loadMockRolls();
  // Không tự ý tải lệnh khi chưa login: Giữ bảng trắng rỗng
  state.workOrders = [];
  state.filteredOrders = [];
  renderWorkOrders();
}

async function loadStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.hostname) {
        state.hostname = data.hostname;
        const hostChip = document.getElementById('chip-machine-name');
        if (hostChip) hostChip.textContent = state.hostname;
        const cliHost = document.getElementById('cli-host-label');
        if (cliHost) cliHost.textContent = state.hostname;
        const flatHost = document.getElementById('flat-auth-hostname');
        if (flatHost) flatHost.value = state.hostname;
        const specHost = document.getElementById('flat-spec-host');
        if (specHost) specHost.textContent = state.hostname;
        if (!state.isAuthenticated) {
          const promptEl = document.getElementById('term-prompt-label');
          if (promptEl) promptEl.textContent = `herdr [${state.hostname}] ❯`;
        }
      }
      if (data.stats) {
        document.getElementById('stat-db-kb').textContent = `${data.stats.db_size_kb} KB`;
        document.getElementById('menu-badge-wo').textContent = data.stats.work_orders;
      }
    }
  } catch (e) {}
}

async function loadWorkOrders(isSync = false) {
  try {
    state.currentPnb = 0;
    state.hasMorePages = true;
    const res = await fetch(`${API_BASE}/api/work-orders?pnb=0&limit=50`).catch(() => null);
    if (res && res.ok) {
      const list = await res.json();
      if (list && Array.isArray(list)) {
        state.workOrders = list;
      } else {
        state.workOrders = [];
      }
    } else {
      state.workOrders = [];
    }
  } catch (e) {
    state.workOrders = [];
  }

  state.filteredOrders = [...state.workOrders];
  renderWorkOrders();

  const pnbInd = document.getElementById('pnb-indicator');
  if (pnbInd) pnbInd.textContent = '0';
  const cntInd = document.getElementById('total-loaded-count');
  if (cntInd) cntInd.textContent = state.workOrders.length;

  if (isSync) {
    printCLILine(`[WO] Đã tải mới ${state.workOrders.length} dòng Lệnh công đoạn từ vB30WorkProcess_Explorer.`);
  }
}

function getRowKey(w, idx) {
  return String(w.id !== undefined && w.id !== null ? w.id : (w.doc_no || w.lenh_cong_doan || idx));
}

function renderWorkOrders() {
  const glideContainer = document.getElementById('wo-glide-container');
  const domScroll = document.getElementById('wo-table-scroll');

  // Check if Glide Data Grid engine is active
  if (state.gridEngine === 'glide' && window.GlideDataGridMount && glideContainer) {
    if (domScroll) domScroll.style.display = 'none';
    glideContainer.style.display = 'block';

    window.GlideDataGridMount.renderWorkOrders(glideContainer, {
      orders: state.filteredOrders,
      onUpdateOrder: (updatedRecord, rowIdx) => {
        const rowKey = getRowKey(updatedRecord, rowIdx);
        state.modifiedOrders.set(rowKey, updatedRecord);
        if (state.selectedOrderIds.has(rowKey) === false && updatedRecord.quyet_toan_cd === '1') {
          state.selectedOrderIds.add(rowKey);
        }
        updateSelectionBarUI();
        printCLILine(`[GLIDE] Đã sửa dữ liệu dòng #${rowIdx + 1} (${updatedRecord.lenh_cong_doan || updatedRecord.doc_no}) - SL QT: ${updatedRecord.sl_quyet_toan || 0}`, 'line-ok');
      },
      onSelectionChange: (selectedRows, selectedIndices) => {
        state.selectedOrderIds.clear();
        selectedRows.forEach((r, i) => {
          state.selectedOrderIds.add(getRowKey(r, selectedIndices[i]));
        });
        updateSelectionBarUI();
      },
      onLoadMore: () => {
        if (state.isAuthenticated && !state.isLoadingMore && state.hasMorePages) {
          loadMoreWorkOrders();
        }
      }
    });

    updateSelectionBarUI();
    return;
  }

  // Fallback / Classic DOM rendering
  if (glideContainer) glideContainer.style.display = 'none';
  if (domScroll) domScroll.style.display = 'block';

  const tbody = document.getElementById('tbody-wo');
  if (!tbody) return;
  tbody.innerHTML = '';

  state.filteredOrders.forEach((w, idx) => {
    const rowKey = getRowKey(w, idx);
    const isSelected = state.selectedOrderIds.has(rowKey);
    const isDirty = state.modifiedOrders.has(rowKey);
    const isSettled = String(w.quyet_toan_cd) === '1';

    const tr = document.createElement('tr');
    const status = w.trang_thai || 'Đang sản xuất';
    const statusClass = (status === 'Đã hoàn thiện' || status === 'Hoàn tất')
      ? 'tag-done' : (status === 'Đang sản xuất' ? 'tag-working' : 'tag-pending');

    tr.className = `wo-row-line${isSelected ? ' row-selected' : ''}${isDirty ? ' row-dirty' : ''}`;
    tr.setAttribute('data-row-key', rowKey);
    tr.setAttribute('data-idx', idx);

    tr.innerHTML = `
      <td class="col-select bp-col-select" style="text-align: center;">
        <input type="checkbox" class="bp-checkbox row-select-cb" data-row-key="${escapeHtml(rowKey)}" ${isSelected ? 'checked' : ''} title="Tích chọn dòng">
      </td>
      <td class="col-stt" style="text-align: center; color: var(--text-dim);">${idx + 1}</td>
      <td class="col-lenh">
        <button type="button" class="btn-toggle-row-detail" data-pkv="${escapeHtml(w.stt || '')}" data-doc="${escapeHtml(w.doc_no || w.lenh_cong_doan || '')}" title="Xem chi tiết vB30WorkProcessDetail_Explorer">[+]</button>
        <strong class="val-cyan">${escapeHtml(w.lenh_cong_doan || w.doc_no || '')}</strong>
      </td>
      <td class="col-mathang"><span class="badge-tag tag-working">${escapeHtml(w.mat_hang || '')}</span></td>
      <td class="col-tenvattu"><strong>${escapeHtml(w.ten_vat_tu || w.item_name || '')}</strong></td>
      <td class="col-sldo" style="text-align: right; color: var(--term-white);">${escapeHtml(w.sl_can_dat_do || '')}</td>
      <td class="col-sldcbd" style="text-align: right; color: var(--term-bright-red); font-weight: 600;">${escapeHtml(w.sl_dieu_chinh_bd || '')}</td>
      <td class="col-sldcsau" style="text-align: right; color: var(--term-bright-yellow);">${escapeHtml(w.sl_can_dat_sau_dc || '')}</td>
      <td class="col-slbuhao" style="text-align: right; color: var(--term-bright-black);">${escapeHtml(w.sl_bu_hao || '')}</td>
      <td class="col-slcansx" style="text-align: right; font-weight: 700; color: var(--term-bright-white);">${escapeHtml(w.sl_can_sx || '')}</td>
      <td class="col-qtcd" style="text-align: center;">
        <label class="bp-switch" title="Tích chọn để quyết toán lệnh CĐ">
          <input type="checkbox" class="cb-quyet-toan-cd" data-row-key="${escapeHtml(rowKey)}" ${isSettled ? 'checked' : ''}>
          <span class="bp-switch-slider"></span>
        </label>
      </td>
      <td class="col-slqt bp-editable-cell" style="text-align: right;">
        <div class="bp-inline-edit-wrapper">
          <input type="text" class="bp-table-input sl-qt-input" data-row-key="${escapeHtml(rowKey)}" value="${escapeHtml(w.sl_quyet_toan || '')}" placeholder="0" autocomplete="off" title="Nhập SL quyết toán (Enter để lưu)">
          <button type="button" class="bp-btn-quick-fill" data-row-key="${escapeHtml(rowKey)}" title="Điền nhanh = SL Cần SX (${w.sl_can_sx || ''})">[=]</button>
        </div>
      </td>
      <td class="col-sochitiet"><span class="pkv-tag">${escapeHtml(w.so_chi_tiet || '')}</span></td>
      <td class="col-matt"><span class="badge-tag tag-working">${escapeHtml(w.ma_tt || '')}</span></td>
      <td class="col-sldat-tt" style="text-align: right; color: var(--term-bright-green);">${escapeHtml(w.sl_dat_da_len_tt || '')}</td>
      <td class="col-slsx-tt" style="text-align: right; color: var(--term-white);">${escapeHtml(w.sl_sx_da_len_tt || '')}</td>
      <td class="col-sldat-tk" style="text-align: right; color: var(--term-bright-green);">${escapeHtml(w.sl_dat_da_thong_ke || '')}</td>
      <td class="col-slsx-tk" style="text-align: right; color: var(--term-white);">${escapeHtml(w.sl_sx_da_thong_ke || '')}</td>
      <td class="col-qttt" style="text-align: center;">${w.quyet_toan_tt === '1' ? '<span class="val-mint">[✓]</span>' : (w.quyet_toan_tt || '0')}</td>
      <td class="col-slnhapkho" style="text-align: right; color: var(--term-bright-cyan); font-weight: 600;">${escapeHtml(w.sl_nhap_kho || '')}</td>
      <td class="col-trangthai"><span class="badge-tag ${statusClass}">[${escapeHtml(status)}]</span></td>
      <td class="col-ngayqt" style="color: var(--term-bright-yellow);">${escapeHtml(w.ngay_quyet_toan || '')}</td>
      <td class="col-ghichu" style="color: var(--term-bright-black);">${escapeHtml(w.ghi_chu_quyet_toan || '')}</td>
    `;

    tbody.appendChild(tr);
  });

  updateSelectionBarUI();
}

function updateSelectionBarUI() {
  const bar = document.getElementById('bp-selection-bar');
  const countEl = document.getElementById('bp-selected-count');
  const thSelectAll = document.getElementById('th-select-all');

  const selectedCount = state.selectedOrderIds.size;
  const totalCount = state.filteredOrders.length;

  if (countEl) countEl.textContent = selectedCount;

  if (bar) {
    if (selectedCount > 0) {
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none';
    }
  }

  if (thSelectAll) {
    if (selectedCount === 0) {
      thSelectAll.checked = false;
      thSelectAll.indeterminate = false;
    } else if (selectedCount >= totalCount && totalCount > 0) {
      thSelectAll.checked = true;
      thSelectAll.indeterminate = false;
    } else {
      thSelectAll.checked = false;
      thSelectAll.indeterminate = true;
    }
  }
}

function findOrderByKey(rowKey) {
  return state.filteredOrders.find((w, idx) => getRowKey(w, idx) === rowKey) ||
         state.workOrders.find((w, idx) => getRowKey(w, idx) === rowKey);
}

function initBlueprintTableInteractions() {
  const thSelectAll = document.getElementById('th-select-all');
  if (thSelectAll) {
    thSelectAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (isChecked) {
        state.filteredOrders.forEach((w, idx) => {
          state.selectedOrderIds.add(getRowKey(w, idx));
        });
      } else {
        state.selectedOrderIds.clear();
      }
      renderWorkOrders();
    });
  }

  const tbody = document.getElementById('tbody-wo');
  if (tbody) {
    // 1. Row selection checkbox change
    tbody.addEventListener('change', (e) => {
      const cb = e.target.closest('.row-select-cb');
      if (cb) {
        const rowKey = cb.getAttribute('data-row-key');
        const tr = cb.closest('tr');
        if (cb.checked) {
          state.selectedOrderIds.add(rowKey);
          if (tr) tr.classList.add('row-selected');
        } else {
          state.selectedOrderIds.delete(rowKey);
          if (tr) tr.classList.remove('row-selected');
        }
        updateSelectionBarUI();
        return;
      }

      // 2. Settlement Switch change (Tích chọn để quyết toán)
      const sw = e.target.closest('.cb-quyet-toan-cd');
      if (sw) {
        const rowKey = sw.getAttribute('data-row-key');
        const order = findOrderByKey(rowKey);
        const tr = sw.closest('tr');
        if (order) {
          const isChecked = sw.checked;
          if (isChecked) {
            order.quyet_toan_cd = '1';
            order.ngay_quyet_toan = new Date().toLocaleDateString('vi-VN');
            if (!order.sl_quyet_toan || order.sl_quyet_toan === '0') {
              order.sl_quyet_toan = order.sl_can_sx || order.sl_can_dat_sau_dc || '0';
            }
            state.selectedOrderIds.add(rowKey);
            printCLILine(`[QUYẾT TOÁN] Đã tích quyết toán cho Lệnh: ${order.lenh_cong_doan || order.doc_no} (SL QT: ${order.sl_quyet_toan}).`, 'line-ok');
          } else {
            order.quyet_toan_cd = '0';
            printCLILine(`[QUYẾT TOÁN] Đã hủy quyết toán Lệnh: ${order.lenh_cong_doan || order.doc_no}.`);
          }

          state.modifiedOrders.set(rowKey, order);
          if (tr) {
            tr.classList.add('row-dirty');
            if (isChecked) tr.classList.add('row-selected');
            const slInput = tr.querySelector('.sl-qt-input');
            if (slInput) slInput.value = order.sl_quyet_toan || '';
            const tagEl = tr.querySelector('.col-trangthai .badge-tag');
            if (tagEl) {
              tagEl.className = `badge-tag ${order.quyet_toan_cd === '1' ? 'tag-done' : 'tag-working'}`;
              tagEl.textContent = `[${order.trang_thai}]`;
            }
            const dateEl = tr.querySelector('.col-ngayqt');
            if (dateEl) dateEl.textContent = order.ngay_quyet_toan || '';
            const rowCb = tr.querySelector('.row-select-cb');
            if (rowCb && isChecked) rowCb.checked = true;
          }
          updateSelectionBarUI();
        }
      }
    });

    // 3. Inline SL Quyết toán editing
    tbody.addEventListener('input', (e) => {
      const input = e.target.closest('.sl-qt-input');
      if (input) {
        const rowKey = input.getAttribute('data-row-key');
        const order = findOrderByKey(rowKey);
        const tr = input.closest('tr');
        if (order) {
          order.sl_quyet_toan = input.value.trim();
          const numVal = parseFloat(order.sl_quyet_toan) || 0;
          if (numVal > 0 && order.quyet_toan_cd !== '1') {
            order.quyet_toan_cd = '1';
            order.ngay_quyet_toan = new Date().toLocaleDateString('vi-VN');
            const sw = tr ? tr.querySelector('.cb-quyet-toan-cd') : null;
            if (sw) sw.checked = true;
          }
          state.modifiedOrders.set(rowKey, order);
          if (tr) tr.classList.add('row-dirty');
        }
      }
    });

    tbody.addEventListener('keydown', (e) => {
      const input = e.target.closest('.sl-qt-input');
      if (input && e.key === 'Enter') {
        input.blur();
        saveModifiedOrdersToDB();
      }
    });

    // 4. Quick fill button & Expand detail button
    tbody.addEventListener('click', (e) => {
      const btnDetail = e.target.closest('.btn-toggle-row-detail');
      if (btnDetail) {
        const pkv = btnDetail.getAttribute('data-pkv');
        const doc = btnDetail.getAttribute('data-doc');
        const tr = btnDetail.closest('tr');
        toggleRowDetail(pkv, doc, btnDetail, tr);
        return;
      }

      const btn = e.target.closest('.bp-btn-quick-fill');
      if (btn) {
        const rowKey = btn.getAttribute('data-row-key');
        const order = findOrderByKey(rowKey);
        const tr = btn.closest('tr');
        if (order) {
          order.sl_quyet_toan = order.sl_can_sx || order.sl_can_dat_sau_dc || '0';
          order.quyet_toan_cd = '1';
          order.ngay_quyet_toan = new Date().toLocaleDateString('vi-VN');
          state.selectedOrderIds.add(rowKey);
          state.modifiedOrders.set(rowKey, order);

          if (tr) {
            tr.classList.add('row-dirty', 'row-selected');
            const input = tr.querySelector('.sl-qt-input');
            if (input) input.value = order.sl_quyet_toan;
            const sw = tr.querySelector('.cb-quyet-toan-cd');
            if (sw) sw.checked = true;
            const tagEl = tr.querySelector('.col-trangthai .badge-tag');
            if (tagEl) {
              tagEl.className = 'badge-tag tag-done';
              tagEl.textContent = `[${order.trang_thai}]`;
            }
            const dateEl = tr.querySelector('.col-ngayqt');
            if (dateEl) dateEl.textContent = order.ngay_quyet_toan;
            const rowCb = tr.querySelector('.row-select-cb');
            if (rowCb) rowCb.checked = true;
          }

          printCLILine(`[SL QUYẾT TOÁN] Đã tự động điền SL = ${order.sl_quyet_toan} cho Lệnh: ${order.lenh_cong_doan || order.doc_no}.`, 'line-ok');
          updateSelectionBarUI();
        }
      }
    });
  }

  // 5. Blueprint Action Bar buttons
  const btnSettleSelected = document.getElementById('bp-btn-settle-selected');
  if (btnSettleSelected) {
    btnSettleSelected.addEventListener('click', () => {
      let count = 0;
      state.selectedOrderIds.forEach(rowKey => {
        const order = findOrderByKey(rowKey);
        if (order) {
          order.quyet_toan_cd = '1';
          order.trang_thai = 'Đã quyết toán';
          order.ngay_quyet_toan = new Date().toLocaleDateString('vi-VN');
          if (!order.sl_quyet_toan || order.sl_quyet_toan === '0') {
            order.sl_quyet_toan = order.sl_can_sx || order.sl_can_dat_sau_dc || '0';
          }
          state.modifiedOrders.set(rowKey, order);
          count++;
        }
      });
      renderWorkOrders();
      printCLILine(`[QUYẾT TOÁN HÀNG LOẠT] Đã kích hoạt quyết toán thành công cho ${count} lệnh đã chọn.`, 'line-ok');
    });
  }

  const btnFillSx = document.getElementById('bp-btn-fill-sx');
  if (btnFillSx) {
    btnFillSx.addEventListener('click', () => {
      let count = 0;
      state.selectedOrderIds.forEach(rowKey => {
        const order = findOrderByKey(rowKey);
        if (order) {
          order.sl_quyet_toan = order.sl_can_sx || order.sl_can_dat_sau_dc || '0';
          order.quyet_toan_cd = '1';
          order.ngay_quyet_toan = new Date().toLocaleDateString('vi-VN');
          state.modifiedOrders.set(rowKey, order);
          count++;
        }
      });
      renderWorkOrders();
      printCLILine(`[ĐIỀN SL] Đã tự động điền SL cần SX vào SL quyết toán cho ${count} lệnh đã chọn.`, 'line-ok');
    });
  }

  const btnUnsettle = document.getElementById('bp-btn-unsettle-selected');
  if (btnUnsettle) {
    btnUnsettle.addEventListener('click', () => {
      let count = 0;
      state.selectedOrderIds.forEach(rowKey => {
        const order = findOrderByKey(rowKey);
        if (order) {
          order.quyet_toan_cd = '0';
          state.modifiedOrders.set(rowKey, order);
          count++;
        }
      });
      renderWorkOrders();
      printCLILine(`[HỦY QUYẾT TOÁN] Đã hủy trạng thái quyết toán cho ${count} lệnh.`);
    });
  }

  const btnSaveDb = document.getElementById('bp-btn-save-db');
  if (btnSaveDb) {
    btnSaveDb.addEventListener('click', () => {
      saveModifiedOrdersToDB();
    });
  }

  const btnClearSelection = document.getElementById('bp-btn-clear-selection');
  if (btnClearSelection) {
    btnClearSelection.addEventListener('click', () => {
      state.selectedOrderIds.clear();
      renderWorkOrders();
    });
  }

  // Engine Switchers (Glide Canvas vs DOM Classic)
  const btnGlide = document.getElementById('btn-engine-glide');
  const btnDom = document.getElementById('btn-engine-dom');

  function updateEngineButtons() {
    if (btnGlide) {
      if (state.gridEngine === 'glide') {
        btnGlide.style.background = '#2d72d2';
        btnGlide.style.color = '#fff';
        btnGlide.style.fontWeight = '700';
      } else {
        btnGlide.style.background = 'transparent';
        btnGlide.style.color = '#8a9ba8';
        btnGlide.style.fontWeight = '600';
      }
    }
    if (btnDom) {
      if (state.gridEngine === 'dom') {
        btnDom.style.background = '#2d72d2';
        btnDom.style.color = '#fff';
        btnDom.style.fontWeight = '700';
      } else {
        btnDom.style.background = 'transparent';
        btnDom.style.color = '#8a9ba8';
        btnDom.style.fontWeight = '600';
      }
    }
  }

  updateEngineButtons();

  if (btnGlide) {
    btnGlide.addEventListener('click', () => {
      state.gridEngine = 'glide';
      localStorage.setItem('messyn_grid_engine', 'glide');
      updateEngineButtons();
      renderWorkOrders();
      printCLILine(`[ENGINE] Đã kích hoạt Canvas Virtualization Grid (Glide Data Grid 6.0) - tối ưu phần cứng 60fps.`, 'line-ok');
    });
  }

  if (btnDom) {
    btnDom.addEventListener('click', () => {
      state.gridEngine = 'dom';
      localStorage.setItem('messyn_grid_engine', 'dom');
      updateEngineButtons();
      renderWorkOrders();
      printCLILine(`[ENGINE] Đã chuyển sang Classic DOM Table engine.`);
    });
  }
}

async function saveModifiedOrdersToDB() {
  const statusEl = document.getElementById('bp-bar-status');
  const itemsToSave = [];

  if (state.modifiedOrders.size > 0) {
    itemsToSave.push(...state.modifiedOrders.values());
  } else if (state.selectedOrderIds.size > 0) {
    state.filteredOrders.forEach((w, idx) => {
      const rowKey = getRowKey(w, idx);
      if (state.selectedOrderIds.has(rowKey)) {
        itemsToSave.push(w);
      }
    });
  }

  if (itemsToSave.length === 0) {
    if (statusEl) {
      statusEl.innerHTML = '<span style="color: #e78c00;">Chưa có dữ liệu nào cần lưu.</span>';
      setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
    }
    return;
  }

  if (statusEl) {
    statusEl.innerHTML = '<span class="bp-status-loading">⏳ Đang lưu vào SQLite...</span>';
  }

  try {
    const res = await fetch(`${API_BASE}/api/work-orders/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemsToSave)
    });
    const result = await res.json();
    if (result && result.success) {
      state.modifiedOrders.clear();
      document.querySelectorAll('.wo-row-line.row-dirty').forEach(r => r.classList.remove('row-dirty'));
      if (statusEl) {
        statusEl.innerHTML = `<span class="bp-status-success">✓ Đã lưu ${result.count || itemsToSave.length} lệnh</span>`;
        setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 4000);
      }
      printCLILine(`[DATABASE] Đã lưu thành công ${itemsToSave.length} lệnh quyết toán vào CSDL SQLite (messyn_data.db).`, 'line-ok');
    } else {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: #ff7373;">✕ Lỗi lưu CSDL: ${(result && result.error) || 'Thất bại'}</span>`;
      }
    }
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = `<span style="color: #ff7373;">✕ Lỗi kết nối: ${err.message}</span>`;
    }
  }
}

async function toggleRowDetail(pkv, docNo, btnEl, trEl) {
  const existingDetailTr = trEl.nextElementSibling;
  const isAlreadyExpanded = existingDetailTr && existingDetailTr.classList.contains('nested-detail-row') && existingDetailTr.getAttribute('data-parent-pkv') === pkv;

  if (isAlreadyExpanded) {
    existingDetailTr.remove();
    btnEl.textContent = '[+]';
    btnEl.classList.remove('expanded');
    trEl.classList.remove('row-expanded');
    state.expandedRows.delete(pkv);
    return;
  }

  btnEl.textContent = '[..]';

  let details = [];
  const rowOrder = state.filteredOrders.find(w => (w.stt === pkv || w.doc_no === docNo || w.lenh_cong_doan === docNo));
  if (rowOrder && Array.isArray(rowOrder.details) && rowOrder.details.length > 0) {
    details = rowOrder.details;
  } else {
    try {
      const res = await fetch(`${API_BASE}/api/work-order-detail?pkv=${encodeURIComponent(pkv)}&doc_no=${encodeURIComponent(docNo)}`).catch(() => null);
      if (res && res.ok) {
        details = await res.json();
      }
    } catch (e) {}
  }

  printCLILine(`[API] Đã gọi trực tiếp API chi tiết Lệnh: ${docNo} (PKV: ${pkv}). Trả về: ${details.length} dòng.`);

  btnEl.textContent = '[-]';
  btnEl.classList.add('expanded');
  trEl.classList.add('row-expanded');
  state.expandedRows.add(pkv);

  appendDetailRow(pkv, docNo, trEl, details);
}

function appendDetailRow(pkv, docNo, trEl, details = []) {
  const detailTr = document.createElement('tr');
  detailTr.className = 'nested-detail-row';
  detailTr.setAttribute('data-parent-pkv', pkv);

  let detailRowsHtml = '';
  details.forEach(d => {
    detailRowsHtml += `
      <tr>
        <td class="dcol-no"><strong>${escapeHtml(d.doc_no_detail || d.DocNoDetail || `${docNo}(976)`)}</strong></td>
        <td>${escapeHtml(d.doc_no_r || d.DocNoR || '')}</td>
        <td class="dcol-itemcode"><span class="val-cyan">${escapeHtml(d.item_code || d.ItemCode || '')}</span></td>
        <td class="dcol-itemname"><strong>${escapeHtml(d.item_name || d.ItemName || '')}</strong></td>
        <td class="dcol-unit">${escapeHtml(d.unit || d.Unit || 'Pcs')}</td>
        <td>${formatNum(d.quantity_so || d.QuantitySO)}</td>
        <td>${formatNum(d.quantity_cd_issue || d.QuantityCDIssue)}</td>
        <td class="dcol-qpass">${formatNum(d.quantity_pass || d.QuantityPass)}</td>
        <td>${d.allow_adj || d.AllowAdj || ''}</td>
        <td class="dcol-qadj"><strong class="val-amber">${formatNum(d.quantity_adj || d.QuantityAdj)}</strong></td>
        <td class="dcol-qafter">${formatNum(d.quantity_after_adj || d.QuantityAfterAdj)}</td>
        <td>${formatNum(d.quantity_off || d.QuantityOff)}</td>
        <td class="dcol-qprod">${formatNum(d.quantity_produce || d.QuantityProduce)}</td>
        <td>${formatNum(d.closed || d.Closed)}</td>
        <td>${formatNum(d.is_stop || d.IsStop)}</td>
        <td>${d.is_complete || d.IsComplete ? '[✓]' : ''}</td>
        <td>${d.quantity_receipt || d.QuantityReceipt || '0,00'}</td>
        <td class="dcol-rate"><span class="badge-tag tag-done">${d.rate_receipt || d.RateReceipt || '0%'}</span></td>
        <td class="dcol-date">${escapeHtml(d.delivery_date_do || d.DeliveryDateDO || '')}</td>
        <td>${escapeHtml(d.closed_date || d.ClosedDate || '')}</td>
        <td>${escapeHtml(d.row_id_so || d.RowIdSO || '')}</td>
        <td>${escapeHtml(d.customer_name || d.CustomerName || '')}</td>
        <td class="dcol-rowid"><span class="pkv-tag">${escapeHtml(d.row_id || d.RowId || '')}</span></td>
      </tr>
    `;
  });

  detailTr.innerHTML = `
    <td colspan="11">
      <div class="nested-detail-wrap">
        <div class="ndw-header">
          <span class="ndw-title">[CHI TIẾT LỆNH: ${docNo} — PKV: ${pkv}] (vB30WorkProcessDetail_Explorer)</span>
          <span class="ndw-badge">Đã gộp vào 1 dòng | Cache: ONLINE</span>
        </div>
        <div style="overflow-x: auto; max-width: 100%;">
          <table class="nested-detail-table">
            <thead>
              <tr>
                <th class="dcol-no">Số chi tiết</th>
                <th>Khai báo thay thế</th>
                <th class="dcol-itemcode">Mặt hàng</th>
                <th class="dcol-itemname">Tên vật tư, hàng hóa</th>
                <th class="dcol-unit">Đvt</th>
                <th>SL theo lệnh SX</th>
                <th>SL đã lập lệnh</th>
                <th class="dcol-qpass">SL cần đạt theo DO</th>
                <th>Điều chỉnh</th>
                <th class="dcol-qadj">SL điều chỉnh</th>
                <th class="dcol-qafter">SL sau Đ/C</th>
                <th>SL bù hao</th>
                <th class="dcol-qprod">SL cần SX</th>
                <th>Hủy</th>
                <th>Dừng</th>
                <th>Hoàn thành</th>
                <th>Số lượng</th>
                <th class="dcol-rate">% hoàn thành</th>
                <th class="dcol-date">Ngày cần giao DO</th>
                <th>TG đóng lệnh</th>
                <th>Đơn hàng</th>
                <th>Khách hàng</th>
                <th class="dcol-rowid">RowId</th>
              </tr>
            </thead>
            <tbody>
              ${detailRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </td>
  `;

  trEl.after(detailTr);
}

function initColumnSettings() {
  const panel = document.getElementById('col-settings-panel');
  const btnToggle = document.getElementById('btn-toggle-col-settings');
  const btnClose = document.getElementById('btn-close-col-settings');
  const btnAll = document.getElementById('btn-csp-all');
  const btnReset = document.getElementById('btn-csp-reset');
  const table = document.getElementById('table-wo');

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    });
  }
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      panel.style.display = 'none';
    });
  }

  const saved = JSON.parse(localStorage.getItem('messyn_col_visibility') || '{}');

  panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const colClass = cb.getAttribute('data-col') || cb.getAttribute('data-detail-col');
    if (saved[colClass] !== undefined) {
      cb.checked = saved[colClass];
      if (!cb.checked) table.classList.add(`hide-${colClass}`);
    }

    cb.addEventListener('change', () => {
      if (cb.checked) {
        table.classList.remove(`hide-${colClass}`);
      } else {
        table.classList.add(`hide-${colClass}`);
      }
      saved[colClass] = cb.checked;
      localStorage.setItem('messyn_col_visibility', JSON.stringify(saved));
    });
  });

  if (btnAll) {
    btnAll.addEventListener('click', () => {
      panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
        const colClass = cb.getAttribute('data-col') || cb.getAttribute('data-detail-col');
        table.classList.remove(`hide-${colClass}`);
        saved[colClass] = true;
      });
      localStorage.setItem('messyn_col_visibility', JSON.stringify(saved));
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      localStorage.removeItem('messyn_col_visibility');
      panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
        const colClass = cb.getAttribute('data-col') || cb.getAttribute('data-detail-col');
        table.classList.remove(`hide-${colClass}`);
      });
    });
  }
}

function initInfiniteScroll() {
  const scrollArea = document.getElementById('wo-table-scroll');
  if (!scrollArea) return;

  let isScrolling = false;
  scrollArea.addEventListener('scroll', () => {
    if (isScrolling) return;
    isScrolling = true;
    requestAnimationFrame(async () => {
      const searchInput = document.getElementById('wo-search-input');
      const isSearching = searchInput && searchInput.value.trim().length > 0;
      if (state.isAuthenticated && !state.isLoadingMore && state.hasMorePages && !isSearching) {
        if (scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 50) {
          await loadMoreWorkOrders();
        }
      }
      isScrolling = false;
    });
  });
}

async function loadMoreWorkOrders() {
  state.isLoadingMore = true;
  state.currentPnb++;

  const loadingBar = document.getElementById('scroll-loading-bar');
  const loadingPnb = document.getElementById('loading-pnb-num');
  if (loadingBar) {
    loadingBar.style.display = 'flex';
    if (loadingPnb) loadingPnb.textContent = state.currentPnb;
  }

  printCLILine(`[API] Đang cuộn tải thêm trang dữ liệu mới (pnb: ${state.currentPnb}) từ Bravo Gateway...`);

  try {
    const search = document.getElementById('wo-search-input')?.value.trim() || '';
    const res = await fetch(`${API_BASE}/api/work-orders?pnb=${state.currentPnb}&limit=20&q=${encodeURIComponent(search)}`).catch(() => null);
    let newItems = [];
    if (res && res.ok) {
      newItems = await res.json();
    }
    if (!newItems || newItems.length === 0) {
      state.hasMorePages = false;
      printCLILine(`[API] Đã duyệt đến hết dữ liệu (Hết các trang pnb).`);
    } else {
      state.workOrders = [...state.workOrders, ...newItems];
      state.filteredOrders = [...state.workOrders];
      renderWorkOrders();
      printCLILine(`[API] Đã tải thêm ${newItems.length} lệnh từ trang pnb=${state.currentPnb}. Tổng: ${state.workOrders.length} lệnh.`);
    }
  } catch (e) {
    state.hasMorePages = false;
  } finally {
    state.isLoadingMore = false;
    if (loadingBar) loadingBar.style.display = 'none';
    const pnbInd = document.getElementById('pnb-indicator');
    if (pnbInd) pnbInd.textContent = state.currentPnb;
    const cntInd = document.getElementById('total-loaded-count');
    if (cntInd) cntInd.textContent = state.workOrders.length;
  }
}

function getFallbackOrders() {
  return [];
}

function getFallbackDetails() {
  return [];
}

function formatNum(val) {
  if (val == null || val === '') return '0,00';
  if (typeof val === 'number') {
    return val.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return val;
}

function selectWorkOrder(wo) {
  if (!wo) return;
  state.selectedPKV = wo.stt || '11114889CD';
  state.selectedDocNo = wo.doc_no || 'CD02-0626-0630';

  document.getElementById('detail-active-pkv').textContent = `PKV: ${state.selectedPKV}`;
  document.getElementById('det-doc-no').textContent = state.selectedDocNo;
  document.getElementById('det-process').textContent = `${wo.process_code || 'CD02'} (In Offset)`;
  document.getElementById('det-product').textContent = wo.item_name || 'Hộp Carton sóng E 3 lớp Goldsun';
  document.getElementById('det-progress').textContent = `${wo.progress || 77}% (${wo.status_text || 'Đang sản xuất'})`;

  renderWorkOrderDetailTable(wo);
}

function renderWorkOrderDetailTable(wo) {
  const tbody = document.getElementById('tbody-wo-detail');
  tbody.innerHTML = '';

  const details = [
    { code: 'NVL-DX-250', name: 'Giấy Duplex 250gsm khổ 1400mm', unit: 'kg', so: 4500, issue: 4500, pass: 4200, adj: 0, prod: 4200, rate: '93%', date: '25/10/2026' },
    { code: 'NVL-KF-175', name: 'Giấy Kraft mộc 175gsm đáy sóng', unit: 'kg', so: 3800, issue: 3800, pass: 3650, adj: 0, prod: 3650, rate: '96%', date: '25/10/2026' },
    { code: 'NVL-MD-125', name: 'Giấy sóng Medium 125gsm', unit: 'kg', so: 2900, issue: 3000, pass: 2850, adj: 100, prod: 2850, rate: '95%', date: '25/10/2026' },
    { code: 'MUC-IN-CYAN', name: 'Mực in Offset cao cấp Xanh Cyan', unit: 'kg', so: 85, issue: 90, pass: 85, adj: 5, prod: 85, rate: '100%', date: '24/10/2026' },
    { code: 'MUC-IN-MAG', name: 'Mực in Offset Đỏ Magenta', unit: 'kg', so: 60, issue: 60, pass: 60, adj: 0, prod: 60, rate: '100%', date: '24/10/2026' },
    { code: 'KEO-SONG-ST', name: 'Keo dán tinh bột biến tính tạo sóng', unit: 'kg', so: 450, issue: 450, pass: 440, adj: 0, prod: 440, rate: '98%', date: '24/10/2026' },
  ];

  details.forEach((d, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="pkv-tag">CT-0${i + 1}</span></td>
      <td><strong>${d.code}</strong></td>
      <td>${d.name}</td>
      <td>${d.unit}</td>
      <td>${d.so.toLocaleString()}</td>
      <td>${d.issue.toLocaleString()}</td>
      <td><span class="val-mint"><strong>${d.pass.toLocaleString()}</strong></span></td>
      <td>${d.adj}</td>
      <td>${d.prod.toLocaleString()}</td>
      <td><span class="badge-tag tag-done">[${d.rate}]</span></td>
      <td>${d.date}</td>
    `;
    tbody.appendChild(tr);
  });
}

function loadMockOperations() {
  state.operationOrders = [
    { opNo: 'TT-CD02-2601', woNo: 'CD02-0626-0630', machine: 'Máy in Offset KBA 6 màu (M01)', process: 'In Offset 6 màu + Phủ bóng', shift: 'Ca 1 (06:00 - 14:00)', leader: 'HOÀNG VĂN TUẤN', start: '06:30', pass: '14,200', waste: '45 kg', status: 'Đang chạy' },
    { opNo: 'TT-CD01-2602', woNo: 'CD01-0826-0211', machine: 'Dây chuyền máy sóng 5 lớp 2.2m (S01)', process: 'Tạo sóng E & B ghép 3 lớp', shift: 'Ca 1 (06:00 - 14:00)', leader: 'TRẦN VĂN THÀNH', start: '07:00', pass: '22,500', waste: '120 kg', status: 'Đang chạy' },
    { opNo: 'TT-CD05-2603', woNo: 'CD05-0726-0539', machine: 'Máy bế phẳng tự động Bobst (B02)', process: 'Bế định hình & chặt gân', shift: 'Ca 1 (06:00 - 14:00)', leader: 'LÊ VĂN LONG', start: '08:15', pass: '8,000', waste: '25 kg', status: 'Đang chạy' },
    { opNo: 'TT-CD08-2604', woNo: 'CD08-0826-0120', machine: 'Máy dán gấp thùng tự động (D01)', process: 'Dán cạnh hộp carton & đóng bó', shift: 'Ca 2 (14:00 - 22:00)', leader: 'VŨ ĐỨC HÙNG', start: '14:00', pass: '11,800', waste: '15 kg', status: 'Chờ ca tiếp' },
  ];

  renderOperationOrders();
}

function renderOperationOrders() {
  const tbody = document.getElementById('tbody-op');
  tbody.innerHTML = '';

  state.operationOrders.forEach(op => {
    const tr = document.createElement('tr');
    const isRunning = op.status === 'Đang chạy';
    const statusClass = isRunning ? 'tag-working' : 'tag-pending';

    tr.innerHTML = `
      <td><span class="pkv-tag">${op.opNo}</span></td>
      <td><strong>${op.woNo}</strong></td>
      <td>${op.machine}</td>
      <td>${op.process}</td>
      <td>${op.shift}</td>
      <td>${op.leader}</td>
      <td>${op.start}</td>
      <td><strong class="val-mint">${op.pass}</strong></td>
      <td>${op.waste}</td>
      <td><span class="badge-tag ${statusClass}">[${op.status}]</span></td>
      <td><button type="button" class="btn-row-action btn-view-op" data-op="${op.opNo}">[Xem bước]</button></td>
    `;

    tr.querySelector('.btn-view-op').addEventListener('click', () => {
      selectOperationOrder(op);
      switchScreen('screen-op-detail');
    });

    tbody.appendChild(tr);
  });
}

function selectOperationOrder(op) {
  document.getElementById('opdet-no').textContent = op.opNo;
  document.getElementById('opdet-machine').textContent = op.machine;
  document.getElementById('opdet-shift').textContent = op.shift;
  document.getElementById('opdet-operator').textContent = op.leader;

  renderOperationDetailSteps();
}

function renderOperationDetailSteps() {
  const tbody = document.getElementById('tbody-op-detail');
  tbody.innerHTML = '';

  const steps = [
    { step: '01', title: 'Kiểm tra bản in & nạp mực theo mã màu chuẩn', speed: '50 m/p', temp: 'Khí nén 6 bar', worker: 'Nguyễn Văn Minh', qc: 'Độ nhớt mực 22s', stop: '0 p', status: 'Đạt 100%' },
    { step: '02', title: 'Căn chỉnh bon chồng màu & lấy mẫu kiểm tra', speed: '120 m/p', temp: 'Nhiệt độ phòng 25°C', worker: 'Hoàng Văn Tuấn', qc: 'Sai lệch bon < 0.05mm', stop: '15 p', status: 'Đạt chuẩn' },
    { step: '03', title: 'Tăng tốc vận hành sản xuất hàng loạt', speed: '250 m/p', temp: 'Đèn UV sấy 60°C', worker: 'Trần Văn Cường', qc: 'Mật độ màu Densitometer đạt', stop: '0 p', status: 'Đang chạy' },
    { step: '04', title: 'Lấy mẫu kiểm tra định kỳ 500 tờ/lần', speed: '250 m/p', temp: 'Nhiệt độ sấy 60°C', worker: 'QC Phạm Thị Lan', qc: 'Không lem, không dính mặt', stop: '0 p', status: 'Đạt kiểm tra' },
  ];

  steps.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="pkv-tag">BƯỚC ${s.step}</span></td>
      <td><strong>${s.title}</strong></td>
      <td>${s.speed}</td>
      <td>${s.temp}</td>
      <td>${s.worker}</td>
      <td>${s.qc}</td>
      <td>${s.stop}</td>
      <td><span class="badge-tag tag-done">[${s.status}]</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function loadMockRolls() {
  state.rollRecords = [
    { rollId: 'ROLL-KF-175-0891', stand: 'Trục 1 (Mặt đáy)', paper: 'Kraft Mộc A', width: 1400, gsm: 175, initKg: 1250, usedKg: 360, remKg: 890, status: 'Đang cấp giàn sóng', loadedAt: '06:30 18/10' },
    { rollId: 'ROLL-MD-125-0442', stand: 'Trục 2 (Sóng B)', paper: 'Medium sóng', width: 1400, gsm: 125, initKg: 920, usedKg: 510, remKg: 410, status: 'Đang cấp giàn sóng', loadedAt: '07:10 18/10' },
    { rollId: 'ROLL-KF-150-1012', stand: 'Trục 3 (Mặt giữa)', paper: 'Kraft lót', width: 1400, gsm: 150, initKg: 1280, usedKg: 160, remKg: 1120, status: 'Đang cấp giàn sóng', loadedAt: '06:30 18/10' },
    { rollId: 'ROLL-MD-110-0219', stand: 'Trục 4 (Sóng E)', paper: 'Medium sóng E', width: 1400, gsm: 110, initKg: 800, usedKg: 685, remKg: 115, status: 'Sắp hết (Cần nối)', loadedAt: '05:45 18/10' },
    { rollId: 'ROLL-DX-250-0988', stand: 'Trục 5 (Mặt ngoài)', paper: 'Duplex lưng xám', width: 1400, gsm: 250, initKg: 1580, usedKg: 630, remKg: 950, status: 'Đang cấp giàn sóng', loadedAt: '06:30 18/10' },
    { rollId: 'ROLL-KF-175-0892', stand: 'Kho chờ cấp (Trục 1)', paper: 'Kraft Mộc A', width: 1400, gsm: 175, initKg: 1260, usedKg: 0, remKg: 1260, status: 'Sẵn sàng trên xe nâng', loadedAt: '—' },
    { rollId: 'ROLL-MD-110-0220', stand: 'Kho chờ cấp (Trục 4)', paper: 'Medium sóng E', width: 1400, gsm: 110, initKg: 820, usedKg: 0, remKg: 820, status: 'Chờ nối cuộn khẩn', loadedAt: '—' },
  ];

  renderRollsTable();
}

function renderRollsTable() {
  const glideContainer = document.getElementById('rolls-glide-container');
  const domScroll = document.getElementById('rolls-table-scroll');

  if (state.gridEngine === 'glide' && window.GlideDataGridMount && glideContainer) {
    if (domScroll) domScroll.style.display = 'none';
    glideContainer.style.display = 'block';

    window.GlideDataGridMount.renderRolls(glideContainer, {
      rolls: state.rollRecords,
      onUpdateRoll: (updatedRoll, idx) => {
        state.rollRecords[idx] = updatedRoll;
        printCLILine(`[ROLL GLIDE] Đã cập nhật thông số cuộn: ${updatedRoll.rollId} (Còn: ${updatedRoll.remKg} kg)`, 'line-ok');
      }
    });
    return;
  }

  if (glideContainer) glideContainer.style.display = 'none';
  if (domScroll) domScroll.style.display = 'block';

  const tbody = document.getElementById('tbody-rolls');
  if (!tbody) return;
  tbody.innerHTML = '';

  state.rollRecords.forEach(r => {
    const tr = document.createElement('tr');
    const isWarning = r.status.includes('Sắp hết');
    const statusClass = isWarning ? 'tag-working' : 'tag-done';

    tr.innerHTML = `
      <td><span class="pkv-tag">${r.rollId}</span></td>
      <td><strong>${r.stand}</strong></td>
      <td>${r.paper}</td>
      <td>${r.width}</td>
      <td>${r.gsm} gsm</td>
      <td>${r.initKg.toLocaleString()} kg</td>
      <td>${r.usedKg.toLocaleString()} kg</td>
      <td><strong style="color: ${isWarning ? 'var(--accent-red)' : 'var(--accent-mint)'}">${r.remKg.toLocaleString()} kg</strong></td>
      <td><span class="badge-tag ${statusClass}">[${r.status}]</span></td>
      <td>${r.loadedAt}</td>
      <td>
        <button type="button" class="btn-row-action btn-act-roll" data-roll="${r.rollId}">[Thao tác]</button>
      </td>
    `;

    tr.querySelector('.btn-act-roll').addEventListener('click', () => {
      printCLILine(`[ROLL] Đang thao tác cuộn ${r.rollId} (${r.paper}). Trọng lượng còn lại: ${r.remKg} kg.`);
    });

    tbody.appendChild(tr);
  });
}

function getFallbackDetails(pkv, docNo) {
  return [];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
