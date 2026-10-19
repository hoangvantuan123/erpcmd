package config

import (
	"encoding/json"
	"os"
	"strings"
)

type Config struct {
	ApiUrl         string `json:"api_url"`
	PollUrl        string `json:"poll_url"`
	PollInterval   int    `json:"poll_interval"` // seconds, default 300 (5 minutes)
	DataUrl        string `json:"data_url"`
	DefaultPKV     string `json:"default_pkv"`
	ClientId       string `json:"client_id"`
	ClientSecret   string `json:"client_secret"`
	DeviceCode     string `json:"device_code"`
	ConnectionName string `json:"connection_name"`
	GrantType      string `json:"grant_type"`
	Scope          string `json:"scope"`
	Username       string `json:"username"`
	Password       string `json:"password"`
	BranchCode     string `json:"branch_code"`
	FiscalYear     string `json:"fiscal_year"`
	Origin         string `json:"origin"`
	Referer        string `json:"referer"`
	UserAgent      string `json:"user_agent"`
	ClientInfo     string `json:"client_info"`
	ClientMode     string `json:"client_mode"` // "winform" (phần mềm máy trạm) hoặc "web"
	AppName        string `json:"app_name"`    // "B10.10.9.1.1" (Winform) hoặc "Bravo Web 10.9.5.1" (Web)
	WsName         string `json:"ws_name"`     // Tên thiết bị (mặc định tự lấy COMPUTERNAME nếu để trống)
	WsUser         string `json:"ws_user"`     // Tài khoản Windows máy trạm (%USERNAME%@%COMPUTERNAME%)
	DBPath         string `json:"db_path"`
	WebPort        int    `json:"web_port"`
}

func GetSystemWsName() string {
	comp := strings.TrimSpace(os.Getenv("COMPUTERNAME"))
	if comp == "" {
		h, err := os.Hostname()
		if err == nil && h != "" {
			comp = strings.TrimSpace(h)
		}
	}
	if comp == "" {
		comp = "localhost"
	}
	return comp
}

func GetSystemWsUser(wsName string) string {
	u := strings.TrimSpace(os.Getenv("USERNAME"))
	if u == "" {
		u = strings.TrimSpace(os.Getenv("USER"))
	}
	if u == "" {
		u = "user"
	}
	if wsName == "" {
		wsName = GetSystemWsName()
	}
	return u + "@" + wsName
}

// GetEffectiveClientInfo tự động tính toán chuỗi clientinfo chuẩn xác theo chế độ Winform hoặc Web
func (c *Config) GetEffectiveClientInfo() string {
	if c.ClientMode == "web" {
		if strings.Contains(c.ClientInfo, "Bravo Web") {
			return c.ClientInfo
		}
		return "AppName=Bravo Web 10.9.5.1;WsName=113.22.84.155"
	}

	// Mặc định là Winform (Bản phần mềm máy trạm)
	appName := c.AppName
	if appName == "" {
		appName = "B10.10.9.1.1"
	}

	wsName := c.WsName
	if wsName == "" || wsName == "DESKTOP-CHS6OSJ" {
		wsName = GetSystemWsName()
	}

	wsUser := c.WsUser
	if wsUser == "" || strings.Contains(wsUser, "tuanhoang") || strings.Contains(wsUser, "DESKTOP-CHS6OSJ") {
		wsUser = GetSystemWsUser(wsName)
	}

	return "AppName=" + appName + ";WsName=" + wsName + ";WsUser=" + wsUser
}

func DefaultConfig() *Config {
	return &Config{
		ApiUrl:         "https://bravo.goldsunpackaging.vn:5051/fa837234b0b27bc02365a940995bdc24",
		PollUrl:        "https://bravo.goldsunpackaging.vn:5051/6e60af0b2cc4e2200d8c2ec545da3627",
		PollInterval:   300, // 5 minutes
		DataUrl:        "https://bravo.goldsunpackaging.vn:5051/4e9b7232116b4a4af1b990d81e00a049",
		DefaultPKV:     "11114889CD",
		ClientId:       "c52bd596-07ff-4329-a640-67f41a51a90e",
		ClientSecret:   "DC86276E4BF54018BE9EC05650681914",
		DeviceCode:     "45fd8c9a3974fe45589811c5dfbc2fef",
		ConnectionName: "Default",
		GrantType:      "password",
		Scope:          "ApiGateway offline_access",
		Username:       "",
		Password:       "",
		BranchCode:     "A01",
		FiscalYear:     "2026",
		Origin:         "https://bravo.goldsunpackaging.vn:5052",
		Referer:        "https://bravo.goldsunpackaging.vn:5052/",
		UserAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
		ClientInfo:     "", // Để trống để tự động nhận diện từ máy trạm
		ClientMode:     "winform",
		AppName:        "B10.10.9.1.1",
		WsName:         "", // Để trống để tự động nhận diện từ máy trạm
		WsUser:         "", // Để trống để tự động nhận diện từ máy trạm
		DBPath:         "erpsyn_data.db",
		WebPort:        8080,
	}
}

const ConfigFileName = "config.json"

func LoadConfig() (*Config, error) {
	if _, err := os.Stat(ConfigFileName); os.IsNotExist(err) {
		cfg := DefaultConfig()
		_ = SaveConfig(cfg)
		return cfg, nil
	}

	data, err := os.ReadFile(ConfigFileName)
	if err != nil {
		return DefaultConfig(), err
	}

	cfg := DefaultConfig()
	if err := json.Unmarshal(data, cfg); err != nil {
		return DefaultConfig(), err
	}

	// Đảm bảo các giá trị mặc định nếu file json cũ chưa có
	if cfg.PollUrl == "" {
		cfg.PollUrl = "https://bravo.goldsunpackaging.vn:5051/6e60af0b2cc4e2200d8c2ec545da3627"
	}
	if cfg.PollInterval <= 0 {
		cfg.PollInterval = 300
	}
	if cfg.BranchCode == "" {
		cfg.BranchCode = "A01"
	}
	if cfg.FiscalYear == "" {
		cfg.FiscalYear = "2026"
	}
	if cfg.Origin == "" {
		cfg.Origin = "https://bravo.goldsunpackaging.vn:5052"
	}
	if cfg.DataUrl == "" {
		cfg.DataUrl = "https://bravo.goldsunpackaging.vn:5051/4e9b7232116b4a4af1b990d81e00a049"
	}
	if cfg.DefaultPKV == "" {
		cfg.DefaultPKV = "11114889CD"
	}
	if cfg.ClientMode == "" {
		cfg.ClientMode = "winform"
	}
	if cfg.AppName == "" {
		cfg.AppName = "B10.10.9.1.1"
	}

	// Tự động nhận diện thiết bị và tài khoản thực tế từ máy trạm đang chạy
	if cfg.WsName == "" || cfg.WsName == "DESKTOP-CHS6OSJ" {
		cfg.WsName = GetSystemWsName()
	}
	if cfg.WsUser == "" || strings.Contains(cfg.WsUser, "tuanhoang") || strings.Contains(cfg.WsUser, "DESKTOP-CHS6OSJ") {
		cfg.WsUser = GetSystemWsUser(cfg.WsName)
	}
	cfg.ClientInfo = cfg.GetEffectiveClientInfo()

	// KHÔNG gọi SaveConfig để tránh ghi đè tên máy tĩnh vào file config.json
	return cfg, nil
}

func SaveConfig(cfg *Config) error {
	// Tạo bản sao để lưu config.json sạch sẽ, không lưu cứng tên máy
	saveCfg := *cfg
	// Nếu người dùng không chỉ định tên máy đặc biệt thì để rỗng để máy khác dùng tự nhận
	if saveCfg.WsName == GetSystemWsName() {
		saveCfg.WsName = ""
	}
	if saveCfg.WsUser == GetSystemWsUser(GetSystemWsName()) {
		saveCfg.WsUser = ""
	}
	saveCfg.ClientInfo = ""

	data, err := json.MarshalIndent(&saveCfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(ConfigFileName, data, 0644)
}
