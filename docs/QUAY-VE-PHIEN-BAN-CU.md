# Quay về phiên bản cũ

© 2026 Dr. Duyen Nguyen. Bảo lưu mọi quyền.

Mỗi phiên bản ổn định được gắn nhãn (tag) và có một **Release** trên GitHub:
https://github.com/HanhDNguyen/tu-van-chon-mon-lop-10-demo/releases

| Nhãn | Nội dung chính |
|---|---|
| `v1.0-offline` | Bản Offline ngày 13/10/2026: có TPB, trang quản trị demo (`admin/`), module `holland.js`, gửi hồ sơ ở Bước 5 |
| `v2.0` | Bản 20/10/2026: bỏ TPB; Mã học sinh; Âm nhạc/Mĩ thuật Đạt/Chưa đạt; giải thích “Vì sao gợi ý ngành” + sơ đồ liên kết; Bước 4 chỉ dùng tổ hợp của trường, loại môn không muốn học, lấy tổ hợp từ link web trường; Lưu hồ sơ; Khu vực giáo viên (danh mục hồ sơ, nhập Google Form); máy chủ có đăng nhập giáo viên |

## Cách 1 – Không cần dùng lệnh
1. Mở trang Releases ở trên, chọn phiên bản muốn quay về.
2. Tải **Source code (zip)**, giải nén.
3. Chép đè toàn bộ nội dung vào thư mục web (trên Mac: `~/web-demo`). **Không xoá** thư mục `~/web-demo-data` và file `server/tuvan.env`.
4. Tải lại trang web (Ctrl+F5).

## Cách 2 – Bằng git (cho người quản trị/Hermes)
```bash
cd ~/web-demo
git fetch --tags
git checkout v1.0-offline        # xem/chạy bản cũ
git checkout main                # trở lại bản mới nhất
```
Muốn bản cũ trở thành bản chính thức trên GitHub (kể cả GitHub Pages), **không xoá lịch sử**, mà tạo một lần cập nhật đảo ngược:
```bash
git checkout main
git revert --no-edit v1.0-offline..HEAD   # đảo ngược mọi thay đổi sau v1.0-offline
git push
```

## Lưu ý về dữ liệu
- Hồ sơ học sinh và danh sách trường trên máy chủ nằm ở `~/web-demo-data`, không thuộc mã nguồn nên đổi phiên bản không mất.
- Bản cũ có thể không đọc được hồ sơ lưu theo cấu trúc mới (và ngược lại). Nên sao lưu `~/web-demo-data` trước khi đổi.
- Dữ liệu lưu trên trình duyệt (chế độ mở file trực tiếp hoặc GitHub Pages) chỉ nằm trên máy đó.

## Khi phát hành phiên bản mới
Gắn nhãn tăng dần (`v2.1`, `v2.2`… cho sửa nhỏ; `v3.0` cho thay đổi lớn) và tạo Release kèm ghi chú thay đổi.
