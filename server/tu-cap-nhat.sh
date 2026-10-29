#!/bin/bash
# Tự cập nhật mã nguồn trên Mac từ GitHub (launchd chạy mỗi 5 phút, xem cai-dat-tu-chay.sh).
# © 2026 Dr. Duyen Nguyen. All rights reserved.
#
# Cách làm, thận trọng:
#  1. Chỉ cập nhật kiểu "tiến thẳng" (fast-forward) theo đúng nhánh đang dùng. Không gộp, không ghi đè.
#  2. Bỏ qua nếu trên Mac có sửa đổi chưa commit, để không mất việc của ai.
#  3. Sau khi cập nhật thì chạy kiểm thử. Lỗi thì quay lại bản cũ và đánh dấu bản lỗi để không thử lại.
#  4. Chỉ khởi động lại máy chủ và bot khi thư mục server/ thay đổi (web tĩnh đọc trực tiếp, không cần).
# Không đụng tới server/tuvan.env, .venv và thư mục dữ liệu (đều nằm ngoài git).
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(dirname "$DIR")"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
ts() { date '+%Y-%m-%d %H:%M:%S'; }

cd "$REPO" || exit 1
LOCK="$REPO/.git/tuvan-capnhat.lock"
mkdir "$LOCK" 2>/dev/null || exit 0          # đang có lần chạy khác
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "HEAD" ] && { echo "$(ts) Đang ở commit lẻ (không theo nhánh) – bỏ qua"; exit 0; }

git fetch --quiet origin "$BRANCH" 2>/dev/null || { echo "$(ts) Không kết nối được GitHub – thử lại sau"; exit 0; }
OLD="$(git rev-parse HEAD)"
NEW="$(git rev-parse "origin/$BRANCH")"
[ "$OLD" = "$NEW" ] && exit 0

BAD="$REPO/.git/tuvan-ban-loi"
if [ -f "$BAD" ] && [ "$(cat "$BAD")" = "$NEW" ]; then
  exit 0                                      # bản này đã kiểm thử lỗi, chờ bản sửa
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "$(ts) Có sửa đổi trên Mac chưa commit – bỏ qua cập nhật (git status để xem)"; exit 0
fi
if ! git merge-base --is-ancestor "$OLD" "$NEW"; then
  echo "$(ts) Lịch sử trên GitHub không nối tiếp bản trên Mac – bỏ qua, cần người kiểm tra"; exit 0
fi

git merge --ff-only --quiet "$NEW" || { echo "$(ts) Không cập nhật được"; exit 0; }
echo "$(ts) Đã tải bản mới ${OLD:0:7} → ${NEW:0:7} ($BRANCH)"
CHANGED="$(git diff --name-only "$OLD" "$NEW")"

PY="$REPO/.venv/bin/python"; [ -x "$PY" ] || PY="python3"
if echo "$CHANGED" | grep -q '^server/requirements-bot.txt$' && [ -x "$REPO/.venv/bin/pip" ]; then
  "$REPO/.venv/bin/pip" install --quiet -r server/requirements-bot.txt || echo "$(ts) ⚠️ Cài thư viện mới lỗi"
fi

OUT="$(mktemp)"
if ! "$PY" -m unittest discover -s server/tests >"$OUT" 2>&1; then
  echo "$(ts) ❌ Kiểm thử bản ${NEW:0:7} thất bại – quay lại ${OLD:0:7}. Trích nhật ký:"
  tail -n 15 "$OUT"
  git reset --hard --quiet "$OLD"
  echo "$NEW" > "$BAD"
  rm -f "$OUT"; exit 0
fi
echo "$(ts) Kiểm thử đạt: $(tail -n 3 "$OUT" | tr '\n' ' ')"
rm -f "$OUT"

if echo "$CHANGED" | grep -q '^server/'; then
  for L in vn.tuvan.proxy vn.tuvan.bot; do
    launchctl kickstart -k "gui/$(id -u)/$L" 2>/dev/null && echo "$(ts) Đã khởi động lại $L"
  done
fi
