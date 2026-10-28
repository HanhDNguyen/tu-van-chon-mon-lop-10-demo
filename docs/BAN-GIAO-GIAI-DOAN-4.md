# BÀN GIAO GIAI ĐOẠN 4: QR CẢ LỚP VÀ XUẤT PHIẾU KHẢO SÁT

© 2026 Dr. Duyen Nguyen. All rights reserved.  
Tài liệu bàn giao kỹ thuật dành cho các mô hình AI (Antigravity, Codex, Claude, Gemini...) hoặc kỹ sư phát triển tiếp quản dự án.  
Ngày hoàn thành: 29/10/2026.  
Nhánh git: `tinh-nang/qr-ca-lop`.  
Phiên bản nền tảng: v2.2 + Giai đoạn 1 + Giai đoạn 3 (đã merge vào `main`).

---

## 1. TỔNG QUAN KẾT QUẢ GIAI ĐOẠN 4

Giai đoạn 4 đã hoàn thiện toàn diện tính năng **Tạo mã mời khảo sát hàng loạt cho cả lớp** trực tiếp trên Bot Telegram của giáo viên, bao gồm:
1. **Lệnh `/taolop <lớp> <mã_bắt_đầu>-<mã_kết_thúc>`**:
   - Tự động phân tích dải mã học sinh có số (ví dụ `/taolop 10A1 HS001-HS045`), giữ nguyên định dạng số 0 đứng trước (zero-padded).
   - Kiểm tra chặt chẽ tiền tố mã, số bắt đầu ≤ số kết thúc, giới hạn tối đa 60 mã/lớp.
2. **Nhận diện file danh sách học sinh `.csv` gửi vào Bot**:
   - Giáo viên gửi trực tiếp file `.csv` (hỗ trợ UTF-8, UTF-8 BOM) có cột `ma_hs` và `lop`.
   - Bot tự động tải file qua Telegram `getFile`, phân tích dữ liệu và tiến hành tạo mã mời hàng loạt.
3. **Sinh tự động 1 file PDF in A4 chuẩn để cắt phát cho học sinh**:
   - Sử dụng thư viện `reportlab` thuần Python.
   - Khổ A4, bố cục **8 ô mỗi trang** (2 cột x 4 hàng), có viền đứt nét để giáo viên dùng kéo cắt phát từng phiếu.
   - Tạo 45 mã học sinh -> tự động phân trang ra đúng **6 trang** (5 trang x 8 ô + 1 trang x 5 ô).
   - Mỗi ô phiếu gồm: Tiêu đề "PHIẾU KHẢO SÁT CHỌN MÔN LỚP 10", ảnh mã QR sắc nét, Mã học sinh (in đậm lớn), Lớp, Hạn dùng (7 ngày), Dòng hướng dẫn *"Quét mã, cha mẹ cùng con làm khảo sát trước buổi tư vấn"*, và Bản quyền.
   - **Bảo mật tuyệt đối quyền riêng tư**: **KHÔNG IN TÊN HỌC SINH**, không chứa bất kỳ dữ liệu nhạy cảm nào.
4. **Sinh kèm 1 file CSV danh sách link khảo sát**:
   - Định dạng chuẩn UTF-8 BOM (`\xef\xbb\xbf`) giúp mở tiếng Việt trên Microsoft Excel không bị lỗi font.
   - Gồm các cột: `ma_hs,lop,link,het_han` để giáo viên gửi trực tiếp qua Zalo hoặc email.
5. **Tuân thủ triệt để chỉ thị cốt lõi của người dùng**:
   - *"Không làm web, không can thiệp vào nội dung web, chúng ta làm bot để liên kết với web."* Toàn bộ mã nguồn web (`index.html`, `js/`, `css/`) được giữ nguyên 100%.

---

## 2. DANH SÁCH FILE THAY ĐỔI VÀ TẠO MỚI

| Đường dẫn file | Trạng thái | Mục đích |
|---|---|---|
| `server/tuvan_bot.py` | Cập nhật | Bổ sung phân tích dải mã `parse_code_range`, đọc file CSV `parse_csv_student_list`, sinh PDF `generate_cards_pdf`, sinh CSV `generate_batch_csv`, lệnh `/taolop`, và bộ xử lý file gửi đến `_handle_document`. |
| `server/requirements-bot.txt` | Cập nhật | Bổ sung phụ thuộc `reportlab>=4.0.0` để tạo file PDF in A4. |
| `server/tuvan_proxy.py` | Cập nhật | Trả kèm trường `className` trong từng phần tử của phản hồi `/api/invites/batch`. |
| `server/HUONG-DAN-BOT-GIAO-VIEN.md` | Cập nhật | Bổ sung hướng dẫn sử dụng lệnh `/taolop` và gửi file CSV cho giáo viên. |
| `server/tests/test_bot.py` | Cập nhật | Mở rộng Mock Telegram Server (`getFile`, `do_GET`) và bổ sung 4 bài test tự động cho `/taolop`, kiểm tra tạo 45 mã ra 6 trang PDF, 45 dòng CSV, và kiểm tra thu hồi mã mời cả lớp. |
| `docs/BAN-GIAO-GIAI-DOAN-4.md` | Tạo mới | Tài liệu bàn giao kỹ thuật này. |

---

## 3. KIẾN TRÚC VÀ CƠ CHẾ HOẠT ĐỘNG

### 3.1 Sơ đồ luồng tạo mã mời cả lớp

```
[Giáo viên gõ /taolop 10A1 HS001-HS045 HOẶC gửi file CSV]
                        │
                        ▼ (Telegram Long Polling)
                 [tuvan_bot.py]
                        │
                        ├─► Phân tích dải mã / Parse file CSV (≤ 60 học sinh)
                        │
                        ├─► Gọi POST /api/invites/batch (qua cổng nội bộ 8788 với X-Service-Token)
                        │   └─► tuvan_proxy.py lưu SHA-256 tokens vào DATA_DIR/invites.json
                        │
                        ├─► generate_cards_pdf: Tạo 1 file PDF A4 (8 ô QR/trang, có viền cắt)
                        ├─► generate_batch_csv: Tạo 1 file CSV (ma_hs, lop, link, het_han)
                        │
                        ▼ (sendDocument qua Telegram API)
   [Gửi lại cho Giáo viên: 1 file PDF in A4 + 1 file CSV + Tin nhắn xác nhận]
```

### 3.2 Bố cục trang in PDF A4 (8 ô/trang)

- Kích thước chuẩn A4: 595.27 x 841.89 points.
- Bố trí: 2 cột x 4 hàng = 8 ô/trang.
- Viền ô đứt nét (`dash=[3, 2]`) màu xám nhạt để cắt bằng kéo thành từng phiếu nhỏ.
- Hỗ trợ font Unicode tiếng Việt (tự động phát hiện Arial/DejaVu, có cơ chế chuyển đổi không dấu an toàn nếu môi trường thiếu font TTF, bảo đảm máy chủ không bao giờ bị crash).

---

## 4. HƯỚNG DẪN KIỂM THỬ VÀ KẾT QUẢ

### 4.1 Lệnh chạy kiểm thử tự động toàn diện
Chạy từ thư mục gốc của repo (`github-pages/`):
```bash
python -m unittest discover -s server/tests -v
```

### 4.2 Kết quả 29/29 bài test đều PASS (100% OK)
```
Ran 29 tests in 3.207s — OK
```

- **Các bài kiểm thử mới của Giai đoạn 4 (`server/tests/test_bot.py`)**:
  - `test_12_taolop_batch_and_pdf`: Tạo 45 mã mời lớp 10A1 (`HS001-HS045`), kiểm tra nhận đủ 2 file đính kèm:
    - File PDF có đúng **6 trang** (45 mã / 8 ô mỗi trang).
    - File PDF **hoàn toàn sạch sẽ, không có tên học sinh hay dữ liệu nhạy cảm**.
    - File CSV có đúng **46 dòng** (1 header + 45 dòng dữ liệu học sinh).
  - `test_13_taolop_validation`: Kiểm tra toàn diện các tình huống nhập sai: thiếu tham số, số bắt đầu > số kết thúc, vượt quá 60 mã, tiền tố mã không khớp. Bot phản hồi thông báo hướng dẫn rõ ràng.
  - `test_14_csv_upload_batch`: Giáo viên gửi file CSV 10 học sinh -> Bot tự tải về qua `getFile`, sinh 1 file PDF (2 trang) và 1 file CSV (10 dòng dữ liệu).
  - `test_15_batch_revocation`: Thu hồi mã mời của một học sinh trong lớp (`/thuhoi HS002`), kiểm tra trạng thái `revoked: true` trên máy chủ.
- **Toàn bộ 11 bài test Bot (Giai đoạn 3) và 14 bài test Máy chủ (Giai đoạn 1) vẫn hoạt động chính xác 100%**.

---

## 5. HƯỚNG DẪN DÀNH CHO MÔ HÌNH TIẾP THEO (GIAI ĐOẠN 5)

> [!IMPORTANT]
> **TIẾP TỤC TUÂN THỦ CHỈ THỊ**:
> *"Chúng ta không làm web, không can thiệp vào nội dung web, chúng ta làm bot để liên kết với web."*

Nhiệm vụ cho Giai đoạn 5 (Chạy 24/7 và tài liệu vận hành):
1. **Tạo nhánh**: `tinh-nang/van-hanh` (tách từ `main` sau khi merge Giai đoạn 4).
2. **Cài đặt dịch vụ tự chạy launchd cho Bot**:
   - Mở rộng script `server/cai-dat-tu-chay.sh` để đăng ký thêm launchd service `vn.tuvan.bot`.
   - Log ra `~/Library/Logs/tuvan-bot.log` (không in token vào log).
   - Không can thiệp làm gián đoạn service `vn.tuvan.proxy` đang chạy.
3. **Script sao lưu tự động**:
   - Tạo `server/sao-luu-du-lieu.sh` nén `DATA_DIR` thành `~/web-demo-backup/du-lieu-YYYYMMDD.tar.gz`, tự động dọn dẹp và giữ lại 14 bản sao lưu gần nhất.
4. **Cập nhật tài liệu vận hành**:
   - `README.md`: Cập nhật bảng tính năng và hướng dẫn chạy Bot.
   - `docs/QUAY-VE-PHIEN-BAN-CU.md`: Chuẩn bị quy ước tag phiên bản `phien-ban/v2.3`.
   - Viết `docs/HUONG-DAN-GIAO-VIEN-KHAO-SAT.md`: Hướng dẫn ngắn gọn 1 trang dành cho giáo viên, từ bước tạo QR trên Bot đến buổi tư vấn trực tiếp cùng học sinh và phụ huynh.
