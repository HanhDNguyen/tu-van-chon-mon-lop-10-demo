# BÀN GIAO GIAI ĐOẠN 5: VẬN HÀNH 24/7, SAO LƯU VÀ TÀI LIỆU HƯỚNG DẪN

© 2026 Dr. Duyen Nguyen. All rights reserved.  
Tài liệu bàn giao kỹ thuật dành cho các mô hình AI (Antigravity, Codex, Claude, Gemini...) hoặc kỹ sư phát triển tiếp quản dự án.  
Ngày hoàn thành: 29/10/2026.  
Nhánh git: `tinh-nang/van-hanh`.  
Phiên bản nền tảng: **v2.3** (đã hoàn thiện toàn bộ Giai đoạn 1 $\rightarrow$ 5).

---

## 1. TỔNG QUAN KẾT QUẢ GIAI ĐOẠN 5

Giai đoạn 5 là giai đoạn hoàn thiện cuối cùng của chuỗi nâng cấp **Bot Telegram cho giáo viên + Khảo sát tại nhà qua link/QR**:
1. **Dịch vụ tự chạy 24/7 trên macOS (launchd)**:
   - Mở rộng script `server/cai-dat-tu-chay.sh` để quản lý cả 2 dịch vụ độc lập:
     - `vn.tuvan.proxy`: Máy chủ tư vấn (cổng công khai 8787 và cổng dịch vụ nội bộ 8788).
     - `vn.tuvan.bot`: Bot Telegram giáo viên (Long polling, không mở cổng ngoài).
   - Tự động nạp khi đăng nhập máy tính, tự động chạy lại nếu bị lỗi dừng đột ngột (`KeepAlive: true`, `ThrottleInterval: 15`).
   - Ghi nhật ký vào `~/Library/Logs/tuvan-bot.log` và `~/Library/Logs/tuvan-proxy.log`. **Tuyệt đối không lộ token hay mật khẩu vào log**.
   - Bảo toàn dịch vụ proxy đang chạy: hỏi trước khi nạp lại cấu hình proxy.
   - Hỗ trợ các lệnh gỡ linh hoạt: `bash cai-dat-tu-chay.sh go` (gỡ cả 2), `go-bot`, `go-proxy`.
2. **Kịch bản sao lưu dữ liệu tự động (`server/sao-luu-du-lieu.sh`)**:
   - Tự động nén thư mục `DATA_DIR` (`~/web-demo-data`) thành file lưu trữ `~/web-demo-backup/du-lieu-YYYYMMDD.tar.gz`.
   - Cơ chế xoay vòng dữ liệu: tự động dọn dẹp các bản sao lưu cũ, luôn giữ đúng **14 bản sao lưu gần nhất**.
3. **Tài liệu hướng dẫn thực hành 1 trang cho giáo viên (`docs/HUONG-DAN-GIAO-VIEN-KHAO-SAT.md`)**:
   - Tóm tắt cô đọng 5 bước: Tạo mã trên bot $\rightarrow$ In/gửi phiếu cho phụ huynh $\rightarrow$ Học sinh làm tại nhà $\rightarrow$ Bot tự báo nộp $\rightarrow$ Giáo viên mở hồ sơ hôm tư vấn.
4. **Cập nhật tài liệu phiên bản và hệ thống**:
   - `docs/QUAY-VE-PHIEN-BAN-CU.md`: Bổ sung thông tin nhánh và file zip của phiên bản `phien-ban/v2.3`.
   - `README.md`: Cập nhật cấu trúc thư mục, chức năng phiên bản `v2.3` và hướng dẫn khảo sát.
5. **Tuân thủ triệt để chỉ thị của người dùng**:
   - Không can thiệp sửa đổi các file web giao diện người dùng.

---

## 2. DANH SÁCH FILE THAY ĐỔI VÀ TẠO MỚI

| Đường dẫn file | Trạng thái | Mục đích |
|---|---|---|
| `server/cai-dat-tu-chay.sh` | Cập nhật | Quản lý cài đặt/gỡ bỏ dịch vụ launchd cho cả trạm trung gian (`vn.tuvan.proxy`) và bot Telegram (`vn.tuvan.bot`). |
| `server/sao-luu-du-lieu.sh` | Tạo mới | Script sao lưu nén thư mục dữ liệu `DATA_DIR`, tự động dọn dẹp giữ 14 bản gần nhất. |
| `docs/HUONG-DAN-GIAO-VIEN-KHAO-SAT.md` | Tạo mới | Hướng dẫn thực hành ngắn gọn 1 trang dành cho giáo viên từ lúc tạo QR đến buổi tư vấn. |
| `docs/QUAY-VE-PHIEN-BAN-CU.md` | Cập nhật | Ghi nhận thông tin phiên bản `phien-ban/v2.3` và link tải ZIP. |
| `README.md` | Cập nhật | Cập nhật tổng quan phiên bản `v2.3`, bảng tính năng và sơ đồ thư mục máy chủ. |
| `docs/BAN-GIAO-GIAI-DOAN-5.md` | Tạo mới | Tài liệu bàn giao kỹ thuật giai đoạn 5 và tổng kết dự án. |

---

## 3. HƯỚNG DẪN VẬN HÀNH HỆ THỐNG

### 3.1 Khởi động và cài đặt tự chạy 24/7 trên macOS
Trên máy chủ Mac, mở Terminal và chạy lệnh:
```bash
# Cài đặt tự khởi động cả trạm proxy và bot Telegram
./server/cai-dat-tu-chay.sh

# Kiểm tra nhật ký hoạt động của bot
tail -f ~/Library/Logs/tuvan-bot.log

# Kiểm tra nhật ký hoạt động của proxy
tail -f ~/Library/Logs/tuvan-proxy.log

# Khi cần gỡ bỏ dịch vụ tự chạy:
./server/cai-dat-tu-chay.sh go
```

### 3.2 Lập lịch sao lưu tự động hàng ngày (crontab)
Để máy chủ tự động sao lưu dữ liệu vào 23:00 mỗi đêm:
```bash
crontab -e
```
Thêm dòng sau vào crontab:
```text
0 23 * * * /bin/bash /đường_dẫn_tới/github-pages/server/sao-luu-du-lieu.sh > /dev/null 2>&1
```

---

## 4. KẾT QUẢ KIỂM THỬ TOÀN BỘ HỆ THỐNG

Chạy test suite từ thư mục gốc của repo:
```bash
python -m unittest discover -s server/tests -v
```
**Kết quả: 29/29 bài test đều PASS (100% OK)**:
- 15 bài test tự động cho Bot Telegram ([`server/tests/test_bot.py`](file:///c:/Users/THINKAD/OneDrive/2-Project/HUST/github-pages/server/tests/test_bot.py)).
- 14 bài test tự động cho Máy chủ và API mã mời ([`server/tests/test_invites.py`](file:///c:/Users/THINKAD/OneDrive/2-Project/HUST/github-pages/server/tests/test_invites.py)).

---

## 5. TỔNG KẾT TOÀN BỘ DỰ ÁN (PHIÊN BẢN v2.3)

| Giai đoạn | Nội dung hoàn thành | Nhánh & File bàn giao |
|---|---|---|
| **Giai đoạn 1** | API mã mời (`/api/invites`), nộp bài khảo sát tại nhà (`/api/submit`), cổng dịch vụ nội bộ 8788 bảo mật bằng `BOT_SERVICE_TOKEN`, lưu băm SHA-256 tokens. | `tinh-nang/ma-moi`<br>`docs/BAN-GIAO-GIAI-DOAN-1.md` |
| **Giai đoạn 2** | *Đã có sẵn trong v2.2 (giao diện web được bảo toàn nguyên trạng theo chỉ thị người dùng).* | Giữ nguyên web |
| **Giai đoạn 3** | Bot Telegram riêng cho giáo viên (`server/tuvan_bot.py`), kết nối cổng dịch vụ 8788, các lệnh `/taolink`, `/danhsach`, `/chuanop`, `/hoso`, `/canhbao`, `/theodoi`, `/xuat`, thông báo tự động nộp bài qua `events.jsonl`. | `tinh-nang/bot-giao-vien`<br>`docs/BAN-GIAO-GIAI-DOAN-3.md` |
| **Giai đoạn 4** | Lệnh `/taolop` và nhận file `.csv`, tự động sinh 1 file PDF in A4 (8 ô QR/trang, có viền cắt) + 1 file CSV link khảo sát, bảo mật tuyệt đối không in tên học sinh. | `tinh-nang/qr-ca-lop`<br>`docs/BAN-GIAO-GIAI-DOAN-4.md` |
| **Giai đoạn 5** | Cài đặt dịch vụ launchd tự chạy 24/7 (`vn.tuvan.bot`), script sao lưu tự động `server/sao-luu-du-lieu.sh` (giữ 14 bản), hướng dẫn 1 trang cho giáo viên `docs/HUONG-DAN-GIAO-VIEN-KHAO-SAT.md`, cập nhật tài liệu phát hành `v2.3`. | `tinh-nang/van-hanh`<br>`docs/BAN-GIAO-GIAI-DOAN-5.md` |
