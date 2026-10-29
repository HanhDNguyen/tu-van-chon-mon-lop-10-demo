#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# © 2026 Dr. Duyen Nguyen. All rights reserved.
# Bot Telegram cho giáo viên tư vấn chọn môn lớp 10
# Kết nối với máy chủ qua cổng dịch vụ nội bộ (SERVICE_URL, mặc định http://127.0.0.1:8788)
# Dùng Long Polling (getUpdates), không mở cổng ra ngoài Internet

import os
import sys
import time
import json
import io
import re
import csv
import signal
import secrets
import threading
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

import unicodedata

# Thư viện thuần Python tạo mã QR PNG
try:
    import segno
except ImportError:
    segno = None

# Thư viện tạo file PDF in phiếu QR A4
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
except ImportError:
    canvas = None

# ----------------- Cấu hình môi trường -----------------
TUVAN_BOT_TOKEN = os.environ.get("TUVAN_BOT_TOKEN", "").strip()
TEACHER_IDS_RAW = os.environ.get("TEACHER_TELEGRAM_IDS", "").strip()
TEACHER_TELEGRAM_IDS = set(x.strip() for x in TEACHER_IDS_RAW.split(",") if x.strip())
# Quản trị viên: được thêm/xoá giáo viên qua bot. Để trống = các ID trong TEACHER_TELEGRAM_IDS là quản trị viên.
ADMIN_TELEGRAM_IDS = set(x.strip() for x in os.environ.get("ADMIN_TELEGRAM_IDS", "").split(",") if x.strip())
TELEGRAM_ID_RE = re.compile(r"^[0-9]{5,15}$")
BOT_SERVICE_TOKEN = os.environ.get("BOT_SERVICE_TOKEN", "").strip()
SERVICE_URL = os.environ.get("SERVICE_URL", "http://127.0.0.1:8788").rstrip("/")
PUBLIC_ORIGIN = os.environ.get("PUBLIC_ORIGIN", "http://127.0.0.1:8787").rstrip("/")
DATA_DIR = Path(os.environ.get("DATA_DIR", Path.home() / "web-demo-data")).resolve()
TELEGRAM_API_BASE = os.environ.get("TELEGRAM_API_BASE", "https://api.telegram.org").rstrip("/")

POLL_TIMEOUT = 50
CODE_RX = re.compile(r"^[A-Za-z0-9_.\-]{1,40}$")

# ----------------- Hằng số trắc nghiệm để phân tích an toàn -----------------
EYSENCK_KEY = [
    ("HN", "+"), ("HN", "+"), ("HN", "+"), ("HN", "-"), ("HN", "-"),
    ("KOD", "+"), ("KOD", "+"), ("KOD", "+"), ("KOD", "+"), ("KOD", "+"),
    ("S", "+"), ("S", "-")
]
EYSENCK_MID = 12

# Cách chấm phải GIỐNG HỆT web (js/app.js: hollandStats, eysenckStats, mbtiStats, eyText, mbtiText).
# Chưa làm đủ câu thì KHÔNG gắn nhãn – chỉ báo "chưa đủ (n/N)". Kiểm thử đối chiếu: tests/test_bot_scoring.py
HOLLAND_ORDER = ("R", "I", "A", "S", "E", "C")
HOLLAND_N, EYSENCK_N, MBTI_N = 54, 59, 70
EYSENCK_NAMES = {"uuTu": "Ưu tư", "binhThan": "Bình thản", "nongNay": "Nóng nảy", "hangHai": "Hăng hái"}
MBTI_DIMS = (("EI", "E", "I", (0,)), ("SN", "S", "N", (1, 2)), ("TF", "T", "F", (3, 4)), ("JP", "J", "P", (5, 6)))

def _is_score(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)

def _calc_holland(holland_data):
    """Giống tóm tắt trên web: mã 3 chữ, thêm "(chưa đủ)" nếu chưa trả lời đủ 54 câu."""
    if not isinstance(holland_data, dict):
        return "–"
    sc, answered = {}, 0
    for k in HOLLAND_ORDER:
        items = holland_data.get(k) if isinstance(holland_data.get(k), list) else []
        answered += sum(1 for x in items if x is not None)
        sc[k] = sum(x for x in items if _is_score(x))
    if not answered:
        return "–"
    order = sorted(HOLLAND_ORDER, key=lambda k: -sc[k])  # sort ổn định như Array.sort của trình duyệt
    code = "".join(order[:3])
    return code if answered == HOLLAND_N else f"{code} (chưa đủ {answered}/{HOLLAND_N} câu)"

def _eysenck_stats(eysenck_list):
    sc = {"HN": 0, "KOD": 0, "S": 0}
    answered = 0
    for i, v in enumerate(eysenck_list if isinstance(eysenck_list, list) else []):
        if v not in ("+", "-"):
            continue
        answered += 1
        k, sign = EYSENCK_KEY[i % 12]
        if v == sign:
            sc[k] += 1
    return sc, answered

def _calc_eysenck(eysenck_list):
    sc, answered = _eysenck_stats(eysenck_list)
    if answered != EYSENCK_N:
        return f"chưa đủ ({answered}/{EYSENCK_N})" if answered else "–"
    m = EYSENCK_MID
    side = lambda v, hi, lo: [hi] if v > m else [lo] if v < m else [hi, lo]  # đúng 12 = nằm trên ranh giới
    q = {"iu": "uuTu", "is": "binhThan", "eu": "nongNay", "es": "hangHai"}
    types = [q[x + y] for x in side(sc["HN"], "e", "i") for y in side(sc["KOD"], "u", "s")]
    txt = " / ".join(EYSENCK_NAMES[t] for t in types) + f" (HN {sc['HN']}, KOD {sc['KOD']}, S {sc['S']}/9)"
    if sc["S"] <= 4:
        txt += " – điểm thành thật thấp, kết quả kém tin cậy"
    return txt

def _calc_mbti(mbti_list):
    lst = mbti_list if isinstance(mbti_list, list) else []
    res = {d[0]: {"a": 0, "b": 0} for d in MBTI_DIMS}
    answered = 0
    for i, v in enumerate(lst):
        if v not in ("a", "b"):
            continue
        answered += 1
        dim = next(d[0] for d in MBTI_DIMS if i % 7 in d[3])
        res[dim][v] += 1
    if answered != MBTI_N:
        return f"chưa đủ ({answered}/{MBTI_N})" if answered else "–"
    letters = []
    for dim, la, lb, _ in MBTI_DIMS:
        a, b = res[dim]["a"], res[dim]["b"]
        letters.append(la if a > b else lb if b > a else la + "/" + lb)
    return " · ".join(letters) if any(len(x) > 1 for x in letters) else "".join(letters)

# ----------------- Giờ Việt Nam, CSV an toàn, kỳ theo dõi -----------------
from datetime import datetime, timezone, timedelta
VN_TZ = timezone(timedelta(hours=7))

def vn_time(iso, with_time=True):
    """Máy chủ lưu giờ UTC ("...Z"); hiển thị cho giáo viên theo giờ Việt Nam."""
    try:
        dt = datetime.strptime(str(iso)[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc).astimezone(VN_TZ)
        return dt.strftime("%H:%M %d/%m/%Y" if with_time else "%d/%m/%Y")
    except (ValueError, TypeError):
        return str(iso or "")[:16]

def is_expired(inv):
    exp = inv.get("expiresAt") or ""
    return bool(exp) and exp < time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def csv_safe(v):
    """Chặn "CSV injection": ô bắt đầu bằng = + - @ (hoặc tab/CR) sẽ thành công thức khi mở bằng Excel."""
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s

# Kỳ theo dõi Bước 7 – cùng danh sách với web (js/data.js: PERIODS); cho phép gõ tắt
PERIODS = ["Giữa HK1", "Cuối HK1", "Giữa HK2", "Cuối năm lớp 10", "Cuối HK1 lớp 11", "Cuối năm lớp 11", "Cuối HK1 lớp 12"]
PERIOD_ALIASES = {"giuahk1": "Giữa HK1", "hk1": "Cuối HK1", "cuoihk1": "Cuối HK1", "giuahk2": "Giữa HK2",
                  "cuoinam": "Cuối năm lớp 10", "cn10": "Cuối năm lớp 10", "hk1-11": "Cuối HK1 lớp 11",
                  "cn11": "Cuối năm lớp 11", "hk1-12": "Cuối HK1 lớp 12"}

def parse_period(text):
    key = remove_accents(str(text or "")).lower().replace(" ", "").replace("_", "")
    for p in PERIODS:
        if remove_accents(p).lower().replace(" ", "") == key:
            return p
    return PERIOD_ALIASES.get(key)

def parse_scale(v):
    """Thang 1–5 như web; chỉ nhận số nguyên 1..5 (không nhận nan, inf, 99, 3.5)."""
    v = str(v or "").strip()
    return int(v) if re.fullmatch(r"[1-5]", v) else None

# ----------------- Hỗ trợ tạo dải mã, file PDF và CSV cả lớp -----------------
def remove_accents(text):
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D")
    return unicodedata.normalize("NFC", text)

def parse_code_range(arg_str):
    arg_str = (arg_str or "").strip()
    m = re.match(r"^([A-Za-z0-9_.\-]+?)\s*(?:\s+-\s+|\s+–\s+|\.\.|->|\s+đến\s+|\s+to\s+|\s+)\s*([A-Za-z0-9_.\-]+)$", arg_str, re.IGNORECASE)
    if not m:
        m = re.match(r"^([A-Za-z0-9_.\-]+?)-(HS\d+|\d+|[A-Za-z0-9_.\-]+)$", arg_str)
        if not m:
            return None, "Cú pháp dải mã không đúng (ví dụ: HS001-HS045)."

    s1, s2 = m.group(1).strip(), m.group(2).strip()
    m1 = re.search(r"^(.*?)(\d+)$", s1)
    m2 = re.search(r"^(.*?)(\d+)$", s2)
    if not m1 or not m2:
        return None, "Mã học sinh phải kết thúc bằng chữ số (ví dụ: HS001-HS045)."

    p1, d1 = m1.group(1), m1.group(2)
    p2, d2 = m2.group(1), m2.group(2)
    if p1 != p2:
        return None, f"Tiền tố mã không khớp: '{p1}' khác '{p2}'."

    n1, n2 = int(d1), int(d2)
    if n1 > n2:
        return None, f"Số bắt đầu ({n1}) lớn hơn số kết thúc ({n2})."

    count = n2 - n1 + 1
    if count > 60:
        return None, f"Số lượng mã ({count}) vượt quá giới hạn tối đa 60 mã/lớp."

    w = max(len(d1), len(d2))
    codes = [f"{p1}{i:0{w}d}" for i in range(n1, n2 + 1)]
    return codes, None

def parse_csv_student_list(csv_bytes):
    try:
        text = csv_bytes.decode("utf-8-sig")
    except Exception:
        try:
            text = csv_bytes.decode("utf-8")
        except Exception:
            text = csv_bytes.decode("latin-1", errors="replace")

    stream = io.StringIO(text)
    reader = csv.reader(stream)

    rows = [r for r in reader if any(cell.strip() for cell in r)]
    if not rows:
        return None, "File CSV trống."

    header = [c.strip().lower() for c in rows[0]]
    has_header = False
    code_idx = -1
    class_idx = -1

    for i, col in enumerate(header):
        clean_col = re.sub(r"[_\s\-]+", "", col)
        if clean_col in ("mahs", "ma", "code", "mahocsinh", "mshs", "studentid"):
            code_idx = i
            has_header = True
        elif clean_col in ("lop", "class", "classname", "lophoc"):
            class_idx = i
            has_header = True

    data_rows = rows[1:] if has_header else rows

    if code_idx == -1:
        code_idx = 0
    if class_idx == -1 and len(rows[0]) > 1:
        class_idx = 1

    items = []
    for r_idx, r in enumerate(data_rows, start=2 if has_header else 1):
        if not r or len(r) <= code_idx:
            continue
        c = r[code_idx].strip()
        if not c:
            continue
        if not CODE_RX.match(c):
            if r_idx == 1 and not has_header:
                continue
            return None, f"Mã học sinh không hợp lệ tại dòng {r_idx}: '{c}'"
        cl = r[class_idx].strip() if (class_idx >= 0 and len(r) > class_idx) else ""
        items.append({"code": c, "className": cl})

    if not items:
        return None, "Không tìm thấy dữ liệu học sinh hợp lệ trong file CSV."
    if len(items) > 60:
        return None, f"File chứa {len(items)} học sinh, vượt quá giới hạn tối đa 60 học sinh/lớp."

    return items, None

_FONTS_SETUP = False
_PDF_NORMAL_FONT = "Helvetica"
_PDF_BOLD_FONT = "Helvetica-Bold"
_PDF_HAS_UNICODE = False

def setup_pdf_fonts():
    global _FONTS_SETUP, _PDF_NORMAL_FONT, _PDF_BOLD_FONT, _PDF_HAS_UNICODE
    if _FONTS_SETUP:
        return _PDF_NORMAL_FONT, _PDF_BOLD_FONT, _PDF_HAS_UNICODE
    if not canvas:
        return "Helvetica", "Helvetica-Bold", False

    font_paths = [
        ("AppFont", "C:\\Windows\\Fonts\\arial.ttf"),
        ("AppFontBold", "C:\\Windows\\Fonts\\arialbd.ttf"),
        ("AppFont", "/Library/Fonts/Arial.ttf"),
        ("AppFontBold", "/Library/Fonts/Arial Bold.ttf"),
        ("AppFont", "/System/Library/Fonts/Supplemental/Arial.ttf"),
        ("AppFontBold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        ("AppFont", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        ("AppFontBold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]
    reg_normal, reg_bold = False, False
    for name, p in font_paths:
        if os.path.exists(p):
            try:
                if name == "AppFont" and not reg_normal:
                    pdfmetrics.registerFont(TTFont("AppFont", p))
                    reg_normal = True
                elif name == "AppFontBold" and not reg_bold:
                    pdfmetrics.registerFont(TTFont("AppFontBold", p))
                    reg_bold = True
            except Exception:
                pass
    if reg_normal:
        _PDF_NORMAL_FONT = "AppFont"
    if reg_bold:
        _PDF_BOLD_FONT = "AppFontBold"
    _PDF_HAS_UNICODE = reg_normal
    _FONTS_SETUP = True
    return _PDF_NORMAL_FONT, _PDF_BOLD_FONT, _PDF_HAS_UNICODE

def generate_cards_pdf(items, class_name=""):
    if not canvas:
        raise RuntimeError("Chưa cài đặt thư viện reportlab để tạo file PDF (pip install reportlab)")
    normal_font, bold_font, is_unicode = setup_pdf_fonts()
    bio = io.BytesIO()
    c = canvas.Canvas(bio, pagesize=A4)
    page_w, page_h = A4

    # 2 cột x 4 hàng = 8 ô mỗi trang
    cols = 2
    rows = 4
    cards_per_page = cols * rows

    margin_x = 24
    margin_y = 25
    gap_x = 14
    gap_y = 12

    card_w = (page_w - 2 * margin_x - (cols - 1) * gap_x) / cols
    card_h = (page_h - 2 * margin_y - (rows - 1) * gap_y) / rows

    def _t(text):
        return text if is_unicode else remove_accents(text)

    for idx, item in enumerate(items):
        page_idx = idx % cards_per_page
        if idx > 0 and page_idx == 0:
            c.showPage()

        row = page_idx // cols
        col = page_idx % cols

        x = margin_x + col * (card_w + gap_x)
        y = page_h - margin_y - (row + 1) * card_h - row * gap_y

        code = str(item.get("code") or "")
        cl = str(item.get("className") or class_name or "")
        link = str(item.get("link") or "")
        exp = str(item.get("expiresAt") or "")[:10]

        # 1. Viền ô đứt nét để cắt rời
        c.saveState()
        c.setStrokeColorRGB(0.72, 0.72, 0.72)
        c.setLineWidth(0.8)
        c.setDash([3, 2])
        c.roundRect(x, y, card_w, card_h, 4, stroke=1, fill=0)
        c.restoreState()

        # 2. Tiêu đề phiếu
        c.saveState()
        c.setFillColorRGB(0.75, 0.12, 0.12)
        c.setFont(bold_font, 9)
        c.drawString(x + 10, y + card_h - 18, _t("PHIẾU KHẢO SÁT CHỌN MÔN LỚP 10"))
        c.setStrokeColorRGB(0.85, 0.85, 0.85)
        c.setLineWidth(0.5)
        c.line(x + 10, y + card_h - 22, x + card_w - 10, y + card_h - 22)
        c.restoreState()

        # 3. Mã QR
        qr_size = 96
        qr_x = x + 10
        qr_y = y + card_h - 28 - qr_size

        if segno and link:
            try:
                qr = segno.make(link)
                png_bio = io.BytesIO()
                qr.save(png_bio, kind="png", scale=4, border=1)
                png_bio.seek(0)
                img = ImageReader(png_bio)
                c.drawImage(img, qr_x, qr_y, width=qr_size, height=qr_size)
            except Exception:
                pass

        # 4. Thông tin bên phải QR: Mã HS, Lớp, Hạn dùng (TUYỆT ĐỐI KHÔNG CÓ TÊN HỌC SINH)
        info_x = qr_x + qr_size + 10
        c.saveState()

        c.setFont(normal_font, 8)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(info_x, qr_y + qr_size - 14, _t("MÃ HỌC SINH:"))

        c.setFont(bold_font, 14)
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.drawString(info_x, qr_y + qr_size - 30, code)

        c.setFont(normal_font, 8)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(info_x, qr_y + qr_size - 46, _t("LỚP:"))

        c.setFont(bold_font, 11)
        c.setFillColorRGB(0.15, 0.15, 0.15)
        c.drawString(info_x, qr_y + qr_size - 59, cl or "–")

        c.setFont(normal_font, 8)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(info_x, qr_y + qr_size - 74, _t("HẠN DÙNG:"))

        c.setFont(normal_font, 9)
        c.setFillColorRGB(0.8, 0.2, 0.2)
        c.drawString(info_x, qr_y + qr_size - 87, exp or "7 ngày")

        c.restoreState()

        # 5. Dòng hướng dẫn và bản quyền
        c.saveState()
        c.setFont(normal_font, 7.5)
        c.setFillColorRGB(0.2, 0.2, 0.2)
        c.drawString(x + 10, y + 20, _t("Quét mã, cha mẹ cùng con làm khảo sát trước buổi tư vấn"))

        c.setFont(normal_font, 6.5)
        c.setFillColorRGB(0.55, 0.55, 0.55)
        c.drawString(x + 10, y + 8, "© 2026 Dr. Duyen Nguyen. All rights reserved.")
        c.restoreState()

    c.showPage()
    c.save()
    return bio.getvalue()

def generate_batch_csv(items, class_name=""):
    bio = io.BytesIO()
    bio.write(b"\xef\xbb\xbf")
    text_stream = io.TextIOWrapper(bio, encoding="utf-8", newline="")
    writer = csv.DictWriter(text_stream, fieldnames=["ma_hs", "lop", "link", "het_han"])
    writer.writeheader()
    for it in items:
        writer.writerow({
            "ma_hs": it.get("code", ""),
            "lop": it.get("className") or class_name or "",
            "link": it.get("link", ""),
            "het_han": str(it.get("expiresAt") or "")[:10]
        })
    text_stream.flush()
    return bio.getvalue()

# ----------------- Lớp Bot Tư Vấn -----------------

# Chứng chỉ HTTPS: Python cài từ python.org trên Mac không dùng kho chứng chỉ của hệ thống,
# khiến mọi lệnh gọi Telegram lỗi CERTIFICATE_VERIFY_FAILED. Dùng certifi nếu có.
try:
    import ssl
    import certifi
    _SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _SSL_CTX = None

class TuVanBot:
    def __init__(self, token=None, teacher_ids=None, service_url=None, service_token=None,
                 public_origin=None, data_dir=None, api_base=None, admin_ids=None):
        self.token = (token or TUVAN_BOT_TOKEN).strip()
        # Giáo viên khai báo trong tuvan.env (cố định, không xoá được qua bot)
        self.teacher_ids = set(teacher_ids) if teacher_ids is not None else set(TEACHER_TELEGRAM_IDS)
        if admin_ids is not None:
            self.admin_ids = set(admin_ids)
        else:
            self.admin_ids = set(ADMIN_TELEGRAM_IDS) or set(self.teacher_ids)
        self.service_url = (service_url or SERVICE_URL).rstrip("/")
        self.service_token = (service_token or BOT_SERVICE_TOKEN).strip()
        self.public_origin = (public_origin or PUBLIC_ORIGIN).rstrip("/")
        self.data_dir = Path(data_dir or DATA_DIR).resolve()
        self.api_base = (api_base or TELEGRAM_API_BASE).rstrip("/")
        self.running = False
        self.last_update_id = 0
        self.offset_file = self.data_dir / "bot_event_offset.txt"
        self.teachers_file = self.data_dir / "teachers.json"   # giáo viên do quản trị viên thêm qua bot
        self._lock = threading.Lock()

    # ---- Telegram API Helpers ----
    def tg_call(self, method, data=None, files=None, timeout=60):
        url = f"{self.api_base}/bot{self.token}/{method}"
        if files:
            boundary = "----TuVanBoundary" + secrets.token_hex(8)
            body = bytearray()
            for k, v in (data or {}).items():
                body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode("utf-8"))
            for field_name, (fname, fbytes, mtype) in files.items():
                body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field_name}\"; filename=\"{fname}\"\r\nContent-Type: {mtype}\r\n\r\n".encode("utf-8"))
                body.extend(fbytes)
                body.extend(b"\r\n")
            body.extend(f"--{boundary}--\r\n".encode("utf-8"))
            req = urllib.request.Request(url, data=bytes(body), method="POST", headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}"
            })
        else:
            body_bytes = json.dumps(data or {}).encode("utf-8") if data is not None else None
            headers = {"Content-Type": "application/json"} if data is not None else {}
            req = urllib.request.Request(url, data=body_bytes, method="POST" if data is not None else "GET", headers=headers)

        with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            res = json.loads(raw)
            if not res.get("ok"):
                raise RuntimeError("Telegram API trả lỗi: " + str(res.get("description")))
            return res.get("result")

    def send_message(self, chat_id, text):
        return self.tg_call("sendMessage", {"chat_id": chat_id, "text": text})

    def send_photo(self, chat_id, photo_bytes, filename="qr.png", caption=""):
        files = {"photo": (filename, photo_bytes, "image/png")}
        data = {"chat_id": str(chat_id), "caption": caption}
        return self.tg_call("sendPhoto", data=data, files=files)

    def send_document(self, chat_id, doc_bytes, filename="danh_sach.csv", caption=""):
        mtype = "application/pdf" if filename.lower().endswith(".pdf") else "text/csv; charset=utf-8"
        files = {"document": (filename, doc_bytes, mtype)}
        data = {"chat_id": str(chat_id), "caption": caption}
        return self.tg_call("sendDocument", data=data, files=files)

    def download_file(self, file_id):
        file_info = self.tg_call("getFile", {"file_id": file_id})
        file_path = file_info.get("file_path", "")
        if not file_path:
            raise RuntimeError("Telegram không trả về file_path")
        url = f"{self.api_base}/file/bot{self.token}/{file_path}"
        req = urllib.request.Request(url, headers={"User-Agent": "TuVanBot/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()

    # ---- Service API Calls (cổng 8788) ----
    def srv_request(self, method, path, body=None):
        url = f"{self.service_url}{path}"
        body_bytes = json.dumps(body).encode("utf-8") if body is not None else None
        headers = {"X-Service-Token": self.service_token}
        if body is not None:
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=body_bytes, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                return resp.status, (json.loads(raw) if raw else {})
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(raw)
            except Exception:
                data = {"error": raw}
            return e.code, data
        except Exception as e:
            return 500, {"error": str(e)}

    # ---- Phân quyền và kiểm tra riêng tư ----
    def is_authorized(self, user_id):
        return str(user_id) in self.all_teacher_ids()

    def is_admin(self, user_id):
        return str(user_id) in self.admin_ids

    # ---- Danh sách giáo viên thêm qua bot (DATA_DIR/teachers.json) ----
    def load_added_teachers(self):
        try:
            data = json.loads(self.teachers_file.read_text(encoding="utf-8"))
            items = data.get("teachers", []) if isinstance(data, dict) else []
            return [t for t in items if isinstance(t, dict) and TELEGRAM_ID_RE.match(str(t.get("id", "")))]
        except FileNotFoundError:
            return []
        except Exception as e:
            sys.stderr.write(f"Không đọc được {self.teachers_file.name}: {e}\n")
            return []

    def save_added_teachers(self, items):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        tmp = self.teachers_file.with_suffix(".json.tmp")
        tmp.write_text(json.dumps({"teachers": items}, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            os.chmod(tmp, 0o600)
        except OSError:
            pass
        os.replace(tmp, self.teachers_file)

    def all_teacher_ids(self):
        return set(self.teacher_ids) | set(self.admin_ids) | {str(t["id"]) for t in self.load_added_teachers()}

    # ---- Xử lý tin nhắn và lệnh ----
    def handle_update(self, update):
        msg = update.get("message")
        if not msg:
            return
        chat = msg.get("chat") or {}
        chat_id = chat.get("id")
        chat_type = chat.get("type", "")
        from_user = msg.get("from") or {}
        user_id = str(from_user.get("id") or "")
        text = str(msg.get("text") or "").strip()

        # Không trả lời và không xử lý trong nhóm để bảo vệ riêng tư
        if chat_type != "private":
            self.send_message(
                chat_id,
                "Xin lỗi Thầy/Cô, bot chỉ hỗ trợ trao đổi qua tin nhắn riêng (private chat) để bảo vệ dữ liệu học sinh."
            )
            return

        first = text.split()[0].lower().split("@")[0] if text.startswith("/") else ""
        if first in ("/myid", "/id"):
            self.send_message(chat_id, f"ID Telegram của bạn: {user_id}\nGửi số này cho quản trị viên để được cấp quyền.")
            return

        # Kiểm tra danh sách giáo viên được phép
        if not self.is_authorized(user_id):
            self.send_message(
                chat_id,
                "Xin lỗi, tài khoản của bạn chưa được cấp quyền sử dụng hệ thống tư vấn này.\n"
                f"ID Telegram của bạn: {user_id}. Gửi số này cho quản trị viên để được thêm vào danh sách giáo viên."
            )
            return

        # Xử lý file đính kèm (ví dụ danh sách học sinh file .csv)
        doc = msg.get("document")
        if doc:
            self._handle_document(chat_id, user_id, doc)
            return

        # Xử lý các lệnh
        if not text.startswith("/"):
            return

        parts = text.split()
        cmd = parts[0].lower().split("@")[0]
        args = parts[1:]

        if cmd in ("/start", "/trogiup"):
            self._cmd_help(chat_id, user_id)
        elif cmd in ("/themgv", "/xoagv", "/dsgv"):
            if not self.is_admin(user_id):
                self.send_message(chat_id, "Lệnh này chỉ dành cho quản trị viên.")
            elif cmd == "/themgv":
                self._cmd_themgv(chat_id, user_id, args)
            elif cmd == "/xoagv":
                self._cmd_xoagv(chat_id, user_id, args)
            else:
                self._cmd_dsgv(chat_id)
        elif cmd == "/taolink":
            self._cmd_taolink(chat_id, user_id, args)
        elif cmd == "/taolop":
            self._cmd_taolop(chat_id, user_id, args)
        elif cmd == "/danhsach":
            self._cmd_danhsach(chat_id, args)
        elif cmd == "/chuanop":
            self._cmd_chuanop(chat_id, args)
        elif cmd == "/hoso":
            self._cmd_hoso(chat_id, args)
        elif cmd == "/canhbao":
            self._cmd_canhbao(chat_id)
        elif cmd == "/theodoi":
            self._cmd_theodoi(chat_id, args)
        elif cmd == "/xuat":
            self._cmd_xuat(chat_id, args)
        elif cmd == "/thuhoi":
            self._cmd_thuhoi(chat_id, args)
        else:
            self.send_message(chat_id, f"Lệnh không nhận dạng được: {cmd}. Gõ /trogiup để xem hướng dẫn.")

    # ---- Các lệnh chi tiết ----
    def _cmd_help(self, chat_id, user_id=""):
        help_text = (
            "Chào Thầy/Cô! Đây là hệ thống Bot hỗ trợ tư vấn chọn môn lớp 10 dành cho giáo viên.\n\n"
            "Các lệnh có thể sử dụng:\n"
            "• /taolink <mã HS> [lớp] : Tạo mã mời và ảnh QR cho 1 học sinh\n"
            "• /taolop <lớp> <mã_bắt_đầu>-<mã_kết_thúc> : Tạo mã mời cả lớp (tối đa 60 mã), gửi lại 1 file PDF in A4 (mỗi trang 8 ô QR) + 1 file CSV link\n"
            "• Gửi file .csv (cột ma_hs,lop) : Bot tự động tạo link và phiếu QR cả lớp\n"
            "• /danhsach [lớp] : Xem danh sách mã mời khảo sát (đã nộp / chưa nộp)\n"
            "• /chuanop [lớp] : Danh sách học sinh chưa nộp khảo sát\n"
            "• /hoso <mã HS> : Tóm tắt kết quả trắc nghiệm và tiến độ hồ sơ\n"
            "• /canhbao : Cảnh báo học sinh có mức hài lòng thấp (≤2) hoặc căng thẳng cao (≥4)\n"
            "• /theodoi <mã HS> <đợt> hailong=1-5 cangthang=1-5 [ghichu=...] : Ghi nhận theo dõi Bước 7 (đợt: giuahk1, hk1, giuahk2, cuoinam, hk1-11, cn11, hk1-12)\n"
            "• /xuat [lớp] : Xuất file CSV danh sách tổng hợp (đã lọc dữ liệu riêng tư)\n"
            "• /thuhoi <mã HS> : Thu hồi toàn bộ mã mời còn hạn của học sinh\n"
            "• /myid : Xem ID Telegram của mình\n"
            "• /trogiup : Xem lại hướng dẫn này"
        )
        if self.is_admin(user_id):
            help_text += (
                "\n\nQuản trị viên:\n"
                "• /themgv <ID> [ghi chú] : Cấp quyền cho giáo viên (người đó gõ /myid với bot để lấy ID)\n"
                "• /xoagv <ID> : Thu hồi quyền của giáo viên đã thêm\n"
                "• /dsgv : Danh sách giáo viên và quản trị viên"
            )
        self.send_message(chat_id, help_text)

    # ---- Quản trị: thêm / xoá / xem giáo viên ----
    def _cmd_themgv(self, chat_id, user_id, args):
        if not args or not TELEGRAM_ID_RE.match(args[0]):
            self.send_message(
                chat_id,
                "Cú pháp: /themgv <ID Telegram> [ghi chú]\nVí dụ: /themgv 123456789 Cô Lan - GVCN 10A1\n"
                "Giáo viên mở bot, gõ /myid để lấy ID rồi gửi cho Thầy/Cô."
            )
            return
        new_id = args[0]
        note = "".join(ch for ch in " ".join(args[1:]) if ch.isprintable())[:60].strip()
        if new_id in self.teacher_ids or new_id in self.admin_ids:
            self.send_message(chat_id, f"ID {new_id} đã có quyền (khai báo trong tuvan.env).")
            return
        with self._lock:
            items = self.load_added_teachers()
            if any(str(t["id"]) == new_id for t in items):
                self.send_message(chat_id, f"ID {new_id} đã có trong danh sách giáo viên.")
                return
            items.append({"id": new_id, "note": note, "addedBy": str(user_id),
                          "addedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")})
            self.save_added_teachers(items)
        sys.stderr.write(f"Quản trị {user_id} đã thêm giáo viên {new_id}\n")
        try:
            self.send_message(new_id, "Thầy/Cô đã được cấp quyền dùng bot tư vấn chọn môn lớp 10. Gõ /trogiup để xem các lệnh.")
            told = "Đã nhắn báo cho giáo viên."
        except Exception:
            told = "Chưa nhắn báo được (giáo viên cần mở bot và bấm Start trước). Quyền vẫn đã được cấp."
        self.send_message(chat_id, f"✅ Đã thêm giáo viên {new_id}{(' – ' + note) if note else ''}.\n{told}")

    def _cmd_xoagv(self, chat_id, user_id, args):
        if not args or not TELEGRAM_ID_RE.match(args[0]):
            self.send_message(chat_id, "Cú pháp: /xoagv <ID Telegram>. Gõ /dsgv để xem danh sách.")
            return
        rm_id = args[0]
        if rm_id in self.teacher_ids or rm_id in self.admin_ids:
            self.send_message(chat_id, f"ID {rm_id} được khai báo trong tuvan.env trên máy chủ, không xoá được qua bot.")
            return
        with self._lock:
            items = self.load_added_teachers()
            kept = [t for t in items if str(t["id"]) != rm_id]
            if len(kept) == len(items):
                self.send_message(chat_id, f"Không có ID {rm_id} trong danh sách giáo viên đã thêm.")
                return
            self.save_added_teachers(kept)
        sys.stderr.write(f"Quản trị {user_id} đã xoá giáo viên {rm_id}\n")
        self.send_message(chat_id, f"✅ Đã thu hồi quyền của {rm_id}. Người này không dùng bot và không nhận thông báo nữa.")

    def _cmd_dsgv(self, chat_id):
        lines = ["Quản trị viên (tuvan.env):"]
        lines += [f"• {i}" for i in sorted(self.admin_ids)] or ["• (chưa có)"]
        env_only = sorted(self.teacher_ids - self.admin_ids)
        if env_only:
            lines.append("Giáo viên khai báo trong tuvan.env:")
            lines += [f"• {i}" for i in env_only]
        items = self.load_added_teachers()
        lines.append(f"Giáo viên thêm qua bot ({len(items)}):")
        for t in items:
            note = f" – {t.get('note')}" if t.get("note") else ""
            lines.append(f"• {t['id']}{note} (thêm {vn_time(t.get('addedAt', ''), False)})")
        if not items:
            lines.append("• (chưa có) – dùng /themgv <ID> [ghi chú]")
        self.send_message(chat_id, "\n".join(lines))

    def _cmd_taolop(self, chat_id, user_id, args):
        if len(args) < 2:
            self.send_message(
                chat_id,
                "Cú pháp: /taolop <lớp> <mã_bắt_đầu>-<mã_kết_thúc>\n"
                "Ví dụ: /taolop 10A1 HS001-HS045\n"
                "Hoặc Thầy/Cô có thể gửi trực tiếp file .csv (cột ma_hs,lop) vào đây."
            )
            return

        class_name = args[0].strip()
        range_str = " ".join(args[1:])
        codes, err = parse_code_range(range_str)
        if err:
            self.send_message(chat_id, f"❌ {err}")
            return

        self._process_batch_invites(chat_id, user_id, class_name, codes)

    def _handle_document(self, chat_id, user_id, doc):
        fname = doc.get("file_name", "")
        mime = doc.get("mime_type", "")
        if not fname.lower().endswith(".csv") and "csv" not in mime.lower():
            self.send_message(chat_id, "Bot chỉ nhận file danh sách học sinh định dạng .csv (có cột ma_hs, lop).")
            return

        file_id = doc.get("file_id")
        if not file_id:
            self.send_message(chat_id, "Không tìm thấy mã file từ Telegram.")
            return

        try:
            csv_bytes = self.download_file(file_id)
        except Exception as e:
            self.send_message(chat_id, f"Không tải được file từ Telegram: {e}")
            return

        items, err = parse_csv_student_list(csv_bytes)
        if err:
            self.send_message(chat_id, f"❌ {err}")
            return

        class_name = ""
        for it in items:
            if it.get("className"):
                class_name = it["className"]
                break
        if not class_name:
            m = re.search(r"(10[A-Za-z0-9]+)", fname)
            if m:
                class_name = m.group(1)

        self._process_batch_invites(chat_id, user_id, class_name, items)

    def _process_batch_invites(self, chat_id, user_id, default_class, student_items):
        groups = {}
        for it in student_items:
            if isinstance(it, dict):
                c = it.get("code", "").strip()
                cl = it.get("className", "").strip() or default_class
            else:
                c = str(it).strip()
                cl = default_class
            if c:
                groups.setdefault(cl, []).append(c)

        total_codes = sum(len(codes) for codes in groups.values())
        if total_codes == 0:
            self.send_message(chat_id, "Không có mã học sinh nào để tạo mã mời.")
            return
        if total_codes > 60:
            self.send_message(chat_id, f"Số lượng học sinh ({total_codes}) vượt quá giới hạn tối đa 60 mã/lớp.")
            return

        all_res_items = []
        for cl, codes in groups.items():
            status, res = self.srv_request("POST", "/api/invites/batch", {
                "className": cl,
                "codes": codes,
                "createdBy": str(user_id),
                "days": 7
            })
            if status != 200:
                self.send_message(chat_id, f"Không tạo được mã mời hàng loạt: {res.get('error', 'Lỗi không xác định')}")
                return
            if isinstance(res, list):
                for item in res:
                    if "className" not in item:
                        item["className"] = cl
                all_res_items.extend(res)

        if not all_res_items:
            self.send_message(chat_id, "Không nhận được kết quả mã mời từ máy chủ.")
            return

        today = time.strftime("%Y%m%d")
        safe_class = re.sub(r"[^\w\-]+", "_", default_class or "lop")

        try:
            pdf_bytes = generate_cards_pdf(all_res_items, default_class)
            pdf_name = f"phieu_qr_{safe_class}_{today}.pdf"
            self.send_document(
                chat_id,
                pdf_bytes,
                filename=pdf_name,
                caption=f"📄 Phiếu QR in A4 cho lớp {default_class or 'tư vấn'} ({len(all_res_items)} học sinh, mỗi trang 8 ô để cắt phát)."
            )
        except Exception as e:
            self.send_message(chat_id, f"Lỗi tạo file PDF: {e}")

        try:
            csv_bytes = generate_batch_csv(all_res_items, default_class)
            csv_name = f"link_khao_sat_{safe_class}_{today}.csv"
            self.send_document(
                chat_id,
                csv_bytes,
                filename=csv_name,
                caption=f"📁 File CSV danh sách link khảo sát lớp {default_class or 'tư vấn'} để gửi qua Zalo/email."
            )
        except Exception as e:
            self.send_message(chat_id, f"Lỗi tạo file CSV: {e}")

        self.send_message(
            chat_id,
            f"✅ Đã tạo thành công {len(all_res_items)} mã mời khảo sát cho lớp {default_class or 'tư vấn'}!\n"
            f"• Hạn dùng: 7 ngày\n"
            f"• File PDF in A4: gồm {len(all_res_items)} ô phiếu khảo sát (8 ô/trang), giáo viên in và cắt phát cho học sinh/phụ huynh.\n"
            f"• File CSV: chứa link khảo sát để Thầy/Cô gửi trực tiếp qua Zalo hoặc email nếu cần.\n"
            f"• Để kiểm tra tiến độ nộp bài: gõ /danhsach {default_class}"
        )

    def _cmd_taolink(self, chat_id, user_id, args):
        if not args:
            self.send_message(chat_id, "Cú pháp: /taolink <mã HS> [lớp]\nVí dụ: /taolink HS001 10A1")
            return
        code = args[0].strip()
        if not CODE_RX.match(code):
            self.send_message(chat_id, "Mã học sinh không hợp lệ. Chỉ gồm chữ, số, dấu - _ . (tối đa 40 ký tự).")
            return
        class_name = args[1].strip() if len(args) > 1 else ""

        status, res = self.srv_request("POST", "/api/invites", {
            "code": code,
            "className": class_name,
            "createdBy": str(user_id),
            "days": 7
        })

        if status != 200:
            self.send_message(chat_id, f"Không tạo được mã mời: {res.get('error', 'Lỗi không xác định')}")
            return

        link = res.get("link", "")
        exp_at = res.get("expiresAt", "")

        caption = (
            f"🔗 Link khảo sát cho học sinh {code}" + (f" (Lớp: {class_name})" if class_name else "") + ":\n"
            f"{link}\n\n"
            f"⏰ Hạn dùng: {exp_at}\n"
            f"📌 Cha mẹ và học sinh quét mã QR hoặc bấm link trên điện thoại để hoàn thành khảo sát tại nhà."
        )

        # Tạo ảnh QR
        if segno:
            try:
                qr = segno.make(link)
                bio = io.BytesIO()
                qr.save(bio, kind="png", scale=6)
                self.send_photo(chat_id, bio.getvalue(), filename=f"qr_{code}.png", caption=caption)
                return
            except Exception:
                pass
        self.send_message(chat_id, caption)

    def _cmd_danhsach(self, chat_id, args):
        cls_filter = args[0].strip() if args else ""
        path = "/api/invites" + (f"?class={urllib.parse.quote(cls_filter)}" if cls_filter else "")
        status, res = self.srv_request("GET", path)
        if status != 200:
            self.send_message(chat_id, f"Không lấy được danh sách: {res.get('error', 'Lỗi kết nối')}")
            return
        if not isinstance(res, list) or not res:
            msg = f"Chưa có mã mời nào" + (f" thuộc lớp {cls_filter}." if cls_filter else ".")
            self.send_message(chat_id, msg)
            return

        lines = [f"📊 Danh sách mã mời khảo sát" + (f" [{cls_filter}]" if cls_filter else "") + ":"]
        sub_cnt, pend_cnt, rev_cnt = 0, 0, 0
        for i, inv in enumerate(res, 1):
            c = inv.get("code", "")
            cl = inv.get("className", "")
            cl_txt = f" ({cl})" if cl else ""
            if inv.get("revoked"):
                rev_cnt += 1
                lines.append(f"{i}. {c}{cl_txt}: Đã thu hồi")
            elif inv.get("submittedAt"):
                sub_cnt += 1
                lines.append(f"{i}. {c}{cl_txt}: Đã nộp (lúc {vn_time(inv.get('submittedAt'))})")
            else:
                pend_cnt += 1
                han = "ĐÃ HẾT HẠN" if is_expired(inv) else "Hạn: " + vn_time(inv.get("expiresAt"), False)
                lines.append(f"{i}. {c}{cl_txt}: Chưa nộp ({han})")

        lines.append(f"\nTổng cộng: {len(res)} mã ({sub_cnt} đã nộp, {pend_cnt} chưa nộp, {rev_cnt} đã thu hồi).")
        self.send_message(chat_id, "\n".join(lines))

    def _cmd_chuanop(self, chat_id, args):
        cls_filter = args[0].strip() if args else ""
        path = "/api/invites" + (f"?class={urllib.parse.quote(cls_filter)}" if cls_filter else "")
        status, res = self.srv_request("GET", path)
        if status != 200:
            self.send_message(chat_id, f"Không lấy được danh sách: {res.get('error', 'Lỗi')}")
            return

        chua_nop = [
            inv for inv in (res if isinstance(res, list) else [])
            if not inv.get("submittedAt") and not inv.get("revoked")
        ]

        if not chua_nop:
            self.send_message(chat_id, "Tất cả học sinh trong danh sách đã nộp khảo sát hoặc chưa có mã mời.")
            return

        lines = [f"⏳ Danh sách học sinh chưa nộp khảo sát" + (f" [{cls_filter}]" if cls_filter else "") + ":"]
        for i, inv in enumerate(chua_nop, 1):
            c = inv.get("code", "")
            cl = inv.get("className", "")
            cl_txt = f" ({cl})" if cl else ""
            han = "ĐÃ HẾT HẠN – tạo mã mới bằng /taolink" if is_expired(inv) else "Hạn: " + vn_time(inv.get("expiresAt"), False)
            lines.append(f"{i}. {c}{cl_txt} – {han}")
        lines.append(f"\nTổng cộng: {len(chua_nop)} học sinh chưa nộp.")
        self.send_message(chat_id, "\n".join(lines))

    def _cmd_hoso(self, chat_id, args):
        if not args:
            self.send_message(chat_id, "Cú pháp: /hoso <mã HS>\nVí dụ: /hoso HS001")
            return
        code = args[0].strip()
        if not CODE_RX.match(code):
            self.send_message(chat_id, "Mã học sinh chỉ gồm chữ, số, dấu - _ . (tối đa 40 ký tự).")
            return
        status, res = self.srv_request("GET", f"/api/profiles/{urllib.parse.quote(code)}")
        if status != 200:
            self.send_message(chat_id, f"Không tìm thấy hồ sơ học sinh {code}.")
            return

        prof = res.get("profile") or {}
        cl = prof.get("className", "")
        school = prof.get("school", "")
        data = prof.get("data") or {}
        tests = data.get("tests") or {}
        home = data.get("home") or {}
        tracking = data.get("tracking") or []

        # Tóm tắt các trắc nghiệm an toàn
        holland_code = _calc_holland(tests.get("holland"))
        ey_txt = _calc_eysenck(tests.get("eysenck"))
        mbti_txt = _calc_mbti(tests.get("mbti"))

        da_nop = "Đã nộp lúc " + vn_time(home.get("submittedAt")) if home.get("submittedAt") else "Chưa nộp qua link"
        if "unanswered" in prof and home.get("submittedAt") and prof.get("updatedAt", "") <= home.get("submittedAt", ""):
            thieu = f"Trắc nghiệm còn {prof.get('unanswered')} câu chưa trả lời" if prof.get("unanswered") else "Đã trả lời đủ 3 trắc nghiệm"
        else:
            thieu = f"Còn thiếu {prof.get('missing', 0)} mục (theo lần lưu gần nhất trên web)"
        track_cnt = len(tracking) if isinstance(tracking, list) else 0

        # TUYỆT ĐỐI KHÔNG chứa: health, econ, wish, familyWish, họ tên
        web_link = f"{self.public_origin}/"

        txt = (
            f"📄 Tóm tắt hồ sơ học sinh: {code}\n"
            f"• Lớp: {cl or '–'} | Trường: {school or '–'}\n"
            f"• Khảo sát tại nhà: {da_nop}\n"
            f"• Holland (top 3): {holland_code}\n"
            f"• Khí chất Eysenck: {ey_txt}\n"
            f"• MBTI: {mbti_txt}\n"
            f"• {thieu}\n"
            f"• Số lần theo dõi (Bước 7): {track_cnt}\n\n"
            f"🔗 Xem đầy đủ: mở {web_link} → nút Giáo viên → đăng nhập → mở mã {code}."
        )
        self.send_message(chat_id, txt)

    def _cmd_canhbao(self, chat_id):
        # Lấy danh sách hồ sơ
        status, res = self.srv_request("GET", "/api/profiles")
        if status != 200:
            self.send_message(chat_id, f"Không tải được danh mục hồ sơ: {res.get('error', 'Lỗi')}")
            return
        profiles = res.get("profiles") or []
        alerts = []
        for p in profiles:
            code = p.get("code")
            if not code:
                continue
            # Lấy hồ sơ chi tiết để đọc tracking
            st, full_res = self.srv_request("GET", f"/api/profiles/{urllib.parse.quote(code)}")
            if st != 200:
                continue
            prof = full_res.get("profile") or {}
            data = prof.get("data") or {}
            tracking = data.get("tracking") or []
            if not tracking or not isinstance(tracking, list):
                continue
            last_entry = tracking[-1]
            if not isinstance(last_entry, dict):
                continue
            overall = last_entry.get("overall")
            stress = last_entry.get("stress")
            if (overall is not None and overall <= 2) or (stress is not None and stress >= 4):
                alerts.append({
                    "code": code,
                    "className": prof.get("className", "") or p.get("className", ""),
                    "period": last_entry.get("period", "–"),
                    "overall": overall,
                    "stress": stress,
                    "note": last_entry.get("note", "")
                })

        if not alerts:
            self.send_message(chat_id, "✅ Không có hồ sơ nào có mức hài lòng thấp (≤2) hoặc căng thẳng cao (≥4).")
            return

        lines = ["⚠️ DANH SÁCH CẢNH BÁO BƯỚC 7 (Hài lòng ≤2 hoặc Căng thẳng ≥4):"]
        for i, a in enumerate(alerts, 1):
            hl = f"{a['overall']}/5" if a['overall'] is not None else "–"
            ct = f"{a['stress']}/5" if a['stress'] is not None else "–"
            cl = f" ({a['className']})" if a['className'] else ""
            nt = f" - Ghi chú: {a['note']}" if a['note'] else ""
            lines.append(f"{i}. {a['code']}{cl} [Đợt: {a['period']}] – Hài lòng: {hl}, Căng thẳng: {ct}{nt}")

        self.send_message(chat_id, "\n".join(lines))

    def _cmd_theodoi(self, chat_id, args):
        # /theodoi HS001 hk1 hailong=4 cangthang=2 ghichu=on_dinh
        if len(args) < 2:
            self.send_message(
                chat_id,
                "Cú pháp: /theodoi <mã HS> <đợt> hailong=1-5 cangthang=1-5 [ghichu=...]\n"
                "Đợt: giuahk1, hk1 (Cuối HK1), giuahk2, cuoinam (Cuối năm lớp 10), hk1-11, cn11, hk1-12\n"
                "Ví dụ: /theodoi HS001 hk1 hailong=4 cangthang=2 ghichu=on_dinh"
            )
            return

        code = args[0].strip()
        if not CODE_RX.match(code):
            self.send_message(chat_id, "Mã học sinh chỉ gồm chữ, số, dấu - _ . (tối đa 40 ký tự).")
            return
        period = parse_period(args[1])
        if not period:
            self.send_message(chat_id, "Đợt theo dõi chưa đúng. Dùng một trong: hk1 (Cuối HK1), giuahk1, giuahk2, cuoinam (Cuối năm lớp 10), hk1-11, cn11, hk1-12.")
            return
        hailong = None
        cangthang = None
        ghichu = ""
        errors = []

        for item in args[2:]:
            if "=" in item:
                k, v = item.split("=", 1)
                k = k.lower().strip()
                v = v.strip()
                if k in ("hailong", "overall", "sat"):
                    hailong = parse_scale(v)
                    if hailong is None:
                        errors.append(f"hailong={v}")
                elif k in ("cangthang", "stress"):
                    cangthang = parse_scale(v)
                    if cangthang is None:
                        errors.append(f"cangthang={v}")
                elif k in ("ghichu", "note"):
                    ghichu = v[:200]
        if errors:
            self.send_message(chat_id, "Giá trị không hợp lệ: " + ", ".join(errors) + ". Mức hài lòng và căng thẳng là số nguyên từ 1 đến 5. Chưa lưu gì.")
            return
        if hailong is None and cangthang is None:
            self.send_message(chat_id, "Cần ít nhất hailong=1-5 hoặc cangthang=1-5. Chưa lưu gì.")
            return

        # Lấy hồ sơ hiện tại
        status, res = self.srv_request("GET", f"/api/profiles/{urllib.parse.quote(code)}")
        if status != 200:
            self.send_message(chat_id, f"Không tìm thấy hồ sơ học sinh {code}.")
            return

        rec = res.get("profile") or {}
        data = rec.get("data")
        if not isinstance(data, dict):
            data = {"v": 2, "role": "gv", "step": 7, "profile": {"code": code}, "tracking": []}
            rec["data"] = data
        if "tracking" not in data or not isinstance(data["tracking"], list):
            data["tracking"] = []

        entry = {
            "period": period,
            "source": "bot",
            "wantChange": False,
            "date": time.strftime("%Y-%m-%d"),
            "scores": {},
            "sat": {},
            "overall": hailong,
            "stress": cangthang,
            "note": ghichu
        }
        data["tracking"].append(entry)
        rec["trackCount"] = len(data["tracking"])

        # Cập nhật lại máy chủ
        put_status, put_res = self.srv_request("PUT", f"/api/profiles/{urllib.parse.quote(code)}", rec)
        if put_status != 200:
            self.send_message(chat_id, f"Lỗi khi lưu theo dõi: {put_res.get('error', 'Lỗi máy chủ')}")
            return

        hl_str = f", Hài lòng: {hailong}/5" if hailong is not None else ""  # số nguyên 1–5
        ct_str = f", Căng thẳng: {cangthang}/5" if cangthang is not None else ""
        nt_str = f", Ghi chú: {ghichu}" if ghichu else ""
        self.send_message(chat_id, f"✅ Đã ghi nhận theo dõi đợt [{period}] cho học sinh {code}{hl_str}{ct_str}{nt_str}.")

    def _cmd_xuat(self, chat_id, args):
        cls_filter = args[0].strip() if args else ""
        status, res = self.srv_request("GET", "/api/profiles")
        if status != 200:
            self.send_message(chat_id, f"Không lấy được dữ liệu hồ sơ: {res.get('error', 'Lỗi')}")
            return

        profiles = res.get("profiles") or []
        rows = []
        for p in profiles:
            code = p.get("code", "")
            cl = p.get("className", "")
            if cls_filter and cl != cls_filter:
                continue
            # Lấy hồ sơ chi tiết
            st, full_res = self.srv_request("GET", f"/api/profiles/{urllib.parse.quote(code)}")
            if st != 200:
                continue
            prof = full_res.get("profile") or {}
            data = prof.get("data") or {}
            tests = data.get("tests") or {}
            home = data.get("home") or {}
            tracking = data.get("tracking") or []

            # Trích xuất dữ liệu tổng hợp – KHÔNG CÓ CỘT SỨC KHỎE, KINH TẾ, Ý KIẾN TỰ DO
            holland_code = _calc_holland(tests.get("holland"))
            ey_txt = _calc_eysenck(tests.get("eysenck"))
            mbti_txt = _calc_mbti(tests.get("mbti"))
            da_nop = "Đã nộp" if home.get("submittedAt") else "Chưa nộp"
            ngay_nop = vn_time(home.get("submittedAt"), False) if home.get("submittedAt") else ""

            rows.append({
                "ma_hs": code,
                "lop": cl,
                "truong": prof.get("school", ""),
                "trang_thai": da_nop,
                "ngay_nop": ngay_nop,
                "holland": holland_code,
                "khi_chat": ey_txt,
                "mbti": mbti_txt,
                "to_hop_chot": prof.get("combo", ""),
                "so_lan_theo_doi": len(tracking) if isinstance(tracking, list) else 0,
                "so_muc_thieu": prof.get("missing", 0)
            })

        if not rows:
            self.send_message(chat_id, "Không có hồ sơ nào phù hợp để xuất.")
            return

        # Tạo file CSV bộ nhớ có UTF-8 BOM để Excel hiển thị tiếng Việt chuẩn
        bio = io.BytesIO()
        bio.write(b"\xef\xbb\xbf")
        text_stream = io.TextIOWrapper(bio, encoding="utf-8", newline="")
        writer = csv.DictWriter(text_stream, fieldnames=[
            "ma_hs", "lop", "truong", "trang_thai", "ngay_nop",
            "holland", "khi_chat", "mbti", "to_hop_chot", "so_lan_theo_doi", "so_muc_thieu"
        ])
        writer.writeheader()
        for r in rows:
            writer.writerow({k: csv_safe(v) for k, v in r.items()})
        text_stream.flush()

        fname = f"danh_sach_{cls_filter or 'tat_ca'}_{time.strftime('%Y%m%d')}.csv"
        self.send_document(
            chat_id,
            bio.getvalue(),
            filename=fname,
            caption=f"📁 File CSV tổng hợp danh sách tư vấn ({len(rows)} học sinh)."
        )

    def _cmd_thuhoi(self, chat_id, args):
        if not args:
            self.send_message(chat_id, "Cú pháp: /thuhoi <mã HS>\nVí dụ: /thuhoi HS001")
            return
        code = args[0].strip()
        status, res = self.srv_request("DELETE", f"/api/invites/{urllib.parse.quote(code)}")
        if status != 200:
            self.send_message(chat_id, f"Không thu hồi được: {res.get('error', 'Lỗi')}")
            return
        cnt = res.get("revokedCount", 0)
        self.send_message(chat_id, f"✅ Đã thu hồi {cnt} mã mời còn hiệu lực của học sinh {code}.")

    # ---- Theo dõi sự kiện nộp bài tự động (Watcher) ----
    def check_events(self):
        events_file = self.data_dir / "events.jsonl"
        if not events_file.exists():
            return
        offset = 0
        if self.offset_file.exists():
            try:
                offset = int(self.offset_file.read_text(encoding="utf-8").strip() or 0)
            except Exception:
                offset = 0

        with self._lock:
            try:
                file_size = events_file.stat().st_size
                if offset > file_size:
                    offset = 0
                if offset == file_size:
                    return

                with open(events_file, "r", encoding="utf-8") as f:
                    f.seek(offset)
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            ev = json.loads(line)
                        except Exception:
                            continue
                        if ev.get("type") == "submit":
                            created_by = str(ev.get("createdBy", ""))
                            # Nếu giáo viên tạo mã mời bằng Telegram ID
                            if created_by in self.all_teacher_ids():
                                c = ev.get("code", "")
                                cl = ev.get("className", "")
                                cl_txt = f" ({cl})" if cl else ""
                                at_txt = vn_time(ev.get("submittedAt", ""))
                                n = ev.get("unanswered", ev.get("missingCount", 0))
                                miss_txt = f"Trắc nghiệm còn {n} câu chưa trả lời." if n else "Đã trả lời đủ 3 trắc nghiệm."
                                msg = (
                                    f"🔔 THÔNG BÁO: Học sinh {c}{cl_txt} đã nộp khảo sát tại nhà lúc {at_txt}.\n"
                                    f"{miss_txt} Thầy/Cô có thể gõ /hoso {c} để xem tóm tắt."
                                )
                                try:
                                    self.send_message(created_by, msg)
                                except Exception:
                                    pass
                    new_offset = f.tell()

                tmp_off = self.offset_file.with_suffix(".tmp")
                tmp_off.write_text(str(new_offset), encoding="utf-8")
                tmp_off.replace(self.offset_file)
            except Exception:
                pass

    # ---- Vòng lặp chính ----
    def run_polling(self):
        self.running = True
        backoff = 1
        print("Bot Telegram tư vấn bắt đầu chạy...")
        while self.running:
            # 1. Kiểm tra sự kiện nộp bài mới từ events.jsonl
            self.check_events()

            # 2. Long Polling getUpdates
            try:
                updates = self.tg_call("getUpdates", {
                    "offset": self.last_update_id + 1,
                    "timeout": POLL_TIMEOUT
                }, timeout=POLL_TIMEOUT + 10)
                backoff = 1
                for u in updates:
                    uid = u.get("update_id", 0)
                    if uid > self.last_update_id:
                        self.last_update_id = uid
                    try:
                        self.handle_update(u)
                    except Exception as err:
                        sys.stderr.write(f"Lỗi khi xử lý update {uid}: {err}\n")
            except Exception as e:
                # Lỗi mạng / timeout -> chờ tăng dần (exponential backoff)
                sleep_time = min(backoff, 30)
                msg = str(e).replace(self.token, "<token>") if self.token else str(e)
                sys.stderr.write(f"Lỗi kết nối Telegram ({type(e).__name__}: {msg[:200]}), thử lại sau {sleep_time}s...\n")
                if "401" in msg or "Unauthorized" in msg:
                    sys.stderr.write("→ Token bot sai hoặc đã bị thu hồi (Unauthorized). Sửa TUVAN_BOT_TOKEN trong server/tuvan.env.\n")
                time.sleep(sleep_time)
                backoff *= 2

    def stop(self):
        self.running = False

# ----------------- Khởi động khi chạy dòng lệnh -----------------
def main():
    if not TUVAN_BOT_TOKEN:
        sys.stderr.write("Lỗi: Chưa cấu hình biến môi trường TUVAN_BOT_TOKEN trong server/tuvan.env.\n")
        sys.stderr.write("Vui lòng tạo bot ở @BotFather và điền token vào server/tuvan.env.\n")
        sys.exit(1)

    if not TEACHER_TELEGRAM_IDS and not ADMIN_TELEGRAM_IDS:
        sys.stderr.write("Cảnh báo: TEACHER_TELEGRAM_IDS đang trống. Chưa có giáo viên nào được cấp quyền dùng bot.\n")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    bot = TuVanBot()

    def _sig_handler(sig, frame):
        print("\nĐang dừng bot...")
        bot.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, _sig_handler)
    signal.signal(signal.SIGTERM, _sig_handler)

    bot.run_polling()

if __name__ == "__main__":
    main()
