# Cổng thông tin tư vấn học sinh – Web demo chọn môn lớp 10

© 2026 Dr. Duyen Nguyen. All rights reserved.

Bản **demo** để minh họa chức năng. Dữ liệu và bộ trắc nghiệm là bản dùng tạm, sẽ chuẩn hóa sau.

## Phiên bản
Phiên bản hiện tại: **v2.0** (20/10/2026). Mỗi phiên bản được giữ ở một nhánh `phien-ban/...` trên GitHub. Cách quay về bản cũ: `docs/QUAY-VE-PHIEN-BAN-CU.md`.

Trên GitHub Pages, web chạy ở chế độ trình duyệt: hồ sơ và danh sách trường chỉ lưu trên máy đang dùng, trợ lý chạy chế độ demo. Khu vực giáo viên dùng chung, đăng nhập và lấy tổ hợp từ link web trường cần chạy qua máy chủ (`server/`).

## Cách chạy
1. Mở thư mục `web-demo`.
2. Nhấp đúp vào **`index.html`**, trang sẽ mở bằng Chrome hoặc Edge. Không cần cài đặt gì.
   - Máy có mạng thì trang dùng phông chữ Be Vietnam Pro; không có mạng thì tự dùng phông có sẵn của máy.
3. Dữ liệu đã nhập được lưu trên trình duyệt của máy đó. Muốn chuyển sang máy khác, dùng nút **Mã hồ sơ** (sao chép mã hoặc tải file .json).

(Tùy chọn) Chạy bằng máy chủ cục bộ: mở cửa sổ lệnh trong thư mục `web-demo`, gõ `python -m http.server 8000`, rồi mở trình duyệt tại `http://localhost:8000`.

## Chức năng
| Bước | Chức năng trong demo |
|---|---|
| Trang đầu | Chọn vai trò (học sinh / phụ huynh / giáo viên) để xưng hô; bảng 9 môn bấm thử để xem tổ hợp xét tuyển nào được mở; nhập mã hồ sơ |
| 1. Dữ liệu nền | Mã học sinh (nhập tay), thông tin chung, Âm nhạc/Mĩ thuật chấm Đạt/Chưa đạt, điểm lớp 9, môn thích/không thích, điều kiện (không bắt buộc), nguyện vọng → **Hồ sơ H1** |
| 2. Trắc nghiệm | Holland 54 câu, nhân cách Eysenck 59 câu (4 kiểu khí chất), tính cách MBTI 70 câu → **Báo cáo H2**, cảnh báo khi cần giáo viên tư vấn thêm (cách chấm: [docs/TRAC-NGHIEM-BUOC-2.md](docs/TRAC-NGHIEM-BUOC-2.md)) |
| 3. Ngành nghề | 36 ngành xếp theo mức phù hợp (dùng toàn bộ dữ liệu Bước 1–2), bảng “Vì sao gợi ý ngành này?”, sơ đồ liên kết, lọc theo nhóm, đánh dấu Thích/Phân vân/Không hợp → **Danh sách H3** |
| 4. Tổ hợp tại trường | Chỉ gợi ý từ danh sách tổ hợp của trường; loại tổ hợp có môn không muốn học; xếp phù hợp nhất lên đầu; chấm 4 tiêu chí (100 điểm); thêm trường bằng link website (qua máy chủ) hoặc dán nội dung/nhập tay → **H4** |
| 5. Tư vấn GV – CMHS | **Phiếu tóm tắt H5** in được hoặc lưu PDF, có câu hỏi gợi ý tự sinh theo dữ liệu |
| 6. Chốt nguyện vọng | Danh sách kiểm tra (tự động và thủ công), xác nhận phương án → **H6**, mã hồ sơ |
| 7. Theo dõi | Mô tả 5 mức hài lòng và căng thẳng, nhập theo kỳ, cảnh báo sớm, hướng dẫn đổi môn theo CV 68, **Lưu hồ sơ** (báo mục còn thiếu nhưng vẫn lưu) → **H7** |
| Khu vực giáo viên | Nút **Giáo viên**: danh mục hồ sơ (tìm, mở, xoá), nhập kết quả Google Form (.csv/.xlsx) khớp theo Mã học sinh, cơ sở dữ liệu trường. Mở file trực tiếp: lưu trên trình duyệt máy đó. Mở qua máy chủ: cần mật khẩu, dữ liệu dùng chung. Mẫu câu hỏi: `docs/MAU-GOOGLE-FORM.md` |
| Trợ lý tư vấn | Trả lời theo bộ câu hỏi có sẵn (quy định, tổ hợp, ngành nghề, gợi ý tổ hợp…), xưng hô theo vai trò, phản hồi an toàn khi có dấu hiệu khủng hoảng (111, 115) |

Mẹo khi thử: ở mỗi bài trắc nghiệm có nút **“Điền ngẫu nhiên (để thử demo)”** để đi nhanh qua các bước.

## Cấu trúc thư mục
```
web-demo/
├─ index.html        Khung trang
├─ so-do.html        Sơ đồ triển khai (mở bằng nút nhỏ góc dưới trái, hoặc mở riêng trong tab mới)
├─ css/style.css     Giao diện
├─ js/config.js      Cấu hình trợ lý tư vấn (máy chủ AI, bot Telegram)
├─ js/data.js        Dữ liệu: môn học, tổ hợp, trắc nghiệm, ngành nghề, trường minh họa
├─ js/app.js         Logic 7 bước, chấm điểm, gợi ý, kiểm tra hợp lệ
└─ js/chat.js        Trợ lý tư vấn (demo) + chỗ gắn API
server/
├─ tuvan_proxy.py    Trạm trung gian chạy trên Mac (nối web ↔ Hermes Agent)
├─ SOUL.md           Vai trò cho profile tư vấn của Hermes
├─ start_tuvan.sh    Khởi động trạm (tự đọc khóa của profile tuvan)
├─ cai-dat-tu-chay.sh  Cài trạm thành dịch vụ tự chạy 24/7 trên Mac
├─ tuvan.env.example Mẫu cấu hình địa chỉ Tailscale Funnel
└─ HUONG-DAN-KET-NOI-HERMES.md   Hướng dẫn từng bước
```
- Sửa ngành nghề, trường, câu hỏi: chỉnh trong `js/data.js`.
- Trường minh họa A, B **không phải dữ liệu thật**. Muốn thêm trường thật, nhập ở ô “Nhập tổ hợp của trường THPT” ngay tại Bước 4 (hoặc nút “Lấy từ website / dán thông báo của trường…”) (cú pháp nhập tay: `docs/QUY-UOC-NHAP-TO-HOP.md`), hoặc thêm vào `SAMPLE_SCHOOLS`.

## Gắn bot Telegram / máy chủ AI
Web đã chừa sẵn chỗ gắn. Khi có máy chủ AI (có thể dùng chung với bot Telegram), chỉ cần điền địa chỉ vào `js/config.js`:
```js
window.CTV_CONFIG = { apiUrl: "http://localhost:8787/chat", timeoutMs: 30000 };
```
Web sẽ gửi `{ messages, role, profileSummary }` và nhận lại `{ reply }`. Nếu máy chủ lỗi, trợ lý tự quay về chế độ demo.

Để hiện nút **“Tiếp tục trò chuyện trên Telegram”** trong khung trợ lý, điền tên bot vào `telegramBot` (không cần @). Cách nối với Hermes Agent: xem `server/HUONG-DAN-KET-NOI-HERMES.md`.
