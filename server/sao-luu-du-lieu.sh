#!/bin/bash
# Sao lưu dữ liệu tư vấn (DATA_DIR) ra thư mục ~/web-demo-backup/
# Nén thành file du-lieu-YYYYMMDD-HHMM.tar.gz (quyền 600, thư mục 700) và tự động giữ 14 bản sao lưu gần nhất.
# © 2026 Dr. Duyen Nguyen. All rights reserved.
set -e
umask 077   # bản sao lưu chứa hồ sơ học sinh: chỉ chủ tài khoản đọc được

DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$DIR/tuvan.env" ]; then
  chmod 600 "$DIR/tuvan.env" 2>/dev/null || true
  set -a
  . "$DIR/tuvan.env"
  set +a
fi

DATA_DIR="${DATA_DIR:-$HOME/web-demo-data}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/web-demo-backup}"
MAX_KEEP=14

if [ ! -d "$DATA_DIR" ]; then
  echo "Lỗi: Thư mục dữ liệu $DATA_DIR không tồn tại. Chưa có dữ liệu để sao lưu."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
DATE_STR="$(date +%Y%m%d-%H%M)"   # kèm giờ: chạy nhiều lần trong ngày không ghi đè
BACKUP_FILE="$BACKUP_DIR/du-lieu-$DATE_STR.tar.gz"

echo "Đang sao lưu $DATA_DIR -> $BACKUP_FILE..."
tar -czf "$BACKUP_FILE" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"

FILE_SIZE="$(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1 || ls -lh "$BACKUP_FILE" 2>/dev/null | awk '{print $5}')"
echo "✅ Đã tạo bản sao lưu thành công ($FILE_SIZE): $BACKUP_FILE"

# Dọn dẹp chỉ giữ lại 14 bản gần nhất
echo "Đang dọn dẹp các bản sao lưu cũ (giữ $MAX_KEEP bản gần nhất)..."
OLD_COUNT=0
for f in $(ls -t "$BACKUP_DIR"/du-lieu-*.tar.gz 2>/dev/null | tail -n +$((MAX_KEEP + 1))); do
  if [ -f "$f" ]; then
    rm -f "$f"
    OLD_COUNT=$((OLD_COUNT + 1))
  fi
done

REMAINING=$(ls -1 "$BACKUP_DIR"/du-lieu-*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
echo "Hiện có $REMAINING bản sao lưu trong $BACKUP_DIR (đã xoá $OLD_COUNT bản cũ; chỉ giữ $MAX_KEEP bản mới nhất)."
