#!/bin/bash
# Cài trạm trung gian và Bot Telegram thành dịch vụ tự chạy (launchd) trên Mac:
# tự khởi động khi đăng nhập, tự chạy lại nếu bị dừng.
# Gỡ dịch vụ:
#   bash cai-dat-tu-chay.sh go          (gỡ cả proxy và bot)
#   bash cai-dat-tu-chay.sh go-bot      (chỉ gỡ bot)
#   bash cai-dat-tu-chay.sh go-proxy    (chỉ gỡ proxy)
# © 2026 Dr. Duyen Nguyen. All rights reserved.

DIR="$(cd "$(dirname "$0")" && pwd)"
LABEL_PROXY="vn.tuvan.proxy"
LABEL_BOT="vn.tuvan.bot"

PL_PROXY="$HOME/Library/LaunchAgents/$LABEL_PROXY.plist"
PL_BOT="$HOME/Library/LaunchAgents/$LABEL_BOT.plist"

LOG_PROXY="$HOME/Library/Logs/tuvan-proxy.log"
LOG_BOT="$HOME/Library/Logs/tuvan-bot.log"

ACTION="${1:-all}"

# ---- Xử lý gỡ dịch vụ ----
if [ "$ACTION" = "go" ] || [ "$ACTION" = "go-all" ]; then
  launchctl unload "$PL_PROXY" 2>/dev/null || true
  rm -f "$PL_PROXY"
  launchctl unload "$PL_BOT" 2>/dev/null || true
  rm -f "$PL_BOT"
  echo "Đã gỡ toàn bộ dịch vụ ($LABEL_PROXY và $LABEL_BOT)."
  exit 0
fi

if [ "$ACTION" = "go-bot" ]; then
  launchctl unload "$PL_BOT" 2>/dev/null || true
  rm -f "$PL_BOT"
  echo "Đã gỡ dịch vụ $LABEL_BOT."
  exit 0
fi

if [ "$ACTION" = "go-proxy" ]; then
  launchctl unload "$PL_PROXY" 2>/dev/null || true
  rm -f "$PL_PROXY"
  echo "Đã gỡ dịch vụ $LABEL_PROXY."
  exit 0
fi

# ---- Cài đặt / Khởi động dịch vụ ----
chmod +x "$DIR/start_tuvan.sh" 2>/dev/null || true
chmod +x "$DIR/start_bot.sh" 2>/dev/null || true
chmod 600 "$DIR/tuvan.env" 2>/dev/null || true

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

# 1. Cài đặt Proxy Server (nếu chọn all hoặc proxy)
if [ "$ACTION" = "all" ] || [ "$ACTION" = "proxy" ]; then
  NEED_INSTALL_PROXY=true
  if [ -f "$PL_PROXY" ] && launchctl list 2>/dev/null | grep -q "$LABEL_PROXY"; then
    echo "Dịch vụ $LABEL_PROXY hiện đang chạy."
    read -p "Thầy/Cô có muốn nạp lại cấu hình dịch vụ proxy không? [y/N]: " ANS_PROXY
    if [ "$ANS_PROXY" != "y" ] && [ "$ANS_PROXY" != "Y" ]; then
      echo "Giữ nguyên dịch vụ $LABEL_PROXY đang chạy."
      NEED_INSTALL_PROXY=false
    fi
  fi

  if [ "$NEED_INSTALL_PROXY" = true ]; then
    cat > "$PL_PROXY" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL_PROXY</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$DIR/start_tuvan.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>15</integer>
  <key>StandardOutPath</key><string>$LOG_PROXY</string>
  <key>StandardErrorPath</key><string>$LOG_PROXY</string>
</dict>
</plist>
EOF
    launchctl unload "$PL_PROXY" 2>/dev/null || true
    launchctl load "$PL_PROXY"
    sleep 2
    if curl -s http://127.0.0.1:8787/health 2>/dev/null | grep -q ok; then
      echo "✅ Trạm trung gian đang chạy tại http://127.0.0.1:8787 (nhật ký: $LOG_PROXY)"
    else
      echo "⚠️ Chưa thấy trạm proxy phản hồi – xem nhật ký: tail -n 30 $LOG_PROXY"
    fi
  fi
fi

# 2. Cài đặt Bot Telegram (nếu chọn all hoặc bot)
if [ "$ACTION" = "all" ] || [ "$ACTION" = "bot" ]; then
  cat > "$PL_BOT" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL_BOT</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$DIR/start_bot.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>15</integer>
  <key>StandardOutPath</key><string>$LOG_BOT</string>
  <key>StandardErrorPath</key><string>$LOG_BOT</string>
</dict>
</plist>
EOF
  launchctl unload "$PL_BOT" 2>/dev/null || true
  launchctl load "$PL_BOT"
  echo "✅ Đã cài đặt dịch vụ Bot Telegram ($LABEL_BOT)."
  echo "Nhật ký hoạt động của bot: tail -f $LOG_BOT"
fi
