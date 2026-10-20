package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"erpsyn/api"
	"erpsyn/config"
	"erpsyn/db"
)

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

func RegisterBusinessRoutes(mux *http.ServeMux, cfg *config.Config, database *db.DB, client *api.Client) {
	var loginMu sync.Mutex
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

	// GET /api/work-orders: Lấy danh sách Lệnh sản xuất thực tế từ Bravo ERP Explorer hoặc SQLite Cache
	mux.HandleFunc("GET /api/work-orders", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		// Search directly in Bravo instead of filtering only the initial page/cache
		// of work orders returned by the explorer.
		search := strings.TrimSpace(r.URL.Query().Get("search"))
		if search != "" {
			results, statusCode, latency, err := client.SearchWorkOrdersAPI(search)
			if err != nil {
				w.WriteHeader(http.StatusBadGateway)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"success": false,
					"error":   err.Error(),
					"status":  statusCode,
					"latency": latency.String(),
				})
				return
			}

			orders := make([]db.WorkOrderRecord, 0, len(results))
			for _, result := range results {
				orders = append(orders, result.Master)
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success":  true,
				"data":     orders,
				"total":    len(orders),
				"latency":  latency.String(),
				"searched": true,
			})
			return
		}

		cacheOnly := r.URL.Query().Get("cache_only") == "true"

		if cacheOnly {
			cachedOrders, err := database.GetWorkOrders()
			if err == nil && len(cachedOrders) > 0 {
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"success": true,
					"data":    cachedOrders,
					"total":   len(cachedOrders),
					"latency": "0ms (SQLite Cache)",
					"cached":  true,
				})
				return
			}
		}

		orders, _, statusCode, latency, err := client.CallWorkOrdersAPI()
		if err != nil {
			// Fallback sang cache SQLite nếu mất mạng hoặc lỗi máy chủ
			cachedOrders, errDb := database.GetWorkOrders()
			if errDb == nil && len(cachedOrders) > 0 {
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"success": true,
					"data":    cachedOrders,
					"total":   len(cachedOrders),
					"latency": "SQLite Fallback",
					"cached":  true,
					"warning": "Không thể kết nối API trực tiếp, đang hiển thị dữ liệu đã lưu trong SQLite",
				})
				return
			}

			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
				"status":  statusCode,
				"latency": latency.String(),
			})
			return
		}

		// Lưu cache bất đồng bộ vào SQLite DB
		if len(orders) > 0 {
			go func(ords []db.WorkOrderRecord) {
				_ = database.UpsertWorkOrders(ords)
			}(orders)
		}

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    orders,
			"total":   len(orders),
			"latency": latency.String(),
		})
	})

	// GET /api/cache?key=... : Lấy cache query / bộ lọc từ SQLite
	mux.HandleFunc("GET /api/cache", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		key := strings.TrimSpace(r.URL.Query().Get("key"))
		if key == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Thiếu tham số key"})
			return
		}
		val, err := database.GetQueryCache(key)
		if err != nil {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "data": nil})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "data": val})
	})

	// POST /api/cache : Lưu cache query / bộ lọc vào SQLite
	mux.HandleFunc("POST /api/cache", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		var body struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024*1024)).Decode(&body); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Dữ liệu JSON không hợp lệ"})
			return
		}
		body.Key = strings.TrimSpace(body.Key)
		if body.Key == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Thiếu key"})
			return
		}
		err := database.SetQueryCache(body.Key, body.Value)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
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

}
