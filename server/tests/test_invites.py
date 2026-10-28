#!/usr/bin/env python3
"""
Kiểm thử tự động cho hệ thống mã mời và nộp khảo sát tại nhà (Giai đoạn 1).
© 2026 Dr. Duyen Nguyen. All rights reserved.
"""
import unittest
import os
import sys
import time
import json
import threading
import tempfile
import urllib.request
import urllib.error
from pathlib import Path

# Thêm thư mục server vào sys.path để import tuvan_proxy
SERVER_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVER_DIR))
import tuvan_proxy

class TestInvites(unittest.TestCase):
    temp_dir = None
    data_dir = None
    main_srv = None
    svc_srv = None
    proxy_port = None
    service_port = None
    teacher_pw = "TeacherPass_12345!"
    service_token = "ServiceSecret_abc123xyz!"
    teacher_token = None

    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.data_dir = Path(cls.temp_dir.name).resolve()

        # Cấu hình tuvan_proxy với thư mục tạm và mật khẩu kiểm thử
        tuvan_proxy.DATA_DIR = cls.data_dir
        tuvan_proxy.TEACHER_PASSWORD = cls.teacher_pw
        tuvan_proxy.BOT_SERVICE_TOKEN = cls.service_token

        # Khởi động hai máy chủ ở cổng tạm (port 0 = OS tự cấp cổng rảnh)
        cls.main_srv, cls.svc_srv = tuvan_proxy.make_servers(
            port=0,
            service_port=0,
            bot_service_token=cls.service_token
        )
        cls.proxy_port = cls.main_srv.server_address[1]
        cls.service_port = cls.svc_srv.server_address[1]
        tuvan_proxy.PUBLIC_ORIGIN = f"http://127.0.0.1:{cls.proxy_port}"

        cls.t_main = threading.Thread(target=cls.main_srv.serve_forever, daemon=True)
        cls.t_svc = threading.Thread(target=cls.svc_srv.serve_forever, daemon=True)
        cls.t_main.start()
        cls.t_svc.start()

        # Đăng nhập lấy Bearer token giáo viên
        login_url = f"http://127.0.0.1:{cls.proxy_port}/api/login"
        body = json.dumps({"password": cls.teacher_pw}).encode("utf-8")
        req = urllib.request.Request(login_url, data=body, method="POST", headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            cls.teacher_token = data["token"]

    @classmethod
    def tearDownClass(cls):
        if cls.main_srv:
            cls.main_srv.shutdown()
            cls.main_srv.server_close()
        if cls.svc_srv:
            cls.svc_srv.shutdown()
            cls.svc_srv.server_close()
        if cls.temp_dir:
            cls.temp_dir.cleanup()

    def _req(self, port, path, method="GET", body=None, headers=None):
        url = f"http://127.0.0.1:{port}{path}"
        hdrs = headers.copy() if headers else {}
        data = None
        if body is not None:
            if isinstance(body, (dict, list)):
                data = json.dumps(body).encode("utf-8")
                hdrs["Content-Type"] = "application/json"
            elif isinstance(body, (bytes, bytearray)):
                data = body
            else:
                data = str(body).encode("utf-8")

        req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                raw = resp.read().decode("utf-8")
                try:
                    js = json.loads(raw)
                except Exception:
                    js = raw
                return resp.status, js
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8")
            try:
                js = json.loads(raw)
            except Exception:
                js = raw
            return e.code, js

    # 1. Tạo mã mời với Bearer token giáo viên
    def test_01_create_invite_teacher(self):
        status, res = self._req(
            self.proxy_port,
            "/api/invites",
            method="POST",
            body={"code": "HS001", "className": "10A1", "days": 7},
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        self.assertEqual(status, 200)
        self.assertIn("token", res)
        self.assertIn("link", res)
        self.assertIn("expiresAt", res)
        self.assertEqual(res["code"], "HS001")
        self.assertTrue(res["link"].startswith(f"http://127.0.0.1:{self.proxy_port}/?moi="))
        self.__class__.invite_token_hs001 = res["token"]

    # 2. Tạo mã mời qua cổng dịch vụ (bot với X-Service-Token)
    def test_02_create_invite_service_port(self):
        status, res = self._req(
            self.service_port,
            "/api/invites",
            method="POST",
            body={"code": "HS002", "className": "10A1", "createdBy": "telegram_999"},
            headers={"X-Service-Token": self.service_token}
        )
        self.assertEqual(status, 200)
        self.assertIn("token", res)
        self.assertIn("link", res)
        self.assertEqual(res["code"], "HS002")
        self.__class__.invite_token_hs002 = res["token"]

    # 3. Tạo mã mời hàng loạt (batch)
    def test_03_create_invites_batch(self):
        status, res = self._req(
            self.proxy_port,
            "/api/invites/batch",
            method="POST",
            body={"className": "10A2", "codes": ["HS010", "HS011", "HS012"]},
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        self.assertEqual(status, 200)
        self.assertIsInstance(res, list)
        self.assertEqual(len(res), 3)
        codes = [item["code"] for item in res]
        self.assertEqual(codes, ["HS010", "HS011", "HS012"])
        for item in res:
            self.assertIn("token", item)
            self.assertIn("link", item)

        # Batch quá 60 mã bị từ chối
        too_many = [f"HS{i:03d}" for i in range(61)]
        status_err, res_err = self._req(
            self.proxy_port,
            "/api/invites/batch",
            method="POST",
            body={"className": "10A3", "codes": too_many},
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        self.assertEqual(status_err, 400)
        self.assertIn("tối đa 60", res_err["error"])

    # 4. Lấy danh sách mã mời (giáo viên), không trả token
    def test_04_get_invites_list_no_plain_token(self):
        status, res = self._req(
            self.proxy_port,
            "/api/invites?class=10A1",
            method="GET",
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        self.assertEqual(status, 200)
        self.assertIsInstance(res, list)
        self.assertGreaterEqual(len(res), 2)
        for inv in res:
            self.assertEqual(inv["className"], "10A1")
            self.assertIn("code", inv)
            self.assertIn("createdAt", inv)
            self.assertIn("expiresAt", inv)
            self.assertIn("revoked", inv)
            # TUYỆT ĐỐI không trả token hay token_hash
            self.assertNotIn("token", inv)
            self.assertNotIn("token_hash", inv)

    # 5. Không thấy token gốc trong file invites.json (chỉ lưu SHA-256)
    def test_05_no_raw_token_in_invites_json(self):
        invites_file = self.data_dir / "invites.json"
        self.assertTrue(invites_file.exists())
        raw_content = invites_file.read_text("utf-8")

        # Kiểm tra token thô của HS001 và HS002 không nằm trong file
        self.assertNotIn(self.invite_token_hs001, raw_content)
        self.assertNotIn(self.invite_token_hs002, raw_content)

        # Nhưng token_hash phải có
        data = json.loads(raw_content)
        hashes = [x.get("token_hash") for x in data]
        self.assertTrue(all(h and len(h) == 64 for h in hashes))

    # 6. Đọc thông tin mã mời công khai qua link
    def test_06_get_invite_public(self):
        status, res = self._req(
            self.proxy_port,
            f"/api/invite/{self.invite_token_hs001}",
            method="GET"
        )
        self.assertEqual(status, 200)
        self.assertEqual(res["code"], "HS001")
        self.assertEqual(res["className"], "10A1")
        self.assertIn("expiresAt", res)

    # 7. Mã sai, hết hạn, hoặc bị thu hồi phải trả 404
    def test_07_invalid_expired_revoked_returns_404(self):
        # Mã sai
        status, _ = self._req(self.proxy_port, "/api/invite/fake_token_random", method="GET")
        self.assertEqual(status, 404)
        status_sub, _ = self._req(
            self.proxy_port,
            "/api/submit/fake_token_random",
            method="POST",
            body={"consent": {"parent": True, "student": True}, "state": {}}
        )
        self.assertEqual(status_sub, 404)

        # Thu hồi mã của HS001
        status_del, res_del = self._req(
            self.proxy_port,
            "/api/invites/HS001",
            method="DELETE",
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        self.assertEqual(status_del, 200)
        self.assertEqual(res_del["revokedCount"], 1)

        # Sau khi thu hồi -> 404
        status_rev, _ = self._req(self.proxy_port, f"/api/invite/{self.invite_token_hs001}", method="GET")
        self.assertEqual(status_rev, 404)
        status_sub_rev, _ = self._req(
            self.proxy_port,
            f"/api/submit/{self.invite_token_hs001}",
            method="POST",
            body={"consent": {"parent": True, "student": True}, "state": {}}
        )
        self.assertEqual(status_sub_rev, 404)

    # 8. Nộp khảo sát thiếu đồng thuận bị từ chối (400)
    def test_08_submit_missing_consent_rejected(self):
        # Tạo mã mới cho HS003
        _, res_inv = self._req(
            self.proxy_port,
            "/api/invites",
            method="POST",
            body={"code": "HS003", "className": "10A1"},
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        tok = res_inv["token"]

        # Thiếu phụ huynh đồng ý
        status1, res1 = self._req(
            self.proxy_port,
            f"/api/submit/{tok}",
            method="POST",
            body={"consent": {"parent": False, "student": True}, "state": {}}
        )
        self.assertEqual(status1, 400)
        self.assertIn("đồng ý", res1["error"])

        # Thiếu học sinh đồng ý
        status2, res2 = self._req(
            self.proxy_port,
            f"/api/submit/{tok}",
            method="POST",
            body={"consent": {"parent": True, "student": False}, "state": {}}
        )
        self.assertEqual(status2, 400)
        self.assertIn("đồng ý", res2["error"])

        # Không có object consent
        status3, res3 = self._req(
            self.proxy_port,
            f"/api/submit/{tok}",
            method="POST",
            body={"state": {}}
        )
        self.assertEqual(status3, 400)

    # 9. Mã học sinh trong state bị ép đúng theo mã mời
    def test_09_code_in_state_is_forced(self):
        _, res_inv = self._req(
            self.proxy_port,
            "/api/invites",
            method="POST",
            body={"code": "HS004", "className": "10A1"},
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        tok = res_inv["token"]

        # Client gửi mã khác (HACKER999) trong state.profile
        status, res_sub = self._req(
            self.proxy_port,
            f"/api/submit/{tok}",
            method="POST",
            body={
                "consent": {"parent": True, "student": True},
                "state": {
                    "profile": {"code": "HACKER999", "nickname": "Tí", "schoolName": "THPT Demo"},
                    "tests": {"holland": {"R": 15, "I": 20}}
                }
            }
        )
        self.assertEqual(status, 200)
        self.assertEqual(res_sub["code"], "HS004")

        # Kiểm tra file hồ sơ trên đĩa: HS004.json phải được tạo, HACKER999.json không tồn tại
        prof_file = self.data_dir / "profiles" / "HS004.json"
        fake_file = self.data_dir / "profiles" / "HACKER999.json"
        self.assertTrue(prof_file.exists())
        self.assertFalse(fake_file.exists())

        saved = json.loads(prof_file.read_text("utf-8"))
        self.assertEqual(saved["code"], "HS004")
        self.assertEqual(saved["data"]["profile"]["code"], "HS004")
        self.assertEqual(saved["data"]["tests"]["holland"]["R"], 15)

    # 10. Nộp không ghi đè data.final / data.tracking đã có
    def test_10_submit_does_not_overwrite_existing_steps_3_to_7(self):
        # Giả lập hồ sơ HS005 đã được giáo viên tư vấn và ghi nhận Bước 5-7
        prof_file = self.data_dir / "profiles" / "HS005.json"
        prof_file.parent.mkdir(parents=True, exist_ok=True)
        initial_prof = {
            "code": "HS005",
            "name": "Bình",
            "className": "10A1",
            "school": "THPT Chu Văn An",
            "data": {
                "v": 2,
                "role": "gv",
                "step": 6,
                "profile": {"nickname": "Bình Cũ", "schoolName": "THPT Chu Văn An"},
                "tests": {"holland": {"R": 10}},
                "final": {"selected": "T01_KHTN", "teacherNotes": "Định hướng tốt"},
                "tracking": [{"hk": "hk1", "satisfaction": 4, "stress": 2, "note": "Theo dõi tốt"}],
                "careerFb": {"analysis": "Thích hợp công nghệ"}
            }
        }
        prof_file.write_text(json.dumps(initial_prof, ensure_ascii=False), "utf-8")

        # Tạo mã mời cho HS005
        _, res_inv = self._req(
            self.proxy_port,
            "/api/invites",
            method="POST",
            body={"code": "HS005", "className": "10A1"},
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        tok = res_inv["token"]

        # Học sinh làm lại tại nhà và nộp (gửi kèm cả final giả mạo để thử phá)
        status, _ = self._req(
            self.proxy_port,
            f"/api/submit/{tok}",
            method="POST",
            body={
                "consent": {"parent": True, "student": True},
                "state": {
                    "profile": {"nickname": "Bình Mới", "className": "10A1"},
                    "tests": {"holland": {"R": 25, "E": 18}, "mbti": {"type": "INTJ"}},
                    "final": {"evil": "ghi đè"},
                    "tracking": []
                }
            }
        )
        self.assertEqual(status, 200)

        # Đọc lại hồ sơ đã lưu
        after = json.loads(prof_file.read_text("utf-8"))
        d = after["data"]

        # Dữ liệu Bước 1-2 được cập nhật
        self.assertEqual(d["profile"]["nickname"], "Bình Mới")
        self.assertEqual(d["tests"]["holland"]["R"], 25)
        self.assertEqual(d["tests"]["mbti"]["type"], "INTJ")

        # Dữ liệu Bước 3-7 của giáo viên được GIỮ NGUYÊN
        self.assertEqual(d["final"], {"selected": "T01_KHTN", "teacherNotes": "Định hướng tốt"})
        self.assertEqual(d["tracking"], [{"hk": "hk1", "satisfaction": 4, "stress": 2, "note": "Theo dõi tốt"}])
        self.assertEqual(d["careerFb"], {"analysis": "Thích hợp công nghệ"})

        # Ghi nhận data.home
        self.assertIn("home", d)
        self.assertEqual(d["home"]["submitCount"], 1)
        self.assertTrue(d["home"]["consent"]["parent"])
        self.assertTrue(d["home"]["consent"]["student"])

    # 11. Gửi X-Service-Token đúng vào cổng 8787 (công khai) VẪN BỊ TỪ CHỐI (401)
    def test_11_service_token_on_public_port_rejected(self):
        status, res = self._req(
            self.proxy_port,
            "/api/invites",
            method="POST",
            body={"code": "HS006"},
            headers={"X-Service-Token": self.service_token}  # KHÔNG gửi Bearer token
        )
        self.assertEqual(status, 401)
        self.assertIn("cần đăng nhập giáo viên", res.get("error", ""))

    # 12. Cổng dịch vụ từ chối khoá sai hoặc thiếu khoá (401)
    def test_12_service_port_rejects_wrong_or_missing_token(self):
        # Khoá sai
        status1, res1 = self._req(
            self.service_port,
            "/api/invites",
            method="POST",
            body={"code": "HS007"},
            headers={"X-Service-Token": "Sai_Khoa_12345"}
        )
        self.assertEqual(status1, 401)
        self.assertIn("không hợp lệ", res1.get("error", ""))

        # Thiếu khoá
        status2, res2 = self._req(
            self.service_port,
            "/api/invites",
            method="POST",
            body={"code": "HS007"}
        )
        self.assertEqual(status2, 401)

    # 13. Cổng dịch vụ CHỈ phục vụ /api/*
    def test_13_service_port_only_serves_api(self):
        status, _ = self._req(
            self.service_port,
            "/index.html",
            method="GET",
            headers={"X-Service-Token": self.service_token}
        )
        self.assertEqual(status, 404)

        status2, _ = self._req(
            self.service_port,
            "/chat",
            method="POST",
            body={},
            headers={"X-Service-Token": self.service_token}
        )
        self.assertEqual(status2, 404)

    # 14. Nộp lại nhiều lần trước khi hết hạn -> tăng submitCount
    def test_14_resubmit_increments_count(self):
        _, res_inv = self._req(
            self.proxy_port,
            "/api/invites",
            method="POST",
            body={"code": "HS008", "className": "10A1"},
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        tok = res_inv["token"]

        # Lần 1
        s1, r1 = self._req(
            self.proxy_port,
            f"/api/submit/{tok}",
            method="POST",
            body={"consent": {"parent": True, "student": True}, "state": {"profile": {"nickname": "Lan 1"}}}
        )
        self.assertEqual(s1, 200)
        self.assertEqual(r1["submitCount"], 1)

        # Lần 2 (sửa rồi nộp lại)
        s2, r2 = self._req(
            self.proxy_port,
            f"/api/submit/{tok}",
            method="POST",
            body={"consent": {"parent": True, "student": True}, "state": {"profile": {"nickname": "Lan 2"}}}
        )
        self.assertEqual(s2, 200)
        self.assertEqual(r2["submitCount"], 2)

        # Kiểm tra events.jsonl có được ghi
        events_file = self.data_dir / "events.jsonl"
        self.assertTrue(events_file.exists())
        lines = events_file.read_text("utf-8").strip().split("\n")
        self.assertGreaterEqual(len(lines), 2)
        last_event = json.loads(lines[-1])
        self.assertEqual(last_event["code"], "HS008")
        self.assertEqual(last_event["submitCount"], 2)

if __name__ == "__main__":
    unittest.main()
