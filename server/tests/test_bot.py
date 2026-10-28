#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# © 2026 Dr. Duyen Nguyen. All rights reserved.
# Bộ kiểm thử tự động cho Bot Telegram giáo viên (server/tuvan_bot.py)
# Giả lập máy chủ Telegram API cục bộ, kiểm tra toàn bộ tính năng và bảo mật riêng tư

import unittest
import threading
import tempfile
import json
import io
import shutil
import time
import os
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

import server.tuvan_proxy as proxy
from server.tuvan_bot import TuVanBot

# ----------------- Mock Telegram Server -----------------
class MockTelegramHandler(BaseHTTPRequestHandler):
    sent_messages = []
    sent_photos = []
    sent_documents = []
    updates_queue = []

    @classmethod
    def reset(cls):
        cls.sent_messages = []
        cls.sent_photos = []
        cls.sent_documents = []
        cls.updates_queue = []

    def log_message(self, fmt, *args):
        pass

    def _json(self, status, payload):
        b = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        path = self.path
        length = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(length) if length > 0 else b""
        ctype = self.headers.get("Content-Type", "")

        if "getUpdates" in path:
            updates = list(self.updates_queue)
            self.updates_queue.clear()
            return self._json(200, {"ok": True, "result": updates})

        if "sendMessage" in path:
            data = json.loads(body.decode("utf-8")) if body else {}
            MockTelegramHandler.sent_messages.append(data)
            return self._json(200, {"ok": True, "result": {"message_id": len(self.sent_messages)}})

        if "sendPhoto" in path:
            # Multipart
            MockTelegramHandler.sent_photos.append({
                "body": body,
                "ctype": ctype
            })
            return self._json(200, {"ok": True, "result": {"message_id": len(self.sent_photos)}})

        if "sendDocument" in path:
            MockTelegramHandler.sent_documents.append({
                "body": body,
                "ctype": ctype
            })
            return self._json(200, {"ok": True, "result": {"message_id": len(self.sent_documents)}})

        return self._json(404, {"ok": False, "description": "not found"})

# ----------------- Test Suite -----------------
class TestTuVanBot(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 1. Khởi động Mock Telegram API Server
        cls.mock_tg_server = HTTPServer(("127.0.0.1", 0), MockTelegramHandler)
        cls.tg_port = cls.mock_tg_server.server_address[1]
        cls.tg_thread = threading.Thread(target=cls.mock_tg_server.serve_forever, daemon=True)
        cls.tg_thread.start()
        cls.tg_api_base = f"http://127.0.0.1:{cls.tg_port}"

        # 2. Khởi động TuVan Proxy Server (Main + Service Port)
        cls.tmp_dir = tempfile.TemporaryDirectory()
        cls.data_dir = Path(cls.tmp_dir.name)
        cls.service_token = "secret_service_token_12345"
        cls.teacher_password = "test_teacher_pass_secret"

        proxy.DATA_DIR = cls.data_dir
        proxy.TEACHER_PASSWORD = cls.teacher_password
        proxy.BOT_SERVICE_TOKEN = cls.service_token
        proxy.PUBLIC_ORIGIN = "http://127.0.0.1:8787"

        cls.main_srv, cls.service_srv = proxy.make_servers(
            port=0,
            service_port=0,
            bot_service_token=cls.service_token
        )
        cls.proxy_port = cls.main_srv.server_address[1]
        cls.service_port = cls.service_srv.server_address[1]

        cls.main_th = threading.Thread(target=cls.main_srv.serve_forever, daemon=True)
        cls.service_th = threading.Thread(target=cls.service_srv.serve_forever, daemon=True)
        cls.main_th.start()
        cls.service_th.start()

        cls.service_url = f"http://127.0.0.1:{cls.service_port}"
        cls.teacher_id = "111222333"

    @classmethod
    def tearDownClass(cls):
        cls.mock_tg_server.shutdown()
        cls.main_srv.shutdown()
        cls.service_srv.shutdown()
        cls.tmp_dir.cleanup()

    def setUp(self):
        MockTelegramHandler.reset()
        self.bot = TuVanBot(
            token="test_mock_token",
            teacher_ids={self.teacher_id},
            service_url=self.service_url,
            service_token=self.service_token,
            public_origin=f"http://127.0.0.1:{self.proxy_port}",
            data_dir=self.data_dir,
            api_base=self.tg_api_base
        )

    def _make_msg_update(self, text, from_id=None, chat_type="private"):
        return {
            "update_id": int(time.time() * 1000) % 1000000,
            "message": {
                "message_id": 1,
                "from": {"id": from_id or self.teacher_id, "first_name": "Teacher"},
                "chat": {"id": from_id or self.teacher_id, "type": chat_type},
                "text": text
            }
        }

    # 1. Từ chối người lạ (ID không trong TEACHER_TELEGRAM_IDS)
    def test_01_unauthorized_user_rejected(self):
        u = self._make_msg_update("/trogiup", from_id="999888777")
        self.bot.handle_update(u)
        self.assertEqual(len(MockTelegramHandler.sent_messages), 1)
        resp_text = MockTelegramHandler.sent_messages[0]["text"]
        self.assertIn("chưa được cấp quyền", resp_text)

    # 2. Từ chối tin nhắn trong nhóm
    def test_02_group_chat_rejected(self):
        u = self._make_msg_update("/danhsach", from_id=self.teacher_id, chat_type="group")
        self.bot.handle_update(u)
        self.assertEqual(len(MockTelegramHandler.sent_messages), 1)
        resp_text = MockTelegramHandler.sent_messages[0]["text"]
        self.assertIn("tin nhắn riêng", resp_text)

    # 3. Lệnh /start và /trogiup
    def test_03_help_command(self):
        u = self._make_msg_update("/start")
        self.bot.handle_update(u)
        self.assertEqual(len(MockTelegramHandler.sent_messages), 1)
        resp_text = MockTelegramHandler.sent_messages[0]["text"]
        self.assertIn("/taolink", resp_text)
        self.assertIn("/danhsach", resp_text)
        self.assertIn("/canhbao", resp_text)

    # 4. Lệnh /taolink tạo QR code và link khảo sát
    def test_04_taolink_generates_qr(self):
        u = self._make_msg_update("/taolink HS001 10A1")
        self.bot.handle_update(u)
        # Sẽ gửi photo nếu có segno, hoặc send_message nếu không có
        if len(MockTelegramHandler.sent_photos) > 0:
            photo = MockTelegramHandler.sent_photos[0]
            self.assertIn(b"form-data", photo["body"])
            self.assertIn(b"HS001", photo["body"])
            self.assertIn(b"/?moi=", photo["body"])
        else:
            self.assertEqual(len(MockTelegramHandler.sent_messages), 1)
            msg = MockTelegramHandler.sent_messages[0]["text"]
            self.assertIn("HS001", msg)
            self.assertIn("?moi=", msg)

    # 5. Lệnh /danhsach và /chuanop
    def test_05_danhsach_and_chuanop(self):
        u_ds = self._make_msg_update("/danhsach 10A1")
        self.bot.handle_update(u_ds)
        self.assertGreater(len(MockTelegramHandler.sent_messages), 0)
        msg_ds = MockTelegramHandler.sent_messages[-1]["text"]
        self.assertIn("HS001", msg_ds)

        u_cn = self._make_msg_update("/chuanop 10A1")
        self.bot.handle_update(u_cn)
        msg_cn = MockTelegramHandler.sent_messages[-1]["text"]
        self.assertIn("HS001", msg_cn)

    # 6. Bảo vệ riêng tư hồ sơ: /hoso TUYỆT ĐỐI KHÔNG chứa health/econ/wish
    def test_06_hoso_privacy_check(self):
        # Tạo sẵn hồ sơ có chứa thông tin nhạy cảm ở DATA_DIR
        sensitive_profile = {
            "code": "HS001",
            "name": "Nguyen Van A",
            "className": "10A1",
            "school": "THPT Demo",
            "combo": "Toán – Lí – Hoá",
            "trackCount": 0,
            "missing": 1,
            "data": {
                "v": 2,
                "role": "hs",
                "profile": {
                    "code": "HS001",
                    "nickname": "Nguyen Van A",
                    "health": "Bị bệnh tim bẩm sinh và hen suyễn nặng",
                    "cond": {
                        "econ": "Gia đình hộ nghèo đặc biệt khó khăn vay nợ"
                    },
                    "wish": "Em muốn bỏ học sớm để đi làm phụ giúp mẹ",
                    "familyWish": "Bố mẹ bắt buộc phải thi ngành Công an"
                },
                "tests": {
                    "holland": {
                        "R": [2, 3, 4, 3, 2, 4],
                        "I": [4, 4, 4, 4, 4, 4],
                        "A": [1, 1, 1, 1, 1, 1],
                        "S": [2, 2, 2, 2, 2, 2],
                        "E": [1, 2, 1, 1, 1, 1],
                        "C": [3, 3, 3, 3, 3, 3]
                    },
                    "eysenck": ["+", "+", "+", "-", "-", "+", "+", "+", "+", "+", "+", "-"],
                    "mbti": ["a", "b", "a", "b", "a", "b", "a"]
                },
                "home": {
                    "submittedAt": "2026-10-29T20:15:00Z"
                },
                "tracking": []
            }
        }
        prof_file = proxy.PROFILE_DIR() / "HS001.json"
        prof_file.parent.mkdir(parents=True, exist_ok=True)
        prof_file.write_text(json.dumps(sensitive_profile, ensure_ascii=False), encoding="utf-8")

        # Gọi lệnh /hoso HS001
        u = self._make_msg_update("/hoso HS001")
        self.bot.handle_update(u)
        self.assertGreater(len(MockTelegramHandler.sent_messages), 0)
        msg_text = MockTelegramHandler.sent_messages[-1]["text"]

        # Kiểm tra nội dung công khai hợp lệ
        self.assertIn("HS001", msg_text)
        self.assertIn("Holland", msg_text)
        self.assertIn("Eysenck", msg_text)
        self.assertIn("MBTI", msg_text)
        self.assertIn("web", msg_text.lower())

        # KHẲNG ĐỊNH: Tuyệt đối không chứa bất kỳ từ ngữ nhạy cảm nào
        forbidden_keywords = [
            "bệnh tim", "hen suyễn", "hộ nghèo", "vay nợ", "bỏ học",
            "phụ giúp mẹ", "Công an", "health", "econ", "wish"
        ]
        for kw in forbidden_keywords:
            self.assertNotIn(kw.lower(), msg_text.lower(), f"Lộ dữ liệu nhạy cảm: {kw}")

    # 7. Ghi nhận theo dõi Bước 7 (/theodoi)
    def test_07_theodoi_step7(self):
        u = self._make_msg_update("/theodoi HS001 hk1 hailong=4 cangthang=2 ghichu=on_dinh")
        self.bot.handle_update(u)
        self.assertGreater(len(MockTelegramHandler.sent_messages), 0)
        res_msg = MockTelegramHandler.sent_messages[-1]["text"]
        self.assertIn("Đã ghi nhận", res_msg)

        # Đọc lại hồ sơ xem đã có tracking chưa
        prof_file = proxy.PROFILE_DIR() / "HS001.json"
        data = json.loads(prof_file.read_text(encoding="utf-8"))
        tr = data["data"]["tracking"]
        self.assertEqual(len(tr), 1)
        self.assertEqual(tr[0]["period"], "hk1")
        self.assertEqual(tr[0]["overall"], 4.0)
        self.assertEqual(tr[0]["stress"], 2.0)
        self.assertEqual(tr[0]["note"], "on_dinh")

    # 8. Cảnh báo học sinh Bước 7 (/canhbao)
    def test_08_canhbao_step7(self):
        # Tạo thêm HS002 có mức căng thẳng cao = 5
        stress_prof = {
            "code": "HS002",
            "className": "10A1",
            "data": {
                "v": 2,
                "tracking": [
                    {"period": "hk1", "overall": 2.0, "stress": 5.0, "note": "ap_luc_hoc_tap"}
                ]
            }
        }
        (proxy.PROFILE_DIR() / "HS002.json").write_text(json.dumps(stress_prof), encoding="utf-8")

        u = self._make_msg_update("/canhbao")
        self.bot.handle_update(u)
        self.assertGreater(len(MockTelegramHandler.sent_messages), 0)
        warn_msg = MockTelegramHandler.sent_messages[-1]["text"]
        self.assertIn("HS002", warn_msg)
        self.assertIn("Căng thẳng: 5.0/5", warn_msg)

    # 9. Xuất CSV (/xuat) và kiểm tra bảo mật dữ liệu
    def test_09_xuat_csv_privacy(self):
        u = self._make_msg_update("/xuat 10A1")
        self.bot.handle_update(u)
        self.assertEqual(len(MockTelegramHandler.sent_documents), 1)
        doc = MockTelegramHandler.sent_documents[0]
        body = doc["body"].decode("utf-8", errors="replace")

        # Khẳng định có header chuẩn
        self.assertIn("ma_hs,lop,truong", body)
        self.assertIn("HS001", body)

        # Khẳng định không có bất kỳ cột/từ nào về sức khỏe, kinh tế, tâm tư
        self.assertNotIn("health", body.lower())
        self.assertNotIn("econ", body.lower())
        self.assertNotIn("wish", body.lower())
        self.assertNotIn("bệnh tim", body.lower())
        self.assertNotIn("hộ nghèo", body.lower())

    # 10. Thu hồi mã mời (/thuhoi)
    def test_10_thuhoi(self):
        u = self._make_msg_update("/thuhoi HS001")
        self.bot.handle_update(u)
        self.assertGreater(len(MockTelegramHandler.sent_messages), 0)
        msg = MockTelegramHandler.sent_messages[-1]["text"]
        self.assertIn("Đã thu hồi", msg)

    # 11. Tự động thông báo khi có học sinh nộp bài (check_events)
    def test_11_event_watcher_notification(self):
        events_file = self.data_dir / "events.jsonl"
        ev = {
            "type": "submit",
            "code": "HS009",
            "className": "10A2",
            "createdBy": self.teacher_id,
            "submittedAt": "2026-10-29T21:00:00Z",
            "missingCount": 2
        }
        with open(events_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(ev, ensure_ascii=False) + "\n")

        # Gọi kiểm tra sự kiện
        self.bot.check_events()

        # Bot phải tự động gửi tin nhắn cho giáo viên
        self.assertGreater(len(MockTelegramHandler.sent_messages), 0)
        notif = MockTelegramHandler.sent_messages[-1]
        self.assertEqual(str(notif["chat_id"]), self.teacher_id)
        self.assertIn("HS009", notif["text"])
        self.assertIn("10A2", notif["text"])
        self.assertIn("2 mục", notif["text"])

if __name__ == "__main__":
    unittest.main()
