#!/bin/bash
# Khởi động trạm trung gian "Cổng thông tin tư vấn học sinh" trên Mac.
# © 2026 Dr. Duyen Nguyen. Bảo lưu mọi quyền.
# - Tự đọc API_SERVER_KEY từ ~/.hermes/profiles/tuvan/.env (không cần dán khóa)
# - Đọc thêm cấu hình trong server/tuvan.env (PUBLIC_ORIGIN, TEACHER_PASSWORD, DATA_DIR, RATE_LIMIT, PROXY_PORT)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
WEB="$(dirname "$DIR")"
ENVF="$HOME/.hermes/profiles/tuvan/.env"

[ -f "$DIR/tuvan.env" ] && chmod 600 "$DIR/tuvan.env" 2>/dev/null; [ -f "$DIR/tuvan.env" ] && set -a && . "$DIR/tuvan.env" && set +a

KEY="$(grep -E '^API_SERVER_KEY=' "$ENVF" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [ -z "$KEY" ]; then
  echo "Chưa có API_SERVER_KEY trong $ENVF – trợ lý trên web sẽ chạy chế độ demo (xem HUONG-DAN-KET-NOI-HERMES.md)"
fi
[ -z "$TEACHER_PASSWORD" ] && echo "Chưa đặt TEACHER_PASSWORD trong server/tuvan.env – khu vực giáo viên trên máy chủ sẽ tắt"

export HERMES_KEY="$KEY"
export WEB_DIR="$WEB"
export DATA_DIR="${DATA_DIR:-$HOME/web-demo-data}"
export TEACHER_PASSWORD
export ALLOWED_ORIGINS="null${PUBLIC_ORIGIN:+,$PUBLIC_ORIGIN}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

if command -v python3 >/dev/null 2>&1 && python3 -c "import sys" >/dev/null 2>&1; then
  exec python3 "$DIR/tuvan_proxy.py"
else
  exec uv run python "$DIR/tuvan_proxy.py"
fi
