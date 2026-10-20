# Hướng dẫn nối "Cổng thông tin tư vấn học sinh" với Hermes Agent
### Phương án đã chọn: Tailscale Funnel + trạm trung gian phục vụ luôn web (phương án A)

© 2026 Dr. Duyen Nguyen. Bảo lưu mọi quyền.

## Sơ đồ

```
Máy bất kỳ ── mở https://<ten-may>.<ten-mang>.ts.net ──┐
                                                      ▼
                         Tailscale Funnel (trên Mac, cổng 443 → 8787)
                                                      ▼
            Trạm trung gian tuvan_proxy.py (127.0.0.1:8787)
              • phục vụ các file web  • /chat chuyển câu hỏi
              • giữ khóa API, giới hạn lượt hỏi, không ghi nội dung chat
                                                      ▼
            Hermes API server (127.0.0.1:8642) → profile "tuvan"
              • SOUL.md tư vấn  • chỉ được tìm kiếm web
              • tách biệt hoàn toàn với bot Telegram/email cá nhân
```

Vì sao phải làm như vậy: API server của Hermes cho agent **toàn quyền dùng công cụ trên máy (kể cả terminal)**, mà profile hiện tại của bạn còn nắm email. Profile `tuvan` riêng cùng trạm trung gian giúp học sinh chỉ chạm được vào phần tư vấn.

---

## Bước 1. Chép thư mục web sang Mac
Chép cả thư mục `web-demo` vào thư mục chính của Mac: `~/web-demo`.
Nên chép hẳn ra ngoài, **không** chạy trực tiếp từ thư mục OneDrive. macOS hay chặn dịch vụ nền truy cập thư mục đồng bộ.

## Bước 2. Tạo profile tư vấn
Mở Terminal trên Mac:
```bash
hermes profile create tuvan
tuvan setup                                   # chọn model/nhà cung cấp AI cho profile này
cp ~/web-demo/server/SOUL.md ~/.hermes/profiles/tuvan/SOUL.md
```

## Bước 3. Giới hạn công cụ của profile `tuvan`
Chạy `tuvan tools`. Với nền tảng **api_server**, chỉ giữ nhóm tìm kiếm web (web/search) và tắt toàn bộ phần còn lại.
Thêm lớp chặn chung vào `~/.hermes/profiles/tuvan/config.yaml`:
```yaml
agent:
  disabled_toolsets:
    - terminal
    - file
    - code_execution
    - browser
    - delegation
    - cronjob
    - messaging
    - memory
    - skills
    - image_gen
    - tts
    - debugging
```
(Tên toolset có thể khác theo phiên bản; bước 4 có lệnh kiểm tra.)

## Bước 4. Bật API server
Gateway của profile **mặc định** phục vụ profile `tuvan` qua đường dẫn `/p/tuvan/`.

Thêm vào `~/.hermes/.env`:
```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=<dán kết quả của: openssl rand -hex 32>
```
Thêm vào `~/.hermes/profiles/tuvan/.env` (một khóa **khác**):
```bash
API_SERVER_KEY=<dán kết quả của: openssl rand -hex 32>
```
Không đổi `API_SERVER_HOST` (mặc định 127.0.0.1 là đúng). Khởi động lại rồi kiểm tra:
```bash
hermes gateway restart
K=$(grep '^API_SERVER_KEY=' ~/.hermes/profiles/tuvan/.env | cut -d= -f2-)
curl -s -H "Authorization: Bearer $K" http://127.0.0.1:8642/p/tuvan/v1/toolsets      # chỉ nên còn nhóm web/search
curl -s http://127.0.0.1:8642/p/tuvan/v1/chat/completions -H "Authorization: Bearer $K" \
  -H "Content-Type: application/json" \
  -d '{"model":"hermes-agent","messages":[{"role":"user","content":"Lớp 10 phải chọn mấy môn?"}]}'
```

## Bước 5. Bật Tailscale Funnel
1. Cài Tailscale cho Mac (ứng dụng trên tailscale.com hoặc `brew install tailscale`), rồi đăng nhập.
2. Chạy:
```bash
tailscale funnel --bg 8787
tailscale funnel status          # xem địa chỉ công khai, dạng https://<ten-may>.<ten-mang>.ts.net
```
Lần đầu chạy, Tailscale sẽ đưa một đường link để bật HTTPS/Funnel cho máy. Mở link đó và bấm đồng ý.
(Nếu cài bằng ứng dụng và Terminal báo không có lệnh `tailscale`, dùng đường dẫn `/Applications/Tailscale.app/Contents/MacOS/Tailscale` thay cho `tailscale`.)

## Bước 6. Ghi địa chỉ công khai cho trạm
```bash
cd ~/web-demo/server
cp tuvan.env.example tuvan.env
nano tuvan.env        # sửa PUBLIC_ORIGIN thành địa chỉ ở bước 5 và đặt TEACHER_PASSWORD (mật khẩu khu vực giáo viên); lưu Ctrl+O, thoát Ctrl+X
```

## Bước 7. Cho trạm tự chạy 24/7
```bash
bash ~/web-demo/server/cai-dat-tu-chay.sh
```
Script tự đọc khóa của profile `tuvan` (không cần dán khóa), tạo dịch vụ tự khởi động cùng Mac và tự chạy lại nếu bị dừng.
- Xem nhật ký: `tail -n 30 ~/Library/Logs/tuvan-proxy.log`
- Gỡ dịch vụ: `bash ~/web-demo/server/cai-dat-tu-chay.sh go`
- Muốn chạy thử bằng tay thay vì cài dịch vụ: `bash ~/web-demo/server/start_tuvan.sh`

## Bước 8. Dùng thử
- Trên Mac: mở `http://localhost:8787`.
- Trên máy bất kỳ (kể cả điện thoại): mở `https://<ten-may>.<ten-mang>.ts.net`.

Mở khung "Hỏi trợ lý tư vấn". Dòng nhỏ dưới tiêu đề phải ghi "Câu hỏi được gửi tới hệ thống AI…" thì mới đúng là đang nối với Hermes.
Mở trực tiếp file `index.html` (không qua địa chỉ trên) thì trợ lý tự chạy chế độ demo. Đây là điều bình thường.

## Dữ liệu giáo viên
Hồ sơ học sinh và cơ sở dữ liệu trường lưu ở `~/web-demo-data` trên Mac (đổi bằng `DATA_DIR`). Nên sao lưu thư mục này định kỳ. Đổi mật khẩu: sửa `TEACHER_PASSWORD` trong `server/tuvan.env` rồi chạy lại `bash ~/web-demo/server/cai-dat-tu-chay.sh`.

## Cập nhật web về sau
Chỉ cần sửa file trong `~/web-demo` trên Mac. Mọi máy tải lại trang là thấy bản mới, không phải khởi động lại gì.

## Mac cần lưu ý
- Giữ Mac không ngủ: Cài đặt hệ thống → Màn hình khoá/Năng lượng → bật "Ngăn tự động ngủ khi màn hình tắt" (bot Telegram của bạn chạy 24/7 nên có thể đã bật).
- Mac tắt hoặc mất mạng thì địa chỉ web không mở được. Nếu cần web luôn mở được, có thể chuyển sang phương án B (đưa web lên hosting tĩnh, chỉ phần trợ lý phụ thuộc Mac).

## Danh sách kiểm tra an toàn
- [ ] Profile `tuvan` tách riêng; `/v1/toolsets` chỉ còn nhóm tìm kiếm web.
- [ ] Hai khóa API khác nhau, dài, ngẫu nhiên; không đưa khóa vào file web.
- [ ] API server chỉ nghe ở 127.0.0.1; Funnel chỉ trỏ vào 8787, không trỏ vào 8642.
- [ ] Không gắn bot Telegram cá nhân vào web.
- [ ] `TEACHER_PASSWORD` dài, chỉ chia sẻ cho giáo viên; `~/web-demo-data` không nằm trong thư mục web.
- [ ] Học sinh được nhắc không nhập họ tên đầy đủ, địa chỉ, số điện thoại (web đã hiển thị sẵn).
