# BÀN GIAO GIAI ĐOẠN 3: BOT TELEGRAM CHO GIÁO VIÊN

© 2026 Dr. Duyen Nguyen. All rights reserved.  
Tài liệu bàn giao kỹ thuật dành cho các mô hình AI (Antigravity, Codex, Claude, Gemini...) hoặc kỹ sư phát triển tiếp quản dự án.  
Ngày hoàn thành: 29/10/2026.  
Nhánh git: `tinh-nang/bot-giao-vien`.  
Phiên bản nền tảng: v2.2 + Giai đoạn 1 (đã merge vào `main`).

---

## 1. TỔNG QUAN KẾT QUẢ GIAI ĐOẠN 3

Giai đoạn 3 đã hoàn thiện toàn bộ hệ thống **Bot Telegram dành cho giáo viên tư vấn**, kết nối độc quyền với máy chủ tư vấn qua **cổng dịch vụ nội bộ 8788** (biến `SERVICE_PORT` / `SERVICE_URL`). Bot cho phép giáo viên thao tác toàn bộ nghiệp vụ tạo link/QR khảo sát, giám sát tiến độ nộp bài, xem tóm tắt trắc nghiệm, theo dõi cảnh báo học sinh và xuất dữ liệu mà **không cần can thiệp vào giao diện web**.

### Các nguyên tắc cốt lõi đã tuân thủ:
1. **Tuyệt đối không can thiệp vào web** (giữ nguyên toàn bộ `index.html`, `js/`, `css/`).
2. **Không mở thêm bất kỳ cổng nào ra Internet**: Bot hoạt động theo cơ chế **Long Polling** (`getUpdates`) thuần túy từ máy Mac ra Telegram API.
3. **Bảo mật phân quyền nghiêm ngặt**:
   - **Chỉ phục vụ tin nhắn riêng (Private Chat)** với các tài khoản Telegram nằm trong danh sách `TEACHER_TELEGRAM_IDS`.
   - Tin nhắn từ nhóm chat hoặc từ người lạ đều bị từ chối lịch sự và **tuyệt đối không lộ dữ liệu**.
4. **Bảo vệ quyền riêng tư học sinh chưa thành niên (Nghị định 13/2023/NĐ-CP)**:
   - **Không bao giờ gửi lên Telegram**: họ tên đầy đủ, dữ liệu sức khỏe (`health`), kinh tế gia đình (`cond.econ`), nguyện vọng cá nhân tự do (`wish`, `familyWish`).
   - Chỉ gửi: Mã học sinh (code), Lớp, kết quả trắc nghiệm dạng nhãn (Holland top 3, Khí chất Eysenck, MBTI), số mục còn thiếu, và link mở hồ sơ đầy đủ trên web (Khu vực giáo viên).
5. **Cơ chế tự động thông báo nộp bài**:
   - Bot theo dõi luồng `DATA_DIR/events.jsonl` theo byte offset (lưu tại `bot_event_offset.txt`).
   - Tự động gửi tin nhắn riêng cho giáo viên đã tạo mã mời ngay khi học sinh nộp khảo sát.

---

## 2. DANH SÁCH FILE THAY ĐỔI VÀ TẠO MỚI

| Đường dẫn file | Trạng thái | Mục đích |
|---|---|---|
| `server/tuvan_bot.py` | Tạo mới | Module chính của Bot Telegram: long polling, xử lý lệnh, sinh QR, theo dõi sự kiện, bảo vệ riêng tư. |
| `server/requirements-bot.txt` | Tạo mới | Định nghĩa phụ thuộc cho bot (`segno>=1.6.0` tạo mã QR PNG). |
| `server/start_bot.sh` | Tạo mới | Script shell khởi động bot: `chmod 600 tuvan.env`, nạp biến môi trường, chạy tiến trình bot. |
| `server/HUONG-DAN-BOT-GIAO-VIEN.md` | Tạo mới | Hướng dẫn giáo viên: tạo bot @BotFather, lấy User ID, điền cấu hình và danh sách câu lệnh. |
| `server/tests/test_bot.py` | Tạo mới | Bộ 11 bài kiểm thử tự động giả lập máy chủ Telegram HTTP nội bộ. |
| `server/tuvan_proxy.py` | Sửa đổi nhỏ | Bổ sung `missingCount` vào payload sự kiện nộp bài trong `events.jsonl`. |
| `server/tuvan.env.example` | Sửa đổi | Bổ sung biến mẫu cho Bot (`TUVAN_BOT_TOKEN`, `TEACHER_TELEGRAM_IDS`, `SERVICE_URL`). |
| `docs/BAN-GIAO-GIAI-DOAN-3.md` | Tạo mới | Tài liệu bàn giao kỹ thuật này. |

---

## 3. KIẾN TRÚC VÀ CƠ CHẾ HOẠT ĐỘNG

### 3.1 Sơ đồ tương tác tổng thể

```
[Giáo viên] ◄─── HTTPS (Telegram App) ───► [Telegram Cloud API]
                                                   │
                                            (Long Polling getUpdates / timeout 50s)
                                                   ▼
                                           [tuvan_bot.py (trên máy chủ)]
                                                   │
                            (HTTP cục bộ + header X-Service-Token = BOT_SERVICE_TOKEN)
                                                   ▼
                                      [127.0.0.1:8788 (ServiceH)]
                                                   │
                                                   ▼
                                         DATA_DIR (~/web-demo-data)
                                         ├─ invites.json
                                         ├─ events.jsonl
                                         └─ profiles/*.json
```

### 3.2 Bảng lệnh Bot Telegram đã hiện thực

| Lệnh | Cú pháp | Kết nối API máy chủ | Mô tả chi tiết |
|---|---|---|---|
| `/start`, `/trogiup` | `/trogiup` | Không | Hiển thị lời chào và hướng dẫn cú pháp các lệnh. |
| `/taolink` | `/taolink <mã HS> [lớp]` | `POST /api/invites` | Tạo mã mời mới, sinh ảnh mã QR PNG bằng thư viện `segno`, gửi qua Telegram kèm link khảo sát và hạn dùng. |
| `/danhsach` | `/danhsach [lớp]` | `GET /api/invites?class=...` | Thống kê danh sách mã mời (Đã nộp lúc... / Chưa nộp / Đã thu hồi). |
| `/chuanop` | `/chuanop [lớp]` | `GET /api/invites?class=...` | Lọc nhanh danh sách học sinh chưa nộp bài kèm hạn chót. |
| `/hoso` | `/hoso <mã HS>` | `GET /api/profiles/<mã HS>` | Tóm tắt kết quả: Holland, Eysenck, MBTI, số mục thiếu, link mở web. **Đã kiểm thử khẳng định không chứa dữ liệu nhạy cảm**. |
| `/canhbao` | `/canhbao` | `GET /api/profiles` + chi tiết | Quét hồ sơ có theo dõi Bước 7 với mức hài lòng ≤ 2 hoặc căng thẳng ≥ 4. |
| `/theodoi` | `/theodoi <mã HS> <đợt> [hailong=1-5] [cangthang=1-5] [ghichu=...]` | `GET/PUT /api/profiles/<mã HS>` | Ghi nhận bản ghi theo dõi định kỳ sau buổi tư vấn vào Bước 7 của hồ sơ. |
| `/xuat` | `/xuat [lớp]` | `GET /api/profiles` + chi tiết | Tạo và gửi file CSV UTF-8 (có BOM cho Excel) tổng hợp danh sách. **Không chứa cột sức khỏe, kinh tế, tâm tư**. |
| `/thuhoi` | `/thuhoi <mã HS>` | `DELETE /api/invites/<mã HS>` | Thu hồi toàn bộ mã mời còn hiệu lực của mã học sinh đó. |

### 3.3 Thông báo tự động khi nộp bài
- Trong `tuvan_proxy.py`: Mỗi khi có học sinh bấm "Nộp cho giáo viên" qua `POST /api/submit/<token>`, máy chủ ghi một dòng vào `DATA_DIR/events.jsonl`:
  ```json
  {"type": "submit", "code": "HS001", "className": "10A1", "createdBy": "123456789", "submittedAt": "2026-10-29T20:15:00Z", "submitCount": 1, "missingCount": 2}
  ```
- Trong `tuvan_bot.py`: Hàm `check_events()` định kỳ đọc từ vị trí byte offset đã lưu. Nếu `createdBy` là Telegram ID của giáo viên (trong `TEACHER_TELEGRAM_IDS`), bot gửi ngay tin nhắn riêng:
  > *"🔔 THÔNG BÁO: Học sinh HS001 (10A1) đã nộp khảo sát tại nhà lúc 20:15 28/10. Còn thiếu: 2 mục. Thầy/Cô có thể gõ /hoso HS001 để xem tóm tắt."*

---

## 4. HƯỚNG DẪN KIỂM THỬ VÀ KẾT QUẢ

### 4.1 Lệnh chạy kiểm thử tự động toàn diện
Chạy từ thư mục gốc của repo (`github-pages/`):
```bash
python -m unittest discover -s server/tests -v
```

### 4.2 Kết quả 25/25 bài test đều PASS (100% OK)
```
Ran 25 tests in 2.536s — OK
```
- **Bộ kiểm thử Bot Telegram (`server/tests/test_bot.py`)**:
  - `test_01_unauthorized_user_rejected`: Chặn người lạ, không lộ thông tin.
  - `test_02_group_chat_rejected`: Từ chối tin nhắn trong nhóm.
  - `test_03_help_command`: Hướng dẫn lệnh /start, /trogiup.
  - `test_04_taolink_generates_qr`: Sinh link mời và ảnh QR PNG gửi qua Telegram.
  - `test_05_danhsach_and_chuanop`: Liệt kê danh sách và lọc chưa nộp.
  - `test_06_hoso_privacy_check`: **Khẳng định bảo mật tuyệt đối**: Dù hồ sơ học sinh có chứa dữ liệu bệnh tim, hen suyễn, hộ nghèo khó khăn, nguyện vọng bỏ học hay ép buộc của gia đình, tin nhắn gửi về Telegram **hoàn toàn sạch sẽ, không lộ bất kỳ từ khóa nhạy cảm nào**.
  - `test_07_theodoi_step7`: Ghi nhận theo dõi Bước 7 thành công.
  - `test_08_canhbao_step7`: Cảnh báo đúng học sinh có căng thẳng cao / hài lòng thấp.
  - `test_09_xuat_csv_privacy`: Xuất file CSV UTF-8 BOM, kiểm tra khẳng định không có cột sức khỏe hay kinh tế.
  - `test_10_thuhoi`: Thu hồi mã mời qua lệnh bot thành công.
  - `test_11_event_watcher_notification`: Tự động nhận diện sự kiện submit từ `events.jsonl` và bắn thông báo tới đúng giáo viên.
- **Bộ kiểm thử Máy chủ (`server/tests/test_invites.py`)**: Toàn bộ 14 bài test của Giai đoạn 1 vẫn PASS 100%.

---

## 5. HƯỚNG DẪN DÀNH CHO MÔ HÌNH TIẾP THEO (GIAI ĐOẠN 4)

> [!IMPORTANT]
> **CHỈ THỊ CỐT LÕI CỦA NGƯỜI DÙNG**:
> "Lưu ý chúng ta không làm web, không can thiệp vào nội dung web, chúng ta làm bot để liên kết với web."
> Vì vậy, ở Giai đoạn tiếp theo (Giai đoạn 4: QR cả lớp):
> - **KHÔNG đụng vào web** (bỏ qua phần sửa "Khu vực giáo viên trên web" ở mục 5 của `BAN-GIAO-BOT-TELEGRAM.md`).
> - **TẬP TRUNG HOÀN THIỆN TÍNH NĂNG BOT**:
>   1. Bổ sung lệnh `/taolop <lop> <tu_ma>-<den_ma>` (ví dụ `/taolop 10A1 HS001-HS045`).
>   2. Bổ sung khả năng nhận file `.csv` gửi vào bot (có cột `ma_hs,lop`, tối đa 60 dòng).
>   3. Gọi `POST /api/invites/batch` để tạo mã mời hàng loạt.
>   4. Tạo **1 file PDF in A4** (mỗi trang chứa 6-8 ô QR, mã HS, lớp, hạn dùng, dòng hướng dẫn in sẵn cho phụ huynh).
>   5. Kèm **1 file CSV** danh sách link.
>   6. Tạo thư viện/công cụ xuất PDF (đề xuất `reportlab` thuần Python hoặc HTML-to-PDF).
>   7. Viết unittest mở rộng cho tính năng tạo lớp hàng loạt và xuất PDF.
>   8. Tạo file bàn giao `docs/BAN-GIAO-GIAI-DOAN-4.md`.
