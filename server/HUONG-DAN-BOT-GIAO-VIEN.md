# Hướng dẫn: Cấu hình và sử dụng Bot Telegram cho giáo viên

© 2026 Dr. Duyen Nguyen. All rights reserved.

Tài liệu hướng dẫn dành cho Giáo viên / Quản trị viên hệ thống tư vấn chọn môn học lớp 10.

---

## 1. Tổng quan

Bot Telegram là công cụ dành riêng cho giáo viên để:
- Tạo nhanh link và mã QR khảo sát tại nhà cho học sinh (hoặc phụ huynh).
- Tự động nhận thông báo ngay khi học sinh nộp bài khảo sát.
- Theo dõi danh sách học sinh đã nộp / chưa nộp khảo sát.
- Xem tóm tắt kết quả trắc nghiệm định hướng (Holland, Eysenck, MBTI) trước buổi tư vấn.
- Cảnh báo sớm các học sinh có mức hài lòng thấp (≤2) hoặc căng thẳng cao (≥4) ở Bước 7.
- Ghi nhận nhanh kết quả theo dõi định kỳ sau buổi tư vấn.
- Xuất file CSV danh sách học sinh tổng hợp để làm việc trên Excel.

> [!IMPORTANT]
> **Quy định bảo vệ dữ liệu học sinh:**
> 1. Bot **chỉ hoạt động trong tin nhắn riêng (Private Chat)** với giáo viên được cấp quyền. Tuyệt đối không thêm bot vào các nhóm chat.
> 2. Mọi dữ liệu nhạy cảm (sức khỏe, hoàn cảnh kinh tế gia đình, họ tên đầy đủ, ý kiến tự do) **không bao giờ được gửi qua Telegram**.

---

## 2. Các bước cài đặt và cấu hình

### Bước 1: Tạo Bot mới qua @BotFather
1. Mở ứng dụng Telegram, tìm kiếm tài khoản chính thức **@BotFather** (có tích xanh).
2. Nhắn lệnh `/newbot`.
3. Đặt tên hiển thị cho bot (ví dụ: `Tư Vấn Chọn Môn Lớp 10`).
4. Đặt username cho bot (phải kết thúc bằng chữ `bot`, ví dụ: `TuVanChonMonLop10_bot`).
5. BotFather sẽ gửi cho Thầy/Cô một đoạn **HTTP API Token** (chuỗi ký tự dạng `1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ`). Hãy sao chép chuỗi này.

### Bước 2: Lấy Telegram User ID của giáo viên
1. Mở Telegram, tìm kiếm bot **@userinfobot**.
2. Nhấn `/start`, bot sẽ gửi lại thông tin của Thầy/Cô, trong đó có dòng `Id: 123456789`.
3. Sao chép dãy số `Id` này. Nếu có nhiều giáo viên cùng quản lý, hãy lấy ID của từng người.

### Bước 3: Điền thông tin vào `server/tuvan.env`
Mở file `server/tuvan.env` (sao chép từ `server/tuvan.env.example` nếu chưa có):

```bash
# Token bot Telegram vừa lấy từ @BotFather
TUVAN_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ

# Danh sách ID Telegram của các giáo viên (cách nhau bởi dấu phẩy)
TEACHER_TELEGRAM_IDS=123456789,987654321

# Khoá bí mật nội bộ kết nối với máy chủ (tự đặt chuỗi ngẫu nhiên dài)
BOT_SERVICE_TOKEN=chuoi_khoa_dich_vu_bi_mat_128bit_random

# Cổng dịch vụ nội bộ (mặc định 8788)
SERVICE_PORT=8788
SERVICE_URL=http://127.0.0.1:8788
```

### Bước 4: Cài đặt thư viện phụ thuộc và khởi động
1. Cài đặt thư viện tạo mã QR:
```bash
pip install -r server/requirements-bot.txt
```
2. Khởi động máy chủ tư vấn (nếu chưa chạy):
```bash
./server/start_tuvan.sh
```
3. Khởi động bot Telegram:
```bash
./server/start_bot.sh
```

---

## 3. Danh sách câu lệnh và ví dụ sử dụng

| Lệnh | Cú pháp | Ví dụ | Ý nghĩa |
|---|---|---|---|
| `/start`, `/trogiup` | `/trogiup` | `/trogiup` | Xem hướng dẫn sử dụng và danh sách lệnh. |
| `/taolink` | `/taolink <mã HS> [lớp]` | `/taolink HS001 10A1` | Tạo link và mã QR để gửi cho học sinh/phụ huynh. Link có hạn 7 ngày. |
| `/danhsach` | `/danhsach [lớp]` | `/danhsach 10A1` | Liệt kê tất cả mã mời, trạng thái đã nộp hoặc chưa nộp. |
| `/chuanop` | `/chuanop [lớp]` | `/chuanop 10A1` | Lọc nhanh danh sách các học sinh chưa nộp bài. |
| `/hoso` | `/hoso <mã HS>` | `/hoso HS001` | Xem tóm tắt kết quả trắc nghiệm (Holland, Eysenck, MBTI), số mục thiếu và link mở web. |
| `/canhbao` | `/canhbao` | `/canhbao` | Cảnh báo học sinh có mức hài lòng ≤2 hoặc căng thẳng ≥4 ở Bước 7. |
| `/theodoi` | `/theodoi <mã HS> <đợt> [hailong=1-5] [cangthang=1-5] [ghichu=...]` | `/theodoi HS001 hk1 hailong=4 cangthang=2 ghichu=tien_bo` | Ghi nhận kết quả theo dõi Bước 7 sau buổi tư vấn. |
| `/xuat` | `/xuat [lớp]` | `/xuat 10A1` | Xuất file `.csv` tổng hợp danh sách học sinh (mở được bằng Excel). |
| `/thuhoi` | `/thuhoi <mã HS>` | `/thuhoi HS001` | Thu hồi toàn bộ mã mời khảo sát còn hạn của học sinh. |

---

## 4. Cơ chế thông báo tự động

Khi học sinh hoặc phụ huynh hoàn thành khảo sát tại nhà qua link/QR và nhấn nút **Nộp cho giáo viên**:
- Máy chủ sẽ ghi nhận sự kiện nộp bài.
- Bot Telegram sẽ **tự động gửi tin nhắn riêng** cho giáo viên đã tạo mã mời đó:
  > *"🔔 THÔNG BÁO: Học sinh HS001 (10A1) đã nộp khảo sát tại nhà lúc 20:15 28/10. Còn thiếu: 2 mục. Thầy/Cô có thể gõ /hoso HS001 để xem tóm tắt."*
- Giáo viên không cần phải liên tục kiểm tra danh sách hay dò hỏi thủ công.
