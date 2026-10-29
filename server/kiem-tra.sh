#!/bin/bash
# Kiểm tra nhanh máy chủ + bot trên Mac. Không in token hay mật khẩu: kết quả có thể gửi cho người hỗ trợ.
#   bash server/kiem-tra.sh
# © 2026 Dr. Duyen Nguyen. All rights reserved.
DIR="$(cd "$(dirname "$0")" && pwd -P)"
REPO="$(dirname "$DIR")"
ENVF="$DIR/tuvan.env"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
ok()   { echo "  ✅ $*"; }
bad()  { echo "  ❌ $*"; }
info() { echo "  ·  $*"; }

get_env() { [ -f "$ENVF" ] && K="$1" F="$ENVF" python3 -c '
import os, re
k, v = os.environ["K"], ""
for line in open(os.environ["F"], encoding="utf-8"):
    m = re.match(r"\s*%s\s*=(.*)$" % re.escape(k), line)
    if m: v = m.group(1).strip().strip("\"").strip("\x27")
print(v, end="")'; }
TOKEN="$(get_env TUVAN_BOT_TOKEN)"
hide() { if [ -n "$TOKEN" ]; then sed "s#$TOKEN#<token>#g"; else cat; fi; }

echo "== Mã nguồn"
info "Thư mục chạy: $REPO"
case "$REPO" in "$HOME/Documents"/*|"$HOME/Desktop"/*|"$HOME/Downloads"/*)
  bad "Đang nằm trong Documents/Desktop/Downloads: macOS chặn dịch vụ nền đọc thư mục này. Chạy lại: bash server/cai-dat-mac.sh";; esac
info "Nhánh $(git -C "$REPO" rev-parse --abbrev-ref HEAD 2>/dev/null) @ $(git -C "$REPO" log --oneline -1 2>/dev/null)"

echo "== Python"
PY="$REPO/.venv/bin/python"
if [ -x "$PY" ]; then
  ok "$("$PY" --version 2>&1) trong .venv"
  "$PY" -c 'import segno, reportlab, certifi' 2>/dev/null && ok "segno, reportlab, certifi" || bad "Thiếu thư viện: $REPO/.venv/bin/pip install -r server/requirements-bot.txt"
else bad "Chưa có .venv – chạy: bash server/cai-dat-mac.sh"; fi

echo "== server/tuvan.env"
if [ -f "$ENVF" ]; then
  for k in TUVAN_BOT_TOKEN TEACHER_TELEGRAM_IDS BOT_SERVICE_TOKEN TEACHER_PASSWORD PUBLIC_ORIGIN; do
    [ -n "$(get_env $k)" ] && ok "$k: đã điền" || bad "$k: TRỐNG"
  done
  info "PUBLIC_ORIGIN = $(get_env PUBLIC_ORIGIN)"
  info "Số giáo viên: $(get_env TEACHER_TELEGRAM_IDS | tr ',' '\n' | grep -c .)"
else bad "Không có $ENVF"; fi

echo "== Dịch vụ chạy nền (launchd)"
for L in vn.tuvan.proxy vn.tuvan.bot vn.tuvan.capnhat; do
  LINE="$(launchctl list 2>/dev/null | awk -v l="$L" '$3==l')"
  if [ -z "$LINE" ]; then bad "$L: chưa cài"
  else
    PID="$(echo "$LINE" | awk '{print $1}')"; EXIT="$(echo "$LINE" | awk '{print $2}')"
    if [ "$PID" != "-" ]; then ok "$L: đang chạy (PID $PID)"
    elif [ "$L" = vn.tuvan.capnhat ] && [ "$EXIT" = 0 ]; then ok "$L: đã cài (chạy mỗi 5 phút)"
    else bad "$L: KHÔNG chạy, mã thoát lần cuối $EXIT"; fi
  fi
done
PLIST_PATH="$(grep -A2 ProgramArguments "$HOME/Library/LaunchAgents/vn.tuvan.bot.plist" 2>/dev/null | grep -o '/[^<]*start_bot.sh')"
[ -n "$PLIST_PATH" ] && info "Bot chạy từ: $PLIST_PATH"

echo "== Máy chủ"
curl -s --max-time 5 http://127.0.0.1:8787/health | grep -q ok && ok "127.0.0.1:8787 trả lời" || bad "127.0.0.1:8787 không trả lời"
lsof -nP -iTCP:8787 -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print "  ·  cổng 8787: "$1" PID "$2}' | head -2
lsof -nP -iTCP:8788 -sTCP:LISTEN >/dev/null 2>&1 && ok "Cổng nội bộ 8788 đang mở (cho bot)" || bad "Cổng nội bộ 8788 chưa mở (thiếu BOT_SERVICE_TOKEN hoặc máy chủ chưa chạy)"
PO="$(get_env PUBLIC_ORIGIN)"
if [ -n "$PO" ]; then
  curl -s --max-time 15 "$PO/health" | grep -q ok && ok "Từ Internet: $PO trả lời" || bad "Từ Internet: $PO KHÔNG trả lời"
fi
TS="$(command -v tailscale || echo /Applications/Tailscale.app/Contents/MacOS/Tailscale)"
[ -x "$TS" ] && "$TS" funnel status 2>&1 | sed 's/^/  ·  funnel: /' | head -6

echo "== Telegram"
if [ -n "$TOKEN" ]; then
  tg() { printf 'url = "https://api.telegram.org/bot%s/%s"\n' "$TOKEN" "$1" | curl -s --max-time 15 -K -; }
  ME="$(tg getMe)"
  echo "$ME" | python3 -c 'import sys,json
try: d=json.load(sys.stdin)
except Exception: print("  ❌ Không gọi được api.telegram.org (mạng?)"); sys.exit()
print("  ✅ Token đúng: bot @"+d["result"]["username"] if d.get("ok") else "  ❌ Telegram từ chối token: "+str(d.get("description")))'
  tg getWebhookInfo | python3 -c 'import sys,json
try: u=json.load(sys.stdin)["result"].get("url","")
except Exception: u=""
print("  ❌ Bot đang gắn webhook ("+u+") nên không nhận tin theo cách của máy chủ này. Gỡ: deleteWebhook" if u else "  ✅ Không có webhook")'
  tg getMyCommands | python3 -c 'import sys,json
try: cmds=json.load(sys.stdin).get("result",[])
except Exception: cmds=[]
print("  ✅ Menu lệnh Telegram: đã đăng ký " + str(len(cmds)) + " lệnh (/)" if cmds else "  ⚠️ Menu lệnh Telegram: chưa đăng ký lệnh (gõ / chưa hiện menu)")'
else bad "Chưa có token"; fi

echo "== Nhật ký gần nhất (đã che token)"
for f in tuvan-bot tuvan-proxy tuvan-capnhat; do
  LOG="$HOME/Library/Logs/$f.log"
  echo "  --- $f.log"
  [ -f "$LOG" ] && tail -n 12 "$LOG" | hide | sed 's/^/  | /' || echo "  | (chưa có)"
done
