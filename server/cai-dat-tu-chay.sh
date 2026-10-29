#!/bin/bash
# Cài máy chủ, Bot Telegram và dịch vụ tự cập nhật thành dịch vụ tự chạy (launchd) trên Mac:
# tự khởi động khi đăng nhập, tự chạy lại nếu bị dừng.
#   bash cai-dat-tu-chay.sh             (cài cả ba: proxy, bot, tự cập nhật)
#   bash cai-dat-tu-chay.sh proxy|bot|capnhat   (chỉ cài một dịch vụ)
# Gỡ dịch vụ:
#   bash cai-dat-tu-chay.sh go          (gỡ cả ba)
#   bash cai-dat-tu-chay.sh go-bot | go-proxy | go-capnhat
# Không hỏi lại khi cài (dùng trong script khác): KHONG_HOI=1 bash cai-dat-tu-chay.sh
# © 2026 Dr. Duyen Nguyen. All rights reserved.

DIR="$(cd "$(dirname "$0")" && pwd -P)"
LABEL_PROXY="vn.tuvan.proxy"
LABEL_BOT="vn.tuvan.bot"
LABEL_UPD="vn.tuvan.capnhat"

PL_PROXY="$HOME/Library/LaunchAgents/$LABEL_PROXY.plist"
PL_BOT="$HOME/Library/LaunchAgents/$LABEL_BOT.plist"
PL_UPD="$HOME/Library/LaunchAgents/$LABEL_UPD.plist"

LOG_PROXY="$HOME/Library/Logs/tuvan-proxy.log"
LOG_BOT="$HOME/Library/Logs/tuvan-bot.log"
LOG_UPD="$HOME/Library/Logs/tuvan-capnhat.log"

ACTION="${1:-all}"

go_service() {  # $1 = đường dẫn plist, $2 = tên
  launchctl unload "$1" 2>/dev/null || true
  rm -f "$1"
  echo "Đã gỡ dịch vụ $2."
}

case "$ACTION" in
  go|go-all) go_service "$PL_PROXY" "$LABEL_PROXY"; go_service "$PL_BOT" "$LABEL_BOT"; go_service "$PL_UPD" "$LABEL_UPD"; exit 0 ;;
  go-proxy) go_service "$PL_PROXY" "$LABEL_PROXY"; exit 0 ;;
  go-bot) go_service "$PL_BOT" "$LABEL_BOT"; exit 0 ;;
  go-capnhat) go_service "$PL_UPD" "$LABEL_UPD"; echo "Mã nguồn sẽ không tự cập nhật nữa."; exit 0 ;;
  all|proxy|bot|capnhat) ;;
  *) echo "Không hiểu lựa chọn: $ACTION"; exit 1 ;;
esac

# ---- Cài đặt / Khởi động dịch vụ ----
chmod +x "$DIR/start_tuvan.sh" "$DIR/start_bot.sh" "$DIR/tu-cap-nhat.sh" 2>/dev/null || true
chmod 600 "$DIR/tuvan.env" 2>/dev/null || true
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

write_plist() {  # $1 plist, $2 label, $3 script, $4 log, $5 = "keep" (chạy liên tục) hoặc số giây lặp lại
  if [ "$5" = "keep" ]; then
    EXTRA="  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>15</integer>"
  else
    EXTRA="  <key>StartInterval</key><integer>$5</integer>"
  fi
  cat > "$1" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$2</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$3</string></array>
  <key>RunAtLoad</key><true/>
$EXTRA
  <key>StandardOutPath</key><string>$4</string>
  <key>StandardErrorPath</key><string>$4</string>
</dict>
</plist>
EOF
  launchctl unload "$1" 2>/dev/null || true
  launchctl load "$1"
}

# 1. Máy chủ (proxy)
if [ "$ACTION" = "all" ] || [ "$ACTION" = "proxy" ]; then
  INSTALL=true
  if [ -z "$KHONG_HOI" ] && [ -f "$PL_PROXY" ] && launchctl list 2>/dev/null | grep -q "$LABEL_PROXY"; then
    read -p "Dịch vụ $LABEL_PROXY đang chạy. Nạp lại cấu hình? [y/N]: " ANS
    [ "$ANS" = "y" ] || [ "$ANS" = "Y" ] || { echo "Giữ nguyên $LABEL_PROXY."; INSTALL=false; }
  fi
  if [ "$INSTALL" = true ]; then
    write_plist "$PL_PROXY" "$LABEL_PROXY" "$DIR/start_tuvan.sh" "$LOG_PROXY" keep
    sleep 3
    if curl -s http://127.0.0.1:8787/health 2>/dev/null | grep -q ok; then
      echo "✅ Máy chủ đang chạy tại http://127.0.0.1:8787 (nhật ký: $LOG_PROXY)"
    else
      echo "⚠️ Chưa thấy máy chủ phản hồi – xem nhật ký: tail -n 30 $LOG_PROXY"
    fi
  fi
fi

# 2. Bot Telegram
if [ "$ACTION" = "all" ] || [ "$ACTION" = "bot" ]; then
  write_plist "$PL_BOT" "$LABEL_BOT" "$DIR/start_bot.sh" "$LOG_BOT" keep
  echo "✅ Đã cài Bot Telegram ($LABEL_BOT). Nhật ký: tail -f $LOG_BOT"
fi

# 3. Tự cập nhật mã nguồn từ GitHub mỗi 5 phút
if [ "$ACTION" = "all" ] || [ "$ACTION" = "capnhat" ]; then
  write_plist "$PL_UPD" "$LABEL_UPD" "$DIR/tu-cap-nhat.sh" "$LOG_UPD" 300
  echo "✅ Đã cài tự cập nhật từ GitHub mỗi 5 phút ($LABEL_UPD). Nhật ký: tail -f $LOG_UPD"
fi
