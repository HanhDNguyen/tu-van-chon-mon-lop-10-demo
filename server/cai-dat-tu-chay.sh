#!/bin/bash
# Cài trạm trung gian thành dịch vụ tự chạy (launchd) trên Mac:
# tự khởi động khi đăng nhập, tự chạy lại nếu bị dừng.
# Gỡ: bash cai-dat-tu-chay.sh go
# © 2026 Dr. Duyen Nguyen. Bảo lưu mọi quyền.
DIR="$(cd "$(dirname "$0")" && pwd)"
LABEL="vn.tuvan.proxy"
PL="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/tuvan-proxy.log"

if [ "$1" = "go" ]; then
  launchctl unload "$PL" 2>/dev/null; rm -f "$PL"
  echo "Đã gỡ dịch vụ $LABEL."; exit 0
fi

chmod +x "$DIR/start_tuvan.sh"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PL" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$DIR/start_tuvan.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>15</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF
launchctl unload "$PL" 2>/dev/null
launchctl load "$PL"
sleep 2
if curl -s http://127.0.0.1:8787/health | grep -q ok; then
  echo "Trạm trung gian đang chạy tại http://127.0.0.1:8787 (nhật ký: $LOG)"
else
  echo "Chưa thấy trạm chạy – xem nhật ký: tail -n 30 $LOG"
fi
