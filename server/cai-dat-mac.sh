#!/bin/bash
# Cài đặt trọn gói trên Mac: máy chủ + Bot Telegram + Tailscale Funnel + tự cập nhật từ GitHub.
# © 2026 Dr. Duyen Nguyen. All rights reserved.
#
# Cách dùng (Terminal trên Mac):
#   mkdir -p ~/Documents/HUST/Ms.Duyen && cd ~/Documents/HUST/Ms.Duyen
#   git clone -b sua-loi/audit-29-10 https://github.com/HanhDNguyen/tu-van-chon-mon-lop-10-demo.git tu-van
#   bash tu-van/server/cai-dat-mac.sh
#
# Chạy lại bao nhiêu lần cũng được: giá trị đã điền trong server/tuvan.env được giữ nguyên.
# Token và mật khẩu chỉ nhập trên Mac (gõ ẩn), không gửi đi đâu ngoài Telegram để kiểm tra token.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(dirname "$DIR")"
ENVF="$DIR/tuvan.env"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
TTY=/dev/tty

ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠️  $*"; }
die()  { echo "  ❌ $*"; exit 1; }

[ "$(uname)" = "Darwin" ] || die "Script này dành cho macOS."

echo "== 1/6. Kiểm tra công cụ"
command -v git >/dev/null || die "Chưa có git. Chạy: xcode-select --install, rồi chạy lại script."
command -v python3 >/dev/null || die "Chưa có python3. Chạy: xcode-select --install, rồi chạy lại script."
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' || die "Cần Python 3.9 trở lên."
ok "git, $(python3 --version)"

echo "== 2/6. Thư viện Python (môi trường riêng trong .venv)"
[ -x "$REPO/.venv/bin/python" ] || python3 -m venv "$REPO/.venv"
"$REPO/.venv/bin/pip" install --quiet --upgrade pip >/dev/null 2>&1 || true
"$REPO/.venv/bin/pip" install --quiet -r "$DIR/requirements-bot.txt" || die "Không cài được thư viện (segno, reportlab)."
ok "segno, reportlab"

echo "== 3/6. Cấu hình server/tuvan.env"
[ -f "$ENVF" ] || cp "$DIR/tuvan.env.example" "$ENVF"
chmod 600 "$ENVF"

# Đọc / ghi một dòng KEY=... ; giá trị truyền qua biến môi trường để không lộ trên danh sách tiến trình.
get_env() { K="$1" F="$ENVF" python3 - <<'PY'
import os, re
k, v = os.environ["K"], ""
for line in open(os.environ["F"], encoding="utf-8"):
    m = re.match(r"\s*%s\s*=(.*)$" % re.escape(k), line)
    if m:
        v = m.group(1).strip().strip('"').strip("'")
print(v, end="")
PY
}
set_env() { K="$1" V="$2" F="$ENVF" python3 - <<'PY'
import os, re
k, v, f = os.environ["K"], os.environ["V"], os.environ["F"]
lines = open(f, encoding="utf-8").read().splitlines()
pat = re.compile(r"\s*%s\s*=" % re.escape(k))
for i, line in enumerate(lines):
    if pat.match(line):
        lines[i] = "%s=%s" % (k, v); break
else:
    lines.append("%s=%s" % (k, v))
open(f, "w", encoding="utf-8").write("\n".join(lines) + "\n")
PY
}

# 3a. Token bot
TOKEN="$(get_env TUVAN_BOT_TOKEN)"
while true; do
  if [ -z "$TOKEN" ]; then
    printf "  Dán TUVAN_BOT_TOKEN (từ @BotFather, gõ ẩn rồi Enter): " > $TTY
    read -rs TOKEN < $TTY; echo > $TTY
  fi
  echo "$TOKEN" | grep -Eq '^[0-9]{6,}:[A-Za-z0-9_-]{30,}$' || { warn "Token không đúng dạng 123456:ABC..."; TOKEN=""; continue; }
  ME="$(printf 'url = "https://api.telegram.org/bot%s/getMe"\n' "$TOKEN" | curl -s --max-time 15 -K - || true)"
  UNAME="$(printf '%s' "$ME" | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin); print(d["result"]["username"] if d.get("ok") else "")
except Exception: print("")')"
  if [ -n "$UNAME" ]; then ok "Token hợp lệ: bot @$UNAME"; break; fi
  if [ -z "$ME" ]; then warn "Không gọi được Telegram để kiểm tra – vẫn dùng token này"; break; fi
  warn "Telegram từ chối token này. Nhập lại."; TOKEN=""
done
set_env TUVAN_BOT_TOKEN "$TOKEN"

# 3b. ID giáo viên
IDS="$(get_env TEACHER_TELEGRAM_IDS)"
while ! echo "$IDS" | grep -Eq '^[0-9]+(,[0-9]+)*$'; do
  printf "  TEACHER_TELEGRAM_IDS (ID Telegram, nhiều ID cách nhau bằng dấu phẩy; lấy từ @userinfobot): " > $TTY
  read -r IDS < $TTY; IDS="$(echo "$IDS" | tr -d ' ')"
done
set_env TEACHER_TELEGRAM_IDS "$IDS"; ok "ID giáo viên: $IDS"

# 3c. Mật khẩu khu vực giáo viên trên web
PW="$(get_env TEACHER_PASSWORD)"
if [ -z "$PW" ]; then
  printf "  Đặt mật khẩu Khu vực giáo viên (gõ ẩn; Enter bỏ trống để máy tự tạo): " > $TTY
  read -rs PW < $TTY; echo > $TTY
  if [ -z "$PW" ]; then
    PW="$(python3 -c 'import secrets;print(secrets.token_urlsafe(12))')"
    echo "  👉 Mật khẩu tự tạo (ghi lại, chỉ hiện lần này): $PW" > $TTY
  fi
  set_env TEACHER_PASSWORD "$PW"
fi
ok "Đã có mật khẩu khu vực giáo viên"

# 3d. Khoá nội bộ giữa bot và máy chủ: máy tự tạo, không cần nhớ
if [ -z "$(get_env BOT_SERVICE_TOKEN)" ]; then
  set_env BOT_SERVICE_TOKEN "$(python3 -c 'import secrets;print(secrets.token_urlsafe(32))')"
fi
ok "Đã có BOT_SERVICE_TOKEN (tự tạo)"

echo "== 4/6. Tailscale Funnel (mở cổng 8787 ra Internet qua https)"
TS="$(command -v tailscale || true)"
[ -z "$TS" ] && [ -x /Applications/Tailscale.app/Contents/MacOS/Tailscale ] && TS=/Applications/Tailscale.app/Contents/MacOS/Tailscale
[ -n "$TS" ] || die "Không tìm thấy lệnh tailscale. Mở ứng dụng Tailscale, bật 'CLI' trong Settings rồi chạy lại."
DNS="$("$TS" status --json 2>/dev/null | python3 -c 'import sys,json
try: print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))
except Exception: print("")')"
[ -n "$DNS" ] || die "Tailscale chưa kết nối hoặc chưa bật MagicDNS. Kiểm tra ứng dụng Tailscale rồi chạy lại."
ORIGIN="https://$DNS"
echo "  Lần đầu Tailscale có thể in một đường link để phê duyệt Funnel: mở link đó, bấm đồng ý."
if "$TS" funnel --bg 8787 < $TTY; then
  ok "Funnel: $ORIGIN → 127.0.0.1:8787 (chỉ cổng 8787; cổng 8788 không mở)"
else
  warn "Chưa bật được Funnel. Xem https://tailscale.com/kb/1223/funnel rồi chạy lại script."
fi
set_env PUBLIC_ORIGIN "$ORIGIN"

echo "== 5/6. Dịch vụ tự chạy (máy chủ, bot, tự cập nhật)"
KHONG_HOI=1 bash "$DIR/cai-dat-tu-chay.sh" all

echo "== 6/6. Kiểm tra"
sleep 3
curl -s --max-time 5 http://127.0.0.1:8787/health | grep -q ok && ok "Máy chủ trên Mac: chạy" || warn "Máy chủ chưa phản hồi: tail -n 30 ~/Library/Logs/tuvan-proxy.log"
if curl -s --max-time 20 "$ORIGIN/health" | grep -q ok; then ok "Từ Internet: $ORIGIN chạy"
else warn "Chưa vào được $ORIGIN từ Internet (lần đầu cấp chứng chỉ có thể mất 1–2 phút)."; fi
sleep 2
grep -q "Unauthorized" ~/Library/Logs/tuvan-bot.log 2>/dev/null && warn "Bot báo lỗi token: tail -n 30 ~/Library/Logs/tuvan-bot.log" || ok "Bot đang chạy (nhật ký: ~/Library/Logs/tuvan-bot.log)"

cat <<EOF

Xong. Việc tiếp theo:
  1. Mở Telegram, nhắn /start cho bot${UNAME:+ @$UNAME}.
  2. Thử: /taolink HS999 10A1  → quét QR bằng điện thoại, làm vài câu, bấm "Nộp cho giáo viên".
  3. Khu vực giáo viên trên web: $ORIGIN
Mã nguồn tự cập nhật từ GitHub (nhánh $(git -C "$REPO" rev-parse --abbrev-ref HEAD)) mỗi 5 phút.
Dữ liệu học sinh lưu tại ~/web-demo-data (ngoài thư mục mã nguồn, không lên GitHub hay OneDrive).
EOF
