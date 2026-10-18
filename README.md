# 🚀 BRAVO API CONNECTOR & MES DATA ENGINE (MESSYN CODEX CLI v2.7)

Ứng dụng viết bằng **Golang** tối ưu hóa hiệu năng và bảo mật, phục vụ kết nối các đầu API Bravo Gateway, tự động quản lý OAuth2 Token, tự động gọi API định kỳ 5 phút và lưu trữ toàn bộ dữ liệu vào SQLite cục bộ (`messyn_data.db`).

## ✨ Tính năng nổi bật

1. **Đăng nhập Tương tác Ngay khi Khởi chạy**:
   - Khi chạy `messyn.exe`, ứng dụng sẽ yêu cầu người dùng tự nhập trực tiếp **Tên tài khoản** và **Mật khẩu** để xác thực với Bravo Gateway (không dùng bất kỳ tài khoản mặc định nào).
   - Toàn bộ Token và các địa chỉ API được lưu tự động vào CSDL SQLite (`messyn_data.db`).
2. **Tiến trình Nền Tự động Gọi API Mỗi 5 Phút (Auto-Poll 5m)**:
   - Tự động gọi API giám sát: `https://bravo.goldsunpackaging.vn:5051/6e60af0b2cc4e2200d8c2ec545da3627`.
   - Đính kèm chính xác 16 HTTP Headers đặc thù của Bravo (`Bearer Token`, `branchcode: A01`, `fiscalyear: 2026`, `clientinfo`, `origin`, `referer`, `sec-ch-ua...`).
   - Tự động làm mới Token nếu Token hết hạn từ xa (401 Unauthorized).
   - Báo thông báo trực tiếp lên CMD console kèm mã HTTP, độ trễ ms, và tóm tắt payload.
   - Ghi nhận lịch sử gọi vào bảng `api_logs` và nội dung payload vào bảng `synced_data` trong SQLite.
3. **Hiệu năng & Tối ưu vượt trội**:
   - Biên dịch thành 1 file nhị phân duy nhất `messyn.exe` (~15MB).
   - Tối ưu RAM (chỉ chiếm ~15MB RAM khi chạy).
   - Khởi động tức thì (< 0.05s), thuần Go Native, không GUI / không Web nặng nề.
4. **Quản trị API & Lệnh sản xuất ngay trên Terminal**:
   - Quản trị danh mục API endpoints đã đăng ký trong SQLite (xem, thêm mới, gọi test trực tiếp).
   - Quản lý tiến độ Lệnh sản xuất (Work Orders) với thanh tiến độ trực quan `[████████░░] 77%`.

---

## ⚡ Giao diện Dòng lệnh CodeX Interactive Shell

Khởi chạy bằng cách nhấp đúp hoặc chạy trong CMD / PowerShell:
```bash
.\messyn.exe
```

Quy trình khởi động:
```text
╭──────────────────────────────────────────────────────────────────────────────╮
│   🔐 ĐĂNG NHẬP HỆ THỐNG BRAVO ERP / MES - GOLDSUN PACKAGING                 │
│   Vui lòng nhập Tên tài khoản và Mật khẩu để xác thực truy cập hệ thống:     │
╰──────────────────────────────────────────────────────────────────────────────╯

Mã tài khoản / Username ❯ <nhập tài khoản của bạn>
Mật khẩu / Password ❯ <nhập mật khẩu của bạn>

[✔] ĐĂNG NHẬP THÀNH CÔNG! (257ms)
    ● Token: eyJhbGciOiJSUzI1NiIsImtpZ... (Thời hạn: 1800 giây ~ 0.5 giờ)
    ● SQLite DB: Đã lưu trữ Token và các Endpoint vào file `messyn_data.db`
    ● Tự động gọi API: Tiến trình nền định kỳ 5 phút (300s) đã được kích hoạt!
```

Mỗi 5 phút, tiến trình nền tự động báo lên CMD:
```text
[11:05:00] ⏱️  [AUTO-POLL 5m #1] Đang gửi yêu cầu tới API Bravo Gateway...
           Endpoint: https://bravo.goldsunpackaging.vn:5051/6e60af0b2cc4e2200d8c2ec545da3627
[11:05:01] ✔  [AUTO-POLL 5m #1] Phản hồi HTTP 200 (21ms) — Đã lưu vào SQLite (api_logs & synced_data)
           Dữ liệu: 0
codex [user] ❯ 
```

---

## 📋 Bảng Lệnh Điều Khiển CodeX CLI:

| Nhóm | Lệnh | Mô tả |
| :--- | :--- | :--- |
| **Lệnh sản xuất** | `/wo` hoặc `/orders` | Xem danh sách Lệnh sản xuất trực tiếp từ Bravo ERP (`vB30WorkProcess_Explorer`) |
| | `/wo sync` | Kích hoạt gọi API tải lại toàn bộ danh sách Lệnh sản xuất mới nhất từ Bravo Gateway và lưu SQLite |
| | `/wo curl` | In câu lệnh cURL mẫu chuẩn xác 100% gọi API Lệnh sản xuất Bravo ERP |
| **Chi tiết công đoạn** | `/data` hoặc `/data [pkv]` | Gọi API truy vấn chi tiết công đoạn (`vB30WorkProcessDetail_Explorer`) theo mã PKV từ lệnh SX (VD: `/data 11114889CD`) |
| | `/data curl [pkv]` | In câu lệnh cURL mẫu chi tiết công đoạn kèm toàn bộ Headers, Bearer Token và JSON payload |
| | `/clear-cache` | Xóa sạch bộ nhớ đệm dữ liệu (`synced_data`) trong SQLite — BẢO TOÀN Token & Tài khoản login |
| **Nền tảng & Xác thực** | `/mode` | Xem và chuyển đổi chế độ nền tảng kết nối: `/mode winform` (Máy trạm) hoặc `/mode web` (Trình duyệt) |
| | `/curl` | In câu lệnh cURL đăng nhập lấy token khớp chuẩn 100% theo chế độ Winform hoặc Web |
| | `/login` | Đăng nhập tương tác (nhập User/Pass) hoặc cập nhật tài khoản |
| | `/token` | Hiển thị chi tiết Bearer Token, thời hạn còn lại và chuỗi mã |
| | `/status` | Kiểm tra tình trạng kết nối, CSDL SQLite, hạn Token và Auto-Poll |
| **Auto-Poll 5m** | `/poll now` | Gọi API định kỳ ngay lập tức để kiểm tra phản hồi không cần chờ 5 phút |
| | `/poll status` | Xem trạng thái tiến trình nền: chu kỳ, lần gọi cuối, đếm ngược lần gọi tiếp theo |
| | `/poll curl` | In câu lệnh cURL chuẩn xác 100% kèm 16 Headers và Token hiện tại |
| | `/poll interval <s>` | Thay đổi chu kỳ gọi (ví dụ: `/poll interval 300` cho 5 phút, `/poll interval 60` để test nhanh) |
| **Quản trị API** | `/api` hoặc `/api list` | Xem danh mục các địa chỉ API endpoints đã lưu trong CSDL SQLite |
| | `/api test <id>` | Gọi thử nghiệm endpoint đã đăng ký (kèm Bearer Token và in JSON) |
| | `/api add` | Đăng ký một địa chỉ API chức năng mới vào CSDL SQLite |
| **Cấu hình & Test** | `/config` | Xem toàn bộ cấu hình hệ thống hiện tại trong `config.json` |
| | `/set <key> <val>` | Cập nhật cấu hình (`/set mode winform`, `/set poll ...`, `/set pkv ...`) |
| | `/logs [n]` | Xem lịch sử n lần gọi API gần nhất đã lưu trong bảng `api_logs` SQLite |
| | `/db` | Xem dữ liệu đồng bộ đã lưu trong bảng `synced_data` SQLite |
| | `/clear` | Xóa sạch màn hình console |
| | `/exit` | Dừng tiến trình nền và đóng phiên làm việc |

---

## 🗄️ Cấu trúc CSDL SQLite (`messyn_data.db`)

1. **`auth_tokens`**: Lưu trữ lịch sử các phiên cấp OAuth2 Bearer Token và thời điểm hết hạn.
2. **`api_logs`**: Nhật ký toàn bộ các lượt gọi API (HTTP Status Code, Endpoint, tóm tắt JSON, lỗi).
3. **`synced_data`**: Lưu trữ toàn bộ payload dữ liệu JSON/kết quả từ API định kỳ (`auto_poll_5m`).
4. **`api_endpoints`**: Bảng lưu trữ tất cả các địa chỉ API Gateway đã đăng ký.
5. **`work_orders`**: Bảng quản lý Lệnh sản xuất MES (mã lệnh, sản phẩm, kế hoạch, hoàn thành, trạng thái).

---

## 🖥️ Ứng dụng Desktop Native (.EXE) — Độc lập, Không cần Web

Hệ thống đã được đóng gói thành một file nhị phân **Windows Desktop Native duy nhất**:

* **File ứng dụng**: [`MESSYN-Desktop.exe`](file:///c:/Users/tuanhoang/Desktop/MESSYN/MESSYN-Desktop.exe) (~10 MB)
* **Cách sử dụng**:
  - Chỉ cần **nhấp đúp trực tiếp vào `MESSYN-Desktop.exe`**.
  - Ứng dụng sẽ mở cửa sổ Desktop độc lập ngay lập tức:
    - **Không có cửa sổ đen CMD console**.
    - **Không cần mở trình duyệt web (không tab, không thanh URL)**.
    - Toàn bộ giao diện Herdr bo vuông và dữ liệu SQLite được đóng gói hoàn toàn bên trong file `.exe`.
* **Lệnh build lại phần mềm khi sửa code**:
  - Nhấp đúp vào [`build-desktop.bat`](file:///c:/Users/tuanhoang/Desktop/MESSYN/build-desktop.bat) hoặc chạy:
  ```bash
  go build -ldflags "-H windowsgui -s -w" -o MESSYN-Desktop.exe ./cmd/gui
  ```


