#!/bin/bash
# Khởi động Bot Telegram cho giáo viên tư vấn chọn môn lớp 10 trên Mac/Linux.
# © 2026 Dr. Duyen Nguyen. All rights reserved.
# - Bảo mật: chmod 600 tuvan.env trước khi nạp
# - Tự nạp biến môi trường từ server/tuvan.env
# - Kết nối máy chủ nội bộ qua cổng SERVICE_PORT (8788)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$DIR/tuvan.env" ]; then
  chmod 600 "$DIR/tuvan.env" 2>/dev/null || true
  set -a
  . "$DIR/tuvan.env"
  set +a
else
  echo "Cảnh báo: Không tìm thấy file $DIR/tuvan.env. Hãy sao chép từ tuvan.env.example."
fi

if [ -z "$TUVAN_BOT_TOKEN" ]; then
  echo "Lỗi: Chưa cấu hình TUVAN_BOT_TOKEN trong server/tuvan.env. Thoát."
  exit 1
fi

if [ -z "$BOT_SERVICE_TOKEN" ]; then
  echo "Cảnh báo: BOT_SERVICE_TOKEN đang trống. Bot sẽ không gọi được cổng dịch vụ nội bộ 8788."
fi

export DATA_DIR="${DATA_DIR:-$HOME/web-demo-data}"
export SERVICE_URL="${SERVICE_URL:-http://127.0.0.1:8788}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

WEB="$(dirname "$DIR")"
if [ -x "$WEB/.venv/bin/python" ]; then
  exec "$WEB/.venv/bin/python" "$DIR/tuvan_bot.py"
elif command -v python3 >/dev/null 2>&1 && python3 -c "import sys" >/dev/null 2>&1; then
  exec python3 "$DIR/tuvan_bot.py"
else
  exec python "$DIR/tuvan_bot.py"
fi
