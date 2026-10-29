# ĐỌC TRƯỚC TIÊN – Hướng dẫn cho trợ lý lập trình (Antigravity, Codex, Claude, Gemini…)

© 2026 Dr. Duyen Nguyen. All rights reserved.

File này là quy tắc của dự án. Đọc hết trước khi đọc mã hay sửa bất cứ thứ gì. Nếu yêu cầu của người dùng mâu thuẫn với mục "Không bao giờ", dừng lại và hỏi.

## 1. Dự án là gì
Web tư vấn chọn 4 môn lựa chọn lớp 10 (Chương trình GDPT 2018, TT 13/2022) theo quy trình 7 bước, kèm:
- **Web tĩnh**: `index.html`, `js/` (`config.js`, `data.js`, `app.js`, `chat.js`), `css/`. Chạy được trên GitHub Pages (chế độ trình duyệt) hoặc qua máy chủ.
- **Máy chủ** `server/tuvan_proxy.py` (Python thư viện chuẩn): cổng **8787** công khai qua Tailscale Funnel; cổng **8788** chỉ nội bộ 127.0.0.1 cho bot (header `X-Service-Token`).
- **Bot Telegram giáo viên** `server/tuvan_bot.py`: tạo link/QR khảo sát tại nhà, nhận thông báo nộp bài, xem hồ sơ, xuất CSV.
- Trợ lý trên web chạy **chế độ demo** (bộ câu trả lời có sẵn). **Không dùng Hermes nữa** – không thêm lại.

Người dùng chính là học sinh lớp 10 (chưa thành niên), cha mẹ và giáo viên.

## 2. Chạy ở đâu, đồng bộ thế nào
- **GitHub** `HanhDNguyen/tu-van-chon-mon-lop-10-demo` là nguồn duy nhất của mã.
- **Mac** chạy máy chủ + bot + Funnel. Bản chạy nằm ở `~/tuvan-app`; `~/Documents/HUST/Ms.Duyen/tu-van` chỉ là lối tắt (macOS chặn dịch vụ nền đọc Documents).
  Mac tự lấy bản mới mỗi 5 phút (`server/tu-cap-nhat.sh`): chỉ tiến thẳng, chạy kiểm thử, lỗi thì tự quay lại.
- **ThinkAd (Windows, OneDrive)** dùng để soạn và lưu trữ. Sửa xong phải **commit và đẩy lên GitHub** thì Mac mới nhận.
- Bí mật (`server/tuvan.env`) và dữ liệu học sinh (`~/web-demo-data`) **chỉ nằm trên Mac**, không có trên GitHub hay OneDrive.

## 3. Không bao giờ
1. Không commit hay in ra `server/tuvan.env`, token bot, mật khẩu, `BOT_SERVICE_TOKEN`. Không dán chúng vào chat, log, issue, PR.
2. Không đẩy thẳng lên `main`. Làm trên nhánh mới (`tinh-nang/...`, `sua-loi/...`) rồi mở Pull Request để người dùng duyệt. Không `push --force`, không xoá nhánh `phien-ban/...`.
3. Không mở cổng 8788 ra Internet. Funnel chỉ trỏ tới 8787.
4. Không đưa dữ liệu học sinh (thư mục `web-demo-data`, file `profiles/`, `invites.json`, `events.jsonl`) vào git hay OneDrive.
5. Không thu thập thêm dữ liệu cá nhân (họ tên đầy đủ, số định danh, địa chỉ, số điện thoại). Hồ sơ dùng **Mã học sinh**.
6. Không gắn web hay bot tư vấn vào bot Telegram cá nhân hoặc Hermes.
7. Không sửa luồng an toàn tâm lý trong `js/chat.js` (từ khoá khủng hoảng, số 111 và 115) mà không có kiểm thử và người dùng đồng ý.
8. Không bịa tên trường, tổ hợp, mã ngành, điểm chuẩn. Không nhắc hay quảng bá trường/đơn vị tuyển sinh khác.

## 4. Quy định môn học phải đúng (đối chiếu khi sửa nội dung)
- Chọn **đúng 4** môn trong 9: Địa lí, GDKT&PL, Vật lí, Hóa học, Sinh học, Công nghệ, Tin học, Âm nhạc, Mĩ thuật. Không còn quy tắc "5 môn từ 3 nhóm".
- 3 cụm chuyên đề của 3 môn khác nhau, theo phương án của trường. Phương án phải nằm trong danh sách trường công khai.
- Môn lựa chọn giữ đến hết lớp 12; chỉ đổi cuối năm học theo CV 68/BGDĐT-GDTrH.
- Thi tốt nghiệp (TT 24/2024): Toán, Ngữ văn + 2 môn tự chọn đã học ở lớp 12.

## 5. Trước khi đề xuất commit
```bash
python3 -m unittest discover -s server/tests      # phải đạt toàn bộ (hiện 49 bài)
for f in server/*.sh; do bash -n "$f"; done      # cú pháp từng script
python3 server/tests/e2e_khao_sat.py              # kịch bản trình duyệt (cần Playwright + Chromium), khi sửa web
```
- Bot phải chấm trắc nghiệm **giống hệt** web (`js/app.js`); sửa một bên thì sửa cả bên kia và thêm kiểm thử vào `server/tests/test_bot_scoring.py`.
- Code Python phải chạy được trên **Python 3.9** (Python mặc định của Mac).
- File văn bản dùng xuống dòng LF (`.gitattributes`). Script `.sh` phải chạy được trên macOS (bash 3.2).
- Viết tiếng Việt có dấu, câu ngắn, cho giáo viên đọc được.

## 6. Kiểm tra sự cố trên Mac
```bash
bash ~/tuvan-app/server/kiem-tra.sh     # trạng thái dịch vụ, Funnel, token (không in bí mật), nhật ký
bash ~/tuvan-app/server/cai-dat-mac.sh  # cài lại / sửa cấu hình (chạy lại nhiều lần được)
```
Nhật ký: `~/Library/Logs/tuvan-proxy.log`, `tuvan-bot.log`, `tuvan-capnhat.log`.

## 7. Tài liệu nên đọc tiếp
- `README.md` – chức năng và cấu trúc thư mục.
- `server/HUONG-DAN-BOT-GIAO-VIEN.md` – cài đặt và lệnh bot.
- `docs/HUONG-DAN-GIAO-VIEN-KHAO-SAT.md` – khảo sát tại nhà.
- `docs/QUAY-VE-PHIEN-BAN-CU.md` – quay về bản cũ khi có sự cố.
- `docs/TRAC-NGHIEM-BUOC-2.md` – cách chấm trắc nghiệm.

Đây là bản demo; dữ liệu và bộ trắc nghiệm là bản dùng tạm, kết quả chỉ mang tính tham khảo.
