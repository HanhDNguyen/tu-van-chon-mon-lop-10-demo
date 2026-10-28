# Bàn giao: Bot Telegram cho giáo viên + Khảo sát tại nhà qua link/QR

© 2026 Dr. Duyen Nguyen. All rights reserved.

Tài liệu bàn giao cho một trợ lý lập trình khác (Codex, Antigravity…) làm tiếp. Viết ngày 28/10/2026, dựa trên bản **v2.2** (nhánh `phien-ban/v2.2`).

## Cách dùng tài liệu này

1. Làm **từng giai đoạn một**, theo thứ tự 1 → 5. Không giao cả 5 giai đoạn trong một lần.
2. Mỗi lần: dán **Luật chung** (mục 4) + **prompt của giai đoạn** (mục 5) vào Codex/Antigravity.
3. Khi trợ lý báo xong: kiểm tra theo mục **Nghiệm thu** của giai đoạn đó. Đạt mới gộp vào `main` và sang giai đoạn tiếp.
4. Sau khi gộp giai đoạn cuối: tạo nhánh phiên bản `phien-ban/v2.3` (xem `docs/QUAY-VE-PHIEN-BAN-CU.md`).

Nếu một giai đoạn làm hỏng web, quay về `phien-ban/v2.2`.

---

## 1. Ý tưởng

| Ai | Dùng gì | Làm gì |
|---|---|---|
| **Giáo viên** | Bot Telegram riêng cho tư vấn + Khu vực giáo viên trên web | Tạo link/QR khảo sát cho từng học sinh hoặc cả lớp; nhận thông báo khi học sinh nộp; xem danh sách đã nộp/chưa nộp, tóm tắt hồ sơ, cảnh báo; xuất danh sách; ghi nhận theo dõi Bước 7 |
| **Cha mẹ + học sinh** | Trình duyệt trên điện thoại (quét QR hoặc bấm link), **không cần Telegram, không cần tài khoản** | Đồng ý tham gia → làm Bước 1 (dữ liệu nền) và Bước 2 (Holland, Eysenck, MBTI) tại nhà → bấm **Nộp cho giáo viên** |
| **Buổi tư vấn hôm sau** | Khu vực giáo viên trên web | Giáo viên mở hồ sơ đã nộp, làm tiếp Bước 3–6 cùng học sinh và cha mẹ, không phải chờ làm trắc nghiệm |

Vì sao phụ huynh và học sinh dùng web thay vì Telegram:
- Học sinh lớp 10 là người chưa thành niên. Không nên bắt các em lập tài khoản mạng xã hội để làm khảo sát.
- Phần lớn phụ huynh dùng Zalo. Một link web gửi được qua Zalo, Messenger, email hoặc in QR lên giấy.
- Dữ liệu chỉ đi một đường: điện thoại → máy chủ của trường. Telegram chỉ nhận thông tin tóm tắt, không chứa dữ liệu nhạy cảm.

---

## 2. Hiện trạng hệ thống (v2.2)

```
Điện thoại/máy tính ──HTTPS──► Tailscale Funnel ──► tuvan_proxy.py (Mac, 127.0.0.1:8787)
                                                      ├─ phục vụ web tĩnh (index.html, js/, css/)
                                                      ├─ /chat  ──► Hermes Agent, profile "tuvan"
                                                      └─ /api/* ──► file JSON trong DATA_DIR (~/web-demo-data)
GitHub Pages: cùng web, chạy chế độ trình duyệt (không có /api, trợ lý chạy demo)
```

- Web tĩnh: `index.html`, `js/app.js` (logic 7 bước), `js/data.js` (dữ liệu, trắc nghiệm), `js/chat.js`, `js/config.js`, `css/style.css`. Không dùng framework, không có bước build.
- Máy chủ: `server/tuvan_proxy.py`, chỉ dùng thư viện chuẩn Python 3 (`http.server`). Khởi động bằng `server/start_tuvan.sh`, chạy 24/7 bằng launchd (`server/cai-dat-tu-chay.sh`). Cấu hình: `server/tuvan.env` (mẫu: `tuvan.env.example`).
- API hiện có:

| Phương thức | Đường dẫn | Quyền |
|---|---|---|
| GET | `/api/info` | công khai: `{server, teacher, chat}` |
| POST | `/api/login` `{password}` | trả `{token}` hạn 12 giờ; tối đa 10 lần thử / 10 phút |
| GET | `/api/schools` | công khai |
| POST/DELETE | `/api/schools[/id]` | giáo viên |
| POST | `/api/scrape` `{url}` | giáo viên; chặn địa chỉ nội bộ |
| GET | `/api/profiles` | giáo viên: danh mục (không có `data`) |
| GET/PUT/DELETE | `/api/profiles/<mã HS>` | giáo viên; mã khớp `^[A-Za-z0-9_.\-]{1,40}$` |

- Bản ghi hồ sơ (do `recordFromState()` trong `js/app.js` tạo):
  `{ code, name, className, school, combo, trackCount, missing, missingList, updatedAt, data }`.
  Trong đó `data` là toàn bộ trạng thái web (`v: 2`) với các khoá:
  `role, step, profile{code, nickname, className, schoolId, …, grades, liked, disliked, cond{extra,time,device,econ}, health, wish, familyWish}, tests{holland, eysenck, mbti}, careerFb, constraints, shortlist, final, tracking, ui`.
- Điểm cần biết: `client_ip()` lấy IP từ header `X-Forwarded-For` (để giới hạn số lượt theo người dùng sau Funnel). Header này chỉ dùng để giới hạn lượt, **không** dùng để phân quyền.
- Kiểm thử đã chạy được (28/10/2026): trang web, chặn `server/` và file ẩn, đăng nhập, lưu/đọc/xoá hồ sơ, chặn lấy dữ liệu từ địa chỉ nội bộ, giao diện 7 bước + Khu vực giáo viên không lỗi JS.

---

## 3. Thiết kế đích

### 3.1 Mã mời (invite)
- Giáo viên tạo mã mời cho **một mã học sinh**. Mã mời là chuỗi ngẫu nhiên ≥ 128 bit (`secrets.token_urlsafe(16)`), có **hạn dùng** (mặc định 7 ngày) và có thể **thu hồi**.
- Link: `<PUBLIC_ORIGIN>/?moi=<mã mời>`. QR chứa đúng link này.
- Mã mời **chỉ** cho phép: xem tên trường + mã học sinh của chính nó, lưu nháp, nộp phần Bước 1–2. Không xem được hồ sơ khác, không vào Khu vực giáo viên.
- Lưu ở `DATA_DIR/invites.json`: `{ token_hash, code, className, createdBy, createdAt, expiresAt, revoked, submittedAt, submitCount }`. **Chỉ lưu mã băm** (SHA-256), không lưu mã mời gốc.

### 3.2 Nộp khảo sát
- Web nhận `?moi=` → gọi `GET /api/invite/<mã mời>` → nếu hợp lệ thì vào **chế độ khảo sát tại nhà**.
- Chế độ này chỉ hiện: màn hình đồng thuận → Bước 1 → Bước 2 → màn hình nộp. Ẩn Bước 3–7, nút Giáo viên, nhập mã hồ sơ.
- Màn hình đồng thuận: giải thích ngắn mục đích, dữ liệu thu thập, ai được xem, thời gian lưu. Hai ô đánh dấu riêng: **cha mẹ/người giám hộ đồng ý** và **học sinh đồng ý**. Thiếu một ô thì không làm tiếp (căn cứ NĐ 13/2023/NĐ-CP về dữ liệu cá nhân của trẻ em).
- Nộp: `POST /api/submit/<mã mời>` với `{ state, consent:{parent:true, student:true} }`. Máy chủ:
  - ép `state.profile.code` = mã học sinh của mã mời;
  - **chỉ nhận** `state.profile` và `state.tests` (bỏ các khoá khác);
  - nếu đã có hồ sơ cùng mã: **chỉ thay** `data.profile` và `data.tests`, giữ nguyên phần Bước 3–7 giáo viên đã làm;
  - ghi `data.home = { submittedAt, submitCount, consent:{parent, student, at} }`;
  - nộp lại được nhiều lần trước khi hết hạn (ghi đè lần trước);
  - giới hạn: thân yêu cầu ≤ 200 KB; 20 lần nộp / 10 phút / IP.
- Web lưu nháp vào `localStorage` theo mã mời, để mở lại trên cùng máy thì làm tiếp.

### 3.3 Bot Telegram cho giáo viên
- **Bot mới, riêng cho tư vấn**, tạo bằng @BotFather. **Tuyệt đối không dùng** bot cá nhân đang chạy Hermes của chủ máy, không sửa cấu hình gateway/profile mặc định của Hermes.
- Chạy thành tiến trình riêng `server/tuvan_bot.py` trên cùng Mac. Dùng **long polling** (`getUpdates`), nên không mở thêm cổng hay webhook công khai.
- Bot **không đọc file dữ liệu trực tiếp**. Mọi thao tác đi qua API của `tuvan_proxy.py`, nhưng qua một **cổng nội bộ riêng** `127.0.0.1:8788` (biến `SERVICE_PORT`), kèm khoá dịch vụ `BOT_SERVICE_TOKEN` (header `X-Service-Token`, so sánh bằng `hmac.compare_digest`). Tailscale Funnel chỉ trỏ tới 8787, nên từ Internet không gọi được cổng 8788.
  - Lý do không dùng "chỉ nhận khi đến từ 127.0.0.1": mọi yêu cầu đi qua Funnel cũng đến từ 127.0.0.1, còn header `X-Forwarded-For` thì người gọi có thể tự điền.
  - Cổng 8787 (công khai qua Funnel) **không bao giờ** nhận `X-Service-Token`.
- Chỉ giáo viên trong danh sách cho phép mới dùng được: `TEACHER_TELEGRAM_IDS=123,456` trong `tuvan.env`. Người lạ nhắn thì bot trả một câu từ chối, không lộ thông tin.
- Chỉ hoạt động trong **chat riêng**. Không trả dữ liệu học sinh vào nhóm.
- Lệnh:

| Lệnh | Việc làm |
|---|---|
| `/start`, `/trogiup` | Hướng dẫn ngắn |
| `/taolink HS001 [10A1]` | Tạo mã mời → gửi link + ảnh QR |
| `/taolop 10A1 HS001-HS045` hoặc gửi file `.csv` (cột `ma_hs,lop`) | Tạo mã mời hàng loạt → gửi lại **1 file PDF** (mỗi trang 6–8 QR có mã HS) + 1 file CSV link |
| `/danhsach [lop]` | Ai đã nộp, ai chưa, ngày nộp |
| `/chuanop [lop]` | Chỉ những em chưa nộp |
| `/hoso HS001` | Tóm tắt ngắn: lớp, đã nộp chưa, Holland 3 chữ cái, kiểu khí chất Eysenck, MBTI, số mục còn thiếu, link mở trên web (Khu vực giáo viên) |
| `/canhbao` | Hồ sơ có theo dõi Bước 7 với hài lòng ≤ 2 hoặc căng thẳng ≥ 4 |
| `/theodoi HS001 hk1 hailong=4 cangthang=2 ghichu=...` | Ghi một lần theo dõi Bước 7 |
| `/xuat [lop]` | Gửi file CSV tổng hợp (không có cột sức khỏe, kinh tế) |
| `/thuhoi HS001` | Thu hồi mã mời còn hạn của HS001 |

- Thông báo tự động: khi có học sinh nộp, gửi tới giáo viên đã tạo mã mời: *"HS001 (10A1) đã nộp khảo sát lúc 20:15. Còn thiếu 2 mục."*
- **Không bao giờ** gửi lên Telegram: họ tên đầy đủ, `health`, `cond.econ`, ý kiến tự do của học sinh. Chỉ mã HS, lớp, kết quả trắc nghiệm dạng nhãn, số mục thiếu.
- QR: dùng thư viện `segno` (thuần Python, xuất PNG không cần Pillow). PDF hàng loạt: `reportlab` hoặc ghép SVG của `segno` thành HTML để in. Ghi phụ thuộc vào `server/requirements-bot.txt`. `tuvan_proxy.py` vẫn chỉ dùng thư viện chuẩn.

---

## 4. Luật chung (dán vào đầu MỌI prompt)

```text
Bạn đang làm việc trên repo GitHub HanhDNguyen/tu-van-chon-mon-lop-10-demo: một web demo tư vấn chọn môn lớp 10
(HTML/CSS/JS thuần, không framework, không build) và một máy chủ Python chỉ dùng thư viện chuẩn (server/tuvan_proxy.py).
Đọc README.md và docs/BAN-GIAO-BOT-TELEGRAM.md (mục 2 và 3) trước khi sửa.

LUẬT BẮT BUỘC
1. Làm trên nhánh riêng tên "tinh-nang/<tên-giai-đoạn>", tách từ main. Không push thẳng lên main.
   Không sửa, không xoá các nhánh phien-ban/*. Xong thì mở Pull Request vào main.
2. Không đưa bí mật vào repo hoặc log: token bot Telegram, BOT_SERVICE_TOKEN, mật khẩu giáo viên, khoá API.
   Bí mật chỉ nằm trong server/tuvan.env (đã nằm ngoài git; quyền 600). Chỉ cập nhật tuvan.env.example với giá trị trống.
3. Không mở thêm cổng ra Internet. Máy chủ và bot chỉ nghe 127.0.0.1. Không đụng tới cổng 8642 của Hermes.
   Không sửa cấu hình Hermes mặc định hay bot Telegram cá nhân của chủ máy.
4. Người dùng là học sinh chưa thành niên: thu thập tối thiểu; không hỏi họ tên đầy đủ, số định danh, địa chỉ, số điện thoại.
   Các mục sức khỏe/kinh tế/gia đình luôn là tuỳ chọn. Không gửi các mục này qua Telegram.
5. Giữ nguyên hành vi hiện có: mở index.html trực tiếp, GitHub Pages (chế độ trình duyệt) và chế độ máy chủ đều phải chạy như cũ.
   Không đổi cấu trúc trạng thái "v: 2" theo kiểu làm hỏng hồ sơ cũ; nếu cần trường mới thì thêm, có giá trị mặc định.
6. Giao diện tiếng Việt, câu ngắn, màu đỏ–vàng theo css/style.css. Giữ dòng bản quyền "© 2026 Dr. Duyen Nguyen. All rights reserved."
   Không thêm tên, logo hay quảng bá của trường/đơn vị tuyển sinh nào khác.
7. Mỗi thay đổi ở máy chủ phải có kiểm thử tự động (unittest, chạy được bằng: python3 -m unittest discover -s server/tests).
   Thay đổi ở web: kiểm thử bằng Playwright hoặc mô tả rõ các bước bấm thử.
8. Cuối cùng báo lại: danh sách file đã đổi, cách chạy thử, kết quả kiểm thử, việc chưa làm hoặc còn nghi ngờ.
   Không tự nhận là "đã kiểm tra" nếu chưa chạy.
```

---

## 5. Các giai đoạn và prompt

### Giai đoạn 1 – Máy chủ: mã mời và nộp khảo sát

```text
[Dán Luật chung ở trên]

NHIỆM VỤ (nhánh: tinh-nang/ma-moi): thêm vào server/tuvan_proxy.py các API sau, đúng thiết kế ở mục 3.1–3.2 của docs/BAN-GIAO-BOT-TELEGRAM.md:
- Mở thêm một listener thứ hai trong cùng tiến trình tại 127.0.0.1:SERVICE_PORT (mặc định 8788), CHỈ phục vụ /api/* và CHỈ
  xác thực bằng header X-Service-Token = BOT_SERVICE_TOKEN (hmac.compare_digest). Nếu BOT_SERVICE_TOKEN trống thì không mở cổng này.
  Cổng 8787 (công khai qua Tailscale Funnel) KHÔNG được nhận X-Service-Token. Không dựa vào địa chỉ 127.0.0.1 hay X-Forwarded-For
  để phân quyền, vì mọi truy cập qua Funnel đều đến từ 127.0.0.1.
- POST   /api/invites            (giáo viên: Bearer token như /api/profiles; hoặc bot qua cổng dịch vụ)
         body {code, className?, days?=7} → {token, link, expiresAt}. link = PUBLIC_ORIGIN + "/?moi=" + token.
- POST   /api/invites/batch      (như trên) body {className, codes:[...]} tối đa 60 mã → [{code, token, link}]
- GET    /api/invites?class=...  (giáo viên) → danh sách {code, className, createdAt, expiresAt, revoked, submittedAt, submitCount}, KHÔNG trả token
- DELETE /api/invites/<code>     (giáo viên) → thu hồi mọi mã mời còn hạn của mã HS đó
- GET    /api/invite/<token>     (công khai) → {code, className, schoolName?, expiresAt} hoặc 404 nếu sai/hết hạn/thu hồi
- POST   /api/submit/<token>     (công khai) → lưu theo đúng quy tắc mục 3.2 (chỉ nhận profile + tests, ép code, gộp với hồ sơ có sẵn,
         ghi data.home, yêu cầu consent.parent và consent.student đều true, ≤200 KB, 20 lần/10 phút/IP)
Lưu mã mời ở DATA_DIR/invites.json, chỉ lưu SHA-256 của token. Ghi file theo kiểu ghi file tạm rồi đổi tên (an toàn khi đang chạy nhiều luồng).
Mô tả các biến mới ở đầu tuvan_proxy.py.
Thêm server/tests/test_invites.py: khởi động máy chủ ở cổng tạm với DATA_DIR tạm, kiểm tra ít nhất:
tạo mã mời; mã sai/hết hạn/thu hồi trả 404; nộp thiếu đồng thuận bị từ chối; nộp không ghi đè data.final/tracking đã có;
code trong state bị ép đúng mã HS; gửi X-Service-Token đúng vào cổng 8787 vẫn bị từ chối (401); cổng dịch vụ từ chối khoá sai;
không thấy token gốc trong invites.json.
Thêm BOT_SERVICE_TOKEN và SERVICE_PORT=8788 vào tuvan.env.example.
```

**Nghiệm thu:** chạy `python3 -m unittest discover -s server/tests` → tất cả đạt. Đọc lướt diff: không có token/mật khẩu thật; các API cũ không đổi.

### Giai đoạn 2 – Web: chế độ khảo sát tại nhà

```text
[Dán Luật chung ở trên]

NHIỆM VỤ (nhánh: tinh-nang/khao-sat-tai-nha): trong js/app.js (và css/style.css nếu cần) thêm chế độ khảo sát tại nhà:
- Khi URL có ?moi=<token> và web đang chạy qua máy chủ (SRV.on): gọi GET /api/invite/<token>.
  Sai/hết hạn → màn hình báo "Link không còn hiệu lực, vui lòng liên hệ giáo viên". Đúng → vào chế độ khảo sát.
- Chế độ khảo sát: thanh bước chỉ còn "Đồng ý tham gia → Bước 1 → Bước 2 → Nộp". Ẩn Bước 3–7, nút Giáo viên, Lưu hồ sơ, Mã hồ sơ.
  Ô Mã học sinh điền sẵn và khoá. Trợ lý tư vấn vẫn dùng được.
- Màn hình đồng thuận theo mục 3.2 (2 ô đánh dấu riêng cho cha mẹ và học sinh, lời giải thích ngắn dễ hiểu).
- Nháp lưu vào localStorage với khoá "ctv_home_<8 ký tự đầu của token>", KHÔNG dùng chung khoá ctv_state_v1.
- Màn hình Nộp: tóm tắt ngắn đã làm được gì, các mục còn thiếu (dùng missingFields() chỉ cho Bước 1–2), nút "Nộp cho giáo viên"
  → POST /api/submit/<token>. Thành công: "Đã gửi. Hẹn gặp ở buổi tư vấn." và cho phép sửa rồi nộp lại.
- Mở index.html trực tiếp hoặc trên GitHub Pages với ?moi=: báo "Link này cần mở qua địa chỉ của nhà trường", không lỗi JS.
- Giao diện điện thoại (rộng 360px) phải dùng được: trắc nghiệm từng câu bấm dễ, không tràn ngang.
Kiểm thử: script Playwright (đặt ở server/tests/e2e_khao_sat.py) chạy máy chủ với DATA_DIR tạm, tạo mã mời qua API,
mở link ở khung 390x844, đồng ý, điền ngẫu nhiên (nút demo có sẵn), nộp, rồi đọc /api/profiles/<mã> thấy data.home.
```

**Nghiệm thu:** mở thử link trên điện thoại thật qua Funnel; nộp xong thì vào Khu vực giáo viên thấy hồ sơ, Bước 1–2 đã có dữ liệu.

### Giai đoạn 3 – Bot Telegram cho giáo viên

```text
[Dán Luật chung ở trên]

NHIỆM VỤ (nhánh: tinh-nang/bot-giao-vien): tạo server/tuvan_bot.py theo mục 3.3 của docs/BAN-GIAO-BOT-TELEGRAM.md.
- Đọc cấu hình từ biến môi trường (do start script nạp từ server/tuvan.env): TUVAN_BOT_TOKEN, TEACHER_TELEGRAM_IDS, BOT_SERVICE_TOKEN,
  SERVICE_URL (mặc định http://127.0.0.1:8788 – cổng dịch vụ nội bộ ở Giai đoạn 1, KHÔNG dùng cổng 8787). Thiếu TUVAN_BOT_TOKEN → in thông báo rõ ràng và thoát, KHÔNG in giá trị biến.
- Long polling getUpdates (timeout 50s), xử lý lỗi mạng bằng chờ tăng dần, không làm sập tiến trình.
- Lệnh: /start, /trogiup, /taolink, /danhsach, /chuanop, /hoso, /canhbao, /theodoi, /xuat, /thuhoi (giai đoạn này CHƯA làm /taolop).
  Mọi lệnh gọi API máy chủ với header X-Service-Token. Thêm vào máy chủ những API đọc còn thiếu (ví dụ tóm tắt hồ sơ đã lọc bỏ
  health/econ/ý kiến tự do), có kiểm thử.
- /taolink trả tin nhắn có link + ảnh QR PNG (thư viện segno). Ghi segno vào server/requirements-bot.txt.
- Thông báo khi có học sinh nộp: máy chủ ghi sự kiện vào DATA_DIR/events.jsonl; bot đọc tiếp từ vị trí đã đọc (lưu offset)
  và gửi cho giáo viên đã tạo mã mời (createdBy = Telegram ID). Không gửi vào nhóm.
- Từ chối lịch sự với người không có trong TEACHER_TELEGRAM_IDS và với tin nhắn trong nhóm.
- Thêm server/start_bot.sh (giống start_tuvan.sh: chmod 600 tuvan.env, nạp biến, chạy bot).
- Kiểm thử: server/tests/test_bot.py giả lập Telegram API bằng một máy chủ HTTP giả cục bộ (không gọi Telegram thật),
  kiểm tra phân quyền, phân tích lệnh, và chắc chắn tin nhắn gửi đi không chứa health/econ.
- Viết server/HUONG-DAN-BOT-GIAO-VIEN.md: tạo bot ở @BotFather, lấy Telegram ID của giáo viên, điền tuvan.env, chạy thử.
```

**Nghiệm thu:** tạo bot thử, nhắn `/taolink HS999 10A1` → nhận link + QR; mở link, nộp → bot báo về; `/hoso HS999` không có dữ liệu sức khỏe/kinh tế.

### Giai đoạn 4 – QR cả lớp và xuất danh sách

```text
[Dán Luật chung ở trên]

NHIỆM VỤ (nhánh: tinh-nang/qr-ca-lop):
- Bot: /taolop 10A1 HS001-HS045 (khoảng mã có số), và nhận file .csv (cột ma_hs,lop; tối đa 60 dòng) gửi vào bot.
  Gọi POST /api/invites/batch, rồi gửi lại 1 file PDF để in: khổ A4, mỗi trang 8 ô, mỗi ô có QR + mã HS + lớp + hạn dùng
  + một dòng hướng dẫn "Quét mã, cha mẹ cùng con làm khảo sát trước buổi tư vấn". KHÔNG in tên học sinh.
  Kèm 1 file CSV (ma_hs, lop, link, het_han) để gửi qua Zalo/email nếu cần.
- Khu vực giáo viên trên web: thêm thẻ "Khảo sát tại nhà": tạo mã mời cho 1 em hoặc cả lớp, tải PDF/CSV giống bot,
  xem đã nộp/chưa nộp, thu hồi.
- Thêm thư viện tạo PDF vào server/requirements-bot.txt (đề xuất reportlab), hoặc tạo trang HTML in được nếu muốn tránh phụ thuộc.
- Kiểm thử: tạo 45 mã → PDF có 6 trang; CSV có 45 dòng; mã đã thu hồi không còn mở được.
```

**Nghiệm thu:** in thử 1 trang, quét QR bằng điện thoại mở đúng trang khảo sát của đúng mã HS.

### Giai đoạn 5 – Chạy 24/7 và tài liệu

```text
[Dán Luật chung ở trên]

NHIỆM VỤ (nhánh: tinh-nang/van-hanh):
- Mở rộng server/cai-dat-tu-chay.sh để cài thêm dịch vụ launchd cho bot (nhãn vn.tuvan.bot), tự khởi động lại khi lỗi,
  log ra ~/Library/Logs/tuvan-bot.log (không ghi token vào log). Không động vào dịch vụ vn.tuvan.proxy đang chạy ngoài việc khởi động lại có hỏi trước.
- Thêm lệnh sao lưu: server/sao-luu-du-lieu.sh nén DATA_DIR thành ~/web-demo-backup/du-lieu-YYYYMMDD.tar.gz, giữ 14 bản gần nhất.
- Cập nhật README.md (bảng chức năng, cấu trúc thư mục), so-do.html (thêm luồng QR → khảo sát → bot), docs/QUAY-VE-PHIEN-BAN-CU.md
  (thêm dòng phien-ban/v2.3 sau khi gộp).
- Viết docs/HUONG-DAN-GIAO-VIEN-KHAO-SAT.md: 1 trang cho giáo viên, các bước từ tạo QR đến mở hồ sơ hôm tư vấn.
```

**Nghiệm thu:** khởi động lại Mac → web và bot tự chạy; chạy sao lưu ra file nén; hướng dẫn giáo viên đọc hiểu được mà không cần hỏi thêm.

---

## 6. Đề xuất thêm (chọn làm sau, mỗi mục là một giai đoạn nhỏ)

1. **Nhắc tự động.** Hai ngày sau khi tạo mã mời, bot nhắc giáo viên danh sách em chưa nộp. Đến cuối học kỳ 1 và cuối năm, bot nhắc đợt theo dõi Bước 7 và tạo sẵn link theo dõi cho từng em.
2. **Đặt lịch tư vấn.** Giáo viên mở các khung giờ bằng `/molich`; sau khi nộp khảo sát, phụ huynh chọn một khung ngay trên web. Bot báo lịch trong ngày cho giáo viên.
3. **Phiếu H5 cho cha mẹ xem trước.** Link chỉ đọc, hạn 7 ngày, để cha mẹ đọc Phiếu tóm tắt trước buổi gặp. Buổi tư vấn sẽ ngắn và đúng trọng tâm hơn.
4. **Bảng tổng hợp khối cho tổ tư vấn và Ban giám hiệu.** Phân bố nhóm Holland, các tổ hợp học sinh đang nghiêng về, so với chỉ tiêu từng tổ hợp của trường. Nhà trường thấy sớm tổ hợp nào sắp quá tải để tư vấn cân bằng. Lưu ý không ép học sinh đổi tổ hợp chỉ vì thuận tiện xếp lớp (KH 4773).
5. **Độ tin cậy của bài làm.** Đánh dấu bài làm quá nhanh, chọn cùng một đáp án liên tục, hoặc thang "thành thật" (S) của Eysenck thấp. Giáo viên nên hỏi lại em đó trong buổi tư vấn, không kết luận dựa vào kết quả này.
6. **Phản hồi an toàn.** Nếu ô tự do có dấu hiệu khủng hoảng, web hiện ngay số 111 (Tổng đài bảo vệ trẻ em) và 115 cho học sinh. Đồng thời gửi một thông báo riêng, không kèm nội dung, cho giáo viên phụ trách tư vấn tâm lý để chủ động liên hệ. Phần này cần nhà trường duyệt quy trình trước khi bật.
7. **Nhật ký truy cập và thời hạn lưu.** Ghi ai đã xem hoặc sửa hồ sơ nào, lúc nào. Tự xoá mã mời hết hạn sau 30 ngày. Có lệnh xoá toàn bộ hồ sơ của một em khi cha mẹ yêu cầu. Những việc này giúp minh bạch theo quy định bảo vệ dữ liệu cá nhân.
8. **Zalo.** Link khảo sát gửi được ngay vào nhóm Zalo lớp. Về lâu dài có thể làm Zalo Official Account cho nhà trường, vì phụ huynh dùng Zalo nhiều hơn Telegram.

---

## 7. Những điều tuyệt đối tránh

- Gắn web hoặc bot tư vấn vào **bot Telegram cá nhân** đang chạy Hermes của chủ máy.
- Mở cổng 8642 của Hermes hoặc cổng dịch vụ 8788 ra Internet. Funnel chỉ trỏ tới 8787.
- Phân quyền dựa vào địa chỉ 127.0.0.1 hoặc header `X-Forwarded-For`.
- Lưu hoặc in token, mật khẩu ra log, tin nhắn, commit.
- Bắt học sinh tạo tài khoản Telegram để làm khảo sát.
- Gửi dữ liệu sức khỏe, kinh tế, hoàn cảnh gia đình hoặc ý kiến tự do của học sinh qua Telegram.
- Push thẳng lên `main` hoặc sửa nhánh `phien-ban/*`.
