#!/usr/bin/env python3
"""
Kiểm thử: quản trị viên thêm / xoá / xem giáo viên qua bot bằng ID Telegram.
© 2026 Dr. Duyen Nguyen. All rights reserved.
"""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import tuvan_bot as tb  # noqa: E402

ADMIN, ENV_GV, NEW, OTHER = "1110001", "2220002", "3330003", "4440004"


class AdminTeachers(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.sent = []
        self.bot = tb.TuVanBot(token="gia", teacher_ids={ENV_GV}, admin_ids={ADMIN},
                               service_url="http://127.0.0.1:9", service_token="gia", data_dir=self.tmp.name)
        self.fail_to = set()

        def fake_send(cid, text):
            if str(cid) in self.fail_to:
                raise RuntimeError("Forbidden: bot can't initiate conversation with a user")
            self.sent.append((str(cid), text))
        self.bot.send_message = fake_send

    def tearDown(self):
        self.tmp.cleanup()

    def say(self, uid, text, chat_type="private"):
        self.sent.clear()
        self.bot.handle_update({"message": {"chat": {"id": int(uid), "type": chat_type},
                                            "from": {"id": int(uid)}, "text": text}})
        return [t for c, t in self.sent if c == uid]

    def test_unknown_user_sees_own_id(self):
        out = self.say(NEW, "/start")
        self.assertIn("chưa được cấp quyền", out[-1])
        self.assertIn(NEW, out[-1])
        self.assertIn(NEW, self.say(NEW, "/myid")[-1])

    def test_admin_adds_teacher_then_teacher_can_use_bot(self):
        out = self.say(ADMIN, "/themgv %s Cô Lan - GVCN 10A1" % NEW)
        self.assertIn("✅ Đã thêm giáo viên %s – Cô Lan - GVCN 10A1" % NEW, out[-1])
        self.assertTrue(any(c == NEW and "được cấp quyền" in t for c, t in self.sent))   # báo cho GV mới
        self.assertTrue(self.bot.is_authorized(NEW))
        self.assertFalse(self.bot.is_admin(NEW))
        self.assertNotIn("chưa được cấp quyền", self.say(NEW, "/trogiup")[-1])
        # lưu bền: bot mới (khởi động lại) vẫn nhận
        bot2 = tb.TuVanBot(token="gia", teacher_ids={ENV_GV}, admin_ids={ADMIN}, data_dir=self.tmp.name)
        self.assertTrue(bot2.is_authorized(NEW))
        f = Path(self.tmp.name) / "teachers.json"
        self.assertEqual(oct(f.stat().st_mode & 0o777), "0o600")
        self.assertEqual(json.loads(f.read_text(encoding="utf-8"))["teachers"][0]["addedBy"], ADMIN)

    def test_add_still_works_when_teacher_never_started_bot(self):
        self.fail_to.add(NEW)
        out = self.say(ADMIN, "/themgv " + NEW)
        self.assertIn("Chưa nhắn báo được", out[-1])
        self.assertTrue(self.bot.is_authorized(NEW))

    def test_non_admin_cannot_manage(self):
        self.assertIn("chỉ dành cho quản trị viên", self.say(ENV_GV, "/themgv " + NEW)[-1])
        self.assertFalse(self.bot.is_authorized(NEW))
        self.say(ADMIN, "/themgv " + NEW)
        self.assertIn("chỉ dành cho quản trị viên", self.say(NEW, "/themgv " + OTHER)[-1])
        self.assertIn("chỉ dành cho quản trị viên", self.say(NEW, "/xoagv " + NEW)[-1])
        self.assertIn("chưa được cấp quyền", self.say(OTHER, "/themgv " + OTHER)[-1])  # người lạ: chặn từ cổng
        self.assertNotIn("Quản trị viên:", self.say(ENV_GV, "/trogiup")[-1])
        self.assertIn("/themgv", self.say(ADMIN, "/trogiup")[-1])

    def test_validation_duplicates_and_env_ids(self):
        self.assertIn("Cú pháp", self.say(ADMIN, "/themgv")[-1])
        self.assertIn("Cú pháp", self.say(ADMIN, "/themgv abc123")[-1])
        self.assertIn("Cú pháp", self.say(ADMIN, "/themgv ../../x")[-1])
        self.assertIn("tuvan.env", self.say(ADMIN, "/themgv " + ENV_GV)[-1])
        self.say(ADMIN, "/themgv " + NEW)
        self.assertIn("đã có trong danh sách", self.say(ADMIN, "/themgv " + NEW)[-1])
        self.assertEqual(len(self.bot.load_added_teachers()), 1)
        self.assertIn("không xoá được qua bot", self.say(ADMIN, "/xoagv " + ADMIN)[-1])
        self.assertIn("không xoá được qua bot", self.say(ADMIN, "/xoagv " + ENV_GV)[-1])

    def test_remove_and_list(self):
        self.say(ADMIN, "/themgv %s Thầy Nam" % NEW)
        self.say(ADMIN, "/themgv " + OTHER)
        ds = self.say(ADMIN, "/dsgv")[-1]
        self.assertIn(ADMIN, ds); self.assertIn(ENV_GV, ds)
        self.assertIn("%s – Thầy Nam" % NEW, ds); self.assertIn("thêm qua bot (2)", ds)
        self.assertIn("Đã thu hồi quyền", self.say(ADMIN, "/xoagv " + NEW)[-1])
        self.assertFalse(self.bot.is_authorized(NEW))
        self.assertTrue(self.bot.is_authorized(OTHER))
        self.assertIn("Không có ID", self.say(ADMIN, "/xoagv " + NEW)[-1])
        self.assertIn("chưa được cấp quyền", self.say(NEW, "/hoso HS1")[-1])

    def test_removed_teacher_gets_no_submit_notice(self):
        self.say(ADMIN, "/themgv " + NEW)
        ev = Path(self.tmp.name) / "events.jsonl"
        ev.write_text(json.dumps({"type": "submit", "createdBy": NEW, "code": "HS1",
                                  "submittedAt": "2026-10-29T01:00:00Z"}) + "\n", encoding="utf-8")
        self.sent.clear(); self.bot.check_events()
        self.assertTrue(any(c == NEW and "HS1" in t for c, t in self.sent))
        self.say(ADMIN, "/xoagv " + NEW)
        with open(ev, "a", encoding="utf-8") as f:
            f.write(json.dumps({"type": "submit", "createdBy": NEW, "code": "HS2",
                                "submittedAt": "2026-10-29T02:00:00Z"}) + "\n")
        self.sent.clear(); self.bot.check_events()
        self.assertFalse(any("HS2" in t for c, t in self.sent))

    def test_corrupt_file_does_not_crash_or_grant(self):
        (Path(self.tmp.name) / "teachers.json").write_text("{không phải json", encoding="utf-8")
        self.assertFalse(self.bot.is_authorized(NEW))
        self.assertTrue(self.bot.is_authorized(ENV_GV))
        (Path(self.tmp.name) / "teachers.json").write_text(json.dumps({"teachers": [{"id": "abc"}, "x", {"id": NEW}]}), encoding="utf-8")
        self.assertEqual(self.bot.all_teacher_ids(), {ADMIN, ENV_GV, NEW})

    def test_default_admins_are_env_teachers(self):
        b = tb.TuVanBot(token="gia", teacher_ids={ENV_GV}, data_dir=self.tmp.name)
        if not tb.ADMIN_TELEGRAM_IDS:
            self.assertTrue(b.is_admin(ENV_GV))


if __name__ == "__main__":
    unittest.main()
