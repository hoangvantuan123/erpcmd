package api

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

//go:embed settle_step_schema.json
var settleStepSchemaJSON []byte

// WorkStepMaster đại diện cho 1 Master Lệnh thao tác (vB30WorkStep_Explorer)
type WorkStepMaster struct {
	Id              int    `json:"id"`
	Stt             string `json:"stt"`
	DocNo           string `json:"doc_no"`
	DocDate         string `json:"doc_date"`
	WorkStepIdList  string `json:"work_step_id_list"`
	ShiftCode       string `json:"shift_code"`
	FactoryName     string `json:"factory_name"`
	DeptName        string `json:"dept_name"`
	ProductTypeName string `json:"product_type_name"`
	DocStatus       int    `json:"doc_status"`
	DocCode         string `json:"doc_code"`
	Description     string `json:"description"`
}

// SettleStepMasterResult ghi nhận kết quả quyết toán cho từng Master Lệnh thao tác
type SettleStepMasterResult struct {
	MasterId    int           `json:"master_id"`
	MasterDocNo string        `json:"master_doc_no"`
	Stt         string        `json:"stt"`
	Status      string        `json:"status"`
	RowsUpdated int           `json:"rows_updated"`
	Duration    time.Duration `json:"duration"`
	Err         error         `json:"err,omitempty"`
}

const workStepExplorerPayloadTemplate = `{"ipo":false,"san":"Ct","stn":"vB30WorkStep_Explorer","alc":"CommandKey=WorkDocTT|LayoutName=Layout1|TemplateName=StatsDocVoucher","ndcn":"_NoDelete_03wk","nocn":"_NoOpen_9yl2lc","necn":"_NoEdit_9uyir","nrcn":"_NoRecall_80aaqd","lst":0,"tpid":"ParentId","pnb":0,"vlm":null,"iis":false,"fit":[{"opr":23,"eps":[{"opr":17,"eps":[{"opr":14,"eps":[{"opr":4,"val":"Ct"},{"opr":4,"val":"IsGroup"}]},{"opr":4,"val":0}]},{"opr":17,"eps":[{"opr":14,"eps":[{"opr":4,"val":"Ct"},{"opr":4,"val":"IsActive"}]},{"opr":4,"val":1}]}]}],"sot":[{"opr":4,"val":"DocStatus"}],"fcle":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":11,"eps":[{"opr":4,"val":"FactoryName"},{"opr":4,"val":"WorkStepIdList"}]},{"opr":4,"val":"DocNo"}]},{"opr":4,"val":"DocDate"}]},{"opr":4,"val":"DeptName"}]},{"opr":4,"val":"ProductTypeName"}]},{"opr":4,"val":"IsCheckSample"}]},{"opr":4,"val":"DocStatus"}]},{"opr":4,"val":"DocCode"}]},{"opr":4,"val":"PostGL"}]},{"opr":4,"val":"ShiftCode"}]},{"opr":4,"val":"Description"}]},{"opr":4,"val":"CreatedBy_Name"}]},{"opr":4,"val":"CreatedAt"}]},{"opr":4,"val":"Stt"}]},{"opr":4,"val":"Id"}]},{"opr":4,"val":"CreatedBy"}]},{"opr":4,"val":"ModifiedBy"}]},{"opr":4,"val":"ModifiedAt"}]}],"lps":{"BRANCHFILTER('BranchCode')":"ISNULL(BranchCode,'') IN ('','%s')"},"pkv":null,"sse":{"dss":{"ChildTable_Detail":[{"opr":175,"eps":[{"opr":25,"eps":[{"opr":35,"val":null,"eps":[{"opr":11,"eps":[{"opr":4,"val":"DocNoWP"},{"opr":4,"val":"''"}]}]},{"opr":4,"val":"'%%%s%%'"}]},{"opr":4,"val":"LATIN1_GENERAL_CI_AI"}]}]}}}`

// FindWorkStepMastersByDocNoWP tìm kiếm danh sách Master Lệnh thao tác (vB30WorkStep_Explorer) có chứa Lệnh công đoạn chỉ định
func (c *Client) FindWorkStepMastersByDocNoWP(docNoWP string) ([]WorkStepMaster, error) {
	if strings.TrimSpace(docNoWP) == "" {
		return nil, fmt.Errorf("số lệnh công đoạn không được để trống")
	}

	targetURL := c.cfg.DataUrl
	if targetURL == "" {
		targetURL = "https://bravo.goldsunpackaging.vn:5051/4e9b7232116b4a4af1b990d81e00a049"
	}

	token, err := c.GetValidToken()
	if err != nil {
		return nil, fmt.Errorf("không thể lấy Bearer Token: %w", err)
	}

	branch := c.cfg.BranchCode
	if branch == "" {
		branch = "A01"
	}
	payloadJSON := fmt.Sprintf(workStepExplorerPayloadTemplate, branch, docNoWP)

	req, err := http.NewRequest("POST", targetURL, strings.NewReader(payloadJSON))
	if err != nil {
		return nil, fmt.Errorf("lỗi tạo request tìm Lệnh thao tác: %w", err)
	}

	clientInfo := c.cfg.GetEffectiveClientInfo()
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("clientinfo", clientInfo)
	req.Header.Set("BranchCode", branch)
	req.Header.Set("FiscalYear", c.cfg.FiscalYear)
	req.Header.Set("Lang", "0")
	if c.cfg.ClientMode == "web" {
		if c.cfg.Referer != "" {
			req.Header.Set("Referer", c.cfg.Referer)
		}
		if c.cfg.Origin != "" {
			req.Header.Set("Origin", c.cfg.Origin)
		}
		req.Header.Set("sec-ch-ua-platform", `"Windows"`)
		req.Header.Set("sec-ch-ua", `"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"`)
		req.Header.Set("sec-ch-ua-mobile", "?0")
		req.Header.Set("User-Agent", c.cfg.UserAgent)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("lỗi kết nối tìm Lệnh thao tác: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("lỗi đọc dữ liệu phản hồi Lệnh thao tác: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("máy chủ phản hồi mã lỗi HTTP %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var bResp BravoExplorerResponse
	if err := json.Unmarshal(bodyBytes, &bResp); err != nil {
		return nil, fmt.Errorf("lỗi giải mã JSON Lệnh thao tác: %w", err)
	}

	colMap := make(map[string]int)
	for i, col := range bResp.Rtv.Columns {
		colMap[col.ColumnName] = i
	}

	getInt := func(vals []interface{}, colName string) int {
		idx, ok := colMap[colName]
		if !ok || idx >= len(vals) || vals[idx] == nil {
			return 0
		}
		switch v := vals[idx].(type) {
		case float64:
			return int(v)
		case int:
			return v
		default:
			return 0
		}
	}

	getStr := func(vals []interface{}, colName string) string {
		idx, ok := colMap[colName]
		if !ok || idx >= len(vals) || vals[idx] == nil {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%v", vals[idx]))
	}

	var masters []WorkStepMaster
	for _, row := range bResp.Rtv.Rows {
		vals := row.Values
		if len(vals) == 0 {
			continue
		}
		m := WorkStepMaster{
			Id:              getInt(vals, "Id"),
			Stt:             getStr(vals, "Stt"),
			DocNo:           getStr(vals, "DocNo"),
			DocDate:         getStr(vals, "DocDate"),
			WorkStepIdList:  getStr(vals, "WorkStepIdList"),
			ShiftCode:       getStr(vals, "ShiftCode"),
			FactoryName:     getStr(vals, "FactoryName"),
			DeptName:        getStr(vals, "DeptName"),
			ProductTypeName: getStr(vals, "ProductTypeName"),
			DocStatus:       getInt(vals, "DocStatus"),
			DocCode:         getStr(vals, "DocCode"),
			Description:     getStr(vals, "Description"),
		}
		if m.Id > 0 && m.Stt != "" {
			masters = append(masters, m)
		}
	}

	return masters, nil
}

// SettleSingleWorkStep thực hiện quyết toán một Master Lệnh thao tác và ghi chú vào các dòng chi tiết liên quan
func (c *Client) SettleSingleWorkStep(master WorkStepMaster, targetDocNoWP string, targetRowIdCD string, param SettleParam) (int, error) {
	token, err := c.GetValidToken()
	if err != nil {
		return 0, fmt.Errorf("không thể lấy Token xác thực: %w", err)
	}

	clientInfo := c.cfg.GetEffectiveClientInfo()
	commonHeaders := func(req *http.Request) {
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "*/*")
		req.Header.Set("Accept-Language", "vi-VN,vi;q=0.9,en;q=0.8")
		req.Header.Set("clientinfo", clientInfo)
		req.Header.Set("BranchCode", c.cfg.BranchCode)
		req.Header.Set("FiscalYear", c.cfg.FiscalYear)
		req.Header.Set("Lang", "0")
		if c.cfg.ClientMode == "web" {
			if c.cfg.Referer != "" {
				req.Header.Set("Referer", c.cfg.Referer)
			}
			if c.cfg.Origin != "" {
				req.Header.Set("Origin", c.cfg.Origin)
			}
			req.Header.Set("sec-ch-ua-platform", `"Windows"`)
			req.Header.Set("sec-ch-ua", `"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"`)
			req.Header.Set("sec-ch-ua-mobile", "?0")
			req.Header.Set("User-Agent", c.cfg.UserAgent)
		}
	}

	urlEditorLoad := "https://bravo.goldsunpackaging.vn:5051/6642f8863ff4d6c5d73112f0e3ef5491"
	urlSaveEdit := "https://bravo.goldsunpackaging.vn:5051/ce49c21a2c25c83cbcb115432b1a9685"
	urlCommit := "https://bravo.goldsunpackaging.vn:5051/6642f8863ff4d6c5d73112f0e3ef5491"
	urlDocProcess := "https://bravo.goldsunpackaging.vn:5051/d7952b69f7aafd7d3db1d2bd8969aac4"

	if c.database != nil {
		urlEditorLoad = c.database.GetSettleEndpoint("editor_load", urlEditorLoad)
		urlSaveEdit = c.database.GetSettleEndpoint("save_edit", urlSaveEdit)
		urlCommit = c.database.GetSettleEndpoint("commit_confirm", urlCommit)
		urlDocProcess = c.database.GetSettleEndpoint("doc_process", urlDocProcess)
	}

	// -------------------------------------------------------------------------
	// BƯỚC 1: Tải dữ liệu ban đầu của Editor từ Bravo (lấy Ct, Ct0 và timestamp hiện thời)
	// -------------------------------------------------------------------------
	payloadLoad := fmt.Sprintf(`{"ipo":false,"att":1,"san":"Ct","stn":"vB30WorkStep_Edit","alc":"CommandKey=EDIT_WorkDocTT|CommandKey0=Edit|LayoutName=Layout1|OwnerCommandKey=WorkDocTT|TemplateName=StatsDocEditor","ndcn":"_NoDelete_x3kkm4","nocn":"_NoOpen_jqtd1e","necn":"_NoEdit_vy0mqg","nrcn":"_NoRecall_6pzmlq","lst":0,"imr":true,"ect":[],"pkv":%d,"lps":{"USER('Id')":1688,"LANGID()":0}}`, master.Id)
	reqLoad, err := http.NewRequest("POST", urlEditorLoad, strings.NewReader(payloadLoad))
	if err != nil {
		return 0, fmt.Errorf("lỗi tạo request đọc dữ liệu editor Lệnh thao tác: %w", err)
	}
	commonHeaders(reqLoad)

	respLoad, err := c.httpClient.Do(reqLoad)
	if err != nil {
		return 0, fmt.Errorf("lỗi kết nối đọc dữ liệu editor Lệnh thao tác: %w", err)
	}
	defer respLoad.Body.Close()

	bodyLoad, _ := io.ReadAll(respLoad.Body)
	if respLoad.StatusCode >= 400 {
		return 0, fmt.Errorf("bước 1 (Load Editor TT với pkv=%d) thất bại HTTP %d: %s", master.Id, respLoad.StatusCode, string(bodyLoad))
	}

	var editorResp map[string]interface{}
	if err := json.Unmarshal(bodyLoad, &editorResp); err != nil {
		return 0, fmt.Errorf("lỗi giải mã dữ liệu editor TT: %w", err)
	}

	rtvObj, ok := editorResp["rtv"].(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("phản hồi editor TT không chứa trường 'rtv' hợp lệ")
	}

	step1Tbls, ok := rtvObj["tbl"].([]interface{})
	if !ok || len(step1Tbls) == 0 {
		return 0, fmt.Errorf("không tìm thấy danh sách bảng 'tbl' trong dữ liệu editor TT")
	}

	// Khởi tạo bảng tra cứu rtvTableMap
	rtvTableMap := make(map[string]map[string]interface{})
	for _, t := range step1Tbls {
		if tm, ok := t.(map[string]interface{}); ok {
			if tblName, ok := tm["tbl"].(string); ok {
				rtvTableMap[tblName] = tm
			}
		}
	}

	branch := c.cfg.BranchCode
	if branch == "" {
		branch = "A01"
	}

	// -------------------------------------------------------------------------
	// BƯỚC 2 & 3: Xây dựng Payload bảng Ct & Ct0 chuẩn hóa từ settleStepSchemaJSON
	// -------------------------------------------------------------------------
	stepTables, rowsUpdated, err := buildStandardStepSettleTables(rtvTableMap, master, targetDocNoWP, targetRowIdCD, param, branch)
	if err != nil {
		return 0, fmt.Errorf("lỗi khởi tạo cấu trúc bảng Lệnh thao tác: %w", err)
	}

	// -------------------------------------------------------------------------
	// BƯỚC 4: Kiểm tra quy trình chứng từ usp_B20DocProcess_GetData
	// -------------------------------------------------------------------------
	docDate := master.DocDate
	if docDate == "" {
		docDate = time.Now().Format("2006-01-02T00:00:00.0")
	} else {
		docDate = fmt.Sprintf("%v", normalizeBravoDateTime(docDate))
	}
	payloadDocProcess := fmt.Sprintf(`{"cmt":"usp_B20DocProcess_GetData","prm":[{"prn":"@_RowId_DocProcess","val":""},{"prn":"@_DocProcessId","val":""},{"prn":"@_DocDate","val":"%s"},{"prn":"@_BranchCode","val":"%s"},{"prn":"@_DocCode","val":"TT"},{"prn":"@_LangId","val":0},{"prn":"@_Id","val":%d},{"dbt":13,"drt":6,"prn":"@RETURN_VALUE","val":null}],"alc":"CommandKey=EDIT_WorkDocTT|CommandKey0=Eval_DocProcess_SetValue|LayoutName=Layout1|OwnerCommandKey=EDIT_WorkDocTT|TemplateName=StatsDocEditor","ttl":-1}`, docDate, branch, master.Id)
	reqProc, errProc := http.NewRequest("POST", urlDocProcess, strings.NewReader(payloadDocProcess))
	if errProc == nil {
		commonHeaders(reqProc)
		respProc, errCall := c.httpClient.Do(reqProc)
		if errCall == nil {
			_ = respProc.Body.Close()
		}
	}

	// -------------------------------------------------------------------------
	// BƯỚC 5: Gửi Lưu điều chỉnh (vB30WorkStep_Edit Save)
	// -------------------------------------------------------------------------
	savePayload := map[string]interface{}{
		"ipo":  false,
		"att":  1,
		"san":  "Ct",
		"stn":  "vB30WorkStep_Edit",
		"alc":  "CommandKey=EDIT_WorkDocTT|CommandKey0=Edit|LayoutName=Layout1|OwnerCommandKey=WorkDocTT|TemplateName=StatsDocEditor",
		"ndcn": "_NoDelete_x3kkm4",
		"nocn": "_NoOpen_jqtd1e",
		"necn": "_NoEdit_vy0mqg",
		"nrcn": "_NoRecall_6pzmlq",
		"lst":  0,
		"imr":  true,
		"sds": map[string]interface{}{
			"tbl": stepTables,
			"rlt": []interface{}{
				map[string]interface{}{
					"rln": "FK_Ct0",
					"ptn": "Ct",
					"pcn": []string{"Stt", "Id"},
					"ctn": "Ct0",
					"ccn": []string{"Stt", "_ParentIdentityKey"},
				},
			},
		},
		"cmc": map[string]interface{}{},
		"lps": map[string]interface{}{
			"Stt":              master.Stt,
			"RowId_DocProcess": "",
			"BranchCode":       branch,
			"DocCode":          "TT",
			"DocDate":          docDate,
			"DocNo":            master.DocNo,
			"USER('Id')":       1688,
			"DocStatus":        4,
			"LANGID()":         0,
		},
		"iptc": true,
	}

	saveJSONBytes, err := json.Marshal(savePayload)
	if err != nil {
		return 0, fmt.Errorf("lỗi mã hóa dữ liệu Save Lệnh thao tác: %w", err)
	}

	reqSave, err := http.NewRequest("POST", urlSaveEdit, bytes.NewReader(saveJSONBytes))
	if err != nil {
		return 0, fmt.Errorf("lỗi tạo request Save Lệnh thao tác: %w", err)
	}
	commonHeaders(reqSave)

	respSave, err := c.httpClient.Do(reqSave)
	if err != nil {
		return 0, fmt.Errorf("lỗi kết nối Save Lệnh thao tác: %w", err)
	}
	defer respSave.Body.Close()

	if respSave.StatusCode >= 400 {
		b, _ := io.ReadAll(respSave.Body)
		return 0, fmt.Errorf("lưu Lệnh thao tác (Save %s) thất bại HTTP %d: %s", master.DocNo, respSave.StatusCode, string(b))
	}

	// -------------------------------------------------------------------------
	// BƯỚC 6: Commit & Xác nhận chốt chứng từ Lệnh thao tác
	// -------------------------------------------------------------------------
	payloadCommit := fmt.Sprintf(`{"ipo":false,"att":1,"san":"Ct","stn":"vB30WorkStep_Edit","alc":"CommandKey=EDIT_WorkDocTT|CommandKey0=Edit|LayoutName=Layout1|OwnerCommandKey=WorkDocTT|TemplateName=StatsDocEditor","ndcn":"_NoDelete_x3kkm4","nocn":"_NoOpen_jqtd1e","necn":"_NoEdit_vy0mqg","nrcn":"_NoRecall_6pzmlq","lst":0,"imr":true,"ect":[],"pkv":%d,"lps":{"USER('Id')":1688,"LANGID()":0}}`, master.Id)
	reqCommit, err := http.NewRequest("POST", urlCommit, strings.NewReader(payloadCommit))
	if err != nil {
		return rowsUpdated, fmt.Errorf("lỗi tạo request Commit Lệnh thao tác: %w", err)
	}
	commonHeaders(reqCommit)

	respCommit, err := c.httpClient.Do(reqCommit)
	if err != nil {
		return rowsUpdated, fmt.Errorf("lỗi kết nối Commit Lệnh thao tác: %w", err)
	}
	defer respCommit.Body.Close()

	if respCommit.StatusCode >= 400 {
		b, _ := io.ReadAll(respCommit.Body)
		return rowsUpdated, fmt.Errorf("commit Lệnh thao tác (%s) thất bại HTTP %d: %s", master.DocNo, respCommit.StatusCode, string(b))
	}

	return rowsUpdated, nil
}

// SettleAllWorkStepsOfProcess tìm kiếm tất cả các Master Lệnh thao tác của Lệnh công đoạn và quyết toán song song bằng Worker Pool
func (c *Client) SettleAllWorkStepsOfProcess(docNoWP string, rowIdCD string, param SettleParam, maxConcurrency int) ([]SettleStepMasterResult, error) {
	masters, err := c.FindWorkStepMastersByDocNoWP(docNoWP)
	if err != nil {
		return nil, fmt.Errorf("không thể tìm Master Lệnh thao tác: %w", err)
	}

	if len(masters) == 0 {
		return nil, nil
	}

	if maxConcurrency <= 0 {
		maxConcurrency = 4
	}
	numWorkers := maxConcurrency
	if len(masters) < numWorkers {
		numWorkers = len(masters)
	}

	jobs := make(chan WorkStepMaster, len(masters))
	results := make(chan SettleStepMasterResult, len(masters))
	var wg sync.WaitGroup

	for w := 1; w <= numWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for master := range jobs {
				start := time.Now()
				updated, settleErr := c.SettleSingleWorkStep(master, docNoWP, rowIdCD, param)
				res := SettleStepMasterResult{
					MasterId:    master.Id,
					MasterDocNo: master.DocNo,
					Stt:         master.Stt,
					RowsUpdated: updated,
					Duration:    time.Since(start),
				}
				if settleErr != nil {
					res.Status = "ERROR"
					res.Err = settleErr
				} else {
					res.Status = "SUCCESS"
				}
				results <- res
			}
		}()
	}

	for _, m := range masters {
		jobs <- m
	}
	close(jobs)

	wg.Wait()
	close(results)

	var report []SettleStepMasterResult
	for r := range results {
		report = append(report, r)
	}

	return report, nil
}

// buildStandardStepSettleTables tạo bảng Ct và Ct0 theo schema chuẩn của vB30WorkStep_Edit
func buildStandardStepSettleTables(rtvTableMap map[string]map[string]interface{}, master WorkStepMaster, targetDocNoWP string, targetRowIdCD string, param SettleParam, branchCode string) ([]map[string]interface{}, int, error) {
	var schemaTables []map[string]interface{}
	if err := json.Unmarshal(settleStepSchemaJSON, &schemaTables); err != nil {
		return nil, 0, fmt.Errorf("lỗi giải mã schema step: %w", err)
	}

	if branchCode == "" {
		branchCode = "A01"
	}

	rowsUpdated := 0
	cleanTargetDocNoWP := strings.TrimSpace(targetDocNoWP)

	for _, sTbl := range schemaTables {
		tblName, _ := sTbl["tbl"].(string)
		clns, _ := sTbl["cln"].([]interface{})
		colCount := len(clns)

		sColMap := make(map[string]int)
		sColDtpMap := make(map[string]int)
		for i, c := range clns {
			if cm, ok := c.(map[string]interface{}); ok {
				if name, ok := cm["cln"].(string); ok {
					sColMap[name] = i
					if dtp, okDtp := cm["dtp"].(float64); okDtp {
						sColDtpMap[name] = int(dtp)
					}
				}
			}
		}

		rtvTbl, hasRtv := rtvTableMap[tblName]
		var rtvRows []interface{}
		rColMap := make(map[string]int)

		if hasRtv {
			if rtvClns, ok := rtvTbl["cln"].([]interface{}); ok {
				for i, c := range rtvClns {
					if cm, ok := c.(map[string]interface{}); ok {
						if name, ok := cm["cln"].(string); ok {
							rColMap[name] = i
						}
					}
				}
			}
			if rws, ok := rtvTbl["rws"].([]interface{}); ok {
				rtvRows = rws
			}
		}

		switch tblName {
		case "Ct":
			crt := make([]interface{}, colCount)
			ori := make([]interface{}, colCount)

			if len(rtvRows) > 0 {
				if r0, ok := rtvRows[0].(map[string]interface{}); ok {
					if rCrt, ok := r0["crt"].([]interface{}); ok {
						for colName, sIdx := range sColMap {
							if rIdx, found := rColMap[colName]; found && rIdx < len(rCrt) {
								val := rCrt[rIdx]
								if sColDtpMap[colName] == 16 {
									val = normalizeBravoDateTime(val)
								}
								crt[sIdx] = val
								ori[sIdx] = val
							}
						}
					}
				}
			}

			// Gán các trường chuẩn của Ct
			if idx, ok := sColMap["Id"]; ok {
				crt[idx] = master.Id
				ori[idx] = master.Id
			}
			if idx, ok := sColMap["Stt"]; ok {
				crt[idx] = master.Stt
				ori[idx] = master.Stt
			}
			if idx, ok := sColMap["ParentId"]; ok {
				crt[idx] = -1
				ori[idx] = -1
			}
			if idx, ok := sColMap["BranchCode"]; ok {
				crt[idx] = branchCode
				ori[idx] = branchCode
			}
			if idx, ok := sColMap["DocCode"]; ok {
				crt[idx] = "TT"
				ori[idx] = "TT"
			}
			if idx, ok := sColMap["DocStatusDefault"]; ok {
				crt[idx] = 4
				ori[idx] = 4
			}
			if idx, ok := sColMap["DocStatus"]; ok {
				crt[idx] = 4
			}
			if idx, ok := sColMap["BizProcess_CheckRoleList"]; ok {
				crt[idx] = true
				ori[idx] = true
			}
			if idx, ok := sColMap["UserId"]; ok {
				crt[idx] = 1688
				ori[idx] = 1688
			}
			// Chuẩn hóa DocDate
			if idx, ok := sColMap["DocDate"]; ok && crt[idx] != nil {
				crt[idx] = normalizeBravoDateTime(crt[idx])
				ori[idx] = normalizeBravoDateTime(ori[idx])
			}

			sTbl["rws"] = []interface{}{
				map[string]interface{}{
					"rst": 16,
					"crt": crt,
					"ori": ori,
				},
			}

		case "Ct0":
			var newRows []interface{}

			for _, r := range rtvRows {
				rm, ok := r.(map[string]interface{})
				if !ok {
					continue
				}
				rCrt, ok := rm["crt"].([]interface{})
				if !ok {
					continue
				}

				crt := make([]interface{}, colCount)
				ori := make([]interface{}, colCount)

				for colName, sIdx := range sColMap {
					if rIdx, found := rColMap[colName]; found && rIdx < len(rCrt) {
						val := rCrt[rIdx]
						if sColDtpMap[colName] == 16 {
							val = normalizeBravoDateTime(val)
						}
						crt[sIdx] = val
						ori[sIdx] = val
					}
				}

				// Luôn đảm bảo khóa ngoại và thuộc tính bắt buộc của Ct0
				if idx, ok := sColMap["Stt"]; ok {
					crt[idx] = master.Stt
					ori[idx] = master.Stt
				}
				if idx, ok := sColMap["_ParentIdentityKey"]; ok {
					crt[idx] = master.Id
					ori[idx] = master.Id
				}
				if idx, ok := sColMap["ParentId"]; ok {
					crt[idx] = -1
					ori[idx] = -1
				}
				if idx, ok := sColMap["BranchCode"]; ok {
					crt[idx] = branchCode
					ori[idx] = branchCode
				}
				if idx, ok := sColMap["DocCode"]; ok {
					crt[idx] = "TT"
					ori[idx] = "TT"
				}

				// Kiểm tra xem dòng này có thuộc Lệnh công đoạn mục tiêu hay không
				matches := false
				if idx, found := rColMap["DocNoDetail_LCD"]; found && idx < len(rCrt) && rCrt[idx] != nil {
					v := strings.TrimSpace(fmt.Sprintf("%v", rCrt[idx]))
					if cleanTargetDocNoWP != "" && strings.Contains(v, cleanTargetDocNoWP) {
						matches = true
					}
				}
				if !matches && targetRowIdCD != "" {
					if idx, found := rColMap["RowId_CD"]; found && idx < len(rCrt) && rCrt[idx] != nil {
						v := strings.TrimSpace(fmt.Sprintf("%v", rCrt[idx]))
						if v == targetRowIdCD {
							matches = true
						}
					}
				}
				if !matches && cleanTargetDocNoWP != "" {
					if idx, found := rColMap["DocNoDetail"]; found && idx < len(rCrt) && rCrt[idx] != nil {
						v := strings.TrimSpace(fmt.Sprintf("%v", rCrt[idx]))
						if strings.Contains(v, cleanTargetDocNoWP) {
							matches = true
						}
					}
				}

				rowRst := 0
				if matches {
					rowRst = 16
					rowsUpdated++

					setVal := func(colName string, val interface{}) {
						if idx, found := sColMap[colName]; found && idx < len(crt) {
							crt[idx] = val
						}
					}

					setVal("AllowAdj", 1)
					setVal("IsNotDelete", 1)

					targetQty := param.QuantityAfterAdj
					setVal("QuantityAdj", 0)
					setVal("QuantityAdj9", 0)
					setVal("QuantityAfterAdj", targetQty)
					setVal("QuantityAfterAdj9", targetQty)
					setVal("QuantityProduce", targetQty)
					setVal("QuantityProduce9", targetQty)
					setVal("QuantityProduceTmp9", targetQty)
					setVal("QuantityPass", targetQty)
					setVal("QuantityPass9", targetQty)
					setVal("QuantityCD", targetQty)
					setVal("QuantityCD9", targetQty)

					if param.Note != "" {
						setVal("Remark", param.Note)
					}

					if param.IsSettleClosed == 1 {
						setVal("Closed", 1)
					}
				}

				newRows = append(newRows, map[string]interface{}{
					"rst": rowRst,
					"crt": crt,
					"ori": ori,
				})
			}

			sTbl["rws"] = newRows
		}
	}

	return schemaTables, rowsUpdated, nil
}
