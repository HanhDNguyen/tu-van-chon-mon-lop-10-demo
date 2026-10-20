# Quy ước nhập danh sách tổ hợp môn của trường

© 2026 Dr. Duyen Nguyen. Bảo lưu mọi quyền. Tài liệu nội bộ cho giáo viên/người quản trị – không hiển thị trên trang web.

Dùng cho ô danh sách tổ hợp trong hộp thoại **Thêm / cập nhật trường** (Bước 4 hoặc Khu vực giáo viên).

## Cú pháp
- **Mỗi dòng một tổ hợp.**
- Ghi **đúng 4 môn lựa chọn**, cách nhau bằng dấu phẩy.
- Nếu trường đã công bố cụm chuyên đề: thêm dấu **`|`** rồi ghi **đúng 3 cụm chuyên đề** (3 môn khác nhau).

```
Lí, Hoá, Sinh, Tin | Toán, Lí, Hoá
Địa, KT&PL, Tin, CN | Văn, Sử, Địa
Lí, Hoá, Tin, CN
```

## Tên môn được nhận
| Môn | Có thể viết |
|---|---|
| Địa lí | Địa, Địa lí, Địa lý |
| Giáo dục kinh tế và pháp luật | KT&PL, GDKT&PL, Kinh tế và pháp luật |
| Vật lí | Lí, Lý, Vật lí, Vật lý |
| Hoá học | Hoá, Hóa, Hoá học |
| Sinh học | Sinh, Sinh học |
| Công nghệ | CN, Công nghệ |
| Tin học | Tin, Tin học |
| Âm nhạc | Nhạc, Âm nhạc |
| Mĩ thuật | Mĩ thuật, Mỹ thuật |
| Chỉ dùng cho cụm chuyên đề | Toán; Văn, Ngữ văn; Sử, Lịch sử |

## Kiểm tra khi lưu
- Dòng không đủ 4 môn khác nhau, hoặc phần chuyên đề không đủ 3 cụm khác nhau → web báo lỗi theo số dòng, không lưu.
- Trường cùng tên đã có → danh sách được cập nhật thay vì tạo trường mới.
