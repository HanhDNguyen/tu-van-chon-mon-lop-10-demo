# Trắc nghiệm Bước 2 – nguồn, cách chấm, điểm cần xác nhận

Bước 2 gồm 3 trắc nghiệm: **Holland** (54 câu), **Nhân cách Eysenck** (59 câu) và **Tính cách MBTI** (70 câu).
Hai trắc nghiệm “Tính cách 4 chiều” và “Đa trí tuệ Gardner” trước đây đã được bỏ.

Nội dung câu hỏi, cách chấm và mô tả kết quả lấy từ tài liệu trong thư mục `source` của dự án:

- `2. TN NHÂN CÁCH EYSENCK.docx`
- `3. TN tinh-cach-MBTI.pdf`

Dữ liệu nằm trong `js/data.js` (`EYSENCK`, `EYSENCK_KEY`, `EYSENCK_TYPES`, `MBTI`, `MBTI_DIMS`).

## 1. Nhân cách Eysenck

**Cách trả lời:** mỗi câu chọn Có (+) hoặc Không (−).

**Bảng khoá:** câu *n* nằm ở cột `(n − 1) % 12` của bảng khoá. Câu nhận 1 điểm khi câu trả lời trùng dấu của cột.

| Thang | Cột | Câu tính điểm khi trả lời **Có** | Câu tính điểm khi trả lời **Không** | Tối đa |
|---|---|---|---|---|
| HN – hướng ngoại | 1–5 | 1, 2, 3, 13, 14, 15, 25, 26, 27, 37, 38, 39, 49, 50, 51 | 4, 5, 16, 17, 28, 29, 40, 41, 52, 53 | 25 |
| KOD – không ổn định | 6–10 | 6–10, 18–22, 30–34, 42–46, 54–58 | – | 25 |
| S – thành thật | 11–12 | 11, 23, 35, 47, 59 | 12, 24, 36, 48 | 9 |

**Kiểu khí chất:** xác định theo biểu đồ của tài liệu (trục ngang HN, trục dọc KOD, tâm 12).

| | KOD > 12 (không ổn định) | KOD < 12 (ổn định) |
|---|---|---|
| **HN < 12 (hướng nội)** | Ưu tư | Bình thản |
| **HN > 12 (hướng ngoại)** | Nóng nảy | Hăng hái |

Điểm đúng bằng 12 nằm trên ranh giới. Khi đó web hiện cả hai kiểu khí chất kề nhau.

### Điểm cần cô Duyên xác nhận

1. **Dấu cột 9–10 của bảng khoá (đã sửa).**
   - Bản gốc in dấu “−” ở cột 9–10, tức các câu 9, 10, 21, 22, 33, 34, 45, 46, 57, 58.
   - Nếu theo đúng bản gốc, trả lời *Có* với “mất ngủ”, “hay bực tức”, “run sợ” lại làm *giảm* điểm không ổn định. Điều này ngược với nội dung câu hỏi.
   - Trong bản gốc của Eysenck, mọi câu thuộc thang N đều tính điểm khi trả lời *Có*.
   - Vì vậy web tính “+” cho cả cột 6–10. Có thể bản gốc đã chép nhầm mẫu dấu của nhóm HN (+ + + − −) sang nhóm KOD.
   - Nếu cần theo đúng bản in, chỉ cần đổi hai phần tử thứ 9–10 trong `EYSENCK_KEY` thành `"-"`.
2. **Câu 53** “Bạn có thích trêu đùa người khác không?” (giữ theo bản gốc). Câu nằm ở cột 5 (dấu −), nên trả lời *Không* thì được điểm hướng ngoại. Theo nội dung, có thể câu này nên tính điểm khi trả lời *Có*.
3. **Câu 12** “Có khi nào bạn nói về những điều mà bạn không am hiểu không?” (giữ theo bản gốc). Câu nằm ở cột 12 (dấu −). Ba câu cùng cột là các câu “tốt đẹp quá mức”, như luôn giữ lời hứa hay mọi thói quen đều tốt. Câu 12 lại giống các câu ở cột 11, nơi trả lời *Có* mới là thành thật.
4. **Ngưỡng điểm thành thật S.** Tài liệu không nêu ngưỡng.
   - Web tạm theo cách dùng thang L của Eysenck: S ≤ 4/9 thì cảnh báo “kết quả kém tin cậy”.
   - Khi đó web không dùng khí chất để chấm ngành.
5. **Thang điểm.** Mỗi thang HN và KOD ở đây có 25 câu, trong khi biểu đồ của tài liệu vẽ thang 0–24 với tâm 12. Web giữ tâm 12 như biểu đồ.

### Dùng vào chấm điểm ngành (Bước 3)

Thành phần “Khí chất (Eysenck)” chiếm tối đa 10 điểm. Phần này thay cho thành phần Gardner (15 điểm) trước đây. Holland tăng từ 35 lên 40 điểm. Các thành phần khác giữ nguyên.

- Ngành nằm trong danh sách “công việc phù hợp” của tài liệu cho khí chất của học sinh: **10 điểm**.
- Tài liệu gợi ý ngành đó cho khí chất khác: **0 điểm**.
- Tài liệu không nhắc tới ngành đó, chưa làm đủ trắc nghiệm, hoặc điểm S thấp: **5 điểm** (mức trung bình).

Bảng ghép ngành với gợi ý của tài liệu (trường `ey` trong `CAREERS`) như sau. Mọi cụm từ được trích nguyên từ tài liệu.

| Ngành | Khí chất – cụm từ trong tài liệu |
|---|---|
| Khoa học dữ liệu & AI, Công nghệ sinh học, Khoa học môi trường, Hoá học – Vật liệu | Ưu tư, Bình thản – “nghiên cứu” |
| Kế toán – Kiểm toán | Bình thản – “kế toán”; Ưu tư – “công việc văn phòng” |
| Tài chính – Ngân hàng | Bình thản – “quản lí ngân hàng” |
| Luật | Bình thản – “luật sư” |
| Marketing | Hăng hái – “nhân viên marketing”; Ưu tư, Nóng nảy – “quảng cáo” |
| Báo chí – Truyền thông | Hăng hái – “truyền thông” |
| Du lịch – Khách sạn | Nóng nảy – “hướng dẫn viên du lịch”; Hăng hái – “hướng dẫn viên” |
| Thiết kế đồ hoạ, Thiết kế thời trang – nội thất, Âm nhạc – Nghệ thuật biểu diễn | Ưu tư, Nóng nảy – “sáng tạo nghệ thuật (và quảng cáo)” |
| Công an – Quân đội | Hăng hái – “cảnh sát” |

Các ngành còn lại không có trong danh sách gợi ý của tài liệu.

## 2. Tính cách MBTI

**Cách trả lời:** mỗi câu chọn a hoặc b. Câu *n* nằm ở cột `(n − 1) % 7` của bảng tính điểm. Chọn *a* cộng 1 điểm cho chữ đứng trước, chọn *b* cộng 1 điểm cho chữ đứng sau.

| Chiều | Cột câu hỏi | Câu | Tối đa |
|---|---|---|---|
| E / I | 1 | 1, 8, 15, …, 64 | 10 |
| S / N | 2, 3 | 2, 3, 9, 10, …, 65, 66 | 20 |
| T / F | 4, 5 | 4, 5, 11, 12, …, 67, 68 | 20 |
| J / P | 6, 7 | 6, 7, 13, 14, …, 69, 70 | 20 |

**Kết quả:** theo tài liệu, “Lấy kết quả từ 4 yếu tố có điểm số cao nhất”. Ở mỗi chiều, chữ có điểm cao hơn được chọn. Nếu hai chữ bằng điểm, web ghi “cân bằng”.

**Gợi ý nghề:** tài liệu MBTI **không kèm gợi ý ngành nghề**. Vì vậy MBTI chỉ hiện trong báo cáo để học sinh hiểu bản thân, không tính vào điểm ngành. Nếu có tài liệu gợi ý nghề theo 16 nhóm MBTI, có thể bổ sung sau.

### Câu có thể bị dịch ngược nghĩa (đang giữ theo bản gốc)

Các câu dưới đây có phương án *a* hoặc *b* đọc lên dường như ngược với chiều được tính điểm:

- **Câu 41** (J/P): “a. Được giao trọn gói, làm xong hết rồi bàn giao” được tính J. Nhưng phương án b “Công việc làm hàng ngày, theo lịch” cũng mang nét J.
- **Câu 49** (J/P): “a. Trước khi đưa ra quyết định” được tính J. Tuy vậy, thấy thoải mái *trước* khi quyết định thường là nét P.
- **Câu 65** (S/N): “a. Viết theo hướng văn chương” được tính S, còn “b. Viết theo số liệu, dữ liệu” được tính N. Nhiều khả năng hai phương án đã bị đảo.

## 3. Chỉnh sửa chữ so với bản gốc

Web chỉ sửa lỗi gõ và dấu câu, không đổi nghĩa:

- “tồi tể” → “tồi tệ”
- “vân đề” → “vấn đề”
- “không hề lúng,” → “không hề lúng túng,”
- Thêm dấu ngoặc kép còn thiếu.
- Thêm “phải không?” cuối câu Eysenck 56.
