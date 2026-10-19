package api

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"erpsyn/config"
	"erpsyn/db"
)

type Client struct {
	cfg        *config.Config
	database   *db.DB
	httpClient *http.Client
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
	Error        string `json:"error"`
	ErrorDesc    string `json:"error_description"`
}

func NewClient(cfg *config.Config, database *db.DB) *Client {
	// Khởi tạo HTTP Client với TLS an toàn và timeout hợp lý
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			// Hỗ trợ cả trường hợp server nội bộ dùng SSL tự ký nếu cần
			InsecureSkipVerify: true,
		},
		MaxIdleConns:        10,
		IdleConnTimeout:     30 * time.Second,
		DisableCompression: false,
	}

	return &Client{
		cfg:      cfg,
		database: database,
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   20 * time.Second,
		},
	}
}

// Thực hiện gọi API đăng nhập lấy OAuth2 Token
func (c *Client) Login() (*AuthResponse, error) {
	clientInfo := c.cfg.GetEffectiveClientInfo()

	formData := url.Values{}
	formData.Set("client_id", c.cfg.ClientId)
	formData.Set("client_secret", c.cfg.ClientSecret)
	formData.Set("device_code", c.cfg.DeviceCode)
	formData.Set("connectionName", c.cfg.ConnectionName)
	formData.Set("grant_type", c.cfg.GrantType)
	formData.Set("scope", c.cfg.Scope)
	formData.Set("username", c.cfg.Username)
	formData.Set("password", c.cfg.Password)

	// Truyền đầy đủ clientinfo và thông tin ngữ cảnh vào cả form data (hỗ trợ Bravo backend đọc từ body)
	formData.Set("clientinfo", clientInfo)
	if c.cfg.BranchCode != "" {
		formData.Set("branchcode", c.cfg.BranchCode)
	}
	if c.cfg.FiscalYear != "" {
		formData.Set("fiscalyear", c.cfg.FiscalYear)
	}

	req, err := http.NewRequest("POST", c.cfg.ApiUrl, strings.NewReader(formData.Encode()))
	if err != nil {
		return nil, fmt.Errorf("lỗi tạo HTTP request: %w", err)
	}

	// Đặt đầy đủ các headers theo đúng chuẩn Bravo ERP
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("accept-language", "vi-VN,vi;q=0.9,en;q=0.8")
	req.Header.Set("clientinfo", clientInfo)
	if c.cfg.BranchCode != "" {
		req.Header.Set("branchcode", c.cfg.BranchCode)
	}
	if c.cfg.FiscalYear != "" {
		req.Header.Set("fiscalyear", c.cfg.FiscalYear)
	}
	req.Header.Set("lang", "0")

	if c.cfg.ClientMode == "web" {
		// Bản Web (Browser):
		if c.cfg.Origin != "" {
			req.Header.Set("origin", c.cfg.Origin)
		}
		if c.cfg.Referer != "" {
			req.Header.Set("Referer", c.cfg.Referer)
		}
		req.Header.Set("User-Agent", c.cfg.UserAgent)
		req.Header.Set("sec-ch-ua-platform", `"Windows"`)
		req.Header.Set("sec-ch-ua", `"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"`)
		req.Header.Set("sec-ch-ua-mobile", "?0")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if c.database != nil {
			_ = c.database.LogApiCall(c.cfg.ApiUrl, 0, "", err.Error())
		}
		return nil, fmt.Errorf("kết nối tới máy chủ Bravo thất bại: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("không thể đọc phản hồi từ API: %w", err)
	}

	summary := string(bodyBytes)
	if len(summary) > 500 {
		summary = summary[:500] + "... (truncated)"
	}

	// Ghi log vào Database
	var errText string
	if resp.StatusCode != http.StatusOK {
		errText = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, summary)
	}
	if c.database != nil {
		_ = c.database.LogApiCall(c.cfg.ApiUrl, resp.StatusCode, summary, errText)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("máy chủ phản hồi mã lỗi HTTP %d: %s", resp.StatusCode, summary)
	}

	var authResp AuthResponse
	if err := json.Unmarshal(bodyBytes, &authResp); err != nil {
		return nil, fmt.Errorf("lỗi giải mã JSON phản hồi: %w", err)
	}

	if authResp.AccessToken == "" {
		if authResp.Error != "" {
			return nil, fmt.Errorf("API từ chối: %s - %s", authResp.Error, authResp.ErrorDesc)
		}
		return nil, fmt.Errorf("API không trả về access_token hợp lệ: %s", summary)
	}

	// Tự động lưu Token vào Database
	if c.database != nil {
		if err := c.database.SaveToken(c.cfg.Username, authResp.AccessToken, authResp.RefreshToken, authResp.ExpiresIn); err != nil {
			return nil, fmt.Errorf("lỗi lưu token vào DB: %w", err)
		}
	}

	return &authResp, nil
}

// Lấy Token hợp lệ: Nếu chưa có hoặc đã hết hạn thì tự động Login lấy mới
func (c *Client) GetValidToken() (string, error) {
	if c.database != nil {
		tokenRec, err := c.database.GetLatestToken(c.cfg.Username)
		if err == nil && tokenRec != nil && !tokenRec.IsExpired {
			return tokenRec.AccessToken, nil
		}
	}

	// Nếu chưa có hoặc hết hạn -> thực hiện Login
	authResp, err := c.Login()
	if err != nil {
		return "", err
	}
	return authResp.AccessToken, nil
}

// Gọi một API endpoint dữ liệu cần xác thực Bearer token
func (c *Client) CallProtectedAPI(targetURL, method string, payload io.Reader) ([]byte, int, error) {
	token, err := c.GetValidToken()
	if err != nil {
		return nil, 0, fmt.Errorf("không thể lấy token hợp lệ: %w", err)
	}

	req, err := http.NewRequest(method, targetURL, payload)
	if err != nil {
		return nil, 0, err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("User-Agent", c.cfg.UserAgent)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if c.database != nil {
			_ = c.database.LogApiCall(targetURL, 0, "", err.Error())
		}
		return nil, 0, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}

	summary := string(bodyBytes)
	if len(summary) > 400 {
		summary = summary[:400] + "..."
	}

	if c.database != nil {
		_ = c.database.LogApiCall(targetURL, resp.StatusCode, summary, "")
	}

	return bodyBytes, resp.StatusCode, nil
}

// CallBravoPollAPI thực hiện gọi định kỳ API Bravo Gateway với đầy đủ 16 HTTP Headers đặc thù
func (c *Client) CallBravoPollAPI(targetURL string) ([]byte, int, time.Duration, error) {
	if targetURL == "" {
		targetURL = c.cfg.PollUrl
	}

	// 1. Lấy Bearer Token hợp lệ (tự động login nếu chưa có hoặc đã hết hạn)
	token, err := c.GetValidToken()
	if err != nil {
		return nil, 0, 0, fmt.Errorf("không thể lấy Bearer Token hợp lệ: %w", err)
	}

	// 2. Tạo HTTP Request
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("lỗi khởi tạo request: %w", err)
	}

	// 3. Thiết lập chính xác 100% các Headers theo yêu cầu
	clientInfo := c.cfg.GetEffectiveClientInfo()
	req.Header.Set("accept", "application/json, text/plain, */*")
	req.Header.Set("accept-language", "vi-VN,vi;q=0.9,en;q=0.8")
	req.Header.Set("authorization", "Bearer "+token)
	req.Header.Set("branchcode", c.cfg.BranchCode)
	req.Header.Set("clientinfo", clientInfo)
	req.Header.Set("fiscalyear", c.cfg.FiscalYear)
	req.Header.Set("lang", "0")
	if c.cfg.ClientMode == "web" {
		if c.cfg.Origin != "" {
			req.Header.Set("origin", c.cfg.Origin)
		}
		if c.cfg.Referer != "" {
			req.Header.Set("referer", c.cfg.Referer)
		}
		req.Header.Set("priority", "u=1, i")
		req.Header.Set("sec-ch-ua", `"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"`)
		req.Header.Set("sec-ch-ua-mobile", "?0")
		req.Header.Set("sec-ch-ua-platform", `"Windows"`)
		req.Header.Set("sec-fetch-dest", "empty")
		req.Header.Set("sec-fetch-mode", "cors")
		req.Header.Set("sec-fetch-site", "same-site")
		req.Header.Set("user-agent", c.cfg.UserAgent)
	}

	startTime := time.Now()
	resp, err := c.httpClient.Do(req)
	latency := time.Since(startTime)

	if err != nil {
		if c.database != nil {
			_ = c.database.LogApiCall(targetURL, 0, "", err.Error())
		}
		return nil, 0, latency, fmt.Errorf("lỗi kết nối tới %s: %w", targetURL, err)
	}
	defer resp.Body.Close()

	// Nếu trả về 401 Unauthorized (ví dụ token bị thu hồi ở server), thử refresh và gọi lại 1 lần
	if resp.StatusCode == http.StatusUnauthorized {
		authResp, loginErr := c.Login()
		if loginErr == nil && authResp != nil && authResp.AccessToken != "" {
			req.Header.Set("authorization", "Bearer "+authResp.AccessToken)
			startTime = time.Now()
			respRetry, errRetry := c.httpClient.Do(req)
			latency = time.Since(startTime)
			if errRetry == nil {
				resp = respRetry
				defer resp.Body.Close()
			}
		}
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, latency, fmt.Errorf("không thể đọc dữ liệu phản hồi: %w", err)
	}

	summary := string(bodyBytes)
	if len(summary) > 500 {
		summary = summary[:500] + "... (truncated)"
	}

	var errText string
	if resp.StatusCode >= 400 {
		errText = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, summary)
	}

	// Ghi nhận nhật ký vào SQLite DB (cả api_logs và synced_data)
	if c.database != nil {
		_ = c.database.LogApiCall(targetURL, resp.StatusCode, summary, errText)
		_ = c.database.SaveSyncedData("auto_poll_5m", targetURL, string(bodyBytes))
	}

	if resp.StatusCode >= 400 {
		return bodyBytes, resp.StatusCode, latency, fmt.Errorf("máy chủ phản hồi mã lỗi HTTP %d: %s", resp.StatusCode, summary)
	}

	return bodyBytes, resp.StatusCode, latency, nil
}

// Lấy chuỗi cURL chuẩn xác cho lệnh login
func (c *Client) GetCurlForLogin() string {
	clientInfo := c.cfg.GetEffectiveClientInfo()

	if c.cfg.ClientMode == "winform" {
		return fmt.Sprintf(`curl -X POST '%s' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'accept-language: vi-VN,vi;q=0.9,en;q=0.8' \
  -H 'clientinfo: %s' \
  -H 'branchcode: %s' \
  -H 'fiscalyear: %s' \
  -H 'lang: 0' \
  --data-urlencode 'client_id=%s' \
  --data-urlencode 'client_secret=%s' \
  --data-urlencode 'device_code=%s' \
  --data-urlencode 'connectionName=%s' \
  --data-urlencode 'grant_type=%s' \
  --data-urlencode 'scope=%s' \
  --data-urlencode 'username=%s' \
  --data-urlencode 'password=%s' \
  --data-urlencode 'clientinfo=%s' \
  --data-urlencode 'branchcode=%s' \
  --data-urlencode 'fiscalyear=%s'`,
			c.cfg.ApiUrl,
			clientInfo,
			c.cfg.BranchCode,
			c.cfg.FiscalYear,
			c.cfg.ClientId,
			c.cfg.ClientSecret,
			c.cfg.DeviceCode,
			c.cfg.ConnectionName,
			c.cfg.GrantType,
			c.cfg.Scope,
			c.cfg.Username,
			c.cfg.Password,
			clientInfo,
			c.cfg.BranchCode,
			c.cfg.FiscalYear,
		)
	}

	return fmt.Sprintf(`curl -X POST '%s' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'accept-language: vi-VN,vi;q=0.9,en;q=0.8' \
  -H 'clientinfo: %s' \
  -H 'branchcode: %s' \
  -H 'fiscalyear: %s' \
  -H 'lang: 0' \
  -H 'origin: %s' \
  -H 'Referer: %s' \
  -H 'User-Agent: %s' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-ch-ua: "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  --data-urlencode 'client_id=%s' \
  --data-urlencode 'client_secret=%s' \
  --data-urlencode 'device_code=%s' \
  --data-urlencode 'connectionName=%s' \
  --data-urlencode 'grant_type=%s' \
  --data-urlencode 'scope=%s' \
  --data-urlencode 'username=%s' \
  --data-urlencode 'password=%s' \
  --data-urlencode 'clientinfo=%s' \
  --data-urlencode 'branchcode=%s' \
  --data-urlencode 'fiscalyear=%s'`,
		c.cfg.ApiUrl,
		clientInfo,
		c.cfg.BranchCode,
		c.cfg.FiscalYear,
		c.cfg.Origin,
		c.cfg.Referer,
		c.cfg.UserAgent,
		c.cfg.ClientId,
		c.cfg.ClientSecret,
		c.cfg.DeviceCode,
		c.cfg.ConnectionName,
		c.cfg.GrantType,
		c.cfg.Scope,
		c.cfg.Username,
		c.cfg.Password,
		clientInfo,
		c.cfg.BranchCode,
		c.cfg.FiscalYear,
	)
}

// Lấy chuỗi cURL chuẩn xác cho lệnh poll định kỳ
func (c *Client) GetCurlForPollAPI() string {
	token := "<CHƯA_CÓ_TOKEN_VUI_LÒNG_LOGIN>"
	if c.database != nil {
		tok, _ := c.database.GetLatestToken(c.cfg.Username)
		if tok != nil && tok.AccessToken != "" {
			token = tok.AccessToken
		}
	}
	clientInfo := c.cfg.GetEffectiveClientInfo()

	if c.cfg.ClientMode == "winform" {
		return fmt.Sprintf(`curl --url '%s' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: vi-VN,vi;q=0.9,en;q=0.8' \
  -H 'authorization: Bearer %s' \
  -H 'branchcode: %s' \
  -H 'clientinfo: %s' \
  -H 'fiscalyear: %s' \
  -H 'lang: 0' \
  -H 'origin: %s' \
  -H 'referer: %s'`,
			c.cfg.PollUrl,
			token,
			c.cfg.BranchCode,
			clientInfo,
			c.cfg.FiscalYear,
			c.cfg.Origin,
			c.cfg.Referer,
		)
	}

	return fmt.Sprintf(`curl --url '%s' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: vi-VN,vi;q=0.9,en;q=0.8' \
  -H 'authorization: Bearer %s' \
  -H 'branchcode: %s' \
  -H 'clientinfo: %s' \
  -H 'fiscalyear: %s' \
  -H 'lang: 0' \
  -H 'origin: %s' \
  -H 'priority: u=1, i' \
  -H 'referer: %s' \
  -H 'sec-ch-ua: "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'user-agent: %s'`,
		c.cfg.PollUrl,
		token,
		c.cfg.BranchCode,
		clientInfo,
		c.cfg.FiscalYear,
		c.cfg.Origin,
		c.cfg.Referer,
		c.cfg.UserAgent,
	)
}

const workProcessPayloadTemplate = `{"ipo":false,"san":"ChildTable_Detail","stn":"vB30WorkProcessDetail_Explorer","alc":"CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher","ndcn":"_NoDelete_i1k6nx","nocn":"_NoOpen_1cp62c","necn":"_NoEdit_lrh5s6","nrcn":"_NoRecall_lfhzf","lst":0,"tpid":"ParentId","pnb":0,"vlm":null,"iis":false,"sot":[{"opr":4,"val":"ItemCode"}],"fcle":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":4,"val":"DocNo_Detail"},{"opr":4,"val":"DocNoR"}]},{"opr":4,"val":"ItemCode"}]},{"opr":4,"val":"ItemName"}]},{"opr":4,"val":"Unit"}]},{"opr":4,"val":"QuantitySO"}]},{"opr":4,"val":"QuantityCDIssue"}]},{"opr":4,"val":"QuantityPass"}]},{"opr":4,"val":"AllowAdj"}]},{"opr":4,"val":"QuantityAdj"}]},{"opr":4,"val":"QuantityAfterAdj"}]},{"opr":4,"val":"QuantityOff"}]},{"opr":4,"val":"QuantityProduce"}]},{"opr":4,"val":"Closed"}]},{"opr":4,"val":"IsStop"}]},{"opr":4,"val":"IsComplete"}]},{"opr":4,"val":"QuantityReceipt"}]},{"opr":4,"val":"RateReceipt"}]},{"opr":4,"val":"DeliveryDateDO"}]},{"opr":4,"val":"ClosedDate"}]},{"opr":4,"val":"RowId_SO"}]},{"opr":4,"val":"CustomerName"}]},{"opr":4,"val":"RowId"}]},{"opr":4,"val":"Stt"}]},{"opr":4,"val":"Id"}]},{"opr":4,"val":"CreatedBy"}]},{"opr":4,"val":"CreatedAt"}]},{"opr":4,"val":"ModifiedBy"}]},{"opr":4,"val":"ModifiedAt"}]}],"lps":{},"pkv":["%s"],"sse":{}}`

// CallWorkProcessDetailAPI gọi truy vấn dữ liệu chi tiết công đoạn WorkProcessDetail
func (c *Client) CallWorkProcessDetailAPI(targetURL, pkv string) ([]byte, int, time.Duration, error) {
	if targetURL == "" {
		targetURL = c.cfg.DataUrl
	}
	if pkv == "" {
		pkv = c.cfg.DefaultPKV
	}
	if pkv == "" {
		pkv = "11114889CD"
	}

	token, err := c.GetValidToken()
	if err != nil {
		return nil, 0, 0, fmt.Errorf("không thể lấy Bearer Token hợp lệ: %w", err)
	}

	payloadJSON := fmt.Sprintf(workProcessPayloadTemplate, pkv)

	req, err := http.NewRequest("POST", targetURL, strings.NewReader(payloadJSON))
	if err != nil {
		return nil, 0, 0, fmt.Errorf("lỗi khởi tạo request POST: %w", err)
	}

	// Đặt chính xác toàn bộ Headers
	clientInfo := c.cfg.GetEffectiveClientInfo()
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("clientinfo", clientInfo)
	req.Header.Set("BranchCode", c.cfg.BranchCode)
	req.Header.Set("FiscalYear", c.cfg.FiscalYear)
	req.Header.Set("Lang", "0")
	if c.cfg.ClientMode == "web" {
		if c.cfg.Referer != "" {
			req.Header.Set("Referer", c.cfg.Referer)
		}
		req.Header.Set("sec-ch-ua-platform", `"Windows"`)
		req.Header.Set("sec-ch-ua", `"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"`)
		req.Header.Set("sec-ch-ua-mobile", "?0")
		req.Header.Set("User-Agent", c.cfg.UserAgent)
	}

	startTime := time.Now()
	resp, err := c.httpClient.Do(req)
	latency := time.Since(startTime)

	if err != nil {
		if c.database != nil {
			_ = c.database.LogApiCall(targetURL, 0, "", err.Error())
		}
		return nil, 0, latency, fmt.Errorf("lỗi kết nối tới %s: %w", targetURL, err)
	}
	defer resp.Body.Close()

	// Xử lý trường hợp 401 Unauthorized (token hết hạn từ xa)
	if resp.StatusCode == http.StatusUnauthorized {
		authResp, loginErr := c.Login()
		if loginErr == nil && authResp != nil && authResp.AccessToken != "" {
			req2, _ := http.NewRequest("POST", targetURL, strings.NewReader(payloadJSON))
			req2.Header = req.Header.Clone()
			req2.Header.Set("Authorization", "Bearer "+authResp.AccessToken)

			startTime = time.Now()
			respRetry, errRetry := c.httpClient.Do(req2)
			latency = time.Since(startTime)
			if errRetry == nil {
				resp = respRetry
				defer resp.Body.Close()
			}
		}
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, latency, fmt.Errorf("lỗi đọc dữ liệu phản hồi: %w", err)
	}

	summary := string(bodyBytes)
	if len(summary) > 500 {
		summary = summary[:500] + "... (truncated)"
	}

	var errText string
	if resp.StatusCode >= 400 {
		errText = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, summary)
	}

	// Ghi nhật ký vào SQLite DB
	if c.database != nil {
		_ = c.database.LogApiCall(targetURL, resp.StatusCode, summary, errText)
		if resp.StatusCode == http.StatusOK {
			_ = c.database.SaveSyncedData("work_process_detail", pkv, string(bodyBytes))
		}
	}

	if resp.StatusCode >= 400 {
		return bodyBytes, resp.StatusCode, latency, fmt.Errorf("máy chủ phản hồi mã lỗi HTTP %d: %s", resp.StatusCode, summary)
	}

	return bodyBytes, resp.StatusCode, latency, nil
}

// GetCurlForWorkProcessAPI trả về chuỗi cURL đầy đủ cho API truy vấn dữ liệu chi tiết công đoạn
func (c *Client) GetCurlForWorkProcessAPI(pkv string) string {
	if pkv == "" {
		pkv = c.cfg.DefaultPKV
	}
	if pkv == "" {
		pkv = "11114889CD"
	}

	token := "<CHƯA_CÓ_TOKEN_VUI_LÒNG_LOGIN>"
	if c.database != nil {
		tok, _ := c.database.GetLatestToken(c.cfg.Username)
		if tok != nil && tok.AccessToken != "" {
			token = tok.AccessToken
		}
	}

	payloadJSON := fmt.Sprintf(workProcessPayloadTemplate, pkv)
	clientInfo := c.cfg.GetEffectiveClientInfo()

	if c.cfg.ClientMode == "winform" {
		return fmt.Sprintf(`curl --url '%s' \
  -H 'Authorization: Bearer %s' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Content-Type: application/json' \
  -H 'clientinfo: %s' \
  -H 'BranchCode: %s' \
  -H 'FiscalYear: %s' \
  -H 'Lang: 0' \
  -H 'Referer: %s' \
  --data-raw '%s'`,
			c.cfg.DataUrl,
			token,
			clientInfo,
			c.cfg.BranchCode,
			c.cfg.FiscalYear,
			c.cfg.Referer,
			payloadJSON,
		)
	}

	return fmt.Sprintf(`curl --url '%s' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'Authorization: Bearer %s' \
  -H 'Lang: 0' \
  -H 'Referer: %s' \
  -H 'FiscalYear: %s' \
  -H 'sec-ch-ua: "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'clientinfo: %s' \
  -H 'BranchCode: %s' \
  -H 'User-Agent: %s' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Content-Type: application/json' \
  --data-raw '%s'`,
		c.cfg.DataUrl,
		token,
		c.cfg.Referer,
		c.cfg.FiscalYear,
		clientInfo,
		c.cfg.BranchCode,
		c.cfg.UserAgent,
		payloadJSON,
	)
}

const workOrdersExplorerPayload = `{"ipo":false,"san":"Ct","stn":"vB30WorkProcess_Explorer","alc":"CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher","ndcn":"_NoDelete_ebrws","nocn":"_NoOpen_thzlir","necn":"_NoEdit_jzrtt9","nrcn":"_NoRecall_axuij","lst":0,"tpid":"ParentId","pnb":0,"vlm":null,"iis":false,"fit":[{"opr":23,"eps":[{"opr":17,"eps":[{"opr":14,"eps":[{"opr":4,"val":"Ct"},{"opr":4,"val":"IsGroup"}]},{"opr":4,"val":0}]},{"opr":17,"eps":[{"opr":14,"eps":[{"opr":4,"val":"Ct"},{"opr":4,"val":"IsActive"}]},{"opr":4,"val":1}]}]}],"sot":[{"opr":4,"val":"DocStatus"}],"fcle":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":4,"val":"DocNo"},{"opr":4,"val":"DocDate"}]},{"opr":4,"val":"DocStatus"}]},{"opr":4,"val":"DocCode"}]},{"opr":4,"val":"PostSL"}]},{"opr":4,"val":"WorkProcessCode"}]},{"opr":4,"val":"ProductTypeName"}]},{"opr":4,"val":"Description"}]},{"opr":4,"val":"IsCheckSample"}]},{"opr":4,"val":"FactoryName"}]},{"opr":4,"val":"CustomerName"}]},{"opr":4,"val":"CreatedBy_Name"}]},{"opr":4,"val":"CreatedAt"}]},{"opr":4,"val":"ItemCode"}]},{"opr":4,"val":"ItemName"}]},{"opr":4,"val":"Quantity"}]},{"opr":4,"val":"Id"}]},{"opr":4,"val":"Stt"}]},{"opr":4,"val":"CreatedBy"}]},{"opr":4,"val":"ModifiedBy"}]},{"opr":4,"val":"ModifiedAt"}]}],"lps":{"BRANCHFILTER('BranchCode')":"ISNULL(BranchCode,'') IN ('','A01')"},"pkv":null,"sse":{}}`

type BravoExplorerColumn struct {
	ColumnName string `json:"cln"`
}

type BravoExplorerRow struct {
	Values []interface{} `json:"crt"`
}

type BravoExplorerRTV struct {
	Columns []BravoExplorerColumn `json:"cln"`
	Rows    []BravoExplorerRow    `json:"rws"`
}

type BravoExplorerResponse struct {
	Rtv BravoExplorerRTV `json:"rtv"`
}

// CallWorkOrdersAPI gọi trực tiếp API vB30WorkProcess_Explorer của Bravo ERP để lấy toàn bộ danh sách Lệnh sản xuất thực tế
func (c *Client) CallWorkOrdersAPI() ([]db.WorkOrderRecord, []byte, int, time.Duration, error) {
	targetURL := c.cfg.DataUrl
	if targetURL == "" {
		targetURL = "https://bravo.goldsunpackaging.vn:5051/4e9b7232116b4a4af1b990d81e00a049"
	}

	token, err := c.GetValidToken()
	if err != nil {
		return nil, nil, 0, 0, fmt.Errorf("không thể lấy Bearer Token hợp lệ: %w", err)
	}

	req, err := http.NewRequest("POST", targetURL, strings.NewReader(workOrdersExplorerPayload))
	if err != nil {
		return nil, nil, 0, 0, fmt.Errorf("lỗi tạo HTTP request: %w", err)
	}

	clientInfo := c.cfg.GetEffectiveClientInfo()
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("clientinfo", clientInfo)
	req.Header.Set("BranchCode", c.cfg.BranchCode)
	req.Header.Set("FiscalYear", c.cfg.FiscalYear)
	req.Header.Set("Lang", "0")
	if c.cfg.ClientMode == "web" {
		if c.cfg.Referer != "" {
			req.Header.Set("Referer", c.cfg.Referer)
		}
		req.Header.Set("sec-ch-ua-platform", `"Windows"`)
		req.Header.Set("sec-ch-ua", `"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"`)
		req.Header.Set("sec-ch-ua-mobile", "?0")
		req.Header.Set("User-Agent", c.cfg.UserAgent)
	}

	startTime := time.Now()
	resp, err := c.httpClient.Do(req)
	latency := time.Since(startTime)

	if err != nil {
		if c.database != nil {
			_ = c.database.LogApiCall(targetURL, 0, "", err.Error())
		}
		return nil, nil, 0, latency, fmt.Errorf("lỗi kết nối tới %s: %w", targetURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		authResp, loginErr := c.Login()
		if loginErr == nil && authResp != nil && authResp.AccessToken != "" {
			req2, _ := http.NewRequest("POST", targetURL, strings.NewReader(workOrdersExplorerPayload))
			req2.Header = req.Header.Clone()
			req2.Header.Set("Authorization", "Bearer "+authResp.AccessToken)

			startTime = time.Now()
			respRetry, errRetry := c.httpClient.Do(req2)
			latency = time.Since(startTime)
			if errRetry == nil {
				resp = respRetry
				defer resp.Body.Close()
			}
		}
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, resp.StatusCode, latency, fmt.Errorf("lỗi đọc dữ liệu: %w", err)
	}

	summary := string(bodyBytes)
	if len(summary) > 500 {
		summary = summary[:500] + "... (truncated)"
	}
	var errText string
	if resp.StatusCode >= 400 {
		errText = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, summary)
	}

	if c.database != nil {
		_ = c.database.LogApiCall(targetURL, resp.StatusCode, summary, errText)
	}

	if resp.StatusCode >= 400 {
		return nil, bodyBytes, resp.StatusCode, latency, fmt.Errorf("máy chủ phản hồi mã lỗi HTTP %d: %s", resp.StatusCode, summary)
	}

	// Parse JSON
	var bResp BravoExplorerResponse
	if err := json.Unmarshal(bodyBytes, &bResp); err != nil {
		return nil, bodyBytes, resp.StatusCode, latency, fmt.Errorf("lỗi giải mã JSON phản hồi Lệnh sản xuất: %w", err)
	}

	colMap := make(map[string]int)
	for i, col := range bResp.Rtv.Columns {
		colMap[col.ColumnName] = i
	}

	getVal := func(vals []interface{}, colName string) interface{} {
		idx, ok := colMap[colName]
		if !ok || idx >= len(vals) {
			return nil
		}
		return vals[idx]
	}

	getStr := func(vals []interface{}, colName string) string {
		v := getVal(vals, colName)
		if v == nil {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}

	getFloat := func(vals []interface{}, colName string) float64 {
		v := getVal(vals, colName)
		if v == nil {
			return 0
		}
		switch val := v.(type) {
		case float64:
			return val
		case int:
			return float64(val)
		default:
			return 0
		}
	}

	getInt := func(vals []interface{}, colName string) int {
		v := getVal(vals, colName)
		if v == nil {
			return 0
		}
		switch val := v.(type) {
		case float64:
			return int(val)
		case int:
			return val
		default:
			return 0
		}
	}

	var orders []db.WorkOrderRecord
	for _, row := range bResp.Rtv.Rows {
		stt := getStr(row.Values, "Stt")
		docNo := getStr(row.Values, "DocNo")
		if docNo == "" {
			continue
		}

		rawDate := getStr(row.Values, "DocDate")
		dateDisplay := rawDate
		if len(rawDate) >= 10 {
			if t, err := time.Parse("2006-01-02", rawDate[:10]); err == nil {
				dateDisplay = t.Format("02/01/2006")
			}
		}

		docStatus := getInt(row.Values, "DocStatus")
		statusText := "Chờ thực hiện"
		switch docStatus {
		case 1:
			statusText = "Đang sản xuất"
		case 2:
			statusText = "Hoàn thành"
		}

		order := db.WorkOrderRecord{
			MasterID:      int64(getInt(row.Values, "Id")),
			Stt:           stt,
			DocNo:         docNo,
			DocDate:       dateDisplay,
			ProcessCode:   getStr(row.Values, "WorkProcessCode"),
			Description:   getStr(row.Values, "Description"),
			FactoryName:   getStr(row.Values, "FactoryName"),
			CreatedByName: getStr(row.Values, "CreatedBy_Name"),
			DocStatus:     docStatus,
			StatusText:    statusText,
			ItemCode:      getStr(row.Values, "ItemCode"),
			ItemName:      getStr(row.Values, "ItemName"),
			Quantity:      getFloat(row.Values, "Quantity"),
			SyncedAt:      time.Now(),
		}
		orders = append(orders, order)
	}

	// Không lưu data Lệnh sản xuất vào SQLite CSDL (theo đúng yêu cầu lấy 100% từ API)
	return orders, bodyBytes, resp.StatusCode, latency, nil
}

// GetCurlForWorkOrdersAPI trả về chuỗi cURL đầy đủ chính xác để gọi API Lệnh sản xuất
func (c *Client) GetCurlForWorkOrdersAPI() string {
	token := "<CHƯA_CÓ_TOKEN_VUI_LÒNG_LOGIN>"
	if c.database != nil {
		tok, _ := c.database.GetLatestToken(c.cfg.Username)
		if tok != nil && tok.AccessToken != "" {
			token = tok.AccessToken
		}
	}

	clientInfo := c.cfg.GetEffectiveClientInfo()

	if c.cfg.ClientMode == "winform" {
		return fmt.Sprintf(`curl --url '%s' \
  -H 'Authorization: Bearer %s' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Content-Type: application/json' \
  -H 'clientinfo: %s' \
  -H 'BranchCode: %s' \
  -H 'FiscalYear: %s' \
  -H 'Lang: 0' \
  -H 'Referer: %s' \
  --data-raw '%s'`,
			c.cfg.DataUrl,
			token,
			clientInfo,
			c.cfg.BranchCode,
			c.cfg.FiscalYear,
			c.cfg.Referer,
			workOrdersExplorerPayload,
		)
	}

	return fmt.Sprintf(`curl --url '%s' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'Authorization: Bearer %s' \
  -H 'Lang: 0' \
  -H 'Referer: %s' \
  -H 'FiscalYear: %s' \
  -H 'sec-ch-ua: "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'clientinfo: %s' \
  -H 'BranchCode: %s' \
  -H 'User-Agent: %s' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Content-Type: application/json' \
  --data-raw '%s'`,
		c.cfg.DataUrl,
		token,
		c.cfg.Referer,
		c.cfg.FiscalYear,
		clientInfo,
		c.cfg.BranchCode,
		c.cfg.UserAgent,
		workOrdersExplorerPayload,
	)
}

// WorkStepOperation biểu diễn 1 dòng thao tác chi tiết (detailtt: vB30WorkProcessDetailTT)
type WorkStepOperation struct {
	BuiltinOrder             int     `json:"builtin_order"`
	WorkStepCode             string  `json:"work_step_code"`               // Mã thao tác (VD: BOI, BE)
	WorkStepTypeCode         string  `json:"work_step_type_code"`          // Mã phân loại thao tác (VD: BOI-01, BE-11)
	WorkStepTypeName         string  `json:"work_step_type_name"`          // Tên phân loại thao tác
	QuantityCD               float64 `json:"quantity_cd"`                  // Số lượng cần đạt (thao tác)
	QuantityTTIssue          float64 `json:"quantity_tt_issue"`            // Số lượng cần sản xuất (thao tác)
	QuantityPass             float64 `json:"quantity_pass"`                // Số lượng đạt đã lên lệnh thao tác
	QuantityProduce          float64 `json:"quantity_produce"`             // Số lượng sản xuất đã lên lệnh thao tác
	QuantityTransfered       float64 `json:"quantity_transfered"`          // SL Chuyển
	QuantityProductTransfer  float64 `json:"quantity_product_transfered"`  // SL SP Chuyển
	QuantityPassTK           float64 `json:"quantity_pass_tk"`             // Số lượng đạt đã thống kê
	QuantityProduceTK        float64 `json:"quantity_produce_tk"`          // Số lượng sản xuất đã thống kê
	MachineCode              string  `json:"machine_code"`                 // Mã máy
	MachineName              string  `json:"machine_name"`                 // Tên máy
	FactoryName              string  `json:"factory_name"`                 // Nhà máy
	RowIdCD                  string  `json:"row_id_cd"`                    // Khóa liên kết với Chi tiết công đoạn
}

// WorkOrderDetailRow biểu diễn một dòng dữ liệu chi tiết công đoạn vB30WorkProcessDetail_Explorer
type WorkOrderDetailRow struct {
	ID               int                 `json:"id"`
	DocNoDetail      string              `json:"doc_no_detail"`
	DocNoR           string              `json:"doc_no_r"`
	ItemCode         string              `json:"item_code"`
	ItemName         string              `json:"item_name"`
	Unit             string              `json:"unit"`
	QuantitySO       float64             `json:"quantity_so"`
	QuantityCDIssue  float64             `json:"quantity_cd_issue"`
	QuantityPass     float64             `json:"quantity_pass"`
	AllowAdj         float64             `json:"allow_adj"`
	QuantityAdj      float64             `json:"quantity_adj"`
	QuantityAfterAdj float64             `json:"quantity_after_adj"`
	QuantityOff      float64             `json:"quantity_off"`
	QuantityProduce  float64             `json:"quantity_produce"`
	Closed           int                 `json:"closed"`
	IsStop           int                 `json:"is_stop"`
	IsComplete       int                 `json:"is_complete"`
	QuantityReceipt  string              `json:"quantity_receipt"`
	RateReceipt      string              `json:"rate_receipt"`
	DeliveryDateDO   string              `json:"delivery_date_do"`
	ClosedDate       string              `json:"closed_date"`
	RowIdSO          string              `json:"row_id_so"`
	CustomerName     string              `json:"customer_name"`
	RowId            string              `json:"row_id"`
	Stt              string              `json:"stt"`
	Steps            []WorkStepOperation `json:"steps"` // Danh sách thao tác chi tiết (detailtt)
}

// WorkOrderWithDetails là kết hợp giữa thông tin Lệnh cha (Master) và danh sách chi tiết (Detail)
type WorkOrderWithDetails struct {
	Master  db.WorkOrderRecord   `json:"master"`
	Details []WorkOrderDetailRow `json:"details"`
}


// SearchWorkOrdersAPI tìm kiếm lệnh sản xuất từ Bravo Gateway bằng mã Master hoặc mã Chi tiết (SSE)
func (c *Client) SearchWorkOrdersAPI(keyword string) ([]WorkOrderWithDetails, int, time.Duration, error) {
	kw := strings.TrimSpace(keyword)
	if kw == "" {
		return nil, 0, 0, fmt.Errorf("từ khóa tìm kiếm không được để trống")
	}

	targetURL := c.cfg.DataUrl
	if targetURL == "" {
		targetURL = "https://bravo.goldsunpackaging.vn:5051/4e9b7232116b4a4af1b990d81e00a049"
	}

	token, err := c.GetValidToken()
	if err != nil {
		return nil, 0, 0, fmt.Errorf("không thể lấy Bearer Token hợp lệ: %w", err)
	}

	// Xây dựng payload tìm kiếm đa năng: lọc theo DocNo_Detail qua SSE ChildTable_Detail
	searchPayload := fmt.Sprintf(`{
  "ipo": false,
  "san": "Ct",
  "stn": "vB30WorkProcess_Explorer",
  "alc": "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher",
  "ndcn": "_NoDelete_ppeboo",
  "nocn": "_NoOpen_qprhbt",
  "necn": "_NoEdit_um5f8g",
  "nrcn": "_NoRecall_set3vw",
  "lst": 0,
  "tpid": "ParentId",
  "pnb": 0,
  "vlm": null,
  "iis": false,
  "fit": [
    {
      "opr": 23,
      "eps": [
        {
          "opr": 17,
          "eps": [
            { "opr": 14, "eps": [{ "opr": 4, "val": "Ct" }, { "opr": 4, "val": "IsGroup" }] },
            { "opr": 4, "val": 0 }
          ]
        },
        {
          "opr": 17,
          "eps": [
            { "opr": 14, "eps": [{ "opr": 4, "val": "Ct" }, { "opr": 4, "val": "IsActive" }] },
            { "opr": 4, "val": 1 }
          ]
        }
      ]
    }
  ],
  "sot": [{ "opr": 4, "val": "DocStatus" }],
  "fcle": [
    {"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":4,"val":"DocNo"},{"opr":4,"val":"DocDate"}]},{"opr":4,"val":"DocStatus"}]},{"opr":4,"val":"DocCode"}]},{"opr":4,"val":"PostSL"}]},{"opr":4,"val":"WorkProcessCode"}]},{"opr":4,"val":"ProductTypeName"}]},{"opr":4,"val":"Description"}]},{"opr":4,"val":"IsCheckSample"}]},{"opr":4,"val":"FactoryName"}]},{"opr":4,"val":"CustomerName"}]},{"opr":4,"val":"CreatedBy_Name"}]},{"opr":4,"val":"CreatedAt"}]},{"opr":4,"val":"ItemCode"}]},{"opr":4,"val":"ItemName"}]},{"opr":4,"val":"Quantity"}]},{"opr":4,"val":"Id"}]},{"opr":4,"val":"Stt"}]},{"opr":4,"val":"CreatedBy"}]},{"opr":4,"val":"ModifiedBy"}]},{"opr":4,"val":"ModifiedAt"}]}
  ],
  "lps": { "BRANCHFILTER('BranchCode')": "ISNULL(BranchCode,'') IN ('','A01')" },
  "pkv": null,
  "sse": {
    "dss": {
      "ChildTable_Detail": [
        {
          "opr": 175,
          "eps": [
            {
              "opr": 25,
              "eps": [
                {
                  "opr": 35,
                  "val": null,
                  "eps": [
                    { "opr": 11, "eps": [{ "opr": 4, "val": "DocNo_Detail" }, { "opr": 4, "val": "''" }] }
                  ]
                },
                { "opr": 4, "val": "'%%%s%%'" }
              ]
            },
            { "opr": 4, "val": "LATIN1_GENERAL_CI_AI" }
          ]
        }
      ]
    }
  }
}`, kw)

	req, err := http.NewRequest("POST", targetURL, strings.NewReader(searchPayload))
	if err != nil {
		return nil, 0, 0, fmt.Errorf("lỗi tạo HTTP request: %w", err)
	}

	clientInfo := c.cfg.GetEffectiveClientInfo()
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("clientinfo", clientInfo)
	req.Header.Set("BranchCode", c.cfg.BranchCode)
	req.Header.Set("FiscalYear", c.cfg.FiscalYear)
	req.Header.Set("Lang", "0")
	if c.cfg.ClientMode == "web" {
		if c.cfg.Referer != "" {
			req.Header.Set("Referer", c.cfg.Referer)
		}
		req.Header.Set("sec-ch-ua-platform", `"Windows"`)
		req.Header.Set("sec-ch-ua", `"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"`)
		req.Header.Set("sec-ch-ua-mobile", "?0")
		req.Header.Set("User-Agent", c.cfg.UserAgent)
	}

	startTime := time.Now()
	resp, err := c.httpClient.Do(req)
	latency := time.Since(startTime)

	if err != nil {
		if c.database != nil {
			_ = c.database.LogApiCall(targetURL, 0, "", err.Error())
		}
		return nil, 0, latency, fmt.Errorf("lỗi kết nối tới %s: %w", targetURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		authResp, loginErr := c.Login()
		if loginErr == nil && authResp != nil && authResp.AccessToken != "" {
			req2, _ := http.NewRequest("POST", targetURL, strings.NewReader(searchPayload))
			req2.Header = req.Header.Clone()
			req2.Header.Set("Authorization", "Bearer "+authResp.AccessToken)

			startTime = time.Now()
			respRetry, errRetry := c.httpClient.Do(req2)
			latency = time.Since(startTime)
			if errRetry == nil {
				resp = respRetry
				defer resp.Body.Close()
			}
		}
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, latency, fmt.Errorf("lỗi đọc dữ liệu phản hồi: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, resp.StatusCode, latency, fmt.Errorf("máy chủ phản hồi mã lỗi HTTP %d", resp.StatusCode)
	}

	var bResp BravoExplorerResponse
	if err := json.Unmarshal(bodyBytes, &bResp); err != nil {
		return nil, resp.StatusCode, latency, fmt.Errorf("lỗi giải mã JSON phản hồi Master: %w", err)
	}

	colMap := make(map[string]int)
	for i, col := range bResp.Rtv.Columns {
		colMap[col.ColumnName] = i
	}

	getVal := func(vals []interface{}, colName string) interface{} {
		idx, ok := colMap[colName]
		if !ok || idx >= len(vals) {
			return nil
		}
		return vals[idx]
	}

	getStr := func(vals []interface{}, colName string) string {
		v := getVal(vals, colName)
		if v == nil {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}

	getInt := func(vals []interface{}, colName string) int {
		v := getVal(vals, colName)
		if v == nil {
			return 0
		}
		switch val := v.(type) {
		case float64:
			return int(val)
		case int:
			return val
		default:
			return 0
		}
	}

	var results []WorkOrderWithDetails
	for _, row := range bResp.Rtv.Rows {
		stt := getStr(row.Values, "Stt")
		docNo := getStr(row.Values, "DocNo")
		if docNo == "" && stt == "" {
			continue
		}

		rawDate := getStr(row.Values, "DocDate")
		dateDisplay := rawDate
		if len(rawDate) >= 10 {
			if t, err := time.Parse("2006-01-02", rawDate[:10]); err == nil {
				dateDisplay = t.Format("02/01/2006")
			}
		}

		docStatus := getInt(row.Values, "DocStatus")
		statusText := "Chờ thực hiện"
		switch docStatus {
		case 1:
			statusText = "Đang sản xuất"
		case 2:
			statusText = "Hoàn thành"
		}

		master := db.WorkOrderRecord{
			MasterID:      int64(getInt(row.Values, "Id")),
			Stt:           stt,
			DocNo:         docNo,
			DocDate:       dateDisplay,
			ProcessCode:   getStr(row.Values, "WorkProcessCode"),
			Description:   getStr(row.Values, "Description"),
			FactoryName:   getStr(row.Values, "FactoryName"),
			CreatedByName: getStr(row.Values, "CreatedBy_Name"),
			DocStatus:     docStatus,
			StatusText:    statusText,
			ItemCode:      getStr(row.Values, "ItemCode"),
			ItemName:      getStr(row.Values, "ItemName"),
			SyncedAt:      time.Now(),
		}

		// Gọi lấy danh sách chi tiết công đoạn vB30WorkProcessDetail_Explorer theo stt (PKV)
		details, _ := c.CallWorkProcessDetailRows(stt)

		results = append(results, WorkOrderWithDetails{
			Master:  master,
			Details: details,
		})
	}

	return results, resp.StatusCode, latency, nil
}

// CallWorkProcessDetailRows gọi vB30WorkProcessDetail_Explorer và giải mã các dòng chi tiết
func (c *Client) CallWorkProcessDetailRows(stt string) ([]WorkOrderDetailRow, error) {
	if stt == "" {
		return nil, nil
	}
	body, statusCode, _, err := c.CallWorkProcessDetailAPI(c.cfg.DataUrl, stt)
	if err != nil || statusCode != 200 {
		return nil, err
	}

	var bResp BravoExplorerResponse
	if err := json.Unmarshal(body, &bResp); err != nil {
		return nil, err
	}

	colMap := make(map[string]int)
	for i, col := range bResp.Rtv.Columns {
		colMap[col.ColumnName] = i
	}

	getVal := func(vals []interface{}, colName string) interface{} {
		idx, ok := colMap[colName]
		if !ok || idx >= len(vals) {
			return nil
		}
		return vals[idx]
	}

	getStr := func(vals []interface{}, colName string) string {
		v := getVal(vals, colName)
		if v == nil {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}

	getFloat := func(vals []interface{}, colName string) float64 {
		v := getVal(vals, colName)
		if v == nil {
			return 0
		}
		switch val := v.(type) {
		case float64:
			return val
		case int:
			return float64(val)
		default:
			return 0
		}
	}

	getInt := func(vals []interface{}, colName string) int {
		v := getVal(vals, colName)
		if v == nil {
			return 0
		}
		switch val := v.(type) {
		case float64:
			return int(val)
		case int:
			return val
		default:
			return 0
		}
	}

	var details []WorkOrderDetailRow
	for i, row := range bResp.Rtv.Rows {
		rawClosedDate := getStr(row.Values, "ClosedDate")
		closedDateDisp := rawClosedDate
		if len(rawClosedDate) >= 10 {
			if t, err := time.Parse("2006-01-02", rawClosedDate[:10]); err == nil {
				closedDateDisp = t.Format("02/01/2006")
			}
		}

		unit := getStr(row.Values, "Unit")
		if unit == "" {
			unit = "Pcs"
		}

		rateRec := getStr(row.Values, "RateReceipt")
		if rateRec == "" || rateRec == "0" {
			rateRec = "0%"
		} else if !strings.HasSuffix(rateRec, "%") {
			rateRec += "%"
		}

		d := WorkOrderDetailRow{
			ID:               i + 1,
			DocNoDetail:      getStr(row.Values, "DocNo_Detail"),
			DocNoR:           getStr(row.Values, "DocNoR"),
			ItemCode:         getStr(row.Values, "ItemCode"),
			ItemName:         getStr(row.Values, "ItemName"),
			Unit:             unit,
			QuantitySO:       getFloat(row.Values, "QuantitySO"),
			QuantityCDIssue:  getFloat(row.Values, "QuantityCDIssue"),
			QuantityPass:     getFloat(row.Values, "QuantityPass"),
			AllowAdj:         getFloat(row.Values, "AllowAdj"),
			QuantityAdj:      getFloat(row.Values, "QuantityAdj"),
			QuantityAfterAdj: getFloat(row.Values, "QuantityAfterAdj"),
			QuantityOff:      getFloat(row.Values, "QuantityOff"),
			QuantityProduce:  getFloat(row.Values, "QuantityProduce"),
			Closed:           getInt(row.Values, "Closed"),
			IsStop:           getInt(row.Values, "IsStop"),
			IsComplete:       getInt(row.Values, "IsComplete"),
			QuantityReceipt:  getStr(row.Values, "QuantityReceipt"),
			RateReceipt:      rateRec,
			DeliveryDateDO:   getStr(row.Values, "DeliveryDateDO"),
			ClosedDate:       closedDateDisp,
			RowIdSO:          getStr(row.Values, "RowId_SO"),
			CustomerName:     getStr(row.Values, "CustomerName"),
			RowId:            getStr(row.Values, "RowId"),
			Stt:              getStr(row.Values, "Stt"),
		}
		if d.Stt == "" {
			d.Stt = stt
		}

		// Nếu có RowId của dòng chi tiết công đoạn, tự động gọi tiếp API detailtt để lấy danh sách thao tác
		if d.RowId != "" {
			steps, _ := c.CallWorkProcessDetailTTRows(d.RowId)
			d.Steps = steps
		}

		details = append(details, d)
	}

	return details, nil
}

const workProcessDetailTTPayloadTemplate = `{"ipo":false,"san":"detailtt","stn":"vB30WorkProcessDetailTT","alc":"CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher","ndcn":"_NoDelete_8qz09h","nocn":"_NoOpen_7qctoik","necn":"_NoEdit_4g2m4v","nrcn":"_NoRecall_hv81tm","lst":0,"tpid":"ParentId","pnb":0,"vlm":null,"iis":false,"fcle":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":4,"val":"BuiltinOrder"},{"opr":4,"val":"WorkStepCode"}]},{"opr":4,"val":"WorkStepTypeCode"}]},{"opr":4,"val":"WorkStepTypeName"}]},{"opr":4,"val":"QuantityCD"}]},{"opr":4,"val":"QuantityTTIssue"}]},{"opr":4,"val":"QuantityPass"}]},{"opr":4,"val":"QuantityProduce"}]},{"opr":4,"val":"QuantityTransfered"}]},{"opr":4,"val":"QuantityProductTransfered"}]},{"opr":4,"val":"QuantityPassTK"}]},{"opr":4,"val":"QuantityProduceTK"}]},{"opr":4,"val":"MachineCode"}]},{"opr":4,"val":"MachineName"}]},{"opr":4,"val":"FactoryName"}]},{"opr":4,"val":"FactoryList"}]},{"opr":4,"val":"BuiltinOrderDESC"}]},{"opr":4,"val":"RowId_CD"}]},{"opr":4,"val":"Id"}]},{"opr":4,"val":"CreatedBy"}]},{"opr":4,"val":"CreatedAt"}]},{"opr":4,"val":"ModifiedBy"}]},{"opr":4,"val":"ModifiedAt"}]}],"lps":{},"pkv":["%s"],"sse":{}}`

// CallWorkProcessDetailTTRows gọi API vB30WorkProcessDetailTT lấy danh sách thao tác chi tiết theo RowId_CD
func (c *Client) CallWorkProcessDetailTTRows(rowIdCD string) ([]WorkStepOperation, error) {
	if rowIdCD == "" {
		return nil, nil
	}

	targetURL := c.cfg.DataUrl
	if targetURL == "" {
		targetURL = "https://bravo.goldsunpackaging.vn:5051/4e9b7232116b4a4af1b990d81e00a049"
	}

	token, err := c.GetValidToken()
	if err != nil {
		return nil, err
	}

	payloadJSON := fmt.Sprintf(workProcessDetailTTPayloadTemplate, rowIdCD)
	req, err := http.NewRequest("POST", targetURL, strings.NewReader(payloadJSON))
	if err != nil {
		return nil, err
	}

	clientInfo := c.cfg.GetEffectiveClientInfo()
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("clientinfo", clientInfo)
	req.Header.Set("BranchCode", c.cfg.BranchCode)
	req.Header.Set("FiscalYear", c.cfg.FiscalYear)
	req.Header.Set("Lang", "0")
	if c.cfg.ClientMode == "web" {
		if c.cfg.Referer != "" {
			req.Header.Set("Referer", c.cfg.Referer)
		}
		req.Header.Set("sec-ch-ua-platform", `"Windows"`)
		req.Header.Set("sec-ch-ua", `"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"`)
		req.Header.Set("sec-ch-ua-mobile", "?0")
		req.Header.Set("User-Agent", c.cfg.UserAgent)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		authResp, loginErr := c.Login()
		if loginErr == nil && authResp != nil && authResp.AccessToken != "" {
			req2, _ := http.NewRequest("POST", targetURL, strings.NewReader(payloadJSON))
			req2.Header = req.Header.Clone()
			req2.Header.Set("Authorization", "Bearer "+authResp.AccessToken)
			respRetry, errRetry := c.httpClient.Do(req2)
			if errRetry == nil {
				resp = respRetry
				defer resp.Body.Close()
			}
		}
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil || resp.StatusCode != 200 {
		return nil, err
	}

	var bResp BravoExplorerResponse
	if err := json.Unmarshal(bodyBytes, &bResp); err != nil {
		return nil, err
	}

	colMap := make(map[string]int)
	for i, col := range bResp.Rtv.Columns {
		colMap[col.ColumnName] = i
	}

	getVal := func(vals []interface{}, colName string) interface{} {
		idx, ok := colMap[colName]
		if !ok || idx >= len(vals) {
			return nil
		}
		return vals[idx]
	}

	getStr := func(vals []interface{}, colName string) string {
		v := getVal(vals, colName)
		if v == nil {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}

	getFloat := func(vals []interface{}, colName string) float64 {
		v := getVal(vals, colName)
		if v == nil {
			return 0
		}
		switch val := v.(type) {
		case float64:
			return val
		case int:
			return float64(val)
		default:
			return 0
		}
	}

	getInt := func(vals []interface{}, colName string) int {
		v := getVal(vals, colName)
		if v == nil {
			return 0
		}
		switch val := v.(type) {
		case float64:
			return int(val)
		case int:
			return val
		default:
			return 0
		}
	}

	var steps []WorkStepOperation
	for _, row := range bResp.Rtv.Rows {
		qPass := getFloat(row.Values, "QuantityPass")
		qProduce := getFloat(row.Values, "QuantityProduce")
		if qProduce == 0 {
			qProduce = getFloat(row.Values, "QuantityProduce0")
		}
		if qProduce == 0 {
			qProduce = getFloat(row.Values, "QuantityTTIssue")
		}
		qTrans := getFloat(row.Values, "QuantityTransfered")
		qProdTrans := getFloat(row.Values, "QuantityProductTransfered")
		qCD := getFloat(row.Values, "QuantityCD")

		s := WorkStepOperation{
			BuiltinOrder:            getInt(row.Values, "BuiltinOrder"),
			WorkStepCode:            getStr(row.Values, "WorkStepCode"),
			WorkStepTypeCode:        getStr(row.Values, "WorkStepTypeCode"),
			WorkStepTypeName:        getStr(row.Values, "WorkStepTypeName"),
			QuantityCD:              qCD,
			QuantityTTIssue:         qProduce,
			QuantityPass:            qPass,
			QuantityProduce:         qProduce,
			QuantityTransfered:      qTrans,
			QuantityProductTransfer: qProdTrans,
			QuantityPassTK:          getFloat(row.Values, "QuantityPassTK"),
			QuantityProduceTK:       getFloat(row.Values, "QuantityProduceTK"),
			MachineCode:             getStr(row.Values, "MachineCode"),
			MachineName:             getStr(row.Values, "MachineName"),
			FactoryName:             getStr(row.Values, "FactoryName"),
			RowIdCD:                 getStr(row.Values, "RowId_CD"),
		}
		steps = append(steps, s)
	}

	return steps, nil
}






