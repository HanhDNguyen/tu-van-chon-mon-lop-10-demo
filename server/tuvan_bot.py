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

# Thư viện thuần Python tạo mã QR PNG
try:
    import segno
except ImportError:
    segno = None

# ----------------- Cấu hình môi trường -----------------
TUVAN_BOT_TOKEN = os.environ.get("TUVAN_BOT_TOKEN", "").strip()
TEACHER_IDS_RAW = os.environ.get("TEACHER_TELEGRAM_IDS", "").strip()
TEACHER_TELEGRAM_IDS = set(x.strip() for x in TEACHER_IDS_RAW.split(",") if x.strip())
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

def _calc_holland(holland_data):
    if not isinstance(holland_data, dict):
        return "–"
    sc = {}
    for k, items in holland_data.items():
        if isinstance(items, list):
            sc[k] = sum(x for x in items if isinstance(x, (int, float)))
    if not sc or not any(sc.values()):
        return "–"
    order = sorted(sc.keys(), key=lambda k: sc[k], reverse=True)
    return "".join(order[:3])

def _calc_eysenck(eysenck_list):
    if not isinstance(eysenck_list, list) or len(eysenck_list) < 12:
        return "–"
    sc = {"HN": 0, "KOD": 0, "S": 0}
    answered = 0
    for i, v in enumerate(eysenck_list):
        if not v:
            continue
        answered += 1
        k, sign = EYSENCK_KEY[i % 12]
        if v == sign:
            sc[k] += 1
    if answered < 12:
        return "–"
    hn_hi = sc["HN"] > EYSENCK_MID
    kod_hi = sc["KOD"] > EYSENCK_MID
    if hn_hi and kod_hi:
        return "Nóng nảy (hướng ngoại, nhạy cảm)"
    if hn_hi and not kod_hi:
        return "Hăng hái / Linh hoạt (hướng ngoại, ổn định)"
    if not hn_hi and kod_hi:
        return "Ưu tư (hướng nội, sâu sắc)"
    return "Bình thản / Điềm đạm (hướng nội, ổn định)"

def _calc_mbti(mbti_list):
    if not isinstance(mbti_list, list) or len(mbti_list) < 7:
        return "–"
    # 4 chiều MBTI: EI, SN, TF, JP
    cols_map = {
        0: "EI", 1: "SN", 2: "SN", 3: "TF", 4: "TF", 5: "JP", 6: "JP"
    }
    counts = {
        "EI": {"a": 0, "b": 0},
        "SN": {"a": 0, "b": 0},
        "TF": {"a": 0, "b": 0},
        "JP": {"a": 0, "b": 0}
    }
    for i, v in enumerate(mbti_list):
        if v in ("a", "b"):
            dim = cols_map.get(i % 7)
            if dim:
                counts[dim][v] += 1
    dim_letters = {
        "EI": ("E", "I"),
        "SN": ("S", "N"),
        "TF": ("T", "F"),
        "JP": ("J", "P")
    }
    letters = []
    for dim in ["EI", "SN", "TF", "JP"]:
        a_cnt = counts[dim]["a"]
        b_cnt = counts[dim]["b"]
        la, lb = dim_letters[dim]
        if a_cnt > b_cnt:
            letters.append(la)
        elif b_cnt > a_cnt:
            letters.append(lb)
        else:
            letters.append(la + "/" + lb)
    return "".join(letters)

# ----------------- Lớp Bot Tư Vấn -----------------
class TuVanBot:
    def __init__(self, token=None, teacher_ids=None, service_url=None, service_token=None,
                 public_origin=None, data_dir=None, api_base=None):
        self.token = (token or TUVAN_BOT_TOKEN).strip()
        self.teacher_ids = teacher_ids if teacher_ids is not None else TEACHER_TELEGRAM_IDS
        self.service_url = (service_url or SERVICE_URL).rstrip("/")
        self.service_token = (service_token or BOT_SERVICE_TOKEN).strip()
        self.public_origin = (public_origin or PUBLIC_ORIGIN).rstrip("/")
        self.data_dir = Path(data_dir or DATA_DIR).resolve()
        self.api_base = (api_base or TELEGRAM_API_BASE).rstrip("/")
        self.running = False
        self.last_update_id = 0
        self.offset_file = self.data_dir / "bot_event_offset.txt"
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

        with urllib.request.urlopen(req, timeout=timeout) as resp:
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
        files = {"document": (filename, doc_bytes, "text/csv; charset=utf-8")}
        data = {"chat_id": str(chat_id), "caption": caption}
        return self.tg_call("sendDocument", data=data, files=files)

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
        return str(user_id) in self.teacher_ids

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

        # Kiểm tra danh sách giáo viên được phép
        if not self.is_authorized(user_id):
            self.send_message(
                chat_id,
                "Xin lỗi, tài khoản của bạn chưa được cấp quyền sử dụng hệ thống tư vấn này."
            )
            return

        # Xử lý các lệnh
        if not text.startswith("/"):
            return

        parts = text.split()
        cmd = parts[0].lower().split("@")[0]
        args = parts[1:]

        if cmd in ("/start", "/trogiup"):
            self._cmd_help(chat_id)
        elif cmd == "/taolink":
            self._cmd_taolink(chat_id, user_id, args)
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
    def _cmd_help(self, chat_id):
        help_text = (
            "Chào Thầy/Cô! Đây là hệ thống Bot hỗ trợ tư vấn chọn môn lớp 10 dành cho giáo viên.\n\n"
            "Các lệnh có thể sử dụng:\n"
            "• /taolink <mã HS> [lớp] : Tạo mã mời và ảnh QR để gửi cho phụ huynh & học sinh khảo sát tại nhà\n"
            "• /danhsach [lớp] : Xem danh sách mã mời khảo sát (đã nộp / chưa nộp)\n"
            "• /chuanop [lớp] : Danh sách học sinh chưa nộp khảo sát\n"
            "• /hoso <mã HS> : Tóm tắt kết quả trắc nghiệm và tiến độ hồ sơ\n"
            "• /canhbao : Cảnh báo học sinh có mức hài lòng thấp (≤2) hoặc căng thẳng cao (≥4)\n"
            "• /theodoi <mã HS> <đợt> [hailong=1-5] [cangthang=1-5] [ghichu=...] : Ghi nhận theo dõi Bước 7\n"
            "• /xuat [lớp] : Xuất file CSV danh sách tổng hợp (đã lọc dữ liệu riêng tư)\n"
            "• /thuhoi <mã HS> : Thu hồi toàn bộ mã mời còn hạn của học sinh\n"
            "• /trogiup : Xem lại hướng dẫn này"
        )
        self.send_message(chat_id, help_text)

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
                lines.append(f"{i}. {c}{cl_txt}: Đã nộp (lúc {inv.get('submittedAt')[:16]})")
            else:
                pend_cnt += 1
                lines.append(f"{i}. {c}{cl_txt}: Chưa nộp (Hạn: {inv.get('expiresAt', '')[:10]})")

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
            lines.append(f"{i}. {c}{cl_txt} – Hạn: {inv.get('expiresAt', '')[:10]}")
        lines.append(f"\nTổng cộng: {len(chua_nop)} học sinh chưa nộp.")
        self.send_message(chat_id, "\n".join(lines))

    def _cmd_hoso(self, chat_id, args):
        if not args:
            self.send_message(chat_id, "Cú pháp: /hoso <mã HS>\nVí dụ: /hoso HS001")
            return
        code = args[0].strip()
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

        da_nop = "Đã nộp lúc " + str(home.get("submittedAt", "")[:16]) if home.get("submittedAt") else "Chưa nộp qua link"
        missing_cnt = prof.get("missing", 0)
        track_cnt = len(tracking) if isinstance(tracking, list) else 0

        # TUYỆT ĐỐI KHÔNG chứa: health, econ, wish, familyWish, họ tên
        web_link = f"{self.public_origin}/?code={code}#gv"

        txt = (
            f"📄 Tóm tắt hồ sơ học sinh: {code}\n"
            f"• Lớp: {cl or '–'} | Trường: {school or '–'}\n"
            f"• Khảo sát tại nhà: {da_nop}\n"
            f"• Holland (top 3): {holland_code}\n"
            f"• Khí chất Eysenck: {ey_txt}\n"
            f"• MBTI: {mbti_txt}\n"
            f"• Còn thiếu: {missing_cnt} mục\n"
            f"• Số lần theo dõi (Bước 7): {track_cnt}\n\n"
            f"🔗 Mở hồ sơ đầy đủ trên web (Khu vực giáo viên):\n{web_link}"
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
                "Cú pháp: /theodoi <mã HS> <đợt> [hailong=1-5] [cangthang=1-5] [ghichu=...]\n"
                "Ví dụ: /theodoi HS001 hk1 hailong=4 cangthang=2 ghichu=on_dinh"
            )
            return

        code = args[0].strip()
        period = args[1].strip()
        hailong = None
        cangthang = None
        ghichu = ""

        for item in args[2:]:
            if "=" in item:
                k, v = item.split("=", 1)
                k = k.lower().strip()
                v = v.strip()
                if k in ("hailong", "overall", "sat"):
                    try:
                        hailong = float(v)
                    except ValueError:
                        pass
                elif k in ("cangthang", "stress"):
                    try:
                        cangthang = float(v)
                    except ValueError:
                        pass
                elif k in ("ghichu", "note"):
                    ghichu = v

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

        hl_str = f", Hài lòng: {hailong}/5" if hailong is not None else ""
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
            ngay_nop = home.get("submittedAt", "")[:10] if home.get("submittedAt") else ""

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
            writer.writerow(r)
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
                            if created_by in self.teacher_ids:
                                c = ev.get("code", "")
                                cl = ev.get("className", "")
                                cl_txt = f" ({cl})" if cl else ""
                                at_txt = str(ev.get("submittedAt", ""))[:16].replace("T", " ")
                                miss = ev.get("missingCount", 0)
                                msg = (
                                    f"🔔 THÔNG BÁO: Học sinh {c}{cl_txt} đã nộp khảo sát tại nhà lúc {at_txt}.\n"
                                    f"Còn thiếu: {miss} mục. Thầy/Cô có thể gõ /hoso {c} để xem tóm tắt."
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
                sys.stderr.write(f"Lỗi kết nối Telegram ({type(e).__name__}), thử lại sau {sleep_time}s...\n")
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

    if not TEACHER_TELEGRAM_IDS:
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
