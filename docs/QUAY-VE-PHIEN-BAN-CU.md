# Quay về phiên bản cũ

© 2026 Dr. Duyen Nguyen. Bảo lưu mọi quyền.

Mỗi phiên bản ổn định được lưu thành một **nhánh** riêng trên GitHub, tên dạng `phien-ban/<số phiên bản>`. Nhánh `main` luôn là bản mới nhất (bản GitHub Pages đang chạy).
Xem các nhánh: https://github.com/HanhDNguyen/tu-van-chon-mon-lop-10-demo/branches

| Nhánh | Nội dung chính |
|---|---|
| `phien-ban/v1.0-offline` | Bản Offline ngày 13/10/2026: có TPB, trang quản trị demo (`admin/`), module `holland.js`, gửi hồ sơ ở Bước 5 |
| `phien-ban/v2.0` | Bản 20/10/2026: bỏ TPB; Mã học sinh; Âm nhạc/Mĩ thuật Đạt/Chưa đạt; giải thích “Vì sao gợi ý ngành” + sơ đồ liên kết; Bước 4 chỉ dùng tổ hợp của trường, loại môn không muốn học, lấy tổ hợp từ link web trường; Lưu hồ sơ; Khu vực giáo viên (danh mục hồ sơ, nhập Google Form); máy chủ có đăng nhập giáo viên |

## Cách 1 – Không cần dùng lệnh
1. Tải file zip của phiên bản muốn quay về:
   - v1.0-offline: https://github.com/HanhDNguyen/tu-van-chon-mon-lop-10-demo/archive/refs/heads/phien-ban/v1.0-offline.zip
   - v2.0: https://github.com/HanhDNguyen/tu-van-chon-mon-lop-10-demo/archive/refs/heads/phien-ban/v2.0.zip
   (hoặc vào trang repo → chọn nhánh → nút **Code** → **Download ZIP**)
2. Giải nén.
3. Chép đè toàn bộ nội dung vào thư mục web (trên Mac: `~/web-demo`). **Không xoá** thư mục `~/web-demo-data` và file `server/tuvan.env`.
4. Tải lại trang web (Ctrl+F5).

## Cách 2 – Bằng git (cho người quản trị/Hermes)
```bash
cd ~/web-demo
git fetch origin
git checkout origin/phien-ban/v1.0-offline   # xem/chạy bản cũ
git checkout main                # trở lại bản mới nhất
```
Muốn bản cũ trở thành bản chính thức trên GitHub (kể cả GitHub Pages), **không xoá lịch sử**, mà tạo một lần cập nhật đảo ngược:
```bash
git checkout main
git revert --no-edit origin/phien-ban/v1.0-offline..HEAD   # đảo ngược mọi thay đổi sau v1.0-offline
git push
```

## Lưu ý về dữ liệu
- Hồ sơ học sinh và danh sách trường trên máy chủ nằm ở `~/web-demo-data`, không thuộc mã nguồn nên đổi phiên bản không mất.
- Bản cũ có thể không đọc được hồ sơ lưu theo cấu trúc mới (và ngược lại). Nên sao lưu `~/web-demo-data` trước khi đổi.
- Dữ liệu lưu trên trình duyệt (chế độ mở file trực tiếp hoặc GitHub Pages) chỉ nằm trên máy đó.

## Khi phát hành phiên bản mới
Đẩy bản lên `main`, rồi tạo nhánh `phien-ban/<số>` trỏ vào đúng lần cập nhật đó (`v2.1`, `v2.2`… cho sửa nhỏ; `v3.0` cho thay đổi lớn). **Không sửa** các nhánh `phien-ban/...` đã tạo.
(Tuỳ chọn) Trên GitHub có thể tạo thêm Release: Releases → Draft a new release → tạo tag mới từ nhánh tương ứng.
