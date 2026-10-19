package api

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

//go:embed settle_schema.json
var settleSchemaJSON []byte

// SettleParam chứa các tham số điều chỉnh số lượng quyết toán
type SettleParam struct {
	QuantityAdj      float64 `json:"quantity_adj"`        // SL điều chỉnh (VD: -170)
	QuantityAfterAdj float64 `json:"quantity_after_adj"`  // SL sau điều chỉnh (VD: 0)
	QuantityProduce  float64 `json:"quantity_produce"`    // SL sản xuất / cần đạt (VD: 0)
	QuantityPass     float64 `json:"quantity_pass"`       // SL đạt (bù hao)
	IsSettleClosed   int     `json:"is_settle_closed"`    // Cờ đánh dấu dòng chi tiết ERP đã đóng quyết toán (Closed = 1)
	Note             string  `json:"note"`                // Ghi chú quyết toán vào cột Remark
}

// SettleResult chứa thông tin phản hồi sau khi hoàn tất chuỗi quyết toán
type SettleResult struct {
	MasterDocNo string        `json:"master_doc_no"`
	RowIdCD     string        `json:"row_id_cd"`
	Duration    time.Duration `json:"duration"`
	Status      string        `json:"status"`
}

// SettleWorkProcess thực hiện quy trình quyết toán lệnh công đoạn qua chuỗi API Bravo ERP Gateway
// Các URL động được nạp trực tiếp từ bảng `settle_endpoints` trong SQLite để hỗ trợ gọi song song tối ưu cao.
func (c *Client) SettleWorkProcess(masterStt string, masterDocNo string, rowIdCD string, pkvId int, param SettleParam) error {
	token, err := c.GetValidToken()
	if err != nil {
		return fmt.Errorf("không thể lấy Token xác thực: %w", err)
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

	// Lấy các URL động từ SQLite Cache (Fallback mặc định)
	urlEditorLoad := "https://bravo.goldsunpackaging.vn:5051/6642f8863ff4d6c5d73112f0e3ef5491"
	urlSaveEdit := "https://bravo.goldsunpackaging.vn:5051/ce49c21a2c25c83cbcb115432b1a9685"
	urlCalcNorm := "https://bravo.goldsunpackaging.vn:5051/5898ea70fecc610b57010cad18694bb1"
	urlCommit := "https://bravo.goldsunpackaging.vn:5051/6642f8863ff4d6c5d73112f0e3ef5491"

	if c.database != nil {
		urlEditorLoad = c.database.GetSettleEndpoint("editor_load", urlEditorLoad)
		urlSaveEdit = c.database.GetSettleEndpoint("save_edit", urlSaveEdit)
		urlCalcNorm = c.database.GetSettleEndpoint("calc_norm", urlCalcNorm)
		urlCommit = c.database.GetSettleEndpoint("commit_confirm", urlCommit)
	}

	// -------------------------------------------------------------------------
	// BƯỚC 1: Tải dữ liệu ban đầu của Editor từ Bravo (lấy timestamp & version mới nhất)
	// -------------------------------------------------------------------------
	payloadLoad := fmt.Sprintf(`{"ipo":false,"att":1,"san":"Ct","stn":"vB30WorkProcess_Edit","alc":"CommandKey=EDIT_WorkDocCD|CommandKey0=Edit|LayoutName=Layout1|OwnerCommandKey=WorkDocCD|TemplateName=StatsDocEditor","ndcn":"_NoDelete_byus1l","nocn":"_NoOpen_k2hmq8","necn":"_NoEdit_1q4ufk","nrcn":"_NoRecall_sqli9n","lst":0,"imr":true,"ect":[],"pkv":%d,"lps":{"1":1,"USER('Id')":1688,"LANGID()":0,"IIF(ROWSTATE()='Added',1,0)":0}}`, pkvId)
	reqLoad, err := http.NewRequest("POST", urlEditorLoad, strings.NewReader(payloadLoad))
	if err != nil {
		return fmt.Errorf("lỗi khởi tạo request đọc dữ liệu editor: %w", err)
	}
	commonHeaders(reqLoad)
	respLoad, err := c.httpClient.Do(reqLoad)
	if err != nil {
		return fmt.Errorf("lỗi kết nối đọc dữ liệu editor: %w", err)
	}
	defer respLoad.Body.Close()
	bodyLoad, _ := io.ReadAll(respLoad.Body)
	if respLoad.StatusCode >= 400 {
		return fmt.Errorf("bước 1 (Load Editor với pkv=%d) thất bại HTTP %d: %s", pkvId, respLoad.StatusCode, string(bodyLoad))
	}

	var editorResp map[string]interface{}
	if err := json.Unmarshal(bodyLoad, &editorResp); err != nil {
		return fmt.Errorf("lỗi giải mã dữ liệu editor: %w", err)
	}

	// -------------------------------------------------------------------------
	// BƯỚC 2: Xây dựng Payload lưu điều chỉnh số lượng (vB30WorkProcess_Edit)
	// Dựa trên lược đồ chuẩn 5 bảng (Ct, Ct0, Child, Product, Ct0NVL) của Bravo ERP 10.9.5.1
	// và đồng bộ 100% dữ liệu thực tế của lệnh vừa đọc được ở Bước 1
	// -------------------------------------------------------------------------
	rtvObj, ok := editorResp["rtv"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("phản hồi editor không chứa trường 'rtv' hợp lệ")
	}

	step1Tbls, ok := rtvObj["tbl"].([]interface{})
	if !ok || len(step1Tbls) == 0 {
		return fmt.Errorf("không tìm thấy danh sách bảng 'tbl' trong dữ liệu editor của lệnh")
	}

	// Đưa các bảng rtv từ Bước 1 vào map theo tên để dễ tra cứu
	rtvTableMap := make(map[string]map[string]interface{})
	for _, t := range step1Tbls {
		if tm, ok := t.(map[string]interface{}); ok {
			if tName, ok := tm["tbl"].(string); ok {
				rtvTableMap[tName] = tm
			}
		}
	}

	// Trích xuất DocDate gốc từ Ct
	masterDocDate := "2026-09-30T00:00:00.0"
	if ctTbl, exists := rtvTableMap["Ct"]; exists {
		if rws, ok := ctTbl["rws"].([]interface{}); ok && len(rws) > 0 {
			if r0, ok := rws[0].(map[string]interface{}); ok {
				if crt, ok := r0["crt"].([]interface{}); ok {
					if clns, ok := ctTbl["cln"].([]interface{}); ok {
						for ci, c := range clns {
							if cm, ok := c.(map[string]interface{}); ok {
								if cm["cln"] == "DocDate" && ci < len(crt) && crt[ci] != nil {
									masterDocDate = fmt.Sprintf("%v", normalizeBravoDateTime(crt[ci]))
									break
								}
							}
						}
					}
				}
			}
		}
	}

	// Khởi tạo 5 bảng chuẩn theo schema Bravo ERP
	tables := buildStandardSettleTables(rtvTableMap, masterStt, rowIdCD, param)

	// Quan hệ rlt chuẩn giữa các bảng trong vB30WorkProcess_Edit
	rltStandard := []map[string]interface{}{
		{
			"rln": "FK_Ct0",
			"ptn": "Ct",
			"pcn": []string{"Stt", "Id"},
			"ctn": "Ct0",
			"ccn": []string{"Stt", "_ParentIdentityKey"},
		},
		{
			"rln": "FK_Child",
			"ptn": "Ct0",
			"pcn": []string{"RowId", "Id"},
			"ctn": "Child",
			"ccn": []string{"RowId_SourceDoc", "_ParentIdentityKey"},
		},
		{
			"rln": "FK_Product",
			"ptn": "Ct0",
			"pcn": []string{"RowId", "Id"},
			"ctn": "Product",
			"ccn": []string{"RowId", "_ParentIdentityKey"},
		},
		{
			"rln": "FK_Ct0NVL",
			"ptn": "Ct",
			"pcn": []string{"Stt", "Id"},
			"ctn": "Ct0NVL",
			"ccn": []string{"Stt", "_ParentIdentityKey"},
		},
	}

	// Xây dựng targetObj gửi lên Bước 2: 100% cấu trúc chuẩn Bravo ERP
	targetObj := map[string]interface{}{
		"ipo":  false,
		"att":  1,
		"san":  "Ct",
		"stn":  "vB30WorkProcess_Edit",
		"alc":  "CommandKey=EDIT_WorkDocCD|CommandKey0=Edit|LayoutName=Layout1|OwnerCommandKey=WorkDocCD|TemplateName=StatsDocEditor",
		"ndcn": "_NoDelete_byus1l",
		"nocn": "_NoOpen_k2hmq8",
		"necn": "_NoEdit_1q4ufk",
		"nrcn": "_NoRecall_sqli9n",
		"lst":  0,
		"imr":  true,
		"sds": map[string]interface{}{
			"tbl": tables,
			"rlt": rltStandard,
		},
		"cmc": map[string]interface{}{},
		"lps": map[string]interface{}{
			"1":                           1,
			"Stt":                         masterStt,
			"RowId_DocProcess":            "",
			"BranchCode":                  c.cfg.BranchCode,
			"DocCode":                     "CD",
			"DocDate":                     masterDocDate,
			"DocNo":                       masterDocNo,
			"DocStatus":                   4,
			"USER('Id')":                  1688,
			"LANGID()":                    0,
			"IIF(ROWSTATE()='Added',1,0)": 0,
			"RowIdList":                   rowIdCD,
		},
		"iptc": true,
	}

	finalStep1Bytes, err := json.Marshal(targetObj)
	if err != nil {
		return fmt.Errorf("lỗi mã hóa dữ liệu Bước 2: %w", err)
	}

	req1, err := http.NewRequest("POST", urlSaveEdit, bytes.NewReader(finalStep1Bytes))
	if err != nil {
		return fmt.Errorf("lỗi tạo request Bước 2 (Save): %w", err)
	}
	commonHeaders(req1)
	resp1, err := c.httpClient.Do(req1)
	if err != nil {
		return fmt.Errorf("lỗi kết nối Bước 2 (Save): %w", err)
	}
	defer resp1.Body.Close()
	if resp1.StatusCode >= 400 {
		b, _ := io.ReadAll(resp1.Body)
		return fmt.Errorf("bước 2 (Save dữ liệu điều chỉnh) thất bại HTTP %d: %s", resp1.StatusCode, string(b))
	}

	// -------------------------------------------------------------------------
	// BƯỚC 3: Tính toán lại định mức chi tiết công đoạn (usp_B30WorkProcessDetailTT_Cal_Norm)
	// -------------------------------------------------------------------------
	payloadCalcNorm := fmt.Sprintf(`{"cmt":"usp_B30WorkProcessDetailTT_Cal_Norm","prm":[{"prn":"@_Stt","val":"%s"},{"prn":"@_BranchCode","val":"A01"},{"prn":"@_DocStatus","val":4},{"prn":"@_IsCheckSample","val":null},{"prn":"@_RowIdList","val":"%s"},{"dbt":13,"drt":6,"prn":"@RETURN_VALUE","val":null}],"alc":"CommandKey=EDIT_WorkDocCD|CommandKey0=Eval_B30WorkProcessDetailTT_SaveData|LayoutName=Layout1|OwnerCommandKey=EDIT_WorkDocCD|TemplateName=StatsDocEditor","ttl":-1}`, masterStt, rowIdCD)
	reqNorm, err := http.NewRequest("POST", urlCalcNorm, strings.NewReader(payloadCalcNorm))
	if err != nil {
		return fmt.Errorf("lỗi tạo request tính định mức (Calc Norm): %w", err)
	}
	commonHeaders(reqNorm)
	respNorm, err := c.httpClient.Do(reqNorm)
	if err == nil {
		defer respNorm.Body.Close()
	}

	// -------------------------------------------------------------------------
	// BƯỚC 4: Gọi API Commit & Chốt đóng quyết toán (vB30WorkProcess_Edit)
	// -------------------------------------------------------------------------
	payloadStep2 := fmt.Sprintf(`{"ipo":false,"att":1,"san":"Ct","stn":"vB30WorkProcess_Edit","alc":"CommandKey=EDIT_WorkDocCD|CommandKey0=Edit|LayoutName=Layout1|OwnerCommandKey=WorkDocCD|TemplateName=StatsDocEditor","ndcn":"_NoDelete_byus1l","nocn":"_NoOpen_k2hmq8","necn":"_NoEdit_1q4ufk","nrcn":"_NoRecall_sqli9n","lst":0,"imr":true,"ect":[],"pkv":%d,"lps":{"1":1,"USER('Id')":1688,"LANGID()":0,"IIF(ROWSTATE()='Added',1,0)":0}}`, pkvId)
	req2, err := http.NewRequest("POST", urlCommit, strings.NewReader(payloadStep2))
	if err != nil {
		return fmt.Errorf("lỗi tạo request Commit: %w", err)
	}
	commonHeaders(req2)
	resp2, err := c.httpClient.Do(req2)
	if err != nil {
		return fmt.Errorf("lỗi kết nối Commit: %w", err)
	}
	defer resp2.Body.Close()
	if resp2.StatusCode >= 400 {
		b, _ := io.ReadAll(resp2.Body)
		return fmt.Errorf("commit thất bại HTTP %d: %s", resp2.StatusCode, string(b))
	}

	return nil
}

// updateDetailRowByRowId tìm chính xác dòng trong bảng chi tiết khớp với rowId và cập nhật các cột chỉ định
func updateDetailRowByRowId(table map[string]interface{}, idColName, targetRowId string, colUpdates map[string]interface{}, passVal float64) {
	clns, ok1 := table["cln"].([]interface{})
	rws, ok2 := table["rws"].([]interface{})
	if !ok1 || !ok2 || len(rws) == 0 {
		return
	}

	colMap := make(map[string]int)
	for i, c := range clns {
		if cm, ok := c.(map[string]interface{}); ok {
			if name, ok := cm["cln"].(string); ok {
				colMap[name] = i
			}
		}
	}

	idColIdx, hasIdCol := colMap[idColName]
	if !hasIdCol {
		return
	}

	for _, r := range rws {
		rowMap, ok := r.(map[string]interface{})
		if !ok {
			continue
		}
		crt, okCrt := rowMap["crt"].([]interface{})
		ori, okOri := rowMap["ori"].([]interface{})
		if !okCrt || idColIdx >= len(crt) {
			continue
		}

		currentRowId := strings.TrimSpace(fmt.Sprintf("%v", crt[idColIdx]))
		if currentRowId == targetRowId {
			// Đánh dấu dòng này được sửa: rst = 16 (Modified)
			rowMap["rst"] = 16

			// Cập nhật từng cột theo colUpdates
			for colName, val := range colUpdates {
				if cIdx, found := colMap[colName]; found {
					if cIdx < len(crt) {
						crt[cIdx] = val
					}
					if okOri && cIdx < len(ori) {
						// Nếu là cột điều chỉnh SL hoặc Remark, giữ ori ban đầu hoặc cập nhật phù hợp
						if colName == "Closed" || colName == "IsStop" {
							ori[cIdx] = 0
						}
					}
				}
			}

			// Nếu có cập nhật QuantityPass (bù hao/đạt) và passVal > 0
			if passVal > 0 {
				if pIdx, found := colMap["QuantityPass"]; found && pIdx < len(crt) {
					crt[pIdx] = passVal
				}
			}
		}
	}
}

// syncTableRow đồng bộ giá trị các cột của bảng target theo editor (ngoại trừ các cột trong exceptCols)
func syncTableRow(targetTable, editorTable map[string]interface{}, exceptCols []string) {
	tClns, ok1 := targetTable["cln"].([]interface{})
	tRws, ok2 := targetTable["rws"].([]interface{})
	eClns, ok3 := editorTable["cln"].([]interface{})
	eRws, ok4 := editorTable["rws"].([]interface{})

	if !ok1 || !ok2 || !ok3 || !ok4 || len(tRws) == 0 || len(eRws) == 0 {
		return
	}

	tRow, okT := tRws[0].(map[string]interface{})
	eRow, okE := eRws[0].(map[string]interface{})
	if !okT || !okE {
		return
	}

	tCrt, okTCrt := tRow["crt"].([]interface{})
	tOri, okTOri := tRow["ori"].([]interface{})
	eCrt, okECrt := eRow["crt"].([]interface{})
	if !okTCrt || !okECrt {
		return
	}

	// Tạo map tên cột editor -> index
	eMap := make(map[string]int)
	for i, c := range eClns {
		if cm, ok := c.(map[string]interface{}); ok {
			if name, ok := cm["cln"].(string); ok {
				eMap[name] = i
			}
		}
	}

	isExcept := func(name string) bool {
		for _, exc := range exceptCols {
			if exc == name {
				return true
			}
		}
		return false
	}

	for i, c := range tClns {
		if cm, ok := c.(map[string]interface{}); ok {
			if name, ok := cm["cln"].(string); ok {
				if isExcept(name) {
					continue
				}
				if eIdx, exists := eMap[name]; exists && eIdx < len(eCrt) {
					val := eCrt[eIdx]
					if i < len(tCrt) {
						tCrt[i] = val
					}
					if okTOri && i < len(tOri) {
						tOri[i] = val
					}
				}
			}
		}
	}
}

// forceTableColumnValue ép buộc giá trị cụ thể cho một cột trong cả crt và ori
func forceTableColumnValue(table map[string]interface{}, colName string, forcedValue interface{}) {
	clns, ok1 := table["cln"].([]interface{})
	rws, ok2 := table["rws"].([]interface{})
	if !ok1 || !ok2 || len(rws) == 0 {
		return
	}

	targetColIdx := -1
	for i, c := range clns {
		if cm, ok := c.(map[string]interface{}); ok {
			if name, ok := cm["cln"].(string); ok && name == colName {
				targetColIdx = i
				break
			}
		}
	}

	if targetColIdx == -1 {
		return
	}

	for _, r := range rws {
		if rowMap, ok := r.(map[string]interface{}); ok {
			if crt, ok := rowMap["crt"].([]interface{}); ok && targetColIdx < len(crt) {
				crt[targetColIdx] = forcedValue
			}
			if ori, ok := rowMap["ori"].([]interface{}); ok && targetColIdx < len(ori) {
				ori[targetColIdx] = forcedValue
			}
		}
	}
}

// buildStandardSettleTables tạo 5 bảng chuẩn theo schema Bravo ERP 10.9.5.1 và ánh xạ dữ liệu động từ Bước 1
func buildStandardSettleTables(rtvTableMap map[string]map[string]interface{}, masterStt string, targetRowId string, param SettleParam) []interface{} {
	var schemaTables []map[string]interface{}
	if err := json.Unmarshal(settleSchemaJSON, &schemaTables); err != nil {
		return nil
	}

	resultTables := make([]interface{}, 0, len(schemaTables))

	for _, sTbl := range schemaTables {
		tblName, _ := sTbl["tbl"].(string)
		clns, _ := sTbl["cln"].([]interface{})
		colCount := len(clns)

		// Xây dựng danh sách cột của schema -> index và dtp
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
		var rtvClns []interface{}
		var rtvRows []interface{}
		rColMap := make(map[string]int)

		if hasRtv {
			rtvClns, _ = rtvTbl["cln"].([]interface{})
			rtvRows, _ = rtvTbl["rws"].([]interface{})
			for i, c := range rtvClns {
				if cm, ok := c.(map[string]interface{}); ok {
					if name, ok := cm["cln"].(string); ok {
						rColMap[name] = i
					}
				}
			}
		}

		switch tblName {
		case "Ct":
			// Master table: 1 dòng rws với rst = 16
			crt := make([]interface{}, colCount)
			ori := make([]interface{}, colCount)

			if len(rtvRows) > 0 {
				r0, _ := rtvRows[0].(map[string]interface{})
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

			// Override cho bảng Ct
			if idx, ok := sColMap["Stt"]; ok && masterStt != "" {
				crt[idx] = masterStt
				ori[idx] = masterStt
			}
			if idx, ok := sColMap["RowIdList"]; ok {
				crt[idx] = targetRowId
				ori[idx] = nil
			}
			if idx, ok := sColMap["IsCancelled"]; ok {
				crt[idx] = 0
				ori[idx] = 0
			}
			if idx, ok := sColMap["DocDate"]; ok && crt[idx] != nil {
				crt[idx] = normalizeBravoDateTime(crt[idx])
				ori[idx] = normalizeBravoDateTime(ori[idx])
			}
			if idx, ok := sColMap["DocDate2"]; ok && crt[idx] != nil {
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
			// Chi tiết công đoạn: chỉ chứa đúng dòng mục tiêu targetRowId với rst = 16
			crt := make([]interface{}, colCount)
			ori := make([]interface{}, colCount)

			// Tìm dòng trong rtvRows khớp RowId
			for _, r := range rtvRows {
				rm, _ := r.(map[string]interface{})
				rCrt, ok := rm["crt"].([]interface{})
				if !ok {
					continue
				}
				rowIdIdx, found := rColMap["RowId"]
				if !found || rowIdIdx >= len(rCrt) {
					continue
				}
				if fmt.Sprintf("%v", rCrt[rowIdIdx]) == targetRowId {
					for colName, sIdx := range sColMap {
						if rIdx, f := rColMap[colName]; f && rIdx < len(rCrt) {
							val := rCrt[rIdx]
							if sColDtpMap[colName] == 16 {
								val = normalizeBravoDateTime(val)
							}
							crt[sIdx] = val
							ori[sIdx] = val
						}
					}
					break
				}
			}

			// Override các cột quyết toán theo yêu cầu nghiệp vụ
			if idx, ok := sColMap["IsNotDelete"]; ok {
				crt[idx] = 1
				ori[idx] = 0
			}
			if idx, ok := sColMap["QuantityAdj"]; ok {
				crt[idx] = param.QuantityAdj
			}
			if idx, ok := sColMap["QuantityAfterAdj"]; ok {
				crt[idx] = param.QuantityAfterAdj
			}
			if idx, ok := sColMap["QuantityProduce"]; ok {
				crt[idx] = param.QuantityProduce
			}
			if idx, ok := sColMap["QuantityPass"]; ok && param.QuantityPass > 0 {
				crt[idx] = param.QuantityPass
			}
			if idx, ok := sColMap["Closed"]; ok {
				crt[idx] = 0
				ori[idx] = 0
			}
			if idx, ok := sColMap["IsStop"]; ok {
				crt[idx] = 0
				ori[idx] = 0
			}
			if idx, ok := sColMap["Remark"]; ok {
				crt[idx] = param.Note
			}

			sTbl["rws"] = []interface{}{
				map[string]interface{}{
					"rst": 16,
					"crt": crt,
					"ori": ori,
				},
			}

		case "Child":
			// Chi tiết đơn hàng/nguồn liên kết với targetRowId
			crt := make([]interface{}, colCount)
			ori := make([]interface{}, colCount)

			for _, r := range rtvRows {
				rm, _ := r.(map[string]interface{})
				rCrt, ok := rm["crt"].([]interface{})
				if !ok {
					continue
				}
				idIdx, found := rColMap["RowId_SourceDoc"]
				if !found || idIdx >= len(rCrt) {
					continue
				}
				if fmt.Sprintf("%v", rCrt[idIdx]) == targetRowId {
					for colName, sIdx := range sColMap {
						if rIdx, f := rColMap[colName]; f && rIdx < len(rCrt) {
							val := rCrt[rIdx]
							if sColDtpMap[colName] == 16 {
								val = normalizeBravoDateTime(val)
							}
							crt[sIdx] = val
							ori[sIdx] = val
						}
					}
					break
				}
			}

			// Override các cột Child
			if idx, ok := sColMap["QuantityAfterAdj"]; ok {
				crt[idx] = param.QuantityAfterAdj
			}
			if idx, ok := sColMap["QuantityProduce"]; ok {
				crt[idx] = param.QuantityProduce
			}
			if idx, ok := sColMap["Quantity"]; ok {
				crt[idx] = param.QuantityProduce
			}
			if idx, ok := sColMap["QuantityPass"]; ok && param.QuantityPass > 0 {
				crt[idx] = param.QuantityPass
			}
			if idx, ok := sColMap["Remark"]; ok {
				crt[idx] = param.Note
			}

			sTbl["rws"] = []interface{}{
				map[string]interface{}{
					"rst": 16,
					"crt": crt,
					"ori": ori,
				},
			}

		case "Product":
			// Bravo ERP không gửi rws trong save_edit cho Product
			sTbl["rws"] = []interface{}{}

		case "Ct0NVL":
			// Bravo ERP không gửi rws trong save_edit cho Ct0NVL
			sTbl["rws"] = []interface{}{}
		}

		resultTables = append(resultTables, sTbl)
	}

	return resultTables
}

// normalizeBravoDateTime chuẩn hóa các trường thời gian sang định dạng chuẩn Bravo ERP (ISO 8601 kèm .0)
func normalizeBravoDateTime(val interface{}) interface{} {
	if val == nil {
		return nil
	}
	s := strings.TrimSpace(fmt.Sprintf("%v", val))
	if s == "" || s == "<nil>" {
		return nil
	}
	// Nếu có dạng yyyy-MM-ddTHH:mm:ss (độ dài 19) -> thêm .0
	if len(s) == 19 && strings.Contains(s, "T") && !strings.Contains(s, ".") {
		return s + ".0"
	}
	// Nếu có dạng yyyy-MM-dd (độ dài 10) -> thêm T00:00:00.0
	if len(s) == 10 && strings.Count(s, "-") == 2 {
		return s + "T00:00:00.0"
	}
	return s
}

