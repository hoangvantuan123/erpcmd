package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"

	"erpsyn/api"
	"erpsyn/config"
	"erpsyn/db"
	"github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

//go:embed frontend/dist
var frontendFiles embed.FS

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Success  bool   `json:"success"`
	Username string `json:"username,omitempty"`
	Expires  int    `json:"expires_in,omitempty"`
	Error    string `json:"error,omitempty"`
}

type settleRequest struct {
	MasterStt        string  `json:"master_stt"`
	MasterDocNo      string  `json:"master_doc_no"`
	RowIdCD          string  `json:"row_id_cd"`
	PkvId            int     `json:"pkv_id"`
	QuantityAdj      float64 `json:"quantity_adj"`
	QuantityAfterAdj float64 `json:"quantity_after_adj"`
	QuantityProduce  float64 `json:"quantity_produce"`
	QuantityPass     float64 `json:"quantity_pass"`
	IsSettleClosed   int     `json:"is_settle_closed"`
	Note             string  `json:"note"`
}

func main() {
	// Enable Per-Monitor DPI Awareness to eliminate blurry text on Windows scaling (125%, 150%, 200%)
	user32 := windows.NewLazySystemDLL("user32.dll")
	setProcessDpiAwarenessContext := user32.NewProc("SetProcessDpiAwarenessContext")
	if setProcessDpiAwarenessContext.Find() == nil {
		const dpiAwarenessContextPerMonitorAwareV2 = ^uintptr(3) // -4
		_, _, _ = setProcessDpiAwarenessContext.Call(dpiAwarenessContextPerMonitorAwareV2)
	} else {
		shcore := windows.NewLazySystemDLL("shcore.dll")
		setProcessDpiAwareness := shcore.NewProc("SetProcessDpiAwareness")
		if setProcessDpiAwareness.Find() == nil {
			_, _, _ = setProcessDpiAwareness.Call(2) // PROCESS_PER_MONITOR_DPI_AWARE
		} else {
			setProcessDPIAware := user32.NewProc("SetProcessDPIAware")
			if setProcessDPIAware.Find() == nil {
				_, _, _ = setProcessDPIAware.Call()
			}
		}
	}

	devURL := strings.TrimSpace(os.Getenv("ERPSYN_DEV_URL"))
	log.Printf("ERPSYN desktop đang khởi động (dev=%t)", devURL != "")
	dataDir, err := os.UserConfigDir()
	if err != nil {
		log.Fatalf("Không xác định được thư mục dữ liệu người dùng: %v", err)
	}
	dataDir = filepath.Join(dataDir, "ERPSYN")
	if err := os.MkdirAll(dataDir, 0700); err != nil {
		log.Fatalf("Không tạo được thư mục dữ liệu: %v", err)
	}
	if err := os.Chdir(dataDir); err != nil {
		log.Fatalf("Không mở được thư mục dữ liệu: %v", err)
	}
	log.Printf("Thư mục dữ liệu: %s", dataDir)
	log.Print("Đang kiểm tra WebView2 Runtime…")
	if err := ensureWebView2(dataDir); err != nil {
		showError("Không cài được WebView2 Runtime. Hãy kiểm tra kết nối mạng rồi mở lại ERPSYN.\n\n" + err.Error())
		return
	}
	log.Print("WebView2 Runtime đã sẵn sàng")

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Không đọc được cấu hình: %v", err)
	}
	log.Print("Đã đọc cấu hình")
	database, err := db.InitDB(cfg.DBPath)
	if err != nil {
		log.Fatalf("Không mở được SQLite: %v", err)
	}
	log.Printf("Đã mở SQLite: %s", cfg.DBPath)
	defer database.Close()
	client := api.NewClient(cfg, database)
	var loginMu sync.Mutex

	apiAddress := "127.0.0.1:0"
	if devURL != "" {
		apiAddress = "127.0.0.1:5184"
	}
	listener, err := net.Listen("tcp", apiAddress)
	if err != nil {
		log.Fatalf("Không mở được dịch vụ nội bộ: %v", err)
	}
	log.Printf("Go API đang nghe tại http://%s", listener.Addr())
	defer listener.Close()

	var view webview2.WebView
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var request loginRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024)).Decode(&request); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(loginResponse{Error: "Thông tin đăng nhập không hợp lệ."})
			return
		}
		request.Username = strings.TrimSpace(request.Username)
		request.Password = strings.TrimSpace(request.Password)
		if request.Username == "" || request.Password == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(loginResponse{Error: "Vui lòng nhập tên đăng nhập và mật khẩu."})
			return
		}

		loginMu.Lock()
		defer loginMu.Unlock()
		cfg.Username = request.Username
		cfg.Password = request.Password
		auth, err := client.Login()
		if err != nil {
			_ = json.NewEncoder(w).Encode(loginResponse{Error: err.Error()})
			return
		}

		// Remember the username while keeping the password in memory only.
		persistedConfig := *cfg
		persistedConfig.Password = ""
		if err := config.SaveConfig(&persistedConfig); err != nil {
			log.Printf("Không lưu được tên đăng nhập: %v", err)
		}
		_ = json.NewEncoder(w).Encode(loginResponse{
			Success:  true,
			Username: request.Username,
			Expires:  auth.ExpiresIn,
		})
	})

	// GET /api/work-orders: Lấy danh sách Lệnh sản xuất thực tế từ Bravo ERP Explorer
	mux.HandleFunc("GET /api/work-orders", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		orders, _, statusCode, latency, err := client.CallWorkOrdersAPI()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
				"status":  statusCode,
				"latency": latency.String(),
			})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    orders,
			"total":   len(orders),
			"latency": latency.String(),
		})
	})

	// GET /api/work-orders/details?stt=... : Lấy chi tiết công đoạn theo khóa STT
	mux.HandleFunc("GET /api/work-orders/details", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		stt := strings.TrimSpace(r.URL.Query().Get("stt"))
		if stt == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Thiếu tham số stt"})
			return
		}
		details, err := client.CallWorkProcessDetailRows(stt)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    details,
			"total":   len(details),
		})
	})

	// POST /api/settle: Thực hiện quy trình quyết toán lệnh công đoạn
	mux.HandleFunc("POST /api/settle", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var req settleRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024)).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Dữ liệu quyết toán không hợp lệ"})
			return
		}

		param := api.SettleParam{
			QuantityAdj:      req.QuantityAdj,
			QuantityAfterAdj: req.QuantityAfterAdj,
			QuantityProduce:  req.QuantityProduce,
			QuantityPass:     req.QuantityPass,
			IsSettleClosed:   req.IsSettleClosed,
			Note:             req.Note,
		}

		err := client.SettleWorkProcess(req.MasterStt, req.MasterDocNo, req.RowIdCD, req.PkvId, param)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Quyết toán thành công!",
		})
	})

	// GET /api/work-steps?doc_no=... : Tìm các Master Lệnh thao tác theo số lệnh công đoạn
	mux.HandleFunc("GET /api/work-steps", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		docNo := strings.TrimSpace(r.URL.Query().Get("doc_no"))
		if docNo == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Thiếu mã số lệnh doc_no"})
			return
		}
		steps, err := client.FindWorkStepMastersByDocNoWP(docNo)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    steps,
			"total":   len(steps),
		})
	})

	// GET /api/logs: Xem lịch sử nhật ký API
	mux.HandleFunc("GET /api/logs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		logs, err := database.GetRecentLogs(50)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    logs,
		})
	})

	// GET /api/status: Trạng thái kết nối và phiên đăng nhập
	mux.HandleFunc("GET /api/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		tok, _ := database.GetLatestToken(cfg.Username)
		isTokenValid := tok != nil && !tok.IsExpired
		expiresIn := 0
		if isTokenValid {
			expiresIn = int(time.Until(tok.ExpiresAt).Seconds())
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":        true,
			"username":       cfg.Username,
			"branch_code":    cfg.BranchCode,
			"fiscal_year":    cfg.FiscalYear,
			"client_mode":    cfg.ClientMode,
			"api_url":        cfg.ApiUrl,
			"is_token_valid": isTokenValid,
			"expires_in":     expiresIn,
		})
	})

	// GET /api/config: Lấy cấu hình kết nối hiện thời
	mux.HandleFunc("GET /api/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":     true,
			"api_url":     cfg.ApiUrl,
			"poll_url":    cfg.PollUrl,
			"data_url":    cfg.DataUrl,
			"branch_code": cfg.BranchCode,
			"fiscal_year": cfg.FiscalYear,
			"client_mode": cfg.ClientMode,
			"app_name":    cfg.AppName,
			"ws_name":     cfg.WsName,
		})
	})

	// POST /api/config: Cập nhật cấu hình kết nối và lưu vào config.json
	mux.HandleFunc("POST /api/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var update struct {
			ApiUrl     string `json:"api_url"`
			PollUrl    string `json:"poll_url"`
			DataUrl    string `json:"data_url"`
			BranchCode string `json:"branch_code"`
			FiscalYear string `json:"fiscal_year"`
			ClientMode string `json:"client_mode"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024)).Decode(&update); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Dữ liệu không hợp lệ"})
			return
		}
		if update.ApiUrl != "" {
			cfg.ApiUrl = strings.TrimSpace(update.ApiUrl)
		}
		if update.PollUrl != "" {
			cfg.PollUrl = strings.TrimSpace(update.PollUrl)
		}
		if update.DataUrl != "" {
			cfg.DataUrl = strings.TrimSpace(update.DataUrl)
		}
		if update.BranchCode != "" {
			cfg.BranchCode = strings.TrimSpace(update.BranchCode)
		}
		if update.FiscalYear != "" {
			cfg.FiscalYear = strings.TrimSpace(update.FiscalYear)
		}
		if update.ClientMode != "" {
			cfg.ClientMode = strings.TrimSpace(update.ClientMode)
		}
		persistedConfig := *cfg
		persistedConfig.Password = ""
		if err := config.SaveConfig(&persistedConfig); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Đã lưu cấu hình thành công"})
	})

	mux.HandleFunc("POST /api/window/main", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if view == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]bool{"success": false})
			return
		}
		view.Dispatch(func() { resizeAndCenter(view) })
		_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
	})
	mux.HandleFunc("POST /api/window/minimize", func(w http.ResponseWriter, _ *http.Request) {
		if view != nil {
			view.Dispatch(func() {
				showWindow := windows.NewLazySystemDLL("user32.dll").NewProc("ShowWindow")
				const swMinimize = uintptr(6)
				_, _, _ = showWindow.Call(uintptr(view.Window()), swMinimize)
			})
		}
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("POST /api/window/close", func(w http.ResponseWriter, _ *http.Request) {
		if view != nil {
			view.Dispatch(func() { view.Destroy() })
		}
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("POST /api/window/maximize", func(w http.ResponseWriter, _ *http.Request) {
		if view != nil {
			view.Dispatch(func() {
				user32 := windows.NewLazySystemDLL("user32.dll")
				isZoomed := user32.NewProc("IsZoomed")
				showWindow := user32.NewProc("ShowWindow")
				res, _, _ := isZoomed.Call(uintptr(view.Window()))
				if res != 0 {
					showWindow.Call(uintptr(view.Window()), 9) // SW_RESTORE
				} else {
					showWindow.Call(uintptr(view.Window()), 3) // SW_MAXIMIZE
				}
			})
		}
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("POST /api/window/drag", func(w http.ResponseWriter, _ *http.Request) {
		if view != nil {
			view.Dispatch(func() {
				user32 := windows.NewLazySystemDLL("user32.dll")
				releaseCapture := user32.NewProc("ReleaseCapture")
				postMessage := user32.NewProc("PostMessageW")
				const wmNCLButtonDown, htCaption = uintptr(0x00A1), uintptr(2)
				_, _, _ = releaseCapture.Call()
				_, _, _ = postMessage.Call(uintptr(view.Window()), wmNCLButtonDown, htCaption, 0)
			})
		}
		w.WriteHeader(http.StatusNoContent)
	})

	var settingsWinLock sync.Mutex
	var settingsWin webview2.WebView

	mux.HandleFunc("POST /api/window/settings", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		settingsWinLock.Lock()
		if settingsWin != nil {
			settingsWin.Dispatch(func() {
				hwnd := uintptr(settingsWin.Window())
				user32 := windows.NewLazySystemDLL("user32.dll")
				user32.NewProc("SetForegroundWindow").Call(hwnd)
				user32.NewProc("ShowWindow").Call(hwnd, 9)
			})
			settingsWinLock.Unlock()
			_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
			return
		}
		settingsWinLock.Unlock()

		settingsURL := fmt.Sprintf("http://%s/?window=settings", listener.Addr().String())
		if devURL != "" {
			settingsURL = fmt.Sprintf("%s/?window=settings", devURL)
		}

		go func() {
			runtime.LockOSThread()
			defer runtime.UnlockOSThread()

			subWin := webview2.NewWithOptions(webview2.WebViewOptions{
				Debug:     devURL != "",
				AutoFocus: true,
				DataPath:  filepath.Join(dataDir, "webview_settings"),
				WindowOptions: webview2.WindowOptions{
					Title:  "ERPSYS — Cài Đặt Hệ Thống",
					Width:  700,
					Height: 520,
					Center: true,
				},
			})
			if subWin == nil {
				log.Printf("Không thể khởi tạo cửa sổ cài đặt WebView2")
				return
			}

			settingsWinLock.Lock()
			settingsWin = subWin
			settingsWinLock.Unlock()

			defer func() {
				settingsWinLock.Lock()
				settingsWin = nil
				settingsWinLock.Unlock()
				subWin.Destroy()
			}()

			subWin.Navigate(settingsURL)
			subWin.Run()
		}()

		_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
	})

	mux.HandleFunc("POST /api/window/settings/close", func(w http.ResponseWriter, _ *http.Request) {
		settingsWinLock.Lock()
		if settingsWin != nil {
			settingsWin.Dispatch(func() {
				settingsWin.Destroy()
			})
		}
		settingsWinLock.Unlock()
		w.WriteHeader(http.StatusNoContent)
	})

	var newViewCount int
	var newViewMu sync.Mutex

	mux.HandleFunc("POST /api/window/new-view", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		viewParam := strings.TrimSpace(r.URL.Query().Get("view"))
		if viewParam == "" {
			viewParam = "all-tasks"
		}

		newViewMu.Lock()
		newViewCount++
		c := newViewCount
		newViewMu.Unlock()

		targetURL := fmt.Sprintf("http://%s/?window=view&view=%s", listener.Addr().String(), url.QueryEscape(viewParam))
		if devURL != "" {
			targetURL = fmt.Sprintf("%s/?window=view&view=%s", devURL, url.QueryEscape(viewParam))
		}

		go func() {
			runtime.LockOSThread()
			defer runtime.UnlockOSThread()

			viewWin := webview2.NewWithOptions(webview2.WebViewOptions{
				Debug:     devURL != "",
				AutoFocus: true,
				DataPath:  filepath.Join(dataDir, fmt.Sprintf("webview_view_%d", c)),
				WindowOptions: webview2.WindowOptions{
					Title:  fmt.Sprintf("ERPSYS — %s", viewParam),
					Width:  1200,
					Height: 750,
					Center: true,
				},
			})
			if viewWin == nil {
				log.Printf("Không thể khởi tạo cửa sổ view độc lập")
				return
			}
			defer viewWin.Destroy()
			setStandardWindowFrame(viewWin)
			viewWin.Navigate(targetURL)
			viewWin.Run()
		}()

		_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
	})

	assetRoot, err := fs.Sub(frontendFiles, "frontend/dist")
	if err != nil {
		log.Fatalf("Không đọc được giao diện đã đóng gói: %v", err)
	}
	mux.Handle("/", http.FileServer(http.FS(assetRoot)))
	server := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Printf("Dịch vụ nội bộ dừng: %v", err)
		}
	}()
	log.Print("Đang khởi tạo cửa sổ WebView2…")
	initWidth, initHeight := 460, 380
	latestTok, _ := database.GetLatestToken(cfg.Username)
	isTokenValid := latestTok != nil && !latestTok.IsExpired
	if isTokenValid {
		initWidth, initHeight = 1366, 800
	}

	view = webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     devURL != "",
		AutoFocus: true,
		DataPath:  filepath.Join(dataDir, "webview"),
		WindowOptions: webview2.WindowOptions{
			Title:  "ERPSYS",
			Width:  uint(initWidth),
			Height: uint(initHeight),
			Center: true,
		},
	})
	if view == nil {
		log.Fatal("Không khởi chạy được WebView2. Cài Microsoft Edge WebView2 Runtime rồi mở lại ERPSYN.")
	}
	defer view.Destroy()
	setStandardWindowFrame(view)
	if isTokenValid {
		resizeAndCenter(view)
	}
	if devURL != "" {
		log.Printf("Đang đợi Vite tại %s…", devURL)
		if err := waitForDevServer(devURL, 60*time.Second); err != nil {
			log.Fatal(err)
		}
		view.Navigate(devURL)
	} else {
		view.Navigate("http://" + listener.Addr().String())
	}
	hwnd := uintptr(view.Window())
	user32.NewProc("ShowWindow").Call(hwnd, 5)
	user32.NewProc("SetForegroundWindow").Call(hwnd)
	log.Print("Cửa sổ desktop đã mở")
	view.Run()
}

func waitForDevServer(url string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	client := &http.Client{Timeout: 1 * time.Second}
	for time.Now().Before(deadline) {
		response, err := client.Get(url)
		if err == nil {
			_ = response.Body.Close()
			if response.StatusCode < http.StatusInternalServerError {
				return nil
			}
		}
		time.Sleep(250 * time.Millisecond)
	}
	return fmt.Errorf("không kết nối được Vite dev server tại %s", url)
}

func resizeAndCenter(view webview2.WebView) {
	const width, height = 1366, 800
	view.SetTitle("ERPSYS — Hệ thống điều hành sản xuất")
	view.SetSize(width, height, webview2.HintNone)
	setStandardWindowFrame(view)

	getSystemMetrics := windows.NewLazySystemDLL("user32.dll").NewProc("GetSystemMetrics")
	setWindowPos := windows.NewLazySystemDLL("user32.dll").NewProc("SetWindowPos")
	screenWidth, _, _ := getSystemMetrics.Call(0)
	screenHeight, _, _ := getSystemMetrics.Call(1)
	actualWidth, actualHeight := uintptr(width), uintptr(height)
	if screenWidth > 0 && actualWidth > screenWidth {
		actualWidth = screenWidth - 40
	}
	if screenHeight > 0 && actualHeight > screenHeight {
		actualHeight = screenHeight - 60
	}
	x := (int(screenWidth) - int(actualWidth)) / 2
	y := (int(screenHeight) - int(actualHeight)) / 2
	const swpNoZOrder = uintptr(0x0004)
	_, _, _ = setWindowPos.Call(uintptr(view.Window()), 0, uintptr(x), uintptr(y), actualWidth, actualHeight, swpNoZOrder)
}

var (
	prevWndProc           uintptr
	customWndProcCallback uintptr
)

func customSubclassProc(hwnd uintptr, msg uint32, wParam, lParam uintptr) uintptr {
	const wmNcCalcSize = 0x0083
	if msg == wmNcCalcSize {
		// Returning 0 on WM_NCCALCSIZE indicates that the client area occupies
		// the entire window frame with 0 non-client title bar space.
		return 0
	}
	user32 := windows.NewLazySystemDLL("user32.dll")
	callWindowProc := user32.NewProc("CallWindowProcW")
	ret, _, _ := callWindowProc.Call(prevWndProc, hwnd, uintptr(msg), wParam, lParam)
	return ret
}

func setStandardWindowFrame(view webview2.WebView) {
	user32 := windows.NewLazySystemDLL("user32.dll")
	getWindowLongPtr := user32.NewProc("GetWindowLongPtrW")
	setWindowLongPtr := user32.NewProc("SetWindowLongPtrW")
	setWindowPos := user32.NewProc("SetWindowPos")
	hwnd := uintptr(view.Window())
	const (
		gwlStyle        = ^uintptr(15) // -16
		gwlpWndProc     = ^uintptr(3)  // -4
		wsCaption       = uintptr(0x00C00000)
		wsThickFrame    = uintptr(0x00040000)
		wsMaximizeBox   = uintptr(0x00010000)
		wsBorder        = uintptr(0x00800000)
		wsDlgFrame      = uintptr(0x00400000)
		swpFrameChanged = uintptr(0x0020)
		swpNoMove       = uintptr(0x0002)
		swpNoSize       = uintptr(0x0001)
		swpNoZOrder     = uintptr(0x0004)
	)

	// Hook window procedure to override WM_NCCALCSIZE
	if customWndProcCallback == 0 {
		customWndProcCallback = syscall.NewCallback(customSubclassProc)
	}
	oldProc, _, _ := setWindowLongPtr.Call(hwnd, gwlpWndProc, customWndProcCallback)
	if oldProc != 0 && oldProc != customWndProcCallback {
		prevWndProc = oldProc
	}

	style, _, _ := getWindowLongPtr.Call(hwnd, gwlStyle)
	style &^= (wsCaption | wsBorder | wsDlgFrame)
	style |= wsThickFrame | wsMaximizeBox
	_, _, _ = setWindowLongPtr.Call(hwnd, gwlStyle, style)

	dwmapi := windows.NewLazySystemDLL("dwmapi.dll")
	dwmExtendFrameIntoClientArea := dwmapi.NewProc("DwmExtendFrameIntoClientArea")
	if dwmExtendFrameIntoClientArea.Find() == nil {
		margins := struct{ cxLeftWidth, cxRightWidth, cyTopHeight, cyBottomHeight int32 }{1, 1, 1, 1}
		_, _, _ = dwmExtendFrameIntoClientArea.Call(hwnd, uintptr(unsafe.Pointer(&margins)))
	}

	_, _, _ = setWindowPos.Call(hwnd, 0, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoZOrder|swpFrameChanged)
}



func ensureWebView2(dataDir string) error {
	const runtimeClientID = `{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}`
	registryLocations := []struct {
		root registry.Key
		path string
	}{
		{registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\EdgeUpdate\Clients\` + runtimeClientID},
		{registry.LOCAL_MACHINE, `SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\` + runtimeClientID},
		{registry.CURRENT_USER, `SOFTWARE\Microsoft\EdgeUpdate\Clients\` + runtimeClientID},
	}
	for _, location := range registryLocations {
		key, err := registry.OpenKey(location.root, location.path, registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		version, _, err := key.GetStringValue("pv")
		_ = key.Close()
		if err == nil && version != "" && version != "0.0.0.0" {
			log.Printf("Tìm thấy WebView2 Runtime phiên bản %s", version)
			return nil
		}
	}

	const bootstrapperURL = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
	log.Print("Chưa có WebView2 Runtime; đang tải bộ cài…")
	installerPath := filepath.Join(dataDir, "MicrosoftEdgeWebView2Setup.exe")
	request, err := http.NewRequest(http.MethodGet, bootstrapperURL, nil)
	if err != nil {
		return err
	}
	response, err := (&http.Client{Timeout: 3 * time.Minute}).Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("Microsoft bootstrapper download returned HTTP %d", response.StatusCode)
	}
	file, err := os.OpenFile(installerPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0700)
	if err != nil {
		return err
	}
	_, copyErr := io.Copy(file, response.Body)
	closeErr := file.Close()
	if copyErr != nil {
		_ = os.Remove(installerPath)
		return copyErr
	}
	if closeErr != nil {
		_ = os.Remove(installerPath)
		return closeErr
	}
	defer os.Remove(installerPath)

	command := exec.Command(installerPath, "/silent", "/install")
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if output, err := command.CombinedOutput(); err != nil {
		return fmt.Errorf("run WebView2 bootstrapper: %w %s", err, strings.TrimSpace(string(output)))
	}
	return nil
}

func showError(message string) {
	user32 := windows.NewLazySystemDLL("user32.dll")
	messageBox := user32.NewProc("MessageBoxW")
	caption, _ := windows.UTF16PtrFromString("ERPSYN")
	text, _ := windows.UTF16PtrFromString(message)
	const mbIconError = uintptr(0x00000010)
	_, _, _ = messageBox.Call(0, uintptr(unsafe.Pointer(text)), uintptr(unsafe.Pointer(caption)), mbIconError)
}
