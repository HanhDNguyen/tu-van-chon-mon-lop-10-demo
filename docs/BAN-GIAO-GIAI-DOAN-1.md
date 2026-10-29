# BÀN GIAO GIAI ĐOẠN 1: MÁY CHỦ – MÃ MỜI VÀ NỘP KHẢO SÁT

© 2026 Dr. Duyen Nguyen. All rights reserved.  
Tài liệu bàn giao kỹ thuật dành cho các mô hình AI (Antigravity, Codex, Claude, Gemini...) hoặc kỹ sư phát triển tiếp quản dự án.  
Ngày hoàn thành: 29/10/2026.  
Nhánh git: `tinh-nang/ma-moi` (chuẩn bị merge vào `main`).  
Phiên bản nền tảng: v2.2.

---

## 1. TỔNG QUAN KẾT QUẢ GIAI ĐOẠN 1

Giai đoạn 1 đã hoàn thiện toàn bộ hạ tầng máy chủ phía sau để hỗ trợ tính năng **Tạo mã mời khảo sát** và **Học sinh/phụ huynh nộp khảo sát trực tuyến**, đồng thời mở cổng dịch vụ nội bộ bảo mật dành riêng cho Bot Telegram (Giai đoạn 3).

### Các nguyên tắc cốt lõi đã tuân thủ:
1. **Chỉ sử dụng thư viện chuẩn của Python 3** (`http.server`, `socketserver`, `json`, `secrets`, `hashlib`, `hmac`, `threading`, `time`, `re`, `os`, `pathlib`). Tuyệt đối không thêm dependency ngoài cho `tuvan_proxy.py`.
2. **Không can thiệp vào giao diện web** (giữ nguyên toàn bộ `index.html`, `js/`, `css/`).
3. **Bảo mật tuyệt đối**:
   - Cổng 8787 (công khai qua Tailscale Funnel) **từ chối 100%** `X-Service-Token`.
   - Cổng 8788 (dịch vụ nội bộ cho Bot) chỉ lắng nghe tại `127.0.0.1`, chỉ phục vụ `/api/*`, và bắt buộc xác thực `X-Service-Token` thông qua `hmac.compare_digest`.
   - Token mã mời **chỉ được lưu dưới dạng băm SHA-256** (`token_hash`) trong `invites.json`, không bao giờ lưu token gốc dưới dạng văn bản rõ.
   - Khi nộp khảo sát qua token (`POST /api/submit/<token>`), máy chủ chỉ tiếp nhận `profile` và `tests`. Toàn bộ dữ liệu chuyên sâu của giáo viên (Bước 3–7: `constraints`, `shortlist`, `final`, `tracking`) được bảo toàn nguyên vẹn.
   - Bắt buộc đủ đồng thuận của cả cha mẹ (`consent.parent = True`) và học sinh (`consent.student = True`) theo Nghị định 13/2023/NĐ-CP.
   - Giới hạn payload ≤ 200 KB và tần suất nộp tối đa 20 lần / 10 phút / IP.

---

## 2. DANH SÁCH FILE THAY ĐỔI VÀ TẠO MỚI

| Đường dẫn file | Trạng thái | Mục đích |
|---|---|---|
| `server/tuvan_proxy.py` | Sửa đổi | Thêm 6 API endpoints, mở listener thứ hai `ServiceH` (cổng 8788), cơ chế atomic file write, xử lý `events.jsonl` và `invites.json`. |
| `server/tuvan.env.example` | Sửa đổi | Bổ sung biến `SERVICE_PORT=8788` và mẫu `BOT_SERVICE_TOKEN=`. |
| `server/tests/__init__.py` | Tạo mới | Định nghĩa package test cho `unittest discover`. |
| `server/tests/test_invites.py` | Tạo mới | Bộ 14 bài kiểm thử tự động toàn diện kiểm tra mọi khía cạnh nghiệp vụ và bảo mật. |
| `docs/BAN-GIAO-GIAI-DOAN-1.md` | Tạo mới | File bàn giao này (trong repo `github-pages/`). |

---

## 3. KIẾN TRÚC VÀ ĐẶC TẢ KỸ THUẬT

### 3.1 Mô hình hai cổng (Dual-Listener Architecture)

```
[Internet / Phụ huynh / Học sinh / Web Giáo viên]
         │
         ▼ (HTTPS qua Tailscale Funnel)
   127.0.0.1:8787 (H Class - Handler chính)
   ├─ Phục vụ web tĩnh: index.html, js/, css/
   ├─ /chat (Hermes Agent cổng 8642)
   └─ /api/* (Xác thực: Bearer Token cho Giáo viên; KHÔNG nhận X-Service-Token)

[Bot Telegram nội bộ (tuvan_bot.py)]
         │
         ▼ (HTTP cục bộ 127.0.0.1)
   127.0.0.1:8788 (ServiceH Class - Handler dịch vụ)
   └─ CHỈ phục vụ /api/* (Bắt buộc xác thực: X-Service-Token = BOT_SERVICE_TOKEN)
```

- Hàm `make_servers(port, service_port, bot_service_token)` trong `tuvan_proxy.py` cho phép khởi tạo cả 2 máy chủ hoặc chạy độc lập khi kiểm thử unittest.
- Cổng dịch vụ 8788 chỉ được bật nếu `BOT_SERVICE_TOKEN` được cấu hình và không rỗng.

### 3.2 Bảng chi tiết các API mới

| Method | Đường dẫn | Quyền / Cổng | Yêu cầu Body / Params | Phản hồi | Mô tả |
|---|---|---|---|---|---|
| `POST` | `/api/invites` | Giáo viên (8787 Bearer) hoặc Bot (8788 Service) | `{"code": "HS001", "className": "10A1", "days": 7}` | `{"token": "...", "link": "https://...?moi=...", "expiresAt": 17...}` | Tạo mã mời ngẫu nhiên 128-bit (`secrets.token_urlsafe(16)`). Lưu băm SHA-256. |
| `POST` | `/api/invites/batch` | Giáo viên (8787) hoặc Bot (8788) | `{"className": "10A1", "codes": ["HS001", "HS002"], "days": 7}` | `[{"code": "...", "token": "...", "link": "..."}]` | Tạo mã hàng loạt (tối đa 60 mã/lần gọi). |
| `GET` | `/api/invites?class=...` | Giáo viên (8787) hoặc Bot (8788) | Query `class` (tuỳ chọn) | `[{"code": "...", "className": "...", "createdAt": ..., "expiresAt": ..., "revoked": bool, "submittedAt": ..., "submitCount": ...}]` | Danh sách mã mời. **Tuyệt đối không trả `token` hay `token_hash`**. |
| `DELETE` | `/api/invites/<code>` | Giáo viên (8787) hoặc Bot (8788) | Không | `{"ok": true, "revokedCount": n}` | Thu hồi toàn bộ mã mời còn hiệu lực của mã học sinh đó. |
| `GET` | `/api/invite/<token>` | Công khai (8787) | Không | `{"code": "...", "className": "...", "schoolName": "...", "expiresAt": ...}` | Tra cứu thông tin mã mời qua token. Trả 404 nếu sai/hết hạn/đã thu hồi. |
| `POST` | `/api/submit/<token>` | Công khai (8787) | `{"state": {"profile": {...}, "tests": {...}}, "consent": {"parent": true, "student": true}}` | `{"ok": true, "code": "HS001"}` | Nộp bài khảo sát. Rate limit 20 req/10min/IP, max 200KB. Ghi nhật ký vào `events.jsonl`. |

### 3.3 Cấu trúc lưu trữ dữ liệu

1. **`DATA_DIR/invites.json`**:
```json
[
  {
    "token_hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
    "code": "HS001",
    "className": "10A1",
    "createdBy": "teacher",
    "createdAt": 1730000000.0,
    "expiresAt": 1730604800.0,
    "revoked": false,
    "submittedAt": 1730010000.0,
    "submitCount": 1
  }
]
```

2. **`DATA_DIR/events.jsonl`**:
Mỗi dòng là một JSON event dạng log append-only phục vụ bot Telegram đọc theo dõi theo offset:
```json
{"type": "submit", "code": "HS001", "className": "10A1", "createdBy": "123456789", "at": 1730010000.0, "missingCount": 2}
```

3. **Cơ chế ghi an toàn (Atomic File Write)**:
Tất cả các thao tác ghi `invites.json`, `events.jsonl` và hồ sơ học sinh đều sử dụng ghi file tạm (`.tmp`) rồi thực hiện `os.replace` để bảo đảm không bị hỏng file khi có đa luồng truy cập đồng thời.

---

## 4. HƯỚNG DẪN KIỂM THỬ VÀ KẾT QUẢ

### 4.1 Lệnh chạy kiểm thử
Chạy từ thư mục gốc của repo (`github-pages/`):
```bash
python -m unittest discover -s server/tests -v
```

### 4.2 Kết quả 14/14 bài test đều PASS
- `test_01_create_invite_teacher_auth`: Xác thực giáo viên tạo mã mời thành công.
- `test_02_create_invite_service_token_auth`: Bot dùng `X-Service-Token` gọi cổng 8788 tạo mã thành công.
- `test_03_service_token_rejected_on_public_port`: Cổng công khai 8787 từ chối dứt khoát `X-Service-Token` (trả về 401).
- `test_04_service_port_rejects_bad_token`: Cổng 8788 từ chối token sai.
- `test_05_invites_json_stores_only_hash`: Khẳng định `invites.json` chỉ chứa SHA-256 băm 64 ký tự, không chứa token thô.
- `test_06_get_invite_public`: Tra cứu token công khai thành công, trả về đúng code, className.
- `test_07_get_invite_invalid_or_expired_or_revoked`: Trả về 404 với token sai, hết hạn hoặc bị thu hồi.
- `test_08_batch_invites`: Tạo mã hàng loạt (batch) thành công, kiểm tra giới hạn tối đa 60 mã.
- `test_09_list_and_revoke_invites`: Liệt kê danh sách (không lộ token) và thu hồi mã mời của học sinh.
- `test_10_submit_requires_consent`: Từ chối nộp khảo sát nếu thiếu sự đồng thuận của cha mẹ hoặc học sinh.
- `test_11_submit_overwrites_only_profile_and_tests`: Nộp bài chỉ ghi đè `profile` và `tests`, bảo toàn toàn bộ Bước 3–7 (`constraints`, `shortlist`, `final`, `tracking`).
- `test_12_submit_forces_invite_code`: Ép buộc mã học sinh trong payload nộp về phải khớp với mã học sinh của mã mời.
- `test_13_submit_writes_event_log`: Nộp bài ghi log sự kiện đầy đủ vào `events.jsonl`.
- `test_14_submit_payload_limit`: Chặn các payload nộp vượt quá 200 KB.

---

## 5. HƯỚNG DẪN DÀNH CHO MÔ HÌNH TIẾP THEO (GIAI ĐOẠN TIẾP THEO)

> [!IMPORTANT]
> **CHỈ THỊ CỦA NGƯỜI DÙNG**:
> "Lưu ý chúng ta không làm web, không can thiệp vào nội dung web, chúng ta làm bot để liên kết với web."
> Vì vậy:
> - **BỎ QUA Giai đoạn 2 (Web)**. Tuyệt đối không can thiệp vào `index.html`, `js/app.js`, `css/style.css`.
> - **CHUYỂN THẲNG SANG GIAI ĐOẠN 3: Bot Telegram cho giáo viên** (`server/tuvan_bot.py`).

### Nhiệm vụ chi tiết của Giai đoạn 3:
1. **Tạo nhánh mới**: `tinh-nang/bot-giao-vien` (tách từ `main` sau khi merge Giai đoạn 1).
2. **Tạo module Bot `server/tuvan_bot.py`**:
   - Đọc cấu hình từ `tuvan.env`: `TUVAN_BOT_TOKEN`, `TEACHER_TELEGRAM_IDS`, `BOT_SERVICE_TOKEN`, `SERVICE_URL=http://127.0.0.1:8788`.
   - Cơ chế Long Polling `getUpdates` (timeout 50s), cơ chế exponential backoff khi gặp lỗi mạng, không bao giờ để sập tiến trình.
   - Kiểm soát quyền: Chỉ phục vụ tin nhắn riêng với các Telegram ID nằm trong `TEACHER_TELEGRAM_IDS`. Từ chối lịch sự người lạ và tin nhắn nhóm (không làm lộ bất kỳ dữ liệu nào).
   - Mọi truy vấn sang máy chủ tư vấn **phải** thông qua `SERVICE_URL` (cổng 8788) với header `X-Service-Token`.
3. **Các lệnh Bot cần hiện thực**:
   - `/start`, `/trogiup`: Hướng dẫn các cú pháp lệnh.
   - `/taolink HS001 [10A1]`: Tạo mã mời qua `POST /api/invites`, trả về link và tạo ảnh mã QR PNG gửi trực tiếp cho giáo viên (sử dụng thư viện `segno`).
   - `/danhsach [lop]`: Gọi `GET /api/invites`, thống kê ai đã nộp, ai chưa nộp, ngày giờ nộp.
   - `/chuanop [lop]`: Lọc nhanh danh sách các em chưa nộp.
   - `/hoso HS001`: Lấy tóm tắt hồ sơ (chỉ Holland, Eysenck, MBTI, số mục thiếu, link xem web). **Tuyệt đối không gửi dữ liệu `health`, `cond.econ`, hoàn cảnh gia đình hoặc ý kiến tự do lên Telegram**.
   - `/canhbao`: Lọc danh sách hồ sơ có đánh giá Bước 7 với mức hài lòng ≤ 2 hoặc căng thẳng ≥ 4.
   - `/theodoi HS001 hk1 hailong=4 cangthang=2 ghichu=...`: Ghi nhận dữ liệu theo dõi Bước 7.
   - `/xuat [lop]`: Xuất file CSV danh sách tổng hợp (đã loại bỏ các cột nhạy cảm).
   - `/thuhoi HS001`: Thu hồi mã mời qua `DELETE /api/invites/HS001`.
4. **Thông báo tự động khi học sinh nộp**:
   - Bot đọc luồng `events.jsonl` từ offset đã lưu.
   - Gửi tin nhắn riêng cho giáo viên đã tạo mã mời (`createdBy` = Telegram ID): *"HS001 (10A1) đã nộp khảo sát lúc 20:15. Còn thiếu 2 mục."*
5. **Thư viện & Script hỗ trợ**:
   - Thêm `segno` vào `server/requirements-bot.txt`.
   - Tạo script khởi động `server/start_bot.sh`.
   - Viết bộ unittest giả lập `server/tests/test_bot.py`.
   - Soạn tài liệu hướng dẫn giáo viên: `server/HUONG-DAN-BOT-GIAO-VIEN.md`.
6. **Sau khi hoàn thành Giai đoạn 3**:
   - Tạo file bàn giao `docs/BAN-GIAO-GIAI-DOAN-3.md`.
   - Đảm bảo toàn bộ unittest pass.
   - Merge vào `main`.
