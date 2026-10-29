#!/usr/bin/env python3
"""
Kiểm thử: bot chấm trắc nghiệm GIỐNG web (audit A5), kiểm tra /theodoi (A6), CSV an toàn (A7), giờ Việt Nam (A14).
© 2026 Dr. Duyen Nguyen. All rights reserved.

Giá trị mong đợi lấy từ chính giao diện web (js/app.js) chạy trên cùng bài làm giả, ngày 29/10/2026.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import tuvan_bot as tb  # noqa: E402


def eysenck_answers(hn, kod, s):
    """Tạo đủ 59 câu cho ra đúng điểm HN, KOD, S mong muốn."""
    out, cnt = [], {"HN": 0, "KOD": 0, "S": 0}
    for i in range(59):
        k, sign = tb.EYSENCK_KEY[i % 12]
        want = {"HN": hn, "KOD": kod, "S": s}[k]
        if cnt[k] < want:
            out.append(sign); cnt[k] += 1
        else:
            out.append("-" if sign == "+" else "+")
    assert cnt == {"HN": hn, "KOD": kod, "S": s}, cnt
    return out


class BotScoringParity(unittest.TestCase):
    # Các trường hợp đã đối chiếu với web trong audit 29/10
    def test_partial_answers_are_not_labelled(self):
        self.assertEqual(tb._calc_eysenck(["+"] * 12 + [None] * 47), "chưa đủ (12/59)")       # web: "chưa đủ (12/59)"
        self.assertEqual(tb._calc_mbti(["a"] * 7 + [None] * 63), "chưa đủ (7/70)")          # web: "chưa đủ (7/70)"
        hol = {k: [None] * 9 for k in "RIASEC"}; hol["R"][0] = 4
        self.assertEqual(tb._calc_holland(hol), "RIA (chưa đủ 1/54 câu)")                  # web: "RIA (chưa đủ)"
        self.assertEqual(tb._calc_holland({k: [None] * 9 for k in "RIASEC"}), "–")
        self.assertEqual(tb._calc_eysenck([None] * 59), "–")
        self.assertEqual(tb._calc_mbti([]), "–")

    def test_eysenck_boundary_gives_both_types(self):
        # web: "Hăng hái / Bình thản" khi HN đúng 12 và KOD < 12
        txt = tb._calc_eysenck(eysenck_answers(12, 0, 9))
        self.assertTrue(txt.startswith("Hăng hái / Bình thản"), txt)
        self.assertIn("(HN 12, KOD 0, S 9/9)", txt)

    def test_eysenck_four_quadrants_and_low_s(self):
        self.assertTrue(tb._calc_eysenck(eysenck_answers(20, 20, 9)).startswith("Nóng nảy ("))
        self.assertTrue(tb._calc_eysenck(eysenck_answers(20, 3, 9)).startswith("Hăng hái ("))
        self.assertTrue(tb._calc_eysenck(eysenck_answers(3, 20, 9)).startswith("Ưu tư ("))
        self.assertTrue(tb._calc_eysenck(eysenck_answers(3, 3, 9)).startswith("Bình thản ("))
        self.assertIn("thành thật thấp", tb._calc_eysenck(eysenck_answers(3, 3, 4)))
        self.assertNotIn("thành thật thấp", tb._calc_eysenck(eysenck_answers(3, 3, 5)))

    def test_mbti_full_and_tie(self):
        self.assertEqual(tb._calc_mbti(["a"] * 70), "ESTJ")
        self.assertEqual(tb._calc_mbti(["b"] * 70), "INFP")
        # cột 0 (E/I): 10 câu; 5 a + 5 b → hoà
        ans = ["a"] * 70
        for i in range(0, 70, 7)[:5]:
            ans[i] = "b"
        self.assertEqual(tb._calc_mbti(ans), "E/I · S · T · J")

    def test_holland_full_and_ties_keep_riasec_order(self):
        hol = {k: [2] * 9 for k in "RIASEC"}
        self.assertEqual(tb._calc_holland(hol), "RIA")          # hoà toàn bộ → giữ thứ tự R I A S E C như web
        hol["E"] = [4] * 9; hol["S"] = [3] * 9
        self.assertEqual(tb._calc_holland(hol), "ESR")

    def test_parse_scale_and_period(self):
        self.assertEqual([tb.parse_scale(v) for v in ("1", "5", "0", "6", "nan", "inf", "3.5", "99", "")], [1, 5, None, None, None, None, None, None, None])
        self.assertEqual(tb.parse_period("hk1"), "Cuối HK1")
        self.assertEqual(tb.parse_period("Giữa HK2"), "Giữa HK2")
        self.assertIsNone(tb.parse_period("ky-la"))

    def test_csv_safe_and_vn_time(self):
        self.assertEqual(tb.csv_safe('=HYPERLINK("x")'), "'=HYPERLINK(\"x\")")
        self.assertEqual(tb.csv_safe("@SUM(1)"), "'@SUM(1)")
        self.assertEqual(tb.csv_safe("10A1"), "10A1")
        self.assertEqual(tb.vn_time("2026-10-28T18:20:58Z"), "01:20 29/10/2026")
        self.assertEqual(tb.vn_time("2026-10-28T18:20:58Z", False), "29/10/2026")


class TheodoiValidation(unittest.TestCase):
    def setUp(self):
        self.sent, self.calls = [], []
        self.bot = tb.TuVanBot(token="gia", teacher_ids={"111"}, service_url="http://127.0.0.1:9", service_token="gia")
        self.bot.send_message = lambda cid, t: self.sent.append(t)
        self.bot.srv_request = lambda *a, **k: (self.calls.append(a), (200, {"profile": {"code": "HS1", "data": {"v": 2, "tracking": []}}}))[1]

    def say(self, text):
        self.bot.handle_update({"message": {"chat": {"id": 1, "type": "private"}, "from": {"id": 111}, "text": text}})

    def test_rejects_nan_and_out_of_range(self):
        self.say("/theodoi HS1 hk1 hailong=99 cangthang=nan")
        self.assertIn("không hợp lệ", self.sent[-1])
        self.assertFalse(any(c[0] == "PUT" for c in self.calls))

    def test_accepts_valid_entry(self):
        self.say("/theodoi HS1 hk1 hailong=4 cangthang=2")
        put = [c for c in self.calls if c[0] == "PUT"]
        self.assertEqual(len(put), 1)
        entry = put[0][2]["data"]["tracking"][-1]
        self.assertEqual((entry["period"], entry["overall"], entry["stress"]), ("Cuối HK1", 4, 2))

    def test_rejects_bad_period_and_code(self):
        self.say("/theodoi HS1 kyla hailong=4")
        self.assertIn("Đợt theo dõi chưa đúng", self.sent[-1])
        self.say("/theodoi ../x hk1 hailong=4")
        self.assertIn("Mã học sinh", self.sent[-1])
        self.assertFalse(any(c[0] == "PUT" for c in self.calls))


if __name__ == "__main__":
    unittest.main()
