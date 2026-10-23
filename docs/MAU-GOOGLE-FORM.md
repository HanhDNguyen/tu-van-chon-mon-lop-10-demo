# Mẫu Google Form khảo sát theo dõi (Bước 7)

© 2026 Dr. Duyen Nguyen. All rights reserved. Bản demo – mẫu câu hỏi dùng tạm.

Web khớp kết quả theo **Mã học sinh** và nhận diện cột theo **tên câu hỏi**. Hãy giữ nguyên các cụm từ in đậm trong tiêu đề câu hỏi (có thể thêm chữ phía sau).

## Cài đặt Form
- Cài đặt → Câu trả lời: **không** thu thập email (học sinh chưa thành niên, thu thập tối thiểu).
- Không hỏi họ tên đầy đủ, số điện thoại, địa chỉ.
- Mỗi đợt khảo sát (cuối HK1, cuối năm…) có thể dùng lại cùng một Form.

## Câu hỏi

| # | Tiêu đề câu hỏi (giữ cụm in đậm) | Loại | Lựa chọn |
|---|---|---|---|
| 1 | **Mã học sinh** | Trả lời ngắn, bắt buộc | Thêm xác thực: “Biểu thức chính quy – khớp” `^[A-Za-z0-9_.-]{1,40}$` |
| 2 | **Thời điểm khảo sát** | Trắc nghiệm, bắt buộc | Giữa HK1 · Cuối HK1 · Giữa HK2 · Cuối năm lớp 10 · Cuối HK1 lớp 11 · Cuối năm lớp 11 · Cuối HK1 lớp 12 |
| 3 | **Mức độ hài lòng chung** với tổ hợp môn đã chọn | Trắc nghiệm, bắt buộc | 5 lựa chọn bên dưới |
| 4 | **Mức độ căng thẳng** trong học tập | Trắc nghiệm, bắt buộc | 5 lựa chọn bên dưới |
| 5 | **Mức độ hài lòng với từng môn** | Lưới trắc nghiệm | Hàng: Địa lí, GD Kinh tế và Pháp luật, Vật lí, Hoá học, Sinh học, Công nghệ, Tin học, Âm nhạc, Mĩ thuật (học sinh chỉ chấm 4 môn mình học – **không** bật “Yêu cầu câu trả lời ở mỗi hàng”). Cột: 1, 2, 3, 4, 5 |
| 6 | **Điểm trung bình** từng môn (không bắt buộc) | Mỗi môn một câu Trả lời ngắn, tiêu đề dạng `Điểm trung bình [Vật lí]` | Xác thực: số từ 0 đến 10 |
| 7 | Bạn có muốn **đổi môn** lựa chọn không? | Trắc nghiệm | Có · Không · Chưa chắc |

Nên dán phần mô tả dưới đây vào ô mô tả của câu 3, 4, 5 để học sinh có cơ sở chấm.

### Câu 3 – Mức độ hài lòng chung (lựa chọn)
1. 1 – Rất không hài lòng: thấy đã chọn sai, không muốn tiếp tục học các môn này
2. 2 – Không hài lòng: nhiều môn không hợp, học thấy nặng nề, hay nghĩ đến chuyện đổi môn
3. 3 – Bình thường: có môn hợp, có môn chưa hợp nhưng vẫn theo được
4. 4 – Hài lòng: phần lớn các môn hợp sở thích và năng lực, học có hứng thú
5. 5 – Rất hài lòng: đúng mong muốn, học hứng thú, thấy rõ ích lợi cho định hướng nghề nghiệp

### Câu 4 – Mức độ căng thẳng (lựa chọn)
1. 1 – Rất thấp: thoải mái, ngủ đủ, theo kịp bài vở
2. 2 – Thấp: đôi khi áp lực trước kiểm tra nhưng nhanh chóng ổn lại
3. 3 – Trung bình: thường áp lực vào mùa kiểm tra, đôi lúc thiếu ngủ, vẫn tự cân bằng được
4. 4 – Cao: thường xuyên lo lắng, mất ngủ hoặc mệt mỏi vì học, khó theo kịp, cần được hỗ trợ
5. 5 – Rất cao: căng thẳng kéo dài, ảnh hưởng ăn ngủ và sức khoẻ, muốn bỏ cuộc; cần gặp giáo viên/tư vấn tâm lý ngay

Gợi ý thêm vào mô tả câu 4: *“Nếu bạn đang rất mệt mỏi hoặc có lúc nghĩ đến việc làm hại bản thân, hãy nói ngay với thầy cô, cha mẹ, hoặc gọi Tổng đài quốc gia bảo vệ trẻ em 111 (miễn phí, 24/7).”*

### Câu 5 – Mức độ hài lòng với từng môn (mô tả cột)
1 Rất không hài lòng (không theo kịp, không hứng thú) · 2 Không hài lòng (thấy khó, ít hứng thú) · 3 Bình thường (theo được, hứng thú vừa phải) · 4 Hài lòng (theo tốt, có hứng thú) · 5 Rất hài lòng (học tốt và rất thích môn này)

## Nhập kết quả vào web
1. Mở Form → Câu trả lời → biểu tượng Google Sheets.
2. Trong Sheets: Tệp → Tải xuống → **.csv** (hoặc .xlsx).
3. Trên web: nút **Giáo viên** → đăng nhập → “Nhập kết quả khảo sát Google Form” → chọn file → **Nhập kết quả**.
4. Web báo mã nào khớp, mã nào chưa có hồ sơ. Mã chưa khớp: tạo và **Lưu hồ sơ** cho học sinh đó trước rồi nhập lại file (dòng đã nhập sẽ không bị nhân đôi).
5. Mức căng thẳng ≥ 4, hài lòng ≤ 2, điểm < 5 hoặc giảm ≥ 1,5 sẽ hiện **cảnh báo sớm** ở Bước 7 của hồ sơ.

File thử: `docs/mau-ket-qua-google-form.csv`.
