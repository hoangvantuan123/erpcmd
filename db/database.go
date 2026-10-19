package db

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

type TokenRecord struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
	IsExpired    bool      `json:"is_expired"`
}

type ApiLogRecord struct {
	ID              int64     `json:"id"`
	Endpoint        string    `json:"endpoint"`
	StatusCode      int       `json:"status_code"`
	RequestTime     time.Time `json:"request_time"`
	ResponseSummary string    `json:"response_summary"`
	ErrorMsg        string    `json:"error_msg"`
}

type SyncedRecord struct {
	ID         int64     `json:"id"`
	Category   string    `json:"category"`
	ExternalID string    `json:"external_id"`
	RawPayload string    `json:"raw_payload"`
	SyncedAt   time.Time `json:"synced_at"`
}

type ApiEndpointRecord struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Method      string `json:"method"`
	EndpointURL string `json:"endpoint_url"`
	Module      string `json:"module"`
	Status      string `json:"status"`
	Description string `json:"description"`
}

type WorkOrderRecord struct {
	ID            int64     `json:"id"`
	MasterID      int64     `json:"master_id"`       // ID số của Master (VD: 17378)
	MasterDocDate string    `json:"master_doc_date"` // Ngày lập gốc (VD: 2026-09-27T00:00:00.0)
	Stt           string    `json:"stt"`             // Khóa PKV (VD: 11114889CD)
	DocNo         string    `json:"doc_no"`          // Số Lệnh SX (VD: CD02-0626-0630)
	DocDate       string    `json:"doc_date"`        // Ngày lập lệnh (VD: 01/07/2026)
	ProcessCode   string    `json:"process_code"`    // Công đoạn (VD: CD02, CD05)
	Description   string    `json:"description"`     // Diễn giải (VD: Test MES)
	FactoryName   string    `json:"factory_name"`    // Nhà máy (VD: Nhà máy GS Hà Nội)
	CreatedByName string    `json:"created_by_name"` // Người lập (VD: HOÀNG VĂN TUẤN)
	DocStatus     int       `json:"doc_status"`      // Mã trạng thái (0, 1, 2)
	StatusText    string    `json:"status_text"`     // Trạng thái chữ (Mới tạo, Đang sản xuất, Hoàn tất)
	ItemCode      string    `json:"item_code"`       // Mã hàng
	ItemName      string    `json:"item_name"`       // Tên sản phẩm
	Quantity      float64   `json:"quantity"`        // Số lượng
	SyncedAt      time.Time `json:"synced_at"`
}

func InitDB(dbPath string) (*DB, error) {
	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("không thể mở cơ sở dữ liệu sqlite: %w", err)
	}

	conn.SetMaxOpenConns(1)

	schema := `
	CREATE TABLE IF NOT EXISTS auth_tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL,
		access_token TEXT NOT NULL,
		refresh_token TEXT,
		expires_at DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS api_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		endpoint TEXT NOT NULL,
		status_code INTEGER NOT NULL,
		request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
		response_summary TEXT,
		error_msg TEXT
	);

	CREATE TABLE IF NOT EXISTS synced_data (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		category TEXT NOT NULL,
		external_id TEXT,
		raw_payload TEXT,
		synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS api_endpoints (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		method TEXT NOT NULL,
		endpoint_url TEXT NOT NULL,
		module TEXT NOT NULL,
		status TEXT DEFAULT 'Hoạt động',
		description TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS settle_endpoints (
		step_key TEXT PRIMARY KEY,
		endpoint_url TEXT NOT NULL,
		method TEXT NOT NULL DEFAULT 'POST',
		description TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	if _, err := conn.Exec(schema); err != nil {
		conn.Close()
		return nil, fmt.Errorf("không thể khởi tạo bảng dữ liệu: %w", err)
	}

	// Đảm bảo không tồn tại bảng work_orders và synced_data trong SQLite
	_, _ = conn.Exec("DROP TABLE IF EXISTS work_orders")
	_, _ = conn.Exec("DROP TABLE IF EXISTS work_order_details")
	_, _ = conn.Exec("DROP TABLE IF EXISTS synced_data")

	// Tự động dọn dẹp các endpoint giả /api/v1/ nếu còn sót trong CSDL
	_, _ = conn.Exec("DELETE FROM api_endpoints WHERE endpoint_url LIKE '%/api/v1/%'")

	// Khởi tạo các endpoint nghiệp vụ quyết toán (cached trong SQLite)
	_, _ = conn.Exec(`
		INSERT INTO settle_endpoints (step_key, endpoint_url, method, description) VALUES
		('editor_load', 'https://bravo.goldsunpackaging.vn:5051/6642f8863ff4d6c5d73112f0e3ef5491', 'POST', 'Đọc trạng thái & timestamp hiện thời của chứng từ'),
		('save_edit', 'https://bravo.goldsunpackaging.vn:5051/ce49c21a2c25c83cbcb115432b1a9685', 'POST', 'Lưu điều chỉnh số lượng và chốt đóng quyết toán'),
		('calc_norm', 'https://bravo.goldsunpackaging.vn:5051/5898ea70fecc610b57010cad18694bb1', 'POST', 'Thực thi Stored Procedure usp_B30WorkProcessDetailTT_Cal_Norm tính lại định mức'),
		('commit_confirm', 'https://bravo.goldsunpackaging.vn:5051/6642f8863ff4d6c5d73112f0e3ef5491', 'POST', 'Commit và xác nhận hoàn tất quyết toán'),
		('doc_process', 'https://bravo.goldsunpackaging.vn:5051/d7952b69f7aafd7d3db1d2bd8969aac4', 'POST', 'Kiểm tra quy trình chứng từ usp_B20DocProcess_GetData'),
		('step_get_detail', 'https://bravo.goldsunpackaging.vn:5051/1cc41a997051d44ade62e9e875a6d2ac', 'POST', 'Lấy chi tiết thao tác usp_B30WorkStep_GetDetail')
		ON CONFLICT(step_key) DO UPDATE SET endpoint_url=excluded.endpoint_url, description=excluded.description;
	`)

	// Chỉ đăng ký đúng các API thực tế của hệ thống Bravo ERP
	var epCount int
	_ = conn.QueryRow("SELECT COUNT(*) FROM api_endpoints").Scan(&epCount)
	if epCount == 0 {
		_, _ = conn.Exec(`
		INSERT INTO api_endpoints (name, method, endpoint_url, module, status, description) VALUES
		('Xác thực OAuth2 Token (Login)', 'POST', 'https://bravo.goldsunpackaging.vn:5051/fa837234b0b27bc02365a940995bdc24', 'Quản trị hệ thống', 'Hoạt động', 'Cấp Bearer Token và Refresh Token'),
		('Auto-Poll Bravo Định kỳ 5m', 'GET', 'https://bravo.goldsunpackaging.vn:5051/6e60af0b2cc4e2200d8c2ec545da3627', 'Giám sát Gateway', 'Hoạt động', 'Truy vấn dữ liệu Bravo định kỳ 5 phút'),
		('Lệnh sản xuất & Chi tiết công đoạn', 'POST', 'https://bravo.goldsunpackaging.vn:5051/4e9b7232116b4a4af1b990d81e00a049', 'Lệnh sản xuất', 'Hoạt động', 'Truy vấn danh sách lệnh SX (WorkProcess) và chi tiết công đoạn (WorkProcessDetail)');
		`)
	}

	return &DB{conn: conn}, nil
}

func (d *DB) Close() error {
	if d.conn != nil {
		return d.conn.Close()
	}
	return nil
}

func (d *DB) SaveToken(username, accessToken, refreshToken string, expiresIn int) error {
	expiresAt := time.Now().Add(time.Duration(expiresIn) * time.Second)
	query := `INSERT INTO auth_tokens (username, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)`
	_, err := d.conn.Exec(query, username, accessToken, refreshToken, expiresAt)
	return err
}

func (d *DB) GetLatestToken(username string) (*TokenRecord, error) {
	var row *sql.Row
	if username != "" {
		query := `SELECT id, username, access_token, refresh_token, expires_at, created_at 
		          FROM auth_tokens 
		          WHERE username = ? 
		          ORDER BY id DESC LIMIT 1`
		row = d.conn.QueryRow(query, username)
	} else {
		query := `SELECT id, username, access_token, refresh_token, expires_at, created_at 
		          FROM auth_tokens 
		          ORDER BY id DESC LIMIT 1`
		row = d.conn.QueryRow(query)
	}

	var rec TokenRecord
	err := row.Scan(&rec.ID, &rec.Username, &rec.AccessToken, &rec.RefreshToken, &rec.ExpiresAt, &rec.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	rec.IsExpired = time.Now().After(rec.ExpiresAt)
	return &rec, nil
}

func (d *DB) LogApiCall(endpoint string, statusCode int, summary, errorMsg string) error {
	query := `INSERT INTO api_logs (endpoint, status_code, response_summary, error_msg) VALUES (?, ?, ?, ?)`
	_, err := d.conn.Exec(query, endpoint, statusCode, summary, errorMsg)
	return err
}

func (d *DB) GetRecentLogs(limit int) ([]ApiLogRecord, error) {
	if limit <= 0 {
		limit = 20
	}
	query := `SELECT id, endpoint, status_code, request_time, response_summary, error_msg 
	          FROM api_logs 
	          ORDER BY id DESC LIMIT ?`

	rows, err := d.conn.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []ApiLogRecord
	for rows.Next() {
		var l ApiLogRecord
		if err := rows.Scan(&l.ID, &l.Endpoint, &l.StatusCode, &l.RequestTime, &l.ResponseSummary, &l.ErrorMsg); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func (d *DB) SaveSyncedData(category, externalID, rawPayload string) error {
	query := `INSERT INTO synced_data (category, external_id, raw_payload) VALUES (?, ?, ?)`
	_, err := d.conn.Exec(query, category, externalID, rawPayload)
	return err
}

func (d *DB) GetRecentSyncedData(limit int) ([]SyncedRecord, error) {
	if limit <= 0 {
		limit = 20
	}
	query := `SELECT id, category, external_id, raw_payload, synced_at 
	          FROM synced_data 
	          ORDER BY id DESC LIMIT ?`

	rows, err := d.conn.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []SyncedRecord
	for rows.Next() {
		var s SyncedRecord
		if err := rows.Scan(&s.ID, &s.Category, &s.ExternalID, &s.RawPayload, &s.SyncedAt); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, nil
}

func (d *DB) GetStats() (tokenCount, logCount, dataCount int, err error) {
	_ = d.conn.QueryRow(`SELECT COUNT(*) FROM auth_tokens`).Scan(&tokenCount)
	_ = d.conn.QueryRow(`SELECT COUNT(*) FROM api_logs`).Scan(&logCount)
	_ = d.conn.QueryRow(`SELECT COUNT(*) FROM synced_data`).Scan(&dataCount)
	return
}

// Lấy danh sách API Endpoints đã đăng ký
func (d *DB) GetEndpoints() ([]ApiEndpointRecord, error) {
	query := `SELECT id, name, method, endpoint_url, module, status, description FROM api_endpoints ORDER BY id ASC`
	rows, err := d.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ApiEndpointRecord
	for rows.Next() {
		var ep ApiEndpointRecord
		if err := rows.Scan(&ep.ID, &ep.Name, &ep.Method, &ep.EndpointURL, &ep.Module, &ep.Status, &ep.Description); err != nil {
			return nil, err
		}
		list = append(list, ep)
	}
	return list, nil
}

// Đăng ký API Endpoint mới
func (d *DB) AddEndpoint(name, method, url, module, desc string) error {
	query := `INSERT INTO api_endpoints (name, method, endpoint_url, module, status, description) VALUES (?, ?, ?, ?, 'Hoạt động', ?)`
	_, err := d.conn.Exec(query, name, method, url, module, desc)
	return err
}

// Lưu hoặc cập nhật API Endpoint (nếu URL đã có thì cập nhật, chưa có thì thêm mới)
func (d *DB) UpsertEndpoint(name, method, url, module, desc string) error {
	var count int
	_ = d.conn.QueryRow(`SELECT COUNT(*) FROM api_endpoints WHERE endpoint_url = ?`, url).Scan(&count)
	if count > 0 {
		query := `UPDATE api_endpoints SET name = ?, method = ?, module = ?, description = ? WHERE endpoint_url = ?`
		_, err := d.conn.Exec(query, name, method, module, desc, url)
		return err
	}
	return d.AddEndpoint(name, method, url, module, desc)
}

// Xóa một API Endpoint theo ID
func (d *DB) DeleteEndpoint(id int64) error {
	query := `DELETE FROM api_endpoints WHERE id = ?`
	_, err := d.conn.Exec(query, id)
	return err
}

// Lấy danh sách Lệnh sản xuất (Work Orders) từ SQLite
func (d *DB) GetWorkOrders() ([]WorkOrderRecord, error) {
	query := `SELECT id, stt, doc_no, doc_date, process_code, description, factory_name, created_by_name, doc_status, status_text, item_code, item_name, quantity, synced_at FROM work_orders ORDER BY id ASC`
	rows, err := d.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []WorkOrderRecord
	for rows.Next() {
		var w WorkOrderRecord
		if err := rows.Scan(&w.ID, &w.Stt, &w.DocNo, &w.DocDate, &w.ProcessCode, &w.Description, &w.FactoryName, &w.CreatedByName, &w.DocStatus, &w.StatusText, &w.ItemCode, &w.ItemName, &w.Quantity, &w.SyncedAt); err != nil {
			return nil, err
		}
		list = append(list, w)
	}
	return list, nil
}

// Lưu đồng bộ danh sách Lệnh sản xuất từ Bravo ERP vào SQLite
func (d *DB) UpsertWorkOrders(orders []WorkOrderRecord) error {
	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO work_orders (stt, doc_no, doc_date, process_code, description, factory_name, created_by_name, doc_status, status_text, item_code, item_name, quantity, synced_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(doc_no) DO UPDATE SET
			stt = excluded.stt,
			doc_date = excluded.doc_date,
			process_code = excluded.process_code,
			description = excluded.description,
			factory_name = excluded.factory_name,
			created_by_name = excluded.created_by_name,
			doc_status = excluded.doc_status,
			status_text = excluded.status_text,
			item_code = excluded.item_code,
			item_name = excluded.item_name,
			quantity = excluded.quantity,
			synced_at = CURRENT_TIMESTAMP
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, o := range orders {
		_, err := stmt.Exec(o.Stt, o.DocNo, o.DocDate, o.ProcessCode, o.Description, o.FactoryName, o.CreatedByName, o.DocStatus, o.StatusText, o.ItemCode, o.ItemName, o.Quantity)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// Thêm Lệnh sản xuất thủ công nếu cần
func (d *DB) AddWorkOrder(stt, docNo, docDate, processCode, desc, factory, creator string, docStatus int, statusText, itemCode, itemName string, qty float64) error {
	query := `INSERT INTO work_orders (stt, doc_no, doc_date, process_code, description, factory_name, created_by_name, doc_status, status_text, item_code, item_name, quantity, synced_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	          ON CONFLICT(doc_no) DO UPDATE SET
	              stt = excluded.stt, doc_date = excluded.doc_date, process_code = excluded.process_code, description = excluded.description,
	              factory_name = excluded.factory_name, created_by_name = excluded.created_by_name, doc_status = excluded.doc_status,
	              status_text = excluded.status_text, item_code = excluded.item_code, item_name = excluded.item_name, quantity = excluded.quantity, synced_at = CURRENT_TIMESTAMP`
	_, err := d.conn.Exec(query, stt, docNo, docDate, processCode, desc, factory, creator, docStatus, statusText, itemCode, itemName, qty)
	return err
}

// Xóa toàn bộ bộ nhớ đệm dữ liệu (synced_data), tuyệt đối BẢO TOÀN auth_tokens (token, tài khoản login) và api_endpoints
func (d *DB) ClearDataCache() (int64, error) {
	res, err := d.conn.Exec(`DELETE FROM synced_data`)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// Xóa lịch sử nhật ký gọi API (api_logs), tuyệt đối BẢO TOÀN auth_tokens
func (d *DB) ClearApiLogs() (int64, error) {
	res, err := d.conn.Exec(`DELETE FROM api_logs`)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// GetSettleEndpoint lấy URL của endpoint theo step_key được lưu cache trong SQLite
func (d *DB) GetSettleEndpoint(stepKey, defaultURL string) string {
	if d == nil || d.conn == nil {
		return defaultURL
	}
	var url string
	err := d.conn.QueryRow("SELECT endpoint_url FROM settle_endpoints WHERE step_key = ?", stepKey).Scan(&url)
	if err != nil || url == "" {
		return defaultURL
	}
	return url
}

// SetSettleEndpoint cập nhật URL cho endpoint quyết toán vào SQLite cache
func (d *DB) SetSettleEndpoint(stepKey, endpointURL, description string) error {
	if d == nil || d.conn == nil {
		return nil
	}
	query := `INSERT INTO settle_endpoints (step_key, endpoint_url, description, updated_at)
	          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
	          ON CONFLICT(step_key) DO UPDATE SET endpoint_url = excluded.endpoint_url, description = excluded.description, updated_at = CURRENT_TIMESTAMP`
	_, err := d.conn.Exec(query, stepKey, endpointURL, description)
	return err
}

