#!/usr/bin/env python3
"""
Kiểm thử hồi quy cho các lỗi máy chủ trong báo cáo audit 29/10/2026 (A3, A4, A6, A7, A15).
© 2026 Dr. Duyen Nguyen. All rights reserved.
Chỉ dùng dữ liệu giả.
"""
import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVER_DIR))
import tuvan_proxy  # noqa: E402


class AuditFixes(unittest.TestCase):
    teacher_pw = "MatKhauGia_Audit_29!"
    service_token = "KhoaDichVuGia_Audit_29!"

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.data_dir = Path(cls.tmp.name).resolve()
        tuvan_proxy.DATA_DIR = cls.data_dir
        tuvan_proxy.TEACHER_PASSWORD = cls.teacher_pw
        tuvan_proxy.BOT_SERVICE_TOKEN = cls.service_token
        cls.main_srv, cls.svc_srv = tuvan_proxy.make_servers(port=0, service_port=0, bot_service_token=cls.service_token)
        cls.port = cls.main_srv.server_address[1]
        cls.sport = cls.svc_srv.server_address[1]
        tuvan_proxy.PUBLIC_ORIGIN = f"http://127.0.0.1:{cls.port}"
        for s in (cls.main_srv, cls.svc_srv):
            threading.Thread(target=s.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        for s in (cls.main_srv, cls.svc_srv):
            s.shutdown(); s.server_close()
        cls.tmp.cleanup()
        tuvan_proxy._login_hits.clear(); tuvan_proxy._submit_hits.clear()

    def setUp(self):
        tuvan_proxy._login_hits.clear(); tuvan_proxy._submit_hits.clear()

    def req(self, path, method="GET", body=None, headers=None, port=None, raw=None):
        url = f"http://127.0.0.1:{port or self.port}{path}"
        h = dict(headers or {})
        data = raw
        if body is not None:
            data = json.dumps(body).encode("utf-8"); h["Content-Type"] = "application/json"
        r = urllib.request.Request(url, data=data, method=method, headers=h)
        try:
            with urllib.request.urlopen(r, timeout=5) as resp:
                txt = resp.read().decode("utf-8")
                return resp.status, (json.loads(txt) if txt else None), dict(resp.headers)
        except urllib.error.HTTPError as e:
            txt = e.read().decode("utf-8")
            try:
                js = json.loads(txt)
            except Exception:
                js = txt
            return e.code, js, dict(e.headers)

    def login(self):
        tuvan_proxy._login_hits.clear()
        st, js, _ = self.req("/api/login", "POST", {"password": self.teacher_pw})
        self.assertEqual(st, 200)
        return {"Authorization": "Bearer " + js["token"]}

    def invite(self, code, cls="10A9"):
        st, js, _ = self.req("/api/invites", "POST", {"code": code, "className": cls}, port=self.sport,
                             headers={"X-Service-Token": self.service_token})
        self.assertEqual(st, 200)
        return js["token"]

    # ---- A3: X-Forwarded-For giả không vượt được giới hạn đăng nhập ----
    def test_a3_spoofed_xff_does_not_bypass_login_limit(self):
        codes = []
        for i in range(14):
            st, _, _ = self.req("/api/login", "POST", {"password": "sai"}, headers={"X-Forwarded-For": f"10.9.{i}.1, 203.0.113.7"})
            codes.append(st)
        self.assertEqual(codes[:10], [401] * 10)
        self.assertTrue(all(c == 429 for c in codes[10:]), codes)

    def test_a3_global_login_limit(self):
        # Mỗi lượt một IP "thật" khác nhau (phần tử cuối) – vẫn bị chặn khi vượt giới hạn toàn cục
        codes = [self.req("/api/login", "POST", {"password": "sai"}, headers={"X-Forwarded-For": f"198.51.100.{i}"})[0]
                 for i in range(tuvan_proxy.LOGIN_GLOBAL + 3)]
        self.assertIn(429, codes)
        self.assertEqual(codes.count(401), tuvan_proxy.LOGIN_GLOBAL)

    # ---- A4: log không chứa mã mời ----
    def test_a4_redact(self):
        tok = "AbCdEf123_-xyz"
        line = f'"POST /api/submit/{tok} HTTP/1.1" 200 - | "GET /?moi={tok} HTTP/1.1" | "GET /api/invite/{tok}"'
        out = tuvan_proxy.redact(line)
        self.assertNotIn(tok, out)
        self.assertEqual(out.count("<an>"), 3)

    # ---- A7: chỉ nhận đúng trường Bước 1–2; không đổi lớp/trường; bỏ __proto__ ----
    def test_a7_submit_is_sanitised(self):
        tok = self.invite("HS701", "10A1")
        evil = '<img src=x onerror="alert(1)">'
        raw = json.dumps({
            "consent": {"parent": True, "student": True},
            "state": {
                "profile": {"code": "HACKER", "nickname": "Giả 701", "className": "=HYPERLINK(\"http://x\")", "school": "THPT Giả",
                            "wish": evil, "liked": ["li", "hoa", 5, {"x": 1}], "lạ": "bỏ",
                            "__proto__": {"parent": True}, "cond": {"econ": "Khó khăn", "__proto__": {"x": 1}}},
                "tests": {"holland": {"R": [4, 4, 9, "4", None, 0, 1, 2, 3], "Z": [1]}, "eysenck": ["+", "x"], "mbti": ["a", "b", "c"]},
                "final": {"checks": {"parent": True}}
            }
        }).encode("utf-8")
        st, js, _ = self.req(f"/api/submit/{tok}", "POST", raw=raw, headers={"Content-Type": "application/json"})
        self.assertEqual(st, 200, js)
        rec = json.loads((self.data_dir / "profiles" / "HS701.json").read_text("utf-8"))
        p, t = rec["data"]["profile"], rec["data"]["tests"]
        self.assertEqual(p["code"], "HS701")
        self.assertEqual(p["className"], "10A1")            # lớp lấy từ mã mời
        self.assertEqual(rec["className"], "10A1")
        self.assertNotIn("school", p)
        self.assertNotIn("__proto__", json.dumps(rec))
        self.assertNotIn("lạ", p)
        self.assertNotIn("final", rec["data"])
        self.assertEqual(p["liked"], ["li", "hoa", "5"])
        self.assertEqual(p["wish"], evil)                   # lưu dạng chữ; web luôn escape khi hiển thị
        self.assertEqual(t["holland"]["R"], [4, 4, None, None, None, 0, 1, 2, 3])
        self.assertEqual(set(t["holland"]), set("RIASEC"))
        self.assertEqual(len(t["eysenck"]), 59); self.assertEqual(t["eysenck"][:2], ["+", None])
        self.assertEqual(len(t["mbti"]), 70); self.assertEqual(t["mbti"][:3], ["a", "b", None])
        self.assertEqual(rec["unanswered"], 3 + 6 * 9 - 9 + 58 + 68)

    def test_a7_consent_must_be_true_booleans(self):
        tok = self.invite("HS702")
        st, _, _ = self.req(f"/api/submit/{tok}", "POST", {"consent": {"parent": "yes", "student": 1}, "state": {}})
        self.assertEqual(st, 400)

    def test_a7_event_has_unanswered_count(self):
        tok = self.invite("HS703")
        self.req(f"/api/submit/{tok}", "POST", {"consent": {"parent": True, "student": True}, "state": {"tests": {"mbti": ["a"] * 70}}})
        evs = [json.loads(l) for l in (self.data_dir / "events.jsonl").read_text("utf-8").splitlines() if l.strip()]
        ev = [e for e in evs if e["code"] == "HS703"][-1]
        self.assertEqual(ev["unanswered"], 54 + 59)

    def test_a7_submit_keeps_teacher_fields(self):
        h = self.login()
        st, _, _ = self.req("/api/profiles/HS704", "PUT", {"code": "HS704", "data": {"v": 2, "profile": {"schoolId": "sch-1", "nickname": "cũ"},
                                                                                      "final": {"comboKey": "T1", "checks": {"cv68": True}}}}, headers=h)
        self.assertEqual(st, 200)
        tok = self.invite("HS704")
        self.req(f"/api/submit/{tok}", "POST", {"consent": {"parent": True, "student": True}, "state": {"profile": {"nickname": "mới"}}})
        rec = json.loads((self.data_dir / "profiles" / "HS704.json").read_text("utf-8"))
        self.assertEqual(rec["data"]["final"]["comboKey"], "T1")
        self.assertEqual(rec["data"]["profile"]["nickname"], "mới")

    # ---- A2 (phía máy chủ) và A6: PUT bỏ khoá nguy hiểm, từ chối NaN ----
    def test_a2_put_strips_proto(self):
        h = self.login()
        raw = b'{"code":"HS705","data":{"v":2,"profile":{"__proto__":{"parent":true},"nickname":"x"}}}'
        st, _, _ = self.req("/api/profiles/HS705", "PUT", raw=raw, headers=dict(h, **{"Content-Type": "application/json"}))
        self.assertEqual(st, 200)
        self.assertNotIn("__proto__", (self.data_dir / "profiles" / "HS705.json").read_text("utf-8"))

    def test_a6_nan_rejected(self):
        h = self.login()
        raw = b'{"code":"HS706","data":{"tracking":[{"overall":NaN,"stress":Infinity}]}}'
        st, _, _ = self.req("/api/profiles/HS706", "PUT", raw=raw, headers=dict(h, **{"Content-Type": "application/json"}))
        self.assertEqual(st, 400)
        self.assertFalse((self.data_dir / "profiles" / "HS706.json").exists())
        tok = self.invite("HS707")
        st, _, _ = self.req(f"/api/submit/{tok}", "POST", raw=b'{"consent":{"parent":true,"student":true},"state":{"profile":{"exam10":NaN}}}',
                            headers={"Content-Type": "application/json"})
        self.assertEqual(st, 400)

    # ---- A15: cổng dịch vụ không trả CORS, từ chối yêu cầu từ trình duyệt ----
    def test_a15_service_port_no_cors(self):
        st, _, hdr = self.req("/api/invites", "GET", port=self.sport, headers={"X-Service-Token": self.service_token, "Origin": "https://evil.example"})
        self.assertEqual(st, 200)
        self.assertNotIn("Access-Control-Allow-Origin", hdr)
        st, _, _ = self.req("/api/invites", "POST", {"code": "HS708"}, port=self.sport,
                            headers={"X-Service-Token": self.service_token, "Origin": "https://evil.example"})
        self.assertEqual(st, 403)


if __name__ == "__main__":
    unittest.main()
