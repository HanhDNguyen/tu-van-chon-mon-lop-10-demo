# Hướng dẫn giáo viên: Khảo sát tại nhà qua QR & Buổi tư vấn trực tiếp

© 2026 Dr. Duyen Nguyen. All rights reserved.  
Tài liệu hướng dẫn thực hành tóm tắt trong 1 trang dành cho Giáo viên chủ nhiệm / Giáo viên tư vấn chọn môn lớp 10.

---

## 1. Ý nghĩa quy trình

Thay vì mất thời gian ngồi làm trắc nghiệm kéo dài tại trường:
- **Tại nhà**: Cha mẹ cùng con quét QR trên điện thoại làm trước Bước 1 (dữ liệu nền tảng) và Bước 2 (trắc nghiệm Holland, Eysenck, MBTI) $\rightarrow$ bấm **Nộp cho giáo viên**.
- **Hôm sau tại trường**: Giáo viên mở sẵn hồ sơ trên web, cùng gia đình thảo luận thẳng vào Bước 3–6 (chọn nhóm ngành và chốt tổ hợp môn).

---

## 2. Quy trình 5 bước thực hiện

### Bước 1: Tạo mã mời và in phiếu khảo sát (trên Telegram)
Mở ứng dụng Telegram, vào khung trò chuyện riêng với **Bot Tư Vấn**:
- **Tạo cho cả lớp**: Gõ lệnh `/taolop <tên_lớp> <từ_mã>-<đến_mã>`  
  *Ví dụ:* `/taolop 10A1 HS001-HS045`  
  *(Hoặc kéo thả file `.csv` có cột `ma_hs,lop` vào bot).*
- **Tạo cho 1 học sinh**: Gõ lệnh `/taolink <mã_HS> [lớp]`  
  *Ví dụ:* `/taolink HS001 10A1`
- **Kết quả bot gửi về**:
  1. **1 file PDF in A4**: Gồm các ô phiếu (8 ô/trang, có viền đứt nét để cắt rời bằng kéo). Mỗi ô in sẵn mã QR, mã HS, lớp, hạn dùng 7 ngày, hướng dẫn cho phụ huynh. **Không in tên học sinh** để bảo vệ dữ liệu cá nhân.
  2. **1 file CSV**: Chứa link khảo sát trực tiếp của từng em.

### Bước 2: Phát phiếu hoặc gửi link cho cha mẹ & học sinh
- Giáo viên in file PDF, dùng kéo cắt rời từng ô phiếu và phát cho học sinh mang về nhà.
- Hoặc giáo viên có thể sao chép link từ file CSV gửi trực tiếp qua tin nhắn Zalo/email cho phụ huynh.
- **Lưu ý**: Phụ huynh và học sinh mở trên trình duyệt điện thoại (quét QR hoặc bấm link), **không cần cài Telegram, không cần lập tài khoản**.

### Bước 3: Cha mẹ và học sinh làm khảo sát tại nhà
1. Mở link $\rightarrow$ đọc thông tin và tích chọn 2 ô đồng thuận (cha mẹ đồng ý + học sinh đồng ý).
2. Hoàn thành Bước 1 (học lực lớp 9, môn yêu thích, môn ngại học, điều kiện gia đình).
3. Hoàn thành Bước 2 (bài trắc nghiệm sở thích nghề nghiệp Holland, khí chất Eysenck, tính cách MBTI).
4. Kiểm tra tóm tắt và bấm nút **"Nộp cho giáo viên"**.

### Bước 4: Theo dõi tiến độ trước buổi tư vấn (trên Telegram)
- Mỗi khi có học sinh nộp bài, bot sẽ **tự động gửi thông báo** về Telegram cho giáo viên.
- Giáo viên có thể chủ động kiểm tra bằng các câu lệnh:
  - `/danhsach 10A1`: Xem danh sách cả lớp (em nào đã nộp, em nào chưa).
  - `/chuanop 10A1`: Lọc nhanh các em chưa nộp để nhắc nhở trước buổi tư vấn.
  - `/hoso HS001`: Xem nhanh tóm tắt kết quả trắc nghiệm và số mục còn thiếu.
  - `/thuhoi HS001`: Thu hồi mã mời nếu học sinh chuyển lớp hoặc tạo nhầm.

### Bước 5: Buổi tư vấn trực tiếp tại trường
1. Giáo viên đăng nhập vào **Khu vực giáo viên** trên web cổng tư vấn của trường.
2. Bấm mở mã học sinh tương ứng (dữ liệu Bước 1 và 2 đã điền sẵn đầy đủ từ bài làm tại nhà).
3. Cùng học sinh và cha mẹ phân tích:
   - **Bước 3**: Khám phá danh sách 36 ngành nghề phù hợp.
   - **Bước 4**: Đối chiếu với các tổ hợp môn thực tế nhà trường mở tuyển sinh.
   - **Bước 5**: Thảo luận các câu hỏi gợi ý và in **Phiếu tóm tắt H5**.
   - **Bước 6**: Chốt phương án lựa chọn chính thức và phương án dự phòng.
4. **Định kỳ trong năm học (Bước 7)**: Giáo viên gõ lệnh `/theodoi <mã HS> <đợt> hailong=1-5 cangthang=1-5` trên bot (đợt: giuahk1, hk1, giuahk2, cuoinam, hk1-11, cn11, hk1-12) để ghi nhận mức độ hài lòng và căng thẳng của học sinh sau khi học tổ hợp đã chọn. Gõ `/canhbao` để phát hiện sớm các em có nguy cơ quá tải.

---

## Lưu ý quan trọng
- Link và QR chỉ dùng được khi máy chủ của trường đang chạy và `PUBLIC_ORIGIN` trong `server/tuvan.env` là địa chỉ Tailscale Funnel của máy chủ. Mở trên GitHub Pages hoặc mở file trực tiếp, trang sẽ báo “Link này cần mở qua địa chỉ của nhà trường”.
- Link hết hạn sau 7 ngày hoặc khi bị thu hồi (`/thuhoi`). Em nào báo “Link không còn hiệu lực” thì tạo link mới bằng `/taolink`.
- Bài làm dở được giữ trên chính điện thoại/máy tính đã mở link; đổi máy thì phải làm lại từ đầu.
- Bot chỉ báo kết quả trắc nghiệm khi em đã làm **đủ** câu; chưa đủ thì ghi “chưa đủ (n/N)”.
