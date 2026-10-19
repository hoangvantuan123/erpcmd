package cli

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/sys/windows"

	"github.com/olekukonko/tablewriter"

	"erpsyn/api"
	"erpsyn/config"
	"erpsyn/db"
)

// ANSI color codes
const (
	colorReset   = "\033[0m"
	colorBold    = "\033[1m"
	colorDim     = "\033[2m"
	colorCyan    = "\033[36m"
	colorGreen   = "\033[32m"
	colorYellow  = "\033[33m"
	colorRed     = "\033[31m"
	colorMagenta = "\033[35m"
	colorBlue    = "\033[34m"
	colorGray    = "\033[90m"
)

type Shell struct {
	cfg        *config.Config
	database   *db.DB
	client     *api.Client
	reader     *bufio.Reader
	pollTicker *time.Ticker
	pollStop   chan bool
	lastPoll   time.Time
	pollCount  int
	mu         sync.Mutex
}

func NewMenu(cfg *config.Config, database *db.DB, client *api.Client) *Shell {
	enableVirtualTerminal()
	return &Shell{
		cfg:      cfg,
		database: database,
		client:   client,
		reader:   bufio.NewReader(os.Stdin),
	}
}

// Kích hoạt hỗ trợ ANSI trên Windows Console
func enableVirtualTerminal() {
	if runtime.GOOS == "windows" {
		stdout := windows.Handle(os.Stdout.Fd())
		var mode uint32
		if err := windows.GetConsoleMode(stdout, &mode); err == nil {
			_ = windows.SetConsoleMode(stdout, mode|windows.ENABLE_VIRTUAL_TERMINAL_PROCESSING)
		}
	}
}

func (s *Shell) Run() {
	// 1. Nhập thông tin đăng nhập trực tiếp từ bàn phím khi chạy lệnh
	s.initialLoginPrompt()

	// 2. Bật tiến trình nền tự động gọi API định kỳ 5 phút
	s.startAutoPollWorker()

	// 3. Hiển thị bảng điều khiển
	s.printBanner()

	// 4. Vòng lặp nhận lệnh tương tác
	for {
		userTag := s.cfg.Username
		if userTag == "" {
			userTag = "chưa_login"
		}
		prompt := fmt.Sprintf("%s%scodex%s %s[%s]%s %s❯%s ", 
			colorBold, colorCyan, colorReset,
			colorGray, userTag, colorReset,
			colorGreen, colorReset)
		fmt.Print(prompt)

		input, err := s.reader.ReadString('\n')
		if err != nil {
			break
		}

		input = strings.TrimSpace(input)
		if input == "" {
			continue
		}

		if s.dispatch(input) {
			break
		}
	}
}

func (s *Shell) printBanner() {
	tokenCount, logCount, dataCount, _ := s.database.GetStats()
	tok, _ := s.database.GetLatestToken(s.cfg.Username)

	tokenStatus := colorRed + "Chưa có" + colorReset
	if tok != nil {
		if tok.IsExpired {
			tokenStatus = colorYellow + "Đã hết hạn" + colorReset
		} else {
			tokenStatus = colorGreen + "Hợp lệ (" + time.Until(tok.ExpiresAt).Round(time.Minute).String() + " còn lại)" + colorReset
		}
	}

	pollIntervalMin := float64(s.cfg.PollInterval) / 60.0
	pollStatus := fmt.Sprintf("%sMỗi %.0fp (%ds)%s", colorGreen, pollIntervalMin, s.cfg.PollInterval, colorReset)

	displayUser := s.cfg.Username
	if displayUser == "" {
		displayUser = "(Chưa đăng nhập)"
	}

	modeDisplay := fmt.Sprintf("%sWinform%s [%s]", colorGreen, colorReset, s.cfg.WsName)
	if s.cfg.ClientMode == "web" {
		modeDisplay = fmt.Sprintf("%sWeb Browser%s", colorCyan, colorReset)
	}

	fmt.Println()
	fmt.Printf("%s╭──────────────────────────────────────────────────────────────────────────────╮%s\n", colorCyan, colorReset)
	fmt.Printf("%s│%s   %s⚡ CODEX CLI v2.8%s - Bravo API Gateway Controller & MES Data Engine     %s│%s\n", colorCyan, colorReset, colorBold+colorMagenta, colorReset, colorCyan, colorReset)
	fmt.Printf("%s│%s   Auth URL : %s%-63s%s%s│%s\n", colorCyan, colorReset, colorDim, s.cfg.ApiUrl, colorReset, colorCyan, colorReset)
	fmt.Printf("%s│%s   Poll URL : %s%-63s%s%s│%s\n", colorCyan, colorReset, colorCyan, s.cfg.PollUrl, colorReset, colorCyan, colorReset)
	fmt.Printf("%s│%s   Mode     : %-28s User: %s%-31s%s%s│%s\n", colorCyan, colorReset, modeDisplay, colorBold+colorYellow, displayUser, colorReset, colorCyan, colorReset)
	fmt.Printf("%s│%s   Token    : %-28s Auto-Poll: %-25s%s│%s\n", colorCyan, colorReset, tokenStatus, pollStatus, colorCyan, colorReset)
	fmt.Printf("%s│%s   Database : %-16s Tokens: %-4d Logs: %-5d Synced: %-5d       %s│%s\n", colorCyan, colorReset, s.cfg.DBPath, tokenCount, logCount, dataCount, colorCyan, colorReset)
	fmt.Printf("%s╰──────────────────────────────────────────────────────────────────────────────╯%s\n", colorCyan, colorReset)
	fmt.Printf("Gõ %s/help%s để xem lệnh. Gõ %s/mode%s để đổi Winform/Web. Gõ %s/wo%s để xem Lệnh SX.\n\n", 
		colorBold+colorYellow, colorReset, colorBold+colorGreen, colorReset, colorBold+colorCyan, colorReset)
}

func (s *Shell) dispatch(line string) bool {
	parts := strings.Fields(line)
	if len(parts) == 0 {
		return false
	}

	cmd := strings.ToLower(parts[0])
	cmd = strings.TrimLeft(cmd, "/\\")

	switch cmd {
	case "exit", "quit", "q":
		s.stopAutoPoll()
		fmt.Printf("%s[✔] Đã tắt tiến trình nền và đóng phiên làm việc CodeX. Tạm biệt!%s\n", colorGreen, colorReset)
		return true

	case "help", "h", "?":
		s.cmdHelp()

	case "mode", "platform":
		s.cmdMode(parts[1:])

	case "login", "auth", "token-new":
		s.cmdLogin(parts[1:])

	case "poll", "cron", "loop":
		s.cmdPoll(parts[1:])

	case "token", "tok", "me":
		s.cmdToken()

	case "status", "stat", "info":
		s.cmdStatus()

	case "api", "endpoints", "endpoint":
		s.cmdAPI(parts[1:])

	case "wo", "orders", "lenhsx", "production":
		s.cmdWorkOrders(parts[1:])

	case "search", "find", "tim", "timkiem":
		s.cmdSearch(parts[1:])

	case "settle", "quyettoan", "qt", "adjust":
		s.cmdSettle(parts[1:])

	case "logs", "log", "history":
		limit := 10
		if len(parts) > 1 {
			if n, err := strconv.Atoi(parts[1]); err == nil && n > 0 {
				limit = n
			}
		}
		s.cmdLogs(limit)

	case "curl":
		s.cmdCurl()

	case "data", "fetch", "process", "detail":
		s.cmdData(parts[1:])

	case "clear-cache", "clearcache", "clean-data":
		s.cmdClearCache()

	case "db":
		s.cmdDB()

	case "config", "cfg":
		s.cmdConfig()

	case "set":
		if len(parts) >= 3 {
			s.cmdSet(parts[1], strings.Join(parts[2:], " "))
		} else {
			fmt.Printf("%s[!] Cú pháp: /set <key> <value> (Ví dụ: /set url https://bravo.goldsunpackaging.vn:5051/...)%s\n", colorYellow, colorReset)
		}

	case "get":
		if len(parts) >= 2 {
			s.cmdCall("GET", parts[1])
		} else {
			fmt.Printf("%s[!] Cú pháp: /get <url>%s\n", colorYellow, colorReset)
		}

	case "post":
		if len(parts) >= 2 {
			s.cmdCall("POST", parts[1])
		} else {
			fmt.Printf("%s[!] Cú pháp: /post <url>%s\n", colorYellow, colorReset)
		}

	case "clear", "cls":
		s.clearScreen()
		s.printBanner()

	default:
		lower := strings.ToLower(line)
		if strings.Contains(lower, "đăng nhập") || strings.Contains(lower, "login") {
			s.cmdLogin(nil)
		} else if strings.Contains(lower, "xoá cache") || strings.Contains(lower, "xóa cache") || strings.Contains(lower, "clear cache") {
			s.cmdClearCache()
		} else if strings.Contains(lower, "gọi data") || strings.Contains(lower, "lấy data") || strings.Contains(lower, "công đoạn") {
			s.cmdData(nil)
		} else if strings.Contains(lower, "poll") || strings.Contains(lower, "5 phút") || strings.Contains(lower, "định kỳ") {
			s.cmdPoll(nil)
		} else if strings.Contains(lower, "lệnh sản xuất") || strings.Contains(lower, "lệnh sx") {
			s.cmdWorkOrders(nil)
		} else if strings.Contains(lower, "tìm kiếm") || strings.Contains(lower, "tra cứu") {
			s.cmdSearch(nil)
		} else if strings.Contains(lower, "quản trị") || strings.Contains(lower, "api") {
			s.cmdAPI(nil)
		} else if strings.Contains(lower, "trạng thái") {
			s.cmdStatus()
		} else {
			fmt.Printf("%s[?] Lệnh không nhận diện: '%s'. Gõ %s/help%s để xem danh sách lệnh.%s\n", colorRed, line, colorYellow, colorRed, colorReset)
		}
	}
	return false
}

// 1. Bàn đăng nhập hỏi người dùng Tên và Mật khẩu khi khởi chạy
func (s *Shell) initialLoginPrompt() {
	fmt.Println()
	fmt.Printf("%s╭──────────────────────────────────────────────────────────────────────────────╮%s\n", colorCyan, colorReset)
	fmt.Printf("%s│%s   %s🔐 ĐĂNG NHẬP HỆ THỐNG BRAVO ERP / MES - GOLDSUN PACKAGING%s                 %s│%s\n", colorCyan, colorReset, colorBold+colorYellow, colorReset, colorCyan, colorReset)
	fmt.Printf("%s│%s   Vui lòng nhập Tên tài khoản và Mật khẩu để xác thực truy cập hệ thống:     %s│%s\n", colorCyan, colorReset, colorCyan, colorReset)
	fmt.Printf("%s╰──────────────────────────────────────────────────────────────────────────────╯%s\n", colorCyan, colorReset)

	var username, password string
	for {
		fmt.Printf("\nMã tài khoản / Username ❯ ")
		uInput, _ := s.reader.ReadString('\n')
		username = strings.TrimSpace(uInput)
		if username != "" {
			break
		}
		fmt.Printf("%s[!] Vui lòng nhập mã tài khoản đăng nhập.%s\n", colorYellow, colorReset)
	}

	for {
		fmt.Printf("Mật khẩu / Password ❯ ")
		pInput, _ := s.reader.ReadString('\n')
		password = strings.TrimSpace(pInput)
		if password != "" {
			break
		}
		fmt.Printf("%s[!] Vui lòng nhập mật khẩu đăng nhập.%s\n", colorYellow, colorReset)
	}

	s.cfg.Username = username
	s.cfg.Password = password

	fmt.Println()
	stop := make(chan bool)
	go s.spinner(stop, fmt.Sprintf("Đang xác thực tài khoản '%s' với Bravo Gateway...", s.cfg.Username))

	startTime := time.Now()
	resp, err := s.client.Login()
	stop <- true
	time.Sleep(15 * time.Millisecond)
	elapsed := time.Since(startTime).Round(time.Millisecond)

	if err != nil {
		fmt.Printf("\r\033[K%s[✘] ĐĂNG NHẬP THẤT BẠI (%v): %v%s\n", colorRed+colorBold, elapsed, err, colorReset)
		fmt.Printf("%s    (Hệ thống vẫn vào CLI để bạn chỉnh cấu hình hoặc dùng /login để thử lại)%s\n\n", colorYellow, colorReset)
	} else {
		_ = config.SaveConfig(s.cfg)
		_ = s.database.UpsertEndpoint("Xác thực OAuth2 Token", "POST", s.cfg.ApiUrl, "Quản trị hệ thống", "Cấp Bearer Token và Refresh Token")
		_ = s.database.UpsertEndpoint("Auto-Poll Bravo Định kỳ 5m", "GET", s.cfg.PollUrl, "Giám sát Gateway", "Truy vấn dữ liệu Bravo định kỳ 5 phút")
		_ = s.database.UpsertEndpoint("Chi tiết Công đoạn SX (WorkProcessDetail)", "POST", s.cfg.DataUrl, "Lệnh sản xuất", "Truy vấn chi tiết công đoạn vB30WorkProcessDetail_Explorer")

		tokSnippet := resp.AccessToken
		if len(tokSnippet) > 40 {
			tokSnippet = tokSnippet[:25] + "..." + tokSnippet[len(tokSnippet)-12:]
		}

		fmt.Printf("\r\033[K%s[✔] ĐĂNG NHẬP THÀNH CÔNG! (%v)%s\n", colorGreen+colorBold, elapsed, colorReset)
		fmt.Printf("    ● Token: %s%s%s (Thời hạn: %d giây ~ %.1f giờ)\n", colorGreen, tokSnippet, colorReset, resp.ExpiresIn, float64(resp.ExpiresIn)/3600.0)
		fmt.Printf("    ● SQLite DB: Đã lưu trữ Token và các Endpoint vào file `%s`\n", s.cfg.DBPath)
		fmt.Printf("    ● Tự động gọi API: Tiến trình nền định kỳ 5 phút (%ds) đã được kích hoạt!\n\n", s.cfg.PollInterval)
	}
}

// 2. Bật tiến trình nền tự động gọi API mỗi 5 phút
func (s *Shell) startAutoPollWorker() {
	if s.cfg.PollInterval <= 0 {
		s.cfg.PollInterval = 300 // 5 phút mặc định
	}

	interval := time.Duration(s.cfg.PollInterval) * time.Second
	s.pollTicker = time.NewTicker(interval)
	s.pollStop = make(chan bool)

	go func() {
		for {
			select {
			case <-s.pollTicker.C:
				s.executePoll("AUTO-POLL 5m")
			case <-s.pollStop:
				return
			}
		}
	}()
}

func (s *Shell) stopAutoPoll() {
	if s.pollTicker != nil {
		s.pollTicker.Stop()
	}
	if s.pollStop != nil {
		select {
		case s.pollStop <- true:
		default:
		}
	}
}

// Thực hiện gọi API Bravo Gateway và in thông báo trực tiếp lên CMD console
func (s *Shell) executePoll(tag string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.pollCount++
	s.lastPoll = time.Now()
	nowStr := s.lastPoll.Format("15:04:05")

	fmt.Printf("\n\r\033[K%s[%s] ⏱️  [%s #%d]%s Đang gửi yêu cầu tới API Bravo Gateway...\n",
		colorCyan, nowStr, tag, s.pollCount, colorReset)
	fmt.Printf("           Endpoint: %s%s%s\n", colorYellow, s.cfg.PollUrl, colorReset)

	body, statusCode, latency, err := s.client.CallBravoPollAPI(s.cfg.PollUrl)
	afterStr := time.Now().Format("15:04:05")

	if err != nil {
		fmt.Printf("\r\033[K%s[%s] ❌ [%s #%d] Gọi API thất bại (%v): %v%s\n",
			colorRed, afterStr, tag, s.pollCount, latency.Round(time.Millisecond), err, colorReset)
	} else {
		bodySnippet := string(body)
		if len(bodySnippet) > 80 {
			bodySnippet = bodySnippet[:78] + ".."
		}
		if bodySnippet == "" {
			bodySnippet = "(empty body)"
		}
		fmt.Printf("\r\033[K%s[%s] ✔  [%s #%d] Phản hồi HTTP %d (%v) — Đã lưu vào SQLite (api_logs & synced_data)%s\n",
			colorGreen, afterStr, tag, s.pollCount, statusCode, latency.Round(time.Millisecond), colorReset)
		fmt.Printf("           %sDữ liệu: %s%s\n", colorDim, bodySnippet, colorReset)
	}

	// In lại dấu nhắc lệnh cho người dùng
	fmt.Printf("%s%scodex%s %s[%s]%s %s❯%s ",
		colorBold, colorCyan, colorReset,
		colorGray, s.cfg.Username, colorReset,
		colorGreen, colorReset)
}

// Xử lý lệnh /poll
func (s *Shell) cmdPoll(args []string) {
	if len(args) == 0 || args[0] == "now" || args[0] == "run" {
		s.executePoll("MANUAL-POLL")
		return
	}

	sub := strings.ToLower(args[0])
	switch sub {
	case "status", "info":
		nextPoll := "Chưa xác định"
		if !s.lastPoll.IsZero() {
			next := s.lastPoll.Add(time.Duration(s.cfg.PollInterval) * time.Second)
			if time.Now().Before(next) {
				nextPoll = fmt.Sprintf("trong %v (lúc %s)", time.Until(next).Round(time.Second), next.Format("15:04:05"))
			} else {
				nextPoll = "ngay bây giờ"
			}
		} else {
			nextPoll = fmt.Sprintf("trong %ds (lần đầu)", s.cfg.PollInterval)
		}

		fmt.Println()
		fmt.Printf("%s⏱️  THÔNG TIN TIẾN TRÌNH AUTO-POLL ĐỊNH KỲ%s\n", colorBold+colorCyan, colorReset)
		fmt.Println("────────────────────────────────────────────────────────────────────────────────")
		fmt.Printf("● Trạng thái      : %sĐang chạy nền (Background Active)%s\n", colorGreen, colorReset)
		fmt.Printf("● Chu kỳ gọi      : %s%d giây (%.1f phút)%s\n", colorYellow, s.cfg.PollInterval, float64(s.cfg.PollInterval)/60.0, colorReset)
		fmt.Printf("● Tổng số lần gọi : %s%d lần%s\n", colorBold, s.pollCount, colorReset)
		fmt.Printf("● Lần gọi gần nhất: %s\n", formatTimeOrNever(s.lastPoll))
		fmt.Printf("● Lần gọi kế tiếp : %s%s%s\n", colorGreen, nextPoll, colorReset)
		fmt.Printf("● Endpoint URL    : %s%s%s\n", colorCyan, s.cfg.PollUrl, colorReset)
		fmt.Printf("● Headers gửi kèm : Accept, Authorization (Bearer), Branchcode (%s), Fiscalyear (%s), Clientinfo...\n", s.cfg.BranchCode, s.cfg.FiscalYear)
		fmt.Printf("● Lưu trữ SQLite  : Bảng `api_logs` & `synced_data` trong file `%s`\n", s.cfg.DBPath)
		fmt.Println("────────────────────────────────────────────────────────────────────────────────")
		fmt.Printf("💡 Gõ %s/poll now%s để gọi kiểm tra ngay. Gõ %s/poll curl%s để xem cURL mẫu.\n\n",
			colorBold+colorYellow, colorReset, colorBold+colorGreen, colorReset)

	case "interval":
		if len(args) < 2 {
			fmt.Printf("%s[!] Cú pháp: /poll interval <số_giây> (Ví dụ: /poll interval 300 cho 5 phút)%s\n\n", colorYellow, colorReset)
			return
		}
		sec, err := strconv.Atoi(args[1])
		if err != nil || sec < 5 {
			fmt.Printf("%s[!] Số giây phải lớn hơn hoặc bằng 5: %s%s\n\n", colorRed, args[1], colorReset)
			return
		}
		s.cfg.PollInterval = sec
		_ = config.SaveConfig(s.cfg)
		if s.pollTicker != nil {
			s.pollTicker.Reset(time.Duration(sec) * time.Second)
		}
		fmt.Printf("%s[✔] Đã cập nhật chu kỳ Auto-Poll thành %d giây (~%.1f phút)%s\n\n", colorGreen, sec, float64(sec)/60.0, colorReset)

	case "url":
		if len(args) < 2 {
			fmt.Printf("%s[!] Cú pháp: /poll url <url_mới>%s\n\n", colorYellow, colorReset)
			return
		}
		newURL := args[1]
		s.cfg.PollUrl = newURL
		_ = config.SaveConfig(s.cfg)
		_ = s.database.UpsertEndpoint("Auto-Poll Bravo Định kỳ", "GET", newURL, "Giám sát Gateway", "Truy vấn dữ liệu Bravo tự động mỗi 5 phút")
		fmt.Printf("%s[✔] Đã cập nhật Endpoint Auto-Poll thành: %s và lưu vào SQLite!%s\n\n", colorGreen, newURL, colorReset)

	case "curl":
		fmt.Println()
		fmt.Printf("%s📋 Lệnh cURL Auto-Poll kèm chính xác 16 HTTP Headers & Bearer Token:%s\n", colorBold+colorCyan, colorReset)
		fmt.Printf("%s%s%s\n\n", colorYellow, s.client.GetCurlForPollAPI(), colorReset)

	case "logs":
		limit := 10
		if len(args) > 1 {
			if n, err := strconv.Atoi(args[1]); err == nil && n > 0 {
				limit = n
			}
		}
		s.cmdLogs(limit)

	default:
		fmt.Printf("%s[!] Lệnh con không hỗ trợ: %s. Dùng: /poll now, /poll status, /poll interval <sec>, /poll url <url>, /poll curl%s\n\n", colorYellow, sub, colorReset)
	}
}

func formatTimeOrNever(t time.Time) string {
	if t.IsZero() {
		return "Chưa thực hiện"
	}
	return t.Format("2006-01-02 15:04:05")
}

// Gọi API truy vấn dữ liệu chi tiết công đoạn WorkProcessDetail
func (s *Shell) cmdData(args []string) {
	pkv := s.cfg.DefaultPKV
	if pkv == "" {
		pkv = "11114889CD"
	}

	if len(args) > 0 {
		sub := strings.ToLower(args[0])
		switch sub {
		case "clear", "clean":
			s.cmdClearCache()
			return
		case "curl":
			if len(args) > 1 {
				pkv = args[1]
			}
			fmt.Println()
			fmt.Printf("%s📋 Lệnh cURL truy vấn dữ liệu chi tiết công đoạn (PKV: %s):%s\n", colorBold+colorCyan, pkv, colorReset)
			fmt.Printf("%s%s%s\n\n", colorYellow, s.client.GetCurlForWorkProcessAPI(pkv), colorReset)
			return
		case "list":
			s.cmdDB()
			return
		default:
			// Người dùng truyền mã PKV / DocNo trực tiếp, ví dụ: /data 11114889CD
			pkv = args[0]
		}
	}

	fmt.Println()
	fmt.Printf("%s🚀 TRUY VẤN DỮ LIỆU CHI TIẾT CÔNG ĐOẠN (WORK PROCESS DETAIL)%s\n", colorBold+colorCyan, colorReset)
	fmt.Printf("● Endpoint: %s%s%s\n", colorYellow, s.cfg.DataUrl, colorReset)
	fmt.Printf("● Khóa PKV : %s%s%s\n", colorBold+colorGreen, pkv, colorReset)

	stop := make(chan bool)
	go s.spinner(stop, fmt.Sprintf("Đang gửi yêu cầu truy vấn dữ liệu tới Bravo Gateway (PKV: %s)...", pkv))

	body, statusCode, latency, err := s.client.CallWorkProcessDetailAPI(s.cfg.DataUrl, pkv)
	stop <- true
	time.Sleep(10 * time.Millisecond)

	afterStr := time.Now().Format("15:04:05")

	if err != nil {
		fmt.Printf("\r\033[K%s[%s] ❌ Gọi API thất bại (%v) - Mã HTTP %d: %v%s\n",
			colorRed, afterStr, latency.Round(time.Millisecond), statusCode, err, colorReset)
		fmt.Printf("    Lịch sử lỗi đã được ghi vào bảng `api_logs` trong CSDL SQLite: %s\n\n", s.cfg.DBPath)
		return
	}

	fmt.Printf("\r\033[K%s[%s] ✔  HTTP %d OK (%v) — Đã nhận dữ liệu thành công!%s\n",
		colorGreen+colorBold, afterStr, statusCode, latency.Round(time.Millisecond), colorReset)
	fmt.Printf("    ● SQLite DB: Đã lưu kết quả vào bảng `synced_data` & `api_logs` (File: %s)\n", s.cfg.DBPath)
	fmt.Printf("    ● Kích thước phản hồi: %d bytes\n\n", len(body))

	// Hiển thị dữ liệu trả về đẹp mắt (Pretty Print JSON)
	var jsonData interface{}
	if err := json.Unmarshal(body, &jsonData); err == nil {
		formatted, _ := json.MarshalIndent(jsonData, "", "  ")
		preview := string(formatted)
		if len(preview) > 2000 {
			preview = preview[:2000] + fmt.Sprintf("\n... (Còn %d ký tự nữa, toàn bộ đã được lưu an toàn trong SQLite `synced_data`)", len(string(formatted))-2000)
		}
		fmt.Printf("%s%s%s\n\n", colorDim, preview, colorReset)
	} else {
		fmt.Printf("%s%s%s\n\n", colorDim, string(body), colorReset)
	}

	fmt.Printf("💡 Gõ %s/clear-cache%s nếu muốn xóa cache dữ liệu này. Token và tài khoản login sẽ luôn được giữ nguyên.\n\n",
		colorBold+colorYellow, colorReset)
}

// Xóa cache dữ liệu (synced_data) nhưng BẢO TOÀN tài khoản, token login
func (s *Shell) cmdClearCache() {
	count, err := s.database.ClearDataCache()
	if err != nil {
		fmt.Printf("\n%s[✘] Lỗi xóa cache SQLite: %v%s\n\n", colorRed, err, colorReset)
		return
	}

	fmt.Println()
	fmt.Printf("%s🧹 BỘ NHỚ ĐỆM DỮ LIỆU ĐÃ ĐƯỢC XÓA SẠCH!%s\n", colorGreen+colorBold, colorReset)
	fmt.Println("────────────────────────────────────────────────────────────────────────────────")
	fmt.Printf("● Đã xóa          : %s%d bản ghi%s trong bảng `synced_data` SQLite\n", colorYellow, count, colorReset)
	fmt.Printf("● Bảo toàn        : %sBảng `auth_tokens` (Tài khoản login, Bearer Token) KHÔNG bị ảnh hưởng%s\n", colorGreen, colorReset)
	fmt.Printf("● CSDL SQLite     : %s\n", s.cfg.DBPath)
	fmt.Println("────────────────────────────────────────────────────────────────────────────────\n")
}

func (s *Shell) spinner(stopChan chan bool, label string) {
	frames := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
	i := 0
	for {
		select {
		case <-stopChan:
			fmt.Print("\r\033[K")
			return
		default:
			fmt.Printf("\r%s[%s]%s %s", colorCyan, frames[i%len(frames)], colorReset, label)
			i++
			time.Sleep(80 * time.Millisecond)
		}
	}
}

// Đăng nhập tương tác hoặc dùng tham số
func (s *Shell) cmdLogin(args []string) {
	var username, password string

	if len(args) >= 2 {
		username = args[0]
		password = args[1]
	} else {
		fmt.Printf("\n%s🔐 BÀN ĐĂNG NHẬP XÁC THỰC TÀI KHOẢN BRAVO GATEWAY%s\n", colorBold+colorCyan, colorReset)
		fmt.Print("Mã tài khoản / Username ❯ ")
		uInput, _ := s.reader.ReadString('\n')
		username = strings.TrimSpace(uInput)

		fmt.Print("Mật khẩu / Password ❯ ")
		pInput, _ := s.reader.ReadString('\n')
		password = strings.TrimSpace(pInput)
	}

	if username == "" || password == "" {
		fmt.Printf("%s[!] Tên tài khoản và mật khẩu không được để trống.%s\n\n", colorRed, colorReset)
		return
	}

	// Cập nhật cấu hình tạm thời
	s.cfg.Username = username
	s.cfg.Password = password

	stop := make(chan bool)
	go s.spinner(stop, fmt.Sprintf("Đang xác thực với Bravo Gateway (%s)...", username))

	startTime := time.Now()
	resp, err := s.client.Login()
	stop <- true
	time.Sleep(10 * time.Millisecond)
	elapsed := time.Since(startTime).Round(time.Millisecond)

	if err != nil {
		fmt.Printf("%s[✘] ĐĂNG NHẬP THẤT BẠI (%v)%s\n", colorRed+colorBold, elapsed, colorReset)
		fmt.Printf("    Lỗi: %v\n\n", err)
		return
	}

	// Lưu cấu hình nếu đăng nhập thành công
	_ = config.SaveConfig(s.cfg)

	fmt.Printf("%s[✔] HTTP 200 OK - Xác thực thành công (%v)%s\n", colorGreen+colorBold, elapsed, colorReset)
	fmt.Printf("%s┌─ OAuth2 Session ────────────────────────────────────────────────────────────┐%s\n", colorCyan, colorReset)
	
	tokSnippet := resp.AccessToken
	if len(tokSnippet) > 55 {
		tokSnippet = tokSnippet[:30] + "..." + tokSnippet[len(tokSnippet)-20:]
	}
	fmt.Printf("│  User         : %s%-58s%s│\n", colorBold+colorYellow, username, colorReset)
	fmt.Printf("│  Access Token : %s%-58s%s│\n", colorBold, tokSnippet, colorReset)
	fmt.Printf("│  Expires In   : %s%-10d giây (~%.1f giờ)%s                                │\n", colorYellow, resp.ExpiresIn, float64(resp.ExpiresIn)/3600.0, colorReset)
	fmt.Printf("│  Refresh Token: %-58s│\n", resp.RefreshToken)
	fmt.Printf("│  Database     : %sĐã ghi vào bảng `auth_tokens` trong %s%s   │\n", colorGreen, s.cfg.DBPath, colorReset)
	fmt.Printf("%s└─────────────────────────────────────────────────────────────────────────────┘%s\n\n", colorCyan, colorReset)
}

func (s *Shell) cmdToken() {
	tok, err := s.database.GetLatestToken(s.cfg.Username)
	if err != nil {
		fmt.Printf("%s[✘] Lỗi truy vấn CSDL: %v%s\n\n", colorRed, err, colorReset)
		return
	}
	if tok == nil {
		fmt.Printf("%s[!] Chưa có Token nào trong Database. Chạy /login để lấy mới.%s\n\n", colorYellow, colorReset)
		return
	}

	statusStr := colorGreen + "HỢP LỆ" + colorReset
	remainStr := time.Until(tok.ExpiresAt).Round(time.Second).String()
	if tok.IsExpired {
		statusStr = colorRed + "ĐÃ HẾT HẠN" + colorReset
		remainStr = "0s"
	}

	fmt.Println()
	fmt.Printf("%s┌─ Current Token Record #%d ──────────────────────────────────────────────────┐%s\n", colorCyan, tok.ID, colorReset)
	fmt.Printf("│  User       : %-60s│\n", tok.Username)
	fmt.Printf("│  Created At : %-60s│\n", tok.CreatedAt.Format("2006-01-02 15:04:05"))
	fmt.Printf("│  Expires At : %-30s Status: %-20s│\n", tok.ExpiresAt.Format("2006-01-02 15:04:05"), statusStr)
	fmt.Printf("│  Remaining  : %-60s│\n", remainStr)
	fmt.Printf("│  Token (Full) :                                                             │\n")
	fmt.Printf("│  %s%s%s\n", colorDim, wrapText(tok.AccessToken, 74), colorReset)
	fmt.Printf("%s└─────────────────────────────────────────────────────────────────────────────┘%s\n\n", colorCyan, colorReset)
}

func wrapText(text string, width int) string {
	var result strings.Builder
	for len(text) > width {
		result.WriteString("  " + text[:width] + "\n")
		text = text[width:]
	}
	if len(text) > 0 {
		result.WriteString("  " + text)
	}
	return result.String()
}

func (s *Shell) cmdStatus() {
	tokenCount, logCount, dataCount, _ := s.database.GetStats()
	tok, _ := s.database.GetLatestToken(s.cfg.Username)

	fmt.Println()
	fmt.Printf("%s● Hệ thống      :%s Sẵn sàng | %sMôi trường:%s Go v1.25.4 (Native CLI)\n", colorGreen, colorReset, colorCyan, colorReset)
	fmt.Printf("%s● CSDL SQLite   :%s %s (Tokens: %d, Logs: %d, Synced: %d)\n", colorGreen, colorReset, s.cfg.DBPath, tokenCount, logCount, dataCount)
	fmt.Printf("%s● Cấu hình Auth :%s %s (%s)\n", colorGreen, colorReset, s.cfg.ApiUrl, s.cfg.Username)
	fmt.Printf("%s● Auto-Poll 5m  :%s %s\n", colorGreen, colorReset, s.cfg.PollUrl)
	fmt.Printf("                   Chu kỳ: %ds (%.1f phút) | Đã gọi: %d lần | Lần cuối: %s\n", 
		s.cfg.PollInterval, float64(s.cfg.PollInterval)/60.0, s.pollCount, formatTimeOrNever(s.lastPoll))
	if tok != nil {
		if tok.IsExpired {
			fmt.Printf("%s● Token         :%s %sHết hạn lúc %s%s\n", colorYellow, colorReset, colorRed, tok.ExpiresAt.Format("15:04:05"), colorReset)
		} else {
			rem := time.Until(tok.ExpiresAt).Round(time.Minute)
			fmt.Printf("%s● Token         :%s %sHợp lệ (Còn %s đến %s)%s\n", colorGreen, colorReset, colorGreen, rem, tok.ExpiresAt.Format("15:04:05"), colorReset)
		}
	} else {
		fmt.Printf("%s● Token         :%s %sChưa đăng nhập (/login để xác thực)%s\n", colorRed, colorReset, colorYellow, colorReset)
	}
	fmt.Println()
}

// ================= MODULE 1: QUẢN TRỊ HỆ THỐNG & ĐĂNG KÝ API =================
func (s *Shell) cmdAPI(args []string) {
	if len(args) == 0 || args[0] == "list" {
		endpoints, err := s.database.GetEndpoints()
		if err != nil {
			fmt.Printf("%s[✘] Lỗi truy vấn API Endpoints: %v%s\n\n", colorRed, err, colorReset)
			return
		}

		fmt.Println()
		fmt.Printf("%s🔌 QUẢN TRỊ HỆ THỐNG — DANH SÁCH API ENDPOINTS ĐÃ ĐĂNG KÝ (%d)%s\n", colorBold+colorCyan, len(endpoints), colorReset)
		fmt.Println("────────────────────────────────────────────────────────────────────────────────")
		fmt.Printf("%-4s %-6s %-32s %-16s %s\n", "ID", "METHOD", "TÊN CHỨC NĂNG", "PHÂN HỆ", "ENDPOINT URL")
		fmt.Println("────────────────────────────────────────────────────────────────────────────────")

		for _, ep := range endpoints {
			methodColor := colorGreen
			if ep.Method == "GET" {
				methodColor = colorCyan
			} else if ep.Method == "DELETE" {
				methodColor = colorRed
			}
			urlSnippet := ep.EndpointURL
			if len(urlSnippet) > 40 {
				urlSnippet = urlSnippet[:38] + ".."
			}
			fmt.Printf("#%-3d %s%-6s%s %-32s %-16s %s%s%s\n", 
				ep.ID, methodColor, ep.Method, colorReset, ep.Name, ep.Module, colorDim, urlSnippet, colorReset)
		}
		fmt.Println("────────────────────────────────────────────────────────────────────────────────")
		fmt.Printf("💡 Gõ %s/api test <id>%s để gọi thử endpoint. Gõ %s/api add%s để đăng ký mới.\n\n", 
			colorBold+colorYellow, colorReset, colorBold+colorGreen, colorReset)
		return
	}

	sub := strings.ToLower(args[0])
	switch sub {
	case "test":
		if len(args) < 2 {
			fmt.Printf("%s[!] Cú pháp: /api test <id> (Ví dụ: /api test 2)%s\n\n", colorYellow, colorReset)
			return
		}
		id, err := strconv.Atoi(args[1])
		if err != nil {
			fmt.Printf("%s[!] ID không hợp lệ: %s%s\n\n", colorRed, args[1], colorReset)
			return
		}
		endpoints, _ := s.database.GetEndpoints()
		var target *db.ApiEndpointRecord
		for _, ep := range endpoints {
			if ep.ID == int64(id) {
				target = &ep
				break
			}
		}
		if target == nil {
			fmt.Printf("%s[✘] Không tìm thấy API Endpoint với ID #%d%s\n\n", colorRed, id, colorReset)
			return
		}
		s.cmdCall(target.Method, target.EndpointURL)

	case "add":
		fmt.Printf("\n%s➕ ĐĂNG KÝ API ENDPOINT CHỨC NĂNG MỚI%s\n", colorBold+colorGreen, colorReset)
		fmt.Print("Tên chức năng (VD: Lấy dữ liệu IoT Nhiệt độ) ❯ ")
		name, _ := s.reader.ReadString('\n')
		name = strings.TrimSpace(name)

		fmt.Print("Phương thức HTTP [GET/POST/PUT/DELETE] (Mặc định GET) ❯ ")
		method, _ := s.reader.ReadString('\n')
		method = strings.ToUpper(strings.TrimSpace(method))
		if method == "" {
			method = "GET"
		}

		fmt.Print("Endpoint URL (VD: https://bravo.goldsunpackaging.vn:5051/api/v1/sensors) ❯ ")
		url, _ := s.reader.ReadString('\n')
		url = strings.TrimSpace(url)

		fmt.Print("Phân hệ nghiệp vụ [Lệnh sản xuất / Quản trị hệ thống / Kho] ❯ ")
		module, _ := s.reader.ReadString('\n')
		module = strings.TrimSpace(module)
		if module == "" {
			module = "Quản trị hệ thống"
		}

		if name != "" && url != "" {
			err := s.database.AddEndpoint(name, method, url, module, "Người dùng tự đăng ký")
			if err != nil {
				fmt.Printf("%s[✘] Lỗi lưu endpoint: %v%s\n\n", colorRed, err, colorReset)
			} else {
				fmt.Printf("%s[✔] Đã đăng ký API '%s' [%s] thành công vào CSDL!%s\n\n", colorGreen, name, method, colorReset)
			}
		} else {
			fmt.Printf("%s[!] Tên chức năng và URL không được để trống.%s\n\n", colorYellow, colorReset)
		}

	case "delete", "del", "remove", "rm":
		if len(args) < 2 {
			fmt.Printf("%s[!] Cú pháp: /api delete <id> (Ví dụ: /api delete 2)%s\n\n", colorYellow, colorReset)
			return
		}
		id, err := strconv.Atoi(args[1])
		if err != nil {
			fmt.Printf("%s[!] ID không hợp lệ: %s%s\n\n", colorRed, args[1], colorReset)
			return
		}
		if err := s.database.DeleteEndpoint(int64(id)); err != nil {
			fmt.Printf("%s[✘] Lỗi xóa endpoint: %v%s\n\n", colorRed, err, colorReset)
		} else {
			fmt.Printf("%s[✔] Đã xóa API Endpoint #%d thành công khỏi CSDL SQLite!%s\n\n", colorGreen, id, colorReset)
		}

	default:
		fmt.Printf("%s[!] Lệnh con không hỗ trợ: %s. Dùng: /api list, /api test <id>, /api add, /api del <id>%s\n\n", colorYellow, sub, colorReset)
	}
}

// ================= MODULE 2: LỆNH SẢN XUẤT (WORK PROCESS - BRAVO ERP) =================
func (s *Shell) cmdWorkOrders(args []string) {
	if len(args) > 0 {
		sub := strings.ToLower(args[0])
		switch sub {
		case "curl":
			curlCmd := s.client.GetCurlForWorkOrdersAPI()
			fmt.Println()
			fmt.Printf("%s📋 Lệnh cURL Truy vấn Lệnh sản xuất trực tiếp từ Bravo ERP (vB30WorkProcess_Explorer):%s\n", colorBold+colorCyan, colorReset)
			fmt.Printf("%s%s%s\n\n", colorYellow, curlCmd, colorReset)
			return

		case "sync", "refresh", "pull":
			s.syncWorkOrdersFromBravo()
			return
		}
	}

	// Gọi trực tiếp API máy chủ Bravo ERP Gateway (không lấy từ cache SQLite)
	s.syncWorkOrdersFromBravo()
}


func (s *Shell) syncWorkOrdersFromBravo() {
	stop := make(chan bool)
	go s.spinner(stop, "Đang kết nối Bravo Gateway truy vấn Lệnh sản xuất (vB30WorkProcess_Explorer)...")

	orders, _, statusCode, latency, err := s.client.CallWorkOrdersAPI()
	stop <- true
	time.Sleep(10 * time.Millisecond)

	if err != nil {
		fmt.Printf("\r\033[K%s[✘] ĐỒNG BỘ THẤT BẠI (%v) - HTTP %d: %v%s\n\n", colorRed+colorBold, latency.Round(time.Millisecond), statusCode, err, colorReset)
		return
	}

	fmt.Printf("\r\033[K%s[✔] HTTP %d OK (%v) — Đã đồng bộ thành công %d Lệnh sản xuất từ Bravo ERP!%s\n",
		colorGreen+colorBold, statusCode, latency.Round(time.Millisecond), len(orders), colorReset)

	s.printWorkOrdersTable(orders, "Trực tiếp từ máy chủ Bravo ERP Gateway")
}

func (s *Shell) printWorkOrdersTable(orders []db.WorkOrderRecord, source string) {
	fmt.Println()
	fmt.Printf("%s📦 DANH SÁCH LỆNH SẢN XUẤT BRAVO ERP (vB30WorkProcess_Explorer) — %d LỆNH%s\n", colorBold+colorCyan, len(orders), colorReset)
	fmt.Printf("● Nguồn dữ liệu : %s%s%s\n", colorYellow, source, colorReset)
	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"STT", "SỐ LỆNH (DocNo)", "KHÓA PKV", "NGÀY LẬP", "C.ĐOẠN", "DIỄN GIẢI / SẢN PHẨM", "NHÀ MÁY", "NGƯỜI LẬP", "TRẠNG THÁI"})
	table.SetAutoFormatHeaders(false)
	table.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
	table.SetAlignment(tablewriter.ALIGN_LEFT)
	table.SetCenterSeparator("┼")
	table.SetColumnSeparator("│")
	table.SetRowSeparator("─")
	table.SetBorder(true)
	table.SetAutoWrapText(false)

	for i, wo := range orders {
		desc := wo.Description
		if desc == "" && wo.ItemName != "" {
			desc = wo.ItemName
		}

		table.Append([]string{
			fmt.Sprintf("#%d", i+1),
			wo.DocNo,
			wo.Stt,
			wo.DocDate,
			wo.ProcessCode,
			desc,
			wo.FactoryName,
			wo.CreatedByName,
			wo.StatusText,
		})
	}
	table.Render()

	fmt.Printf("💡 %sMẹo:%s Gõ %s/data <Khóa PKV>%s để truy vấn chi tiết công đoạn của lệnh đó (Ví dụ: %s/data 11114889CD%s)\n",
		colorBold+colorGreen, colorReset, colorBold+colorYellow, colorReset, colorBold+colorCyan, colorReset)
	fmt.Printf("💡 Gõ %s/wo sync%s để tải lại dữ liệu mới nhất từ Bravo ERP. Gõ %s/wo curl%s để xem cURL mẫu.\n\n",
		colorBold+colorGreen, colorReset, colorBold+colorYellow, colorReset)
}

// cmdSearch tra cứu Lệnh sản xuất trực tiếp từ Bravo Gateway và hiển thị đầy đủ thông tin Master lẫn toàn bộ các dòng Chi tiết
func (s *Shell) cmdSearch(args []string) {
	var keyword string
	if len(args) > 0 {
		keyword = strings.Join(args, " ")
	} else {
		fmt.Printf("\n%s🔍 TRA CỨU LỆNH SẢN XUẤT & CHI TIẾT CÔNG ĐOẠN (BRAVO GATEWAY)%s\n", colorBold+colorCyan, colorReset)
		fmt.Print("Nhập mã Lệnh hoặc mã Chi tiết (VD: CDSO-1026-0008(997) hoặc CD05) ❯ ")
		input, _ := s.reader.ReadString('\n')
		keyword = strings.TrimSpace(input)
	}

	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		fmt.Printf("%s[!] Vui lòng nhập mã lệnh cần tra cứu. Cú pháp: /search <mã_lệnh>%s\n\n", colorYellow, colorReset)
		return
	}

	fmt.Println()
	fmt.Printf("%s🔍 ĐANG TRUY VẤN TRỰC TIẾP TỪ BRAVO ERP GATEWAY (MÃ: %s)...%s\n", colorBold+colorCyan, keyword, colorReset)

	stop := make(chan bool)
	go s.spinner(stop, fmt.Sprintf("Đang tìm kiếm '%s' trên hệ thống Bravo...", keyword))

	results, statusCode, latency, err := s.client.SearchWorkOrdersAPI(keyword)
	stop <- true
	time.Sleep(10 * time.Millisecond)

	if err != nil {
		fmt.Printf("\r\033[K%s[✘] Lỗi truy vấn API Bravo Gateway (%v) [Mã HTTP %d]: %v%s\n\n",
			colorRed, latency.Round(time.Millisecond), statusCode, err, colorReset)
		return
	}

	if len(results) == 0 {
		fmt.Printf("\r\033[K%s[!] Không tìm thấy kết quả nào từ máy chủ Bravo cho mã: '%s'%s\n\n", colorYellow, keyword, colorReset)
		return
	}

	// Đếm tổng số dòng chi tiết
	totalDetails := 0
	for _, r := range results {
		totalDetails += len(r.Details)
	}

	fmt.Printf("\r\033[K%s[✔] HTTP %d OK (%v) — Tìm thấy %d Lệnh cha (Master) | %d dòng Chi tiết công đoạn%s\n",
		colorGreen+colorBold, statusCode, latency.Round(time.Millisecond), len(results), totalDetails, colorReset)

	for mIdx, res := range results {
		master := res.Master
		statusColor := colorGreen
		if master.DocStatus == 0 {
			statusColor = colorYellow
		} else if master.DocStatus == 1 {
			statusColor = colorCyan
		}

		// 1. Thẻ thông tin tổng quan Lệnh Master (Gọn gàng, rõ ràng, không bị tràn ngang)
		fmt.Println()
		fmt.Printf("%s┌── [LỆNH GỐC #%d] %s%s (PKV: %s) ─────────────────────────────────────────────────────────┐%s\n",
			colorCyan, mIdx+1, colorBold+colorYellow, master.DocNo, master.Stt, colorReset)
		fmt.Printf("│  ● Công đoạn   : %s%-12s%s │  ● Trạng thái : %s%-20s%s│\n",
			colorBold+colorGreen, master.ProcessCode, colorReset, statusColor, master.StatusText, colorReset)
		fmt.Printf("│  ● Ngày lập    : %-12s │  ● Người lập  : %-20s│\n",
			master.DocDate, master.CreatedByName)
		if master.FactoryName != "" {
			fmt.Printf("│  ● Nhà máy     : %-52s│\n", master.FactoryName)
		}
		if master.Description != "" {
			desc := master.Description
			if len(desc) > 52 {
				desc = desc[:50] + ".."
			}
			fmt.Printf("│  ● Diễn giải   : %-52s│\n", desc)
		}
		fmt.Printf("%s└──────────────────────────────────────────────────────────────────────────────────────────┘%s\n", colorCyan, colorReset)

		// 2. Bảng các dòng chi tiết công đoạn (Tự động đo độ rộng động theo chuẩn psql)
		if len(res.Details) == 0 {
			fmt.Printf("%s   (Không có bản ghi chi tiết công đoạn con)%s\n\n", colorDim, colorReset)
			continue
		}

		fmt.Printf("\n  %s📋 DANH SÁCH CHI TIẾT CÔNG ĐOẠN (%d DÒNG):%s\n", colorBold, len(res.Details), colorReset)

		detailTable := tablewriter.NewWriter(os.Stdout)
		detailTable.SetHeader([]string{"STT", "MÃ LỆNH CHI TIẾT", "MẶT HÀNG / TÊN SP", "MÃ HÀNG", "ĐVT", "CẦN SX", "SAU Đ/C", "MAX TK", "ROWID", "HẠN HOÀN TẤT"})
		detailTable.SetAutoFormatHeaders(false)
		detailTable.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
		detailTable.SetAlignment(tablewriter.ALIGN_LEFT)
		detailTable.SetCenterSeparator("┼")
		detailTable.SetColumnSeparator("│")
		detailTable.SetRowSeparator("─")
		detailTable.SetBorder(true)
		detailTable.SetAutoWrapText(false)

		for dIdx, d := range res.Details {
			docDetail := d.DocNoDetail
			if docDetail == "" {
				docDetail = master.DocNo
			}

			itemName := d.ItemName
			if itemName == "" {
				itemName = master.ItemName
			}

			itemCode := d.ItemCode
			if itemCode == "" {
				itemCode = master.ItemCode
			}

			closedDate := d.ClosedDate
			if closedDate == "" {
				closedDate = master.DocDate
			}
			if len(closedDate) >= 10 {
				closedDate = closedDate[:10]
			}

			rowIdStr := d.RowId
			if rowIdStr == "" {
				rowIdStr = master.Stt
			}

			var maxTK float64 = 0
			for _, st := range d.Steps {
				if st.QuantityProduceTK > maxTK {
					maxTK = st.QuantityProduceTK
				}
				if st.QuantityPassTK > maxTK {
					maxTK = st.QuantityPassTK
				}
			}
			maxTKStr := "-"
			if maxTK > 0 {
				maxTKStr = fmt.Sprintf("%.0f", maxTK)
			}

			detailTable.Append([]string{
				fmt.Sprintf("#%d", dIdx+1),
				docDetail,
				itemName,
				itemCode,
				d.Unit,
				fmt.Sprintf("%.0f", d.QuantityProduce),
				fmt.Sprintf("%.0f", d.QuantityAfterAdj),
				maxTKStr,
				rowIdStr,
				closedDate,
			})
		}
		detailTable.Render()

		// 3. Render bảng Thao tác chi tiết (detailtt: vB30WorkProcessDetailTT) chuẩn PostgreSQL psql
		for _, d := range res.Details {
			if len(d.Steps) == 0 {
				continue
			}

			docDetail := d.DocNoDetail
			if docDetail == "" {
				docDetail = master.DocNo
			}

			fmt.Println()
			fmt.Printf("  %s⚙️  BẢNG CHI TIẾT THAO TÁC (vB30WorkProcessDetailTT) — Lệnh con: %s (RowId: %s):%s\n",
				colorBold+colorYellow, docDetail, d.RowId, colorReset)

			stepTable := tablewriter.NewWriter(os.Stdout)
			stepTable.SetHeader([]string{"STT", "MÃ THAO TÁC", "TÊN THAO TÁC CÔNG ĐOẠN", "SL ĐẠT TT", "SL SX TT", "ĐẠT THỐNG KÊ", "SL MAX THỐNG KÊ", "MÃ MÁY", "TÊN MÁY"})
			stepTable.SetAutoFormatHeaders(false)
			stepTable.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
			stepTable.SetAlignment(tablewriter.ALIGN_LEFT)
			stepTable.SetCenterSeparator("┼")
			stepTable.SetColumnSeparator("│")
			stepTable.SetRowSeparator("─")
			stepTable.SetBorder(true)
			stepTable.SetAutoWrapText(false)

			var maxProduceTK float64 = 0
			var maxPassTK float64 = 0
			for sIdx, st := range d.Steps {
				stepName := st.WorkStepTypeName
				if stepName == "" {
					stepName = st.WorkStepTypeCode
				}

				mCode := st.MachineCode
				if mCode == "" {
					mCode = "-"
				}
				mName := st.MachineName
				if mName == "" {
					mName = "-"
				}

				if st.QuantityProduceTK > maxProduceTK {
					maxProduceTK = st.QuantityProduceTK
				}
				if st.QuantityPassTK > maxPassTK {
					maxPassTK = st.QuantityPassTK
				}

				stepTable.Append([]string{
					fmt.Sprintf("#%d", sIdx+1),
					st.WorkStepCode,
					stepName,
					fmt.Sprintf("%.0f", st.QuantityPass),
					fmt.Sprintf("%.0f", st.QuantityProduce),
					fmt.Sprintf("%.0f", st.QuantityPassTK),
					fmt.Sprintf("%.0f", st.QuantityProduceTK),
					mCode,
					mName,
				})
			}
			stepTable.Render()
			fmt.Printf("   ⭐ %sSL Max Thống Kê (SX)%s: %s%.0f%s | %sSL Đạt Thống Kê cao nhất%s: %s%.0f%s\n",
				colorBold+colorYellow, colorReset, colorBold+colorGreen, maxProduceTK, colorReset,
				colorBold+colorYellow, colorReset, colorBold+colorGreen, maxPassTK, colorReset)

			// Kiểm tra điều kiện quyết toán theo quy tắc thống kê
			maxTKVal := maxProduceTK
			if maxPassTK > maxTKVal {
				maxTKVal = maxPassTK
			}
			if maxTKVal > 0 && d.QuantityAfterAdj > 0 && maxTKVal >= d.QuantityAfterAdj {
				fmt.Printf("   %s⛔ [KHÔNG THỂ QUYẾT TOÁN]: Số lượng thống kê đã đạt %.0f/%.0f (bằng SL cần đạt sau điều chỉnh). Lệnh đã hoàn thành đủ sản lượng!%s\n",
					colorBold+colorRed, maxTKVal, d.QuantityAfterAdj, colorReset)
			} else if maxTKVal > 0 && maxTKVal < d.QuantityAfterAdj {
				fmt.Printf("   %sℹ️  [RÀNG BUỘC THỐNG KÊ]: Đã thống kê được %.0f/%.0f. Khi quyết toán KHÔNG ĐƯỢC HẠ QUÁ %.0f (SL cần đạt tối thiểu phải là %.0f)!%s\n",
					colorBold+colorYellow, maxTKVal, d.QuantityAfterAdj, maxTKVal, maxTKVal, colorReset)
			}
		}
	}



	fmt.Printf("\n💡 Gõ %s/data <Khóa PKV>%s để xem toàn bộ JSON gốc từ Bravo. Gõ %s/wo%s để xem danh sách tổng quát.\n\n",
		colorBold+colorYellow, colorReset, colorBold+colorCyan, colorReset)
}

// cmdSettle thực hiện quy trình Quyết toán & Điều chỉnh số lượng Lệnh sản xuất trực tiếp lên Bravo ERP
func (s *Shell) cmdSettle(args []string) {
	var keyword string
	if len(args) > 0 {
		keyword = strings.Join(args, " ")
	} else {
		fmt.Printf("\n%s⚖️  QUYẾT TOÁN & ĐIỀU CHỈNH SẢN LƯỢNG LỆNH CÔNG ĐOẠN (BRAVO ERP)%s\n", colorBold+colorCyan, colorReset)
		fmt.Print("Nhập mã Lệnh cần quyết toán (VD: CD02-0926-0006 hoặc CD03-1026-0010) ❯ ")
		input, _ := s.reader.ReadString('\n')
		keyword = strings.TrimSpace(input)
	}

	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		fmt.Printf("%s[!] Vui lòng nhập mã lệnh cần quyết toán. Cú pháp: /settle <mã_lệnh>%s\n\n", colorYellow, colorReset)
		return
	}

	fmt.Printf("\n%s🔍 Đang tải thông tin hiện tại của lệnh '%s' từ Bravo Gateway...%s\n", colorCyan, keyword, colorReset)
	results, _, _, err := s.client.SearchWorkOrdersAPI(keyword)
	if err != nil || len(results) == 0 {
		fmt.Printf("%s[✘] Không tìm thấy Lệnh hợp lệ để quyết toán: %v%s\n\n", colorRed, err, colorReset)
		return
	}

	res := results[0]
	master := res.Master
	if len(res.Details) == 0 {
		fmt.Printf("%s[!] Lệnh %s không có dòng chi tiết công đoạn con nào để quyết toán.%s\n\n", colorYellow, master.DocNo, colorReset)
		return
	}

	fmt.Println()
	fmt.Printf("%s┌── [THÔNG TIN LỆNH CẦN QUYẾT TOÁN] ─────────────────────────────────────────────────────────┐%s\n", colorCyan, colorReset)
	fmt.Printf("│  ● Số Lệnh     : %s%-20s%s │  ● Khóa PKV : %-20s│\n", colorBold+colorYellow, master.DocNo, colorReset, master.Stt)
	fmt.Printf("│  ● ID Lệnh     : %s%-20d%s │  ● Công đoạn: %-20s│\n", colorBold+colorCyan, master.MasterID, colorReset, master.ProcessCode)
	fmt.Printf("│  ● Trạng thái  : %-20s │  ● Tổng dòng: %s%d chi tiết công đoạn%s                  │\n", master.StatusText, colorBold+colorGreen, len(res.Details), colorReset)
	fmt.Printf("%s└──────────────────────────────────────────────────────────────────────────────────────────┘%s\n", colorCyan, colorReset)

	// In bảng danh sách các dòng chi tiết hiện tại
	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"STT", "MÃ LỆNH CHI TIẾT", "MẶT HÀNG", "MÃ HÀNG", "SL DO", "CẦN SX", "SAU Đ/C", "MAX TK", "ROWID"})
	table.SetAutoFormatHeaders(false)
	table.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
	table.SetAlignment(tablewriter.ALIGN_LEFT)
	table.SetCenterSeparator("┼")
	table.SetColumnSeparator("│")
	table.SetRowSeparator("─")
	table.SetBorder(true)
	table.SetAutoWrapText(false)

	for i, d := range res.Details {
		var maxTK float64 = 0
		for _, st := range d.Steps {
			if st.QuantityProduceTK > maxTK {
				maxTK = st.QuantityProduceTK
			}
			if st.QuantityPassTK > maxTK {
				maxTK = st.QuantityPassTK
			}
		}
		maxTKStr := "-"
		if maxTK > 0 {
			maxTKStr = fmt.Sprintf("%.0f", maxTK)
		}

		table.Append([]string{
			fmt.Sprintf("#%d", i+1),
			d.DocNoDetail,
			d.ItemName,
			d.ItemCode,
			fmt.Sprintf("%.0f", d.QuantitySO),
			fmt.Sprintf("%.0f", d.QuantityProduce),
			fmt.Sprintf("%.0f", d.QuantityAfterAdj),
			maxTKStr,
			d.RowId,
		})
	}
	table.Render()

	// Chọn dòng cần quyết toán
	targetIdx := 0
	if len(res.Details) > 1 {
		fmt.Printf("\n%sChọn số thứ tự dòng chi tiết cần quyết toán (1-%d) [Mặc định 1]:%s ", colorYellow, len(res.Details), colorReset)
		input, _ := s.reader.ReadString('\n')
		input = strings.TrimSpace(input)
		if input != "" {
			if n, err := strconv.Atoi(input); err == nil && n >= 1 && n <= len(res.Details) {
				targetIdx = n - 1
			}
		}
	}

	targetDetail := res.Details[targetIdx]
	if len(targetDetail.Steps) == 0 && targetDetail.RowId != "" {
		steps, _ := s.client.CallWorkProcessDetailTTRows(targetDetail.RowId)
		targetDetail.Steps = steps
	}

	fmt.Printf("\n%s🎯 ĐANG THAO TÁC QUYẾT TOÁN DÒNG #%d: %s (RowId: %s)%s\n",
		colorBold+colorGreen, targetIdx+1, targetDetail.DocNoDetail, targetDetail.RowId, colorReset)
	fmt.Printf("   ● SL theo DO        : %s%.0f%s\n", colorYellow, targetDetail.QuantitySO, colorReset)
	fmt.Printf("   ● SL Cần SX hiện tại: %s%.0f%s\n", colorCyan, targetDetail.QuantityProduce, colorReset)
	fmt.Printf("   ● SL Sau Đ/C hiện tại: %s%.0f%s\n", colorCyan, targetDetail.QuantityAfterAdj, colorReset)

	var maxProduceTK float64 = 0
	var maxPassTK float64 = 0
	if len(targetDetail.Steps) > 0 {
		fmt.Printf("\n  %s⚙️  TIẾN ĐỘ THỐNG KÊ THAO TÁC (vB30WorkProcessDetailTT):%s\n", colorBold+colorYellow, colorReset)
		stepTable := tablewriter.NewWriter(os.Stdout)
		stepTable.SetHeader([]string{"STT", "MÃ THAO TÁC", "TÊN THAO TÁC CÔNG ĐOẠN", "SL ĐẠT TT", "SL SX TT", "ĐẠT THỐNG KÊ", "SL MAX THỐNG KÊ", "MÃ MÁY", "TÊN MÁY"})
		stepTable.SetAutoFormatHeaders(false)
		stepTable.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
		stepTable.SetAlignment(tablewriter.ALIGN_LEFT)
		stepTable.SetCenterSeparator("┼")
		stepTable.SetColumnSeparator("│")
		stepTable.SetRowSeparator("─")
		stepTable.SetBorder(true)
		stepTable.SetAutoWrapText(false)

		for sIdx, st := range targetDetail.Steps {
			stepName := st.WorkStepTypeName
			if stepName == "" {
				stepName = st.WorkStepTypeCode
			}
			mCode := st.MachineCode
			if mCode == "" {
				mCode = "-"
			}
			mName := st.MachineName
			if mName == "" {
				mName = "-"
			}

			if st.QuantityProduceTK > maxProduceTK {
				maxProduceTK = st.QuantityProduceTK
			}
			if st.QuantityPassTK > maxPassTK {
				maxPassTK = st.QuantityPassTK
			}

			stepTable.Append([]string{
				fmt.Sprintf("#%d", sIdx+1),
				st.WorkStepCode,
				stepName,
				fmt.Sprintf("%.0f", st.QuantityPass),
				fmt.Sprintf("%.0f", st.QuantityProduce),
				fmt.Sprintf("%.0f", st.QuantityPassTK),
				fmt.Sprintf("%.0f", st.QuantityProduceTK),
				mCode,
				mName,
			})
		}
		stepTable.Render()
		fmt.Printf("   ⭐ %sSL Max Thống Kê (SX)%s: %s%.0f%s | %sSL Đạt Thống Kê cao nhất%s: %s%.0f%s\n",
			colorBold+colorYellow, colorReset, colorBold+colorGreen, maxProduceTK, colorReset,
			colorBold+colorYellow, colorReset, colorBold+colorGreen, maxPassTK, colorReset)
	}

	maxTKVal := maxProduceTK
	if maxPassTK > maxTKVal {
		maxTKVal = maxPassTK
	}

	// Kiểm tra nếu số lượng thống kê đã bằng hoặc vượt quá SL cần đạt sau điều chỉnh
	if maxTKVal > 0 && targetDetail.QuantityAfterAdj > 0 && maxTKVal >= targetDetail.QuantityAfterAdj {
		fmt.Printf("\n%s⛔ [TỪ CHỐI THỰC HIỆN — LỆNH ĐÃ HOÀN THÀNH ĐỦ THỐNG KÊ]:%s\n", colorBold+colorRed, colorReset)
		fmt.Printf("   ● SL cần đạt sau điều chỉnh hiện tại : %s%.0f%s\n", colorCyan, targetDetail.QuantityAfterAdj, colorReset)
		fmt.Printf("   ● SL sản xuất đã thống kê thực tế   : %s%.0f%s\n", colorGreen, maxTKVal, colorReset)
		fmt.Printf("   %s-> KHÔNG ĐỦ ĐIỀU KIỆN QUYẾT TOÁN: Số lượng thống kê đã bằng SL cần đạt (%.0f/%.0f).%s\n", colorBold+colorRed, maxTKVal, targetDetail.QuantityAfterAdj, colorReset)
		fmt.Printf("   %s-> HỆ THỐNG TỪ CHỐI VÀ KHÔNG CHO PHÉP HẠ SẢN LƯỢNG NỮA! THAO TÁC BỊ CHẶN HOÀN TOÀN.%s\n\n", colorBold+colorRed, colorReset)
		return
	} else if maxTKVal > 0 && maxTKVal < targetDetail.QuantityAfterAdj {
		fmt.Printf("\n%sℹ️  [RÀNG BUỘC THỐNG KÊ]:%s\n", colorBold+colorYellow, colorReset)
		fmt.Printf("   ● Xưởng đã thống kê thực tế được: %s%.0f con%s (SL cần đạt hiện tại: %.0f)\n", colorBold+colorGreen, maxTKVal, colorReset, targetDetail.QuantityAfterAdj)
		fmt.Printf("   ● Quy định: %sKHÔNG ĐƯỢC HẠ QUÁ %.0f%s! SL sau điều chỉnh tối thiểu phải là %s%.0f%s.\n",
			colorBold+colorRed, maxTKVal, colorReset, colorBold+colorGreen, maxTKVal, colorReset)
	}

	// Nhập SL điều chỉnh với gợi ý thông minh dựa trên SL Max Thống Kê
	suggestAdj := -targetDetail.QuantityProduce
	if maxTKVal > 0 && maxTKVal < targetDetail.QuantityProduce {
		suggestAdj = maxTKVal - targetDetail.QuantityProduce
	}
	fmt.Printf("\n%s1. Nhập Số Lượng Điều Chỉnh (QuantityAdj):%s\n", colorBold, colorReset)
	fmt.Printf("   [Gợi ý hợp lệ]:\n")
	if maxTKVal > 0 && maxTKVal < targetDetail.QuantityProduce {
		fmt.Printf("   • Nhập %s%.0f%s : Chốt về đúng SL Max Thống Kê (%.0f con — Mức hạ tối đa cho phép)\n", colorGreen, maxTKVal-targetDetail.QuantityProduce, maxTKVal, colorReset)
	} else if maxTKVal == 0 {
		fmt.Printf("   • Nhập %s%.0f%s : Đưa SL sau Đ/C về 0 (Chưa có thống kê phát sinh)\n", colorYellow, -targetDetail.QuantityProduce, colorReset)
	}
	if maxPassTK > 0 && maxPassTK >= maxTKVal {
		fmt.Printf("   • Nhập %s%.0f%s : Chốt theo Đạt Thống Kê (%.0f con)\n", colorGreen, maxPassTK-targetDetail.QuantityProduce, maxPassTK, colorReset)
	}
	fmt.Printf("   ❯ Nhập giá trị [Mặc định %.0f, Enter giữ nguyên]: ", suggestAdj)
	inputAdj, _ := s.reader.ReadString('\n')
	inputAdj = strings.TrimSpace(inputAdj)
	adjVal := suggestAdj
	if inputAdj != "" {
		if v, err := strconv.ParseFloat(inputAdj, 64); err == nil {
			adjVal = v
		}
	}

	// Nhập SL cần đạt sau điều chỉnh
	defaultAfterAdj := targetDetail.QuantityProduce + adjVal
	if defaultAfterAdj < 0 {
		defaultAfterAdj = 0
	}
	fmt.Printf("%s2. Nhập SL Cần Đạt Sau Điều Chỉnh (QuantityAfterAdj) [Mặc định %.0f]:%s ",
		colorBold, defaultAfterAdj, colorReset)
	inputAfter, _ := s.reader.ReadString('\n')
	inputAfter = strings.TrimSpace(inputAfter)
	afterAdjVal := defaultAfterAdj
	if inputAfter != "" {
		if v, err := strconv.ParseFloat(inputAfter, 64); err == nil {
			afterAdjVal = v
		}
	}

	// Kiểm tra ràng buộc chặn dưới: Không được hạ quá số lượng đã thống kê
	if maxTKVal > 0 && afterAdjVal < maxTKVal {
		fmt.Printf("\n%s⛔ [TỪ CHỐI THỰC HIỆN — KHÔNG ĐỦ ĐIỀU KIỆN HẠ SẢN LƯỢNG]:%s\n", colorRed+colorBold, colorReset)
		fmt.Printf("   ● Xưởng đã thống kê thực tế được : %s%.0f con%s\n", colorBold+colorYellow, maxTKVal, colorReset)
		fmt.Printf("   ● Bạn đang yêu cầu hạ về          : %s%.0f con%s\n", colorRed, afterAdjVal, colorReset)
		fmt.Printf("   %s-> LỖI RÀNG BUỘC: Không được hạ số lượng thấp hơn mức xưởng đã thống kê thực tế!%s\n", colorBold+colorRed, colorReset)
		fmt.Printf("   %s-> Mức hạ tối đa chỉ được phép về: %.0f con. Hệ thống không cho phép hạ nữa!%s\n\n", colorBold+colorYellow, maxTKVal, colorReset)
		return
	}

	// Nhập SL Bù hao / Đạt (QuantityPass)
	fmt.Printf("%s3. Nhập SL Bù Hao / Đạt (QuantityPass) [Mặc định 0]:%s ", colorBold, colorReset)
	inputPass, _ := s.reader.ReadString('\n')
	inputPass = strings.TrimSpace(inputPass)
	passVal := 0.0
	if inputPass != "" {
		if v, err := strconv.ParseFloat(inputPass, 64); err == nil {
			passVal = v
		}
	}

	// Nhập Ghi chú quyết toán (Remark)
	defaultNote := fmt.Sprintf("Quyết toán qua ERP-CLI lúc %s", time.Now().Format("15:04 02/01/2006"))
	fmt.Printf("%s4. Nhập Ghi Chú Quyết Toán (Remark) [Mặc định: '%s']:%s ", colorBold, defaultNote, colorReset)
	inputNote, _ := s.reader.ReadString('\n')
	inputNote = strings.TrimSpace(inputNote)
	finalNote := defaultNote
	if inputNote != "" {
		finalNote = inputNote
	}

	// Kiểm tra điều kiện ràng buộc không vượt quá DO
	if targetDetail.QuantitySO > 0 && afterAdjVal > targetDetail.QuantitySO {
		fmt.Printf("\n%s[!] Cảnh báo: SL sau điều chỉnh (%.0f) vượt quá SL DO (%.0f)!%s\n",
			colorRed+colorBold, afterAdjVal, targetDetail.QuantitySO, colorReset)
	}

	fmt.Println()
	fmt.Printf("%s──────────────────────────────────────────────────────────────────────────────────────────%s\n", colorCyan, colorReset)
	fmt.Printf("  XÁC NHẬN THÔNG SỐ QUYẾT TOÁN CHO LỆNH [%s]:\n", targetDetail.DocNoDetail)
	fmt.Printf("  ● SL Điều chỉnh (QuantityAdj)       : %s%.0f%s\n", colorBold+colorYellow, adjVal, colorReset)
	fmt.Printf("  ● SL Sau điều chỉnh (QuantityAfter) : %s%.0f%s\n", colorBold+colorGreen, afterAdjVal, colorReset)
	fmt.Printf("  ● SL Sản xuất (QuantityProduce)     : %s%.0f%s\n", colorBold+colorGreen, afterAdjVal, colorReset)
	fmt.Printf("  ● SL Bù hao / Đạt (QuantityPass)    : %s%.0f%s\n", colorBold+colorGreen, passVal, colorReset)
	fmt.Printf("  ● Ghi chú quyết toán (Remark)       : %s%s%s\n", colorBold+colorYellow, finalNote, colorReset)
	fmt.Printf("  ┌─ [3 TRẠNG THÁI LỆNH TRÊN ERP] ──────────────────────────────────────────┐\n")
	fmt.Printf("  │  1. Hủy lệnh (Closed / IsCancelled) : %s0 (KHÔNG HỦY LỆNH)%s                      │\n", colorGreen, colorReset)
	fmt.Printf("  │  2. Dừng triển khai (IsStop)        : %s0 (KHÔNG DỪNG)%s                          │\n", colorGreen, colorReset)
	fmt.Printf("  │  3. Hoàn thành lệnh (IsComplete)    : %s0 (KHÔNG ĐÁNH DẤU HOÀN THÀNH)%s           │\n", colorGreen, colorReset)
	fmt.Printf("  └─────────────────────────────────────────────────────────────────────────┘\n")
	fmt.Printf("%s──────────────────────────────────────────────────────────────────────────────────────────%s\n", colorCyan, colorReset)

	fmt.Printf("%sBạn có chắc chắn muốn thực hiện quyết toán lên Bravo Gateway? (y/N) ❯ %s", colorBold+colorYellow, colorReset)
	confirm, _ := s.reader.ReadString('\n')
	confirm = strings.TrimSpace(strings.ToLower(confirm))
	if confirm != "y" && confirm != "yes" {
		fmt.Printf("%s[!] Đã hủy thao tác quyết toán (Không thực hiện thay đổi nào).%s\n\n", colorYellow, colorReset)
		return
	}

	// Tiến hành gọi chuỗi 3 API
	stop := make(chan bool)
	go s.spinner(stop, fmt.Sprintf("Đang thực hiện quy trình Quyết toán (3 bước) cho lệnh %s...", targetDetail.DocNoDetail))

	pkvId := int(master.MasterID)
	if pkvId == 0 {
		pkvId = 17378 // fallback nếu không đọc được ID
	}
	param := api.SettleParam{
		QuantityAdj:      adjVal,
		QuantityAfterAdj: afterAdjVal,
		QuantityProduce:  afterAdjVal,
		QuantityPass:     passVal,
		IsSettleClosed:   0, // Tuyệt đối KHÔNG HỦY LỆNH (Closed = 0)
		Note:             finalNote,
	}

	startTime := time.Now()
	err = s.client.SettleWorkProcess(master.Stt, master.DocNo, targetDetail.RowId, pkvId, param)
	stop <- true
	time.Sleep(10 * time.Millisecond)

	if err != nil {
		fmt.Printf("\r\033[K%s[✘] QUYẾT TOÁN THẤT BẠI (%v): %v%s\n\n",
			colorRed+colorBold, time.Since(startTime).Round(time.Millisecond), err, colorReset)
		return
	}

	fmt.Printf("\r\033[K%s[✔] QUYẾT TOÁN CÔNG ĐOẠN THÀNH CÔNG (%v) — Đã lưu điều chỉnh SL và định mức!%s\n",
		colorGreen+colorBold, time.Since(startTime).Round(time.Millisecond), colorReset)
	fmt.Printf("    ● Lệnh con    : %s%s%s (RowId: %s)\n\n", colorBold+colorCyan, targetDetail.DocNoDetail, colorReset, targetDetail.RowId)

	// Tiếp tục tự động tìm kiếm và quyết toán toàn bộ Master Lệnh thao tác liên quan
	fmt.Printf("%s[⟳] Đang tìm kiếm các Master Lệnh Thao Tác (WorkDocTT) liên quan tới '%s'...%s\n",
		colorBold+colorCyan, targetDetail.DocNoDetail, colorReset)

	stepResults, errStep := s.client.SettleAllWorkStepsOfProcess(targetDetail.DocNoDetail, targetDetail.RowId, param, 4)
	if errStep != nil {
		fmt.Printf("%s[!] Cảnh báo quyết toán Lệnh thao tác: %v%s\n\n", colorYellow, errStep, colorReset)
	} else if len(stepResults) == 0 {
		fmt.Printf("%s[i] Không tìm thấy Master Lệnh thao tác nào liên quan cần quyết toán.%s\n\n", colorDim, colorReset)
	} else {
		fmt.Printf("%s[✔] ĐÃ ĐỒNG BỘ VÀ QUYẾT TOÁN %d MASTER LỆNH THAO TÁC:%s\n", colorBold+colorGreen, len(stepResults), colorReset)
		for _, sr := range stepResults {
			if sr.Err != nil {
				fmt.Printf("    %s[✘] Phiếu %s (Stt: %s): Lỗi: %v%s\n", colorRed, sr.MasterDocNo, sr.Stt, sr.Err, colorReset)
			} else {
				fmt.Printf("    %s[✔] Phiếu %s (Stt: %s): Đã cập nhật %d dòng thao tác & ghi chú '%s' (%v)%s\n",
					colorGreen, sr.MasterDocNo, sr.Stt, sr.RowsUpdated, param.Note, sr.Duration.Round(time.Millisecond), colorReset)
			}
		}
		fmt.Println()
	}
}




func renderProgressBar(pct, width int) string {
	if pct < 0 {
		pct = 0
	}
	if pct > 100 {
		pct = 100
	}
	filled := (pct * width) / 100
	empty := width - filled

	bar := colorGreen + "[" + strings.Repeat("█", filled) + colorDim + strings.Repeat("░", empty) + colorReset + colorGreen + "]" + colorReset
	return bar
}

func (s *Shell) cmdLogs(limit int) {
	logs, err := s.database.GetRecentLogs(limit)
	if err != nil {
		fmt.Printf("%s[✘] Lỗi truy vấn nhật ký: %v%s\n\n", colorRed, err, colorReset)
		return
	}
	if len(logs) == 0 {
		fmt.Printf("%s[!] Chưa có bản ghi log nào trong database.%s\n\n", colorYellow, colorReset)
		return
	}

	fmt.Println()
	fmt.Printf("%s📜 Lịch sử %d lần gọi API gần nhất:%s\n", colorBold, len(logs), colorReset)
	fmt.Println("────────────────────────────────────────────────────────────────────────────────")
	fmt.Printf("%-4s %-19s %-9s %s\n", "ID", "THỜI GIAN", "HTTP MÃ", "ENDPOINT & TÓM TẮT PHẢN HỒI")
	fmt.Println("────────────────────────────────────────────────────────────────────────────────")

	for _, l := range logs {
		statusColor := colorGreen
		if l.StatusCode != 200 {
			statusColor = colorRed
		}
		summary := l.ResponseSummary
		if l.ErrorMsg != "" {
			summary = colorRed + "[LỖI] " + l.ErrorMsg + colorReset
		}
		if len(summary) > 42 {
			summary = summary[:40] + ".."
		}

		fmt.Printf("#%-3d %-19s %s%-9d%s %s\n", 
			l.ID, l.RequestTime.Format("2006-01-02 15:04:05"), 
			statusColor, l.StatusCode, colorReset, 
			summary)
	}
	fmt.Println("────────────────────────────────────────────────────────────────────────────────\n")
}

func (s *Shell) cmdCurl() {
	curlCmd := s.client.GetCurlForLogin()

	fmt.Println()
	fmt.Printf("%s📋 Lệnh cURL Đăng nhập chuẩn xác (Khớp 100%% chế độ %s):%s\n", colorBold+colorCyan, strings.ToUpper(s.cfg.ClientMode), colorReset)
	fmt.Printf("%s%s%s\n\n", colorYellow, curlCmd, colorReset)
}

// Chuyển đổi và quản lý chế độ nền tảng kết nối Winform (Phần mềm) vs Web
func (s *Shell) cmdMode(args []string) {
	if len(args) == 0 {
		fmt.Println()
		fmt.Printf("%s💻 CHẾ ĐỘ NỀN TẢNG KẾT NỐI (PLATFORM MODE):%s\n", colorBold+colorCyan, colorReset)
		fmt.Printf("● Nền tảng hiện tại   : %s%s%s\n", colorBold+colorYellow, strings.ToUpper(s.cfg.ClientMode), colorReset)
		fmt.Printf("● Chuỗi ClientInfo   : %s%s%s\n", colorGreen, s.cfg.GetEffectiveClientInfo(), colorReset)
		fmt.Printf("● Tên thiết bị       : %s%s%s\n", colorCyan, s.cfg.WsName, colorReset)
		fmt.Printf("● Tài khoản máy trạm : %s%s%s\n", colorMagenta, s.cfg.WsUser, colorReset)
		fmt.Printf("● Phiên bản App      : %s%s%s\n", colorYellow, s.cfg.AppName, colorReset)
		fmt.Printf("● Đơn vị cơ sở       : %s%s%s\n", colorGreen, s.cfg.BranchCode, colorReset)
		fmt.Printf("\n💡 Chuyển đổi nhanh:\n")
		fmt.Printf("   %s/mode winform%s : Giả lập phần mềm máy trạm Bravo Winform (.exe)\n", colorBold+colorGreen, colorReset)
		fmt.Printf("   %s/mode web%s     : Giả lập truy cập trình duyệt Bravo Web\n\n", colorBold+colorCyan, colorReset)
		return
	}

	mode := strings.ToLower(args[0])
	if mode != "winform" && mode != "web" {
		fmt.Printf("%s[!] Chế độ không hợp lệ: '%s'. Chỉ hỗ trợ 'winform' hoặc 'web'.%s\n\n", colorRed, args[0], colorReset)
		return
	}

	s.cfg.ClientMode = mode
	if mode == "winform" {
		s.cfg.AppName = "B10.10.9.1.1"
		comp := config.GetSystemWsName()
		s.cfg.WsName = comp
		s.cfg.WsUser = config.GetSystemWsUser(comp)
		s.cfg.ClientInfo = s.cfg.GetEffectiveClientInfo()
	} else {
		s.cfg.AppName = "Bravo Web 10.9.5.1"
		s.cfg.ClientInfo = "AppName=Bravo Web 10.9.5.1;WsName=113.22.84.155"
	}

	_ = config.SaveConfig(s.cfg)
	fmt.Printf("%s[✔] ĐÃ CHUYỂN SANG CHẾ ĐỘ: %s%s\n", colorGreen+colorBold, strings.ToUpper(mode), colorReset)
	fmt.Printf("● Chuỗi ClientInfo: %s%s%s\n", colorYellow, s.cfg.GetEffectiveClientInfo(), colorReset)
	fmt.Printf("● Nhật ký Bravo ERP: Sẽ ghi nhận Nền tảng = %s, Tên thiết bị = %s, __WsUser = %s, __AppName = %s\n\n",
		strings.ToUpper(mode), s.cfg.WsName, s.cfg.WsUser, s.cfg.AppName)
}

func (s *Shell) cmdCall(method, urlStr string) {
	tok, _ := s.database.GetLatestToken(s.cfg.Username)
	if tok == nil {
		fmt.Printf("%s[!] Cần đăng nhập (/login) trước để lấy Bearer Token gọi API bảo vệ.%s\n\n", colorYellow, colorReset)
		return
	}

	stop := make(chan bool)
	go s.spinner(stop, fmt.Sprintf("Đang gửi %s tới %s...", method, urlStr))

	body, code, err := s.client.CallProtectedAPI(urlStr, method, nil)
	stop <- true
	time.Sleep(10 * time.Millisecond)

	if err != nil {
		fmt.Printf("%s[✘] LỖI GỌI API (%d): %v%s\n\n", colorRed+colorBold, code, err, colorReset)
		return
	}

	fmt.Printf("%s[✔] PHẢN HỒI HTTP %d OK%s\n", colorGreen+colorBold, code, colorReset)
	var prettyJSON map[string]interface{}
	if err := json.Unmarshal(body, &prettyJSON); err == nil {
		formatted, _ := json.MarshalIndent(prettyJSON, "", "  ")
		fmt.Printf("%s%s%s\n\n", colorDim, string(formatted), colorReset)
	} else {
		fmt.Printf("%s\n\n", string(body))
	}
}

func (s *Shell) cmdDB() {
	list, err := s.database.GetRecentSyncedData(10)
	if err != nil {
		fmt.Printf("%s[✘] Lỗi đọc bảng synced_data: %v%s\n\n", colorRed, err, colorReset)
		return
	}
	if len(list) == 0 {
		fmt.Printf("%s[!] Chưa có bản ghi nào trong bảng `synced_data`.%s\n\n", colorYellow, colorReset)
		return
	}

	fmt.Println()
	fmt.Printf("%s🗄️ Dữ liệu đã đồng bộ gần đây trong SQLite (%d):%s\n", colorBold, len(list), colorReset)
	for _, item := range list {
		fmt.Printf("● [#%d] [%s] ExtID: %s (%s)\n", item.ID, item.Category, item.ExternalID, item.SyncedAt.Format("15:04:05"))
	}
	fmt.Println()
}

func (s *Shell) cmdConfig() {
	fmt.Println()
	fmt.Printf("%s⚙️ Cấu hình hệ thống hiện tại (config.json):%s\n", colorBold+colorCyan, colorReset)
	fmt.Printf("● Nền tảng (Mode) : %s%s%s\n", colorBold+colorYellow, strings.ToUpper(s.cfg.ClientMode), colorReset)
	fmt.Printf("● Effective Client: %s%s%s\n", colorGreen, s.cfg.GetEffectiveClientInfo(), colorReset)
	fmt.Printf("● Tên thiết bị    : %s%s%s\n", colorCyan, s.cfg.WsName, colorReset)
	fmt.Printf("● Windows User    : %s%s%s\n", colorMagenta, s.cfg.WsUser, colorReset)
	fmt.Printf("● App Name        : %s%s%s\n", colorYellow, s.cfg.AppName, colorReset)
	fmt.Printf("● Auth URL        : %s%s%s\n", colorYellow, s.cfg.ApiUrl, colorReset)
	fmt.Printf("● Poll URL (5m)   : %s%s%s\n", colorCyan, s.cfg.PollUrl, colorReset)
	fmt.Printf("● Data URL (POST) : %s%s%s\n", colorMagenta, s.cfg.DataUrl, colorReset)
	fmt.Printf("● Khóa PKV mặc định: %s%s%s\n", colorGreen, s.cfg.DefaultPKV, colorReset)
	fmt.Printf("● Chu kỳ Poll     : %s%d giây (%.1f phút)%s\n", colorGreen, s.cfg.PollInterval, float64(s.cfg.PollInterval)/60.0, colorReset)
	fmt.Printf("● Tài khoản User  : %s%s%s\n", colorYellow, s.cfg.Username, colorReset)
	fmt.Printf("● Branch Code     : %s | Fiscal Year: %s\n", s.cfg.BranchCode, s.cfg.FiscalYear)
	fmt.Printf("● Client ID       : %s\n", s.cfg.ClientId)
	fmt.Printf("● Connection Name : %s\n", s.cfg.ConnectionName)
	fmt.Printf("● Database Path   : %s\n\n", s.cfg.DBPath)
}

func (s *Shell) cmdSet(key, value string) {
	key = strings.ToLower(key)
	switch key {
	case "mode", "platform":
		s.cmdMode([]string{value})
		return
	case "app", "app_name", "appname":
		s.cfg.AppName = value
		s.cfg.ClientInfo = s.cfg.GetEffectiveClientInfo()
	case "wsname", "ws_name", "computername", "device":
		s.cfg.WsName = value
		s.cfg.ClientInfo = s.cfg.GetEffectiveClientInfo()
	case "wsuser", "ws_user":
		s.cfg.WsUser = value
		s.cfg.ClientInfo = s.cfg.GetEffectiveClientInfo()
	case "username", "user", "u":
		s.cfg.Username = value
	case "password", "pass", "pwd", "p":
		s.cfg.Password = value
	case "url", "api", "api_url":
		s.cfg.ApiUrl = value
	case "poll", "poll_url":
		s.cfg.PollUrl = value
		_ = s.database.UpsertEndpoint("Auto-Poll Bravo Định kỳ", "GET", value, "Giám sát Gateway", "Truy vấn dữ liệu Bravo định kỳ")
	case "data", "data_url":
		s.cfg.DataUrl = value
		_ = s.database.UpsertEndpoint("Chi tiết Công đoạn SX (WorkProcessDetail)", "POST", value, "Lệnh sản xuất", "Truy vấn chi tiết công đoạn vB30WorkProcessDetail_Explorer")
	case "pkv", "default_pkv":
		s.cfg.DefaultPKV = value
	case "interval", "poll_interval":
		if n, err := strconv.Atoi(value); err == nil && n >= 5 {
			s.cfg.PollInterval = n
			if s.pollTicker != nil {
				s.pollTicker.Reset(time.Duration(n) * time.Second)
			}
		} else {
			fmt.Printf("%s[!] Số giây chu kỳ không hợp lệ (tối thiểu 5s): %s%s\n\n", colorRed, value, colorReset)
			return
		}
	case "branch", "branch_code":
		s.cfg.BranchCode = value
	case "year", "fiscal_year":
		s.cfg.FiscalYear = value
	case "client_id":
		s.cfg.ClientId = value
	case "client_secret":
		s.cfg.ClientSecret = value
	default:
		fmt.Printf("%s[!] Không hỗ trợ thuộc tính '%s'. Có thể đặt: mode, user, pass, url, poll, data, pkv, interval, branch, year, app, wsname, wsuser%s\n\n", colorRed, key, colorReset)
		return
	}

	if err := config.SaveConfig(s.cfg); err != nil {
		fmt.Printf("%s[✘] Lỗi lưu cấu hình: %v%s\n\n", colorRed, err, colorReset)
	} else {
		fmt.Printf("%s[✔] Đã cập nhật `%s` = `%s` vào config.json thành công!%s\n\n", colorGreen, key, value, colorReset)
	}
}

func (s *Shell) clearScreen() {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("cmd", "/c", "cls")
		cmd.Stdout = os.Stdout
		_ = cmd.Run()
	} else {
		fmt.Print("\033[H\033[2J")
	}
}

func (s *Shell) cmdHelp() {
	fmt.Println()
	fmt.Printf("%s📋 DANH SÁCH LỆNH ĐIỀU KHIỂN CODEX CLI:%s\n", colorBold+colorCyan, colorReset)
	fmt.Println("─────────────────────────────────────────────────────────────────────────────────────────")
	fmt.Printf("  %s/login [user] [pass]%s : Đăng nhập lấy Bearer Token OAuth2 từ Bravo Gateway\n", colorBold+colorGreen, colorReset)
	fmt.Printf("  %s/mode [winform|web]%s  : Chuyển đổi nền tảng đăng nhập (Bản Winform máy trạm vs Bản Web)\n", colorBold+colorGreen, colorReset)
	fmt.Printf("  %s/token%s               : Xem chi tiết Bearer Token, thời hạn còn lại và chuỗi mã\n", colorBold+colorGreen, colorReset)
	fmt.Printf("  %s/curl%s                : In câu lệnh cURL đăng nhập chuẩn xác 100%% theo đúng mode hiện tại\n", colorBold+colorGreen, colorReset)
	fmt.Printf("  %s/status%s              : Kiểm tra trạng thái máy chủ, CSDL SQLite, hạn Token & Poll\n", colorBold+colorGreen, colorReset)
	fmt.Println("─────────────────────────────────────────────────────────────────────────────────────────")
	fmt.Printf("  %s/data [pkv]%s          : Gọi truy vấn dữ liệu chi tiết công đoạn (PKV mặc định: %s)\n", colorBold+colorYellow, colorReset, s.cfg.DefaultPKV)
	fmt.Printf("  %s/data curl [pkv]%s     : In lệnh cURL chi tiết công đoạn kèm Bearer Token và JSON payload\n", colorBold+colorYellow, colorReset)
	fmt.Printf("  %s/clear-cache%s         : Xóa sạch bộ nhớ đệm (synced_data) trong SQLite - KHÔNG xóa Token\n", colorBold+colorRed, colorReset)
	fmt.Println("─────────────────────────────────────────────────────────────────────────────────────────")
	fmt.Printf("  %s/poll now%s            : Gọi thử nghiệm API Bravo 5m ngay lập tức để kiểm tra phản hồi\n", colorBold+colorCyan, colorReset)
	fmt.Printf("  %s/poll status%s         : Xem trạng thái chu kỳ tự động gọi định kỳ 5 phút (%ds)\n", colorBold+colorCyan, s.cfg.PollInterval, colorReset)
	fmt.Printf("  %s/poll curl%s           : In câu lệnh cURL chuẩn xác 100%% với 16 Headers & Bearer Token\n", colorBold+colorCyan, colorReset)
	fmt.Printf("  %s/poll interval <s>%s   : Đổi chu kỳ tự động gọi (Ví dụ: /poll interval 300)\n", colorBold+colorCyan, colorReset)
	fmt.Println("─────────────────────────────────────────────────────────────────────────────────────────")
	fmt.Printf("  %s/api%s                 : Xem danh mục các địa chỉ API Endpoints đã lưu trong SQLite\n", colorBold+colorCyan, colorReset)
	fmt.Printf("  %s/api test <id>%s       : Gọi thử nghiệm API endpoint bất kỳ kèm Bearer Token\n", colorBold+colorCyan, colorReset)
	fmt.Printf("  %s/api add%s             : Đăng ký một API endpoint chức năng mới vào CSDL SQLite\n", colorBold+colorCyan, colorReset)
	fmt.Println("─────────────────────────────────────────────────────────────────────────────────────────")
	fmt.Printf("  %s/wo%s                  : Xem danh sách Lệnh sản xuất trực tiếp từ Bravo ERP (vB30WorkProcess)\n", colorBold+colorMagenta, colorReset)
	fmt.Printf("  %s/wo sync%s             : Kích hoạt đồng bộ Lệnh sản xuất mới nhất từ máy chủ Bravo ERP\n", colorBold+colorMagenta, colorReset)
	fmt.Printf("  %s/wo curl%s             : In câu lệnh cURL chuẩn xác gọi API Lệnh sản xuất Bravo ERP\n", colorBold+colorMagenta, colorReset)
	fmt.Printf("  %s/search <mã_lệnh>%s     : Tra cứu trực tiếp Bravo & hiển thị kèm toàn bộ chi tiết công đoạn\n", colorBold+colorGreen, colorReset)
	fmt.Printf("  %s/settle <mã_lệnh>%s     : Quyết toán & Điều chỉnh sản lượng Lệnh sản xuất lên Bravo Gateway\n", colorBold+colorYellow, colorReset)
	fmt.Println("─────────────────────────────────────────────────────────────────────────────────────────")
	fmt.Printf("  %s/config%s              : Xem cấu hình hệ thống (Mode, URL, Client ID, DB path, Poll URL...)\n", colorBold+colorGreen, colorReset)
	fmt.Printf("  %s/set <key> <val>%s     : Cập nhật cấu hình (/set mode winform, /set poll ..., /set pkv ...)\n", colorBold+colorGreen, colorReset)
	fmt.Printf("  %s/logs [n]%s            : Xem lịch sử n lần gọi API gần nhất đã lưu trong SQLite\n", colorBold+colorCyan, colorReset)
	fmt.Printf("  %s/db%s                  : Xem các bản ghi dữ liệu đã đồng bộ lưu trong bảng synced_data\n", colorBold+colorCyan, colorReset)
	fmt.Printf("  %s/clear%s               : Xóa sạch màn hình console\n", colorBold+colorGray, colorReset)
	fmt.Printf("  %s/exit%s                : Dừng tiến trình nền và thoát\n", colorBold+colorRed, colorReset)
	fmt.Println("─────────────────────────────────────────────────────────────────────────────────────────\n")
}
