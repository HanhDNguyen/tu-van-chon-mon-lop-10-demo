#!/bin/bash
# Khởi động máy chủ "Cổng thông tin tư vấn học sinh" trên Mac.
# © 2026 Dr. Duyen Nguyen. All rights reserved.
# - Đọc cấu hình trong server/tuvan.env (PUBLIC_ORIGIN, TEACHER_PASSWORD, DATA_DIR, RATE_LIMIT, PROXY_PORT, BOT_SERVICE_TOKEN)
# - Không dùng Hermes: trợ lý trên web chạy chế độ demo (trả lời theo bộ câu hỏi có sẵn).
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
WEB="$(dirname "$DIR")"

if [ -f "$DIR/tuvan.env" ]; then
  chmod 600 "$DIR/tuvan.env" 2>/dev/null || true
  set -a; . "$DIR/tuvan.env"; set +a
else
  echo "Chưa có server/tuvan.env – chạy với cấu hình mặc định"
fi
[ -z "$TEACHER_PASSWORD" ] && echo "Chưa đặt TEACHER_PASSWORD trong server/tuvan.env – khu vực giáo viên trên máy chủ sẽ tắt"

# Trợ lý AI trên máy chủ đang tắt: /chat trả 503, web tự dùng chế độ demo.
export HERMES_KEY=""
export WEB_DIR="$WEB"
export DATA_DIR="${DATA_DIR:-$HOME/web-demo-data}"
export TEACHER_PASSWORD
export ALLOWED_ORIGINS="null${PUBLIC_ORIGIN:+,$PUBLIC_ORIGIN}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

if [ -x "$WEB/.venv/bin/python" ]; then
  exec "$WEB/.venv/bin/python" "$DIR/tuvan_proxy.py"
elif command -v python3 >/dev/null 2>&1; then
  exec python3 "$DIR/tuvan_proxy.py"
else
  exec python "$DIR/tuvan_proxy.py"
fi
