# BÀN GIAO CHO HERMES AGENT – Dự án "Cổng thông tin tư vấn học sinh"

> Tài liệu bàn giao từ phiên làm việc với Claude (11–12/10/2026) để Hermes Agent trên máy Mac thực hiện tiếp các bước còn dở.
> Đọc hết tài liệu trước khi chạy bất kỳ lệnh nào. Làm từng bước theo thứ tự, kiểm tra xong bước này mới sang bước sau, và báo kết quả cho chủ máy sau mỗi bước.
> © 2026 Dr. Duyen Nguyen. Bảo lưu mọi quyền.

---

## 1. Bối cảnh

| Mục | Nội dung |
|---|---|
| Dự án | Web demo **"Cổng thông tin tư vấn học sinh"**: hỗ trợ học sinh lớp 10 chọn 4 môn học lựa chọn theo quy trình 7 bước, có trợ lý hỏi đáp |
| Bản quyền | © 2026 **Dr. Duyen Nguyen** (ghi tên một lần, dạng "© 2026 Dr. Duyen Nguyen – Bảo lưu mọi quyền.") |
| Người vận hành | Chủ máy Mac đang chạy Hermes Agent 24/7. Bot Telegram cá nhân `@hermes_633yks4qhsgck3ur_bot` đang làm cầu nối email |
| Tính chất | **Bản demo** để trình diễn chức năng; dữ liệu và trắc nghiệm dùng tạm, sẽ chuẩn hóa sau |
| Màu chủ đạo | Đỏ đậm `#A51C24` + vàng `#F5B800` (theo tinh thần màu Đại học Bách khoa Hà Nội; không dùng logo hay tên trường) |
| Người dùng cuối | Học sinh lớp 10 (phần lớn chưa thành niên), cha mẹ, giáo viên |

## 2. Đã hoàn thành (không cần làm lại)

### 2.1 Web demo – thư mục `web-demo/`
Web tĩnh (HTML/CSS/JS thuần, không cần build), đã kiểm thử bằng trình duyệt trên máy tính và điện thoại, không có lỗi.
- `index.html`, `css/style.css`: giao diện; chân trang ghi bản quyền một lần.
- `js/data.js`: 9 môn lựa chọn (TT 13/2022), tổ hợp xét tuyển tham khảo, Holland 54 câu, tính cách 4 chiều 16 câu (không phải MBTI chính thức), Gardner 24 câu, 36 ngành, mô tả 5 mức hài lòng/căng thẳng, 2 **trường minh họa (không phải dữ liệu thật)**.
- `js/app.js`: 7 bước + Khu vực giáo viên. B1 hồ sơ (có Mã học sinh nhập tay; Âm nhạc/Mĩ thuật chấm Đạt/Chưa đạt); B2 trắc nghiệm và báo cáo; B3 ngành nghề có bảng “Vì sao gợi ý ngành này?” và sơ đồ liên kết; B4 chỉ gợi ý từ danh sách tổ hợp của trường, loại hẳn tổ hợp có môn không muốn học, chấm 4 tiêu chí/100 điểm; thêm trường bằng link website (máy chủ đọc trang) hoặc nhập tay, lưu vào CSDL chung; B5 phiếu in; B6 danh sách kiểm tra và chốt; B7 theo dõi, nút Lưu hồ sơ (cảnh báo mục còn thiếu nhưng vẫn cho lưu), cảnh báo sớm, hướng dẫn CV 68. Khu vực giáo viên (mật khẩu): danh mục hồ sơ, nhập kết quả Google Form (CSV/XLSX) khớp theo Mã học sinh (mẫu ở `docs/MAU-GOOGLE-FORM.md`). Dữ liệu lưu trong localStorage, có "Mã hồ sơ" để xuất và nhập.
- `js/chat.js`: "Trợ lý tư vấn". Không có máy chủ thì trả lời theo luật có sẵn (demo). Có `apiUrl` thì gọi máy chủ AI; lỗi thì tự quay về demo. Từ khóa khủng hoảng luôn được xử lý tại chỗ: trả về số 111 và 115.
- `js/config.js`: **đã đặt** `apiUrl: "/chat"` cho phương án A. Mở bằng `file://` thì tự chạy demo. `telegramBot: ""` **để trống có chủ ý** (xem mục 4).

### 2.2 Thành phần máy chủ – thư mục `web-demo/server/`
Thư mục này không bao giờ được trạm trung gian phục vụ ra web.
- `tuvan_proxy.py`: trạm trung gian (chỉ dùng thư viện chuẩn Python 3), nghe ở `127.0.0.1:8787`.
  - `GET /` và các file tĩnh: phục vụ web từ `WEB_DIR` (chặn thư mục `server/`, chặn truy cập vượt thư mục).
  - `GET /health` → `{"ok": true}`.
  - `POST /chat`: nhận `{"messages":[{"role","content"}], "role":"hs|ph|gv", "profileSummary":"..."}`, gửi tới Hermes theo chuẩn OpenAI `/v1/chat/completions`, trả về `{"reply":"..."}`.
  - Có sẵn: chèn system message (kênh web, xưng hô theo vai trò, cấm thao tác máy hay email), giới hạn 30 lượt/IP/10 phút, tối đa 2.000 ký tự/tin, 20 lượt hội thoại, kiểm tra Origin (cùng địa chỉ, `null`, hoặc `PUBLIC_ORIGIN`), không ghi nội dung chat vào log.
  - `/api/info`, `/api/login` (mật khẩu `TEACHER_PASSWORD`, token 12 giờ, giới hạn 10 lần/10 phút), `/api/schools` (đọc công khai; ghi/xoá cần giáo viên), `/api/scrape` (giáo viên; chỉ http/https, chặn địa chỉ nội bộ/loopback/169.254, tối đa 3 MB), `/api/profiles[/<mã>]` (giáo viên). Dữ liệu JSON lưu ở `DATA_DIR` (mặc định `~/web-demo-data`, quyền 700, không được nằm trong thư mục web).
  - Biến môi trường: `HERMES_URL` (mặc định `http://127.0.0.1:8642/p/tuvan/v1/chat/completions`), `HERMES_KEY` (không có thì /chat trả 503 và web tự dùng demo), `TEACHER_PASSWORD`, `DATA_DIR`, `HERMES_MODEL` (`hermes-agent`), `PROXY_PORT`, `ALLOWED_ORIGINS`, `WEB_DIR`, `RATE_LIMIT`.
  - Đã kiểm thử với một Hermes giả lập: luồng web → trạm → Hermes, CORS, chặn Origin lạ, giới hạn lượt hỏi, chặn file trong `server/`. **Chưa thử với Hermes thật.**
- `start_tuvan.sh`: tự đọc `API_SERVER_KEY` từ `~/.hermes/profiles/tuvan/.env`, đọc `server/tuvan.env` (nếu có), đặt `WEB_DIR` là thư mục cha, rồi chạy trạm bằng `python3` (không có thì dùng `uv run python`).
- `cai-dat-tu-chay.sh`: tạo dịch vụ launchd `vn.tuvan.proxy` (RunAtLoad, KeepAlive, nhật ký ở `~/Library/Logs/tuvan-proxy.log`), tự kiểm tra `/health`. Gỡ bằng tham số `go`.
- `tuvan.env.example`: mẫu `PUBLIC_ORIGIN`, `TEACHER_PASSWORD`, `DATA_DIR`, `RATE_LIMIT`, `PROXY_PORT`. Mật khẩu giáo viên do chủ máy tự đặt trong `server/tuvan.env`; Hermes không tự đặt, không in ra.
- `SOUL.md`: vai trò của profile `tuvan` (quy trình 7 bước, quy định môn học, nguyên tắc an toàn, cấm thao tác máy).
- `HUONG-DAN-KET-NOI-HERMES.md`: hướng dẫn 8 bước dành cho người (mục 5 dưới đây là bản dành cho Hermes).

### 2.3 Ngoài web (để biết, không cần xử lý)
- Claude Project "Web AI tư vấn hỗ trợ lựa chọn môn học lớp 10" có 7 tài liệu kiến thức (00–06) và Instruction cho chatbot.
- File PDF phiếu Holland trong `source/Trắc nghiệm/` đã được xóa phần quảng cáo của trường khác.

## 3. Các quyết định đã chốt (không tự ý thay đổi)

1. Tên web: **Cổng thông tin tư vấn học sinh**; khung chat tên **Trợ lý tư vấn**.
2. Quy định môn học: chọn **đúng 4/9 môn** (TT 13/2022); 3 cụm chuyên đề; giữ ổn định đến hết lớp 12, đổi theo CV 68; thi tốt nghiệp theo TT 24/2024.
3. **Bỏ hẳn TPB** (19/10/2026). Câu thay thế cho Bảng E câu 9 của Holland ("Sẵn sàng chấp nhận rủi ro để đạt mục tiêu"): dùng tạm. **Không làm chatbot Gemini/AI mới**, giữ trợ lý hiện tại.
4. Không quảng bá trường hay đơn vị tuyển sinh nào khác.
5. Kết nối trợ lý: **phương án (b)**, tức chat ngay trên web và Hermes trả lời.
6. Hạ tầng: **Tailscale Funnel**, và **phương án A** (trạm trên Mac phục vụ luôn web; máy khác chỉ cần mở `https://<may>.<mang>.ts.net`).
7. **Bot Telegram cá nhân KHÔNG được gắn vào web** và không phục vụ học sinh. Hội thoại trên web đi qua API vào profile `tuvan`, không hiện trong Telegram. Đây là điều mong muốn; chủ máy đã đồng ý không cần bot mới.
8. Profile `tuvan` **tách biệt hoàn toàn** khỏi profile mặc định (đang xử lý email/Telegram).

## 4. Ràng buộc an toàn BẮT BUỘC

- **Không** sửa, xóa hay đọc nội dung email, cấu hình email, token Telegram của profile mặc định. Chỉ **thêm** 2 dòng `API_SERVER_*` vào `~/.hermes/.env`.
- `API_SERVER_HOST` giữ `127.0.0.1`. **Không bao giờ** mở cổng 8642 ra ngoài; Funnel chỉ trỏ vào **8787**.
- Khóa API: tạo bằng `openssl rand -hex 32`, hai khóa khác nhau (mặc định và `tuvan`). **Không** in khóa ra chat hay Telegram, **không** ghi khóa vào file trong `web-demo/`.
- Profile `tuvan` chỉ được giữ nhóm công cụ tìm kiếm web (web/search). Tắt terminal, file, code_execution, browser, delegation, cronjob, messaging, memory, skills, image_gen, tts, debugging.
- **Hỏi chủ máy trước khi:** khởi động lại gateway (việc này có thể làm gián đoạn chính bot Telegram/email đang trò chuyện); cài phần mềm mới (Tailscale); thay đổi bất kỳ thứ gì ngoài danh sách ở mục 5.
- Các việc cần chủ máy tự làm: đăng nhập Tailscale, mở link và bấm đồng ý bật HTTPS/Funnel, chọn model/nhà cung cấp AI khi chạy `tuvan setup` (nếu cần đăng nhập hoặc nhập khóa).
- Không sửa giao diện hay logic web. Việc đó để Claude làm (mục 8).

## 5. VIỆC CẦN LÀM – theo thứ tự, mỗi bước có cách kiểm tra

### Bước 1. Đưa thư mục web lên Mac
- Đích: `~/web-demo` (đặt ngoài OneDrive, vì launchd hay bị chặn truy cập thư mục đồng bộ).
- Nguồn: thư mục `web-demo` trong `.../2-Project/HUST/Ms.Duyen/` (nếu OneDrive đồng bộ trên Mac, thường ở `~/Library/CloudStorage/OneDrive-*/2-Project/HUST/Ms.Duyen/web-demo`); không thấy thì nhờ chủ máy chép vào.
- Kiểm tra: `ls ~/web-demo/index.html ~/web-demo/server/tuvan_proxy.py` có đủ.

### Bước 2. Tạo profile `tuvan`
```bash
hermes profile create tuvan
tuvan setup            # chủ máy chọn model/nhà cung cấp (có thể dùng giống profile mặc định)
cp ~/web-demo/server/SOUL.md ~/.hermes/profiles/tuvan/SOUL.md
```
- Kiểm tra: `ls ~/.hermes/profiles/tuvan/` có `config.yaml`, `.env`, `SOUL.md`.

### Bước 3. Giới hạn công cụ
- `tuvan tools`: với nền tảng api_server, chỉ giữ web/search.
- Thêm vào `~/.hermes/profiles/tuvan/config.yaml`:
```yaml
agent:
  disabled_toolsets: [terminal, file, code_execution, browser, delegation, cronjob, messaging, memory, skills, image_gen, tts, debugging]
```
- Tên toolset có thể khác theo phiên bản: đối chiếu với danh sách thực tế và điều chỉnh. Kiểm tra ở bước 4.

### Bước 4. Bật API server (cần chủ máy đồng ý trước khi restart)
- Thêm vào `~/.hermes/.env`: `API_SERVER_ENABLED=true` và `API_SERVER_KEY=<khóa 1>`.
- Thêm vào `~/.hermes/profiles/tuvan/.env`: `API_SERVER_KEY=<khóa 2>`.
- `hermes gateway restart`
- Kiểm tra:
```bash
K=$(grep '^API_SERVER_KEY=' ~/.hermes/profiles/tuvan/.env | cut -d= -f2-)
curl -s http://127.0.0.1:8642/health
curl -s -H "Authorization: Bearer $K" http://127.0.0.1:8642/p/tuvan/v1/toolsets
curl -s http://127.0.0.1:8642/p/tuvan/v1/chat/completions -H "Authorization: Bearer $K" -H "Content-Type: application/json" \
  -d '{"model":"hermes-agent","messages":[{"role":"user","content":"Lớp 10 phải chọn mấy môn?"}]}'
```
- Đạt khi: `/v1/toolsets` **chỉ còn** nhóm web/search, và câu trả lời nói "4 môn trong 9 môn lựa chọn", đúng giọng Trợ lý tư vấn.
- Nếu cổng hoặc đường dẫn khác (8642, `/p/tuvan/`), xem tài liệu Hermes (API Server, Multi-profile gateways) rồi sửa `HERMES_URL` trong `server/tuvan.env`.

### Bước 5. Bật Tailscale Funnel (cần chủ máy đăng nhập và bấm đồng ý)
```bash
tailscale funnel --bg 8787
tailscale funnel status
```
- Ghi lại địa chỉ `https://<may>.<mang>.ts.net`. Nếu không có lệnh `tailscale`, dùng `/Applications/Tailscale.app/Contents/MacOS/Tailscale`.

### Bước 6. Cấu hình trạm
```bash
cd ~/web-demo/server && cp tuvan.env.example tuvan.env
# sửa PUBLIC_ORIGIN=https://<may>.<mang>.ts.net (đúng địa chỉ ở bước 5, không có dấu / ở cuối)
```

### Bước 7. Cài trạm tự chạy
```bash
bash ~/web-demo/server/cai-dat-tu-chay.sh
curl -s http://127.0.0.1:8787/health            # → {"ok": true}
curl -s -X POST http://127.0.0.1:8787/chat -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Tổ hợp A00 gồm những môn nào?"}],"role":"hs"}'
```
- Đạt khi: `/chat` trả về `{"reply": ...}` có nội dung do Hermes soạn.

### Bước 8. Kiểm tra từ bên ngoài
- `curl -s https://<may>.<mang>.ts.net/health` → `{"ok": true}`
- `curl -s -o /dev/null -w "%{http_code}" https://<may>.<mang>.ts.net/server/SOUL.md` → **404** (thư mục server không bị lộ).
- Nhờ chủ máy mở địa chỉ trên điện thoại (4G), mở "Hỏi trợ lý tư vấn": dòng nhỏ dưới tiêu đề phải ghi "Câu hỏi được gửi tới hệ thống AI…", và câu trả lời do Hermes soạn.

## 6. Tiêu chí hoàn thành (Expected)

- [ ] Mở `https://<may>.<mang>.ts.net` từ máy khác hoặc điện thoại: thấy web, chat được với Trợ lý tư vấn qua Hermes.
- [ ] Profile `tuvan` chỉ có công cụ tìm kiếm web; profile mặc định và bot email/Telegram vẫn hoạt động bình thường.
- [ ] Cổng 8642 chỉ nghe ở 127.0.0.1; `/server/*` trả về 404 từ bên ngoài.
- [ ] Dịch vụ `vn.tuvan.proxy` tự chạy lại sau khi khởi động lại Mac.
- [ ] Không có khóa nào xuất hiện trong `web-demo/`, chat hay Telegram.
- [ ] **Báo cáo cho chủ máy:** địa chỉ công khai; kết quả từng bước; danh sách toolset còn lại của `tuvan`; mọi chỗ phải làm khác hướng dẫn và lý do.

## 7. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| Web báo "Không kết nối được máy chủ AI (HTTP 403)" | Origin bị chặn: kiểm tra `PUBLIC_ORIGIN` trong `server/tuvan.env` có khớp chính xác địa chỉ Funnel không, rồi `bash cai-dat-tu-chay.sh` lại |
| `(HTTP 502)` / `hermes http 401` | Sai khóa: `HERMES_KEY` phải là `API_SERVER_KEY` của **profile tuvan**, không phải của profile mặc định |
| `hermes http 404` | Sai đường dẫn hoặc profile chưa được multiplex: kiểm tra `/p/tuvan/v1/...`, `gateway.multiplex_profiles` |
| Trả lời chậm, quá 90 giây | Agent tra cứu web lâu: tăng `timeoutMs` trong `js/config.js` (đây là ngoại lệ được phép sửa) hoặc đổi sang model nhanh hơn cho `tuvan` |
| launchd không chạy | Xem `tail -n 50 ~/Library/Logs/tuvan-proxy.log`; thường do thiếu `python3` (dùng `uv`) hoặc web nằm trong thư mục OneDrive |
| Trợ lý trả lời sai vai trò hoặc làm việc ngoài phạm vi | Kiểm tra `SOUL.md` đã nằm trong `~/.hermes/profiles/tuvan/` chưa, và toolset đã giới hạn chưa |

## 8. Khi nào chuyển lại cho Claude
Chủ máy sẽ quay lại Claude (cuộc trò chuyện trong Claude Project trên) khi cần:
- sửa giao diện, nội dung, logic 7 bước, bộ trắc nghiệm, dữ liệu ngành hoặc trường;
- chuẩn hóa thang đo, cập nhật văn bản quy định mới;
- tạo bot Telegram riêng cho học sinh (nếu sau này muốn);
- chuyển sang phương án B (hosting tĩnh), hoặc lỗi không xử lý được theo mục 7.
Khi chuyển lại, gửi kèm: kết quả các bước, thông báo lỗi nguyên văn, danh sách toolset của `tuvan`, địa chỉ Funnel (không gửi khóa).

## 9. Câu lệnh mở đầu gợi ý cho Hermes
> Đọc file `~/web-demo/server/HANDOFF-HERMES.md` (hoặc file đính kèm). Tóm tắt lại cho tôi bạn sẽ làm gì ở từng bước, những gì cần tôi làm hoặc đồng ý, và chờ tôi xác nhận rồi mới bắt đầu. Tuân thủ tuyệt đối mục 4 (ràng buộc an toàn). Mỗi bước xong thì báo kết quả kiểm tra trước khi sang bước tiếp.
