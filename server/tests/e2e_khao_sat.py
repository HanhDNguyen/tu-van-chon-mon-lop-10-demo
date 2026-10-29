#!/usr/bin/env python3
"""
Kiểm thử trình duyệt (Playwright) cho khảo sát tại nhà và các lỗi web trong báo cáo audit 29/10/2026.
© 2026 Dr. Duyen Nguyen. All rights reserved.

Không chạy tự động cùng unittest (cần Playwright + Chromium). Cách chạy từ thư mục gốc repo:
    pip install playwright && python -m playwright install chromium
    python server/tests/e2e_khao_sat.py
Biến PW_CHROMIUM (tuỳ chọn): đường dẫn Chromium có sẵn. Chỉ dùng dữ liệu giả, máy chủ chạy ở cổng tạm trên 127.0.0.1.
"""
import asyncio
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
PW = "MatKhauGia_E2E!"
SVC = "KhoaDichVuGia_E2E!"
RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append((name, bool(ok)))
    print(("ĐẠT  " if ok else "LỖI  ") + name + (f" – {detail}" if detail and not ok else ""))


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


def call(url, method="GET", body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    h = dict(headers or {}); h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(req, timeout=5) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


async def main():
    data_dir = tempfile.mkdtemp(prefix="e2e-data-")
    port, sport = free_port(), free_port()
    base, svc = f"http://127.0.0.1:{port}", f"http://127.0.0.1:{sport}"
    env = dict(os.environ, WEB_DIR=str(ROOT), DATA_DIR=data_dir, TEACHER_PASSWORD=PW, BOT_SERVICE_TOKEN=SVC,
               PROXY_PORT=str(port), SERVICE_PORT=str(sport), PUBLIC_ORIGIN=base, PYTHONUNBUFFERED="1")
    env.pop("HERMES_KEY", None)
    log = open(Path(data_dir) / "proxy.log", "w")
    srv = subprocess.Popen([sys.executable, "-I", str(ROOT / "server" / "tuvan_proxy.py")], env=env, stdout=log, stderr=subprocess.STDOUT)
    try:
        for _ in range(50):
            try:
                if call(base + "/api/info")[0] == 200:
                    break
            except Exception:
                time.sleep(0.1)
        _, inv = call(svc + "/api/invites", "POST", {"code": "HS801", "className": "10A8"}, {"X-Service-Token": SVC})
        tok = inv["token"]
        exe = os.environ.get("PW_CHROMIUM") or ("/opt/pw-browsers/chromium" if Path("/opt/pw-browsers/chromium").exists() else None)
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=exe) if exe else await p.chromium.launch()

            # ---------- 1. Phụ huynh làm khảo sát trên điện thoại ----------
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(f"{base}/?moi={tok}"); await pg.wait_for_timeout(1200)
            body = await pg.inner_text("body")
            check("Mở link mời → màn hình đồng ý", "Đồng ý tham gia" in body and "HS801" in body)
            start = pg.locator('#main [data-go="1"]')
            check("Chưa đồng ý thì chưa bắt đầu được", await start.is_disabled())
            check("Ẩn nút Giáo viên / Mã hồ sơ / Lưu hồ sơ", not await pg.locator("#teacherBtn").is_visible()
                  and not await pg.locator('[data-action="open-profile-code"]').first.is_visible())
            await pg.click('[data-action="home-consent"][data-k="parent"]'); await pg.wait_for_timeout(200)
            check("Chỉ một ô đồng ý vẫn chưa bắt đầu được", await pg.locator('#main [data-go="1"]').is_disabled())
            await pg.click('[data-action="home-consent"][data-k="student"]'); await pg.wait_for_timeout(200)
            await pg.click('#main [data-action="role"][data-role="ph"]'); await pg.wait_for_timeout(200)
            await pg.click('#main [data-go="1"]'); await pg.wait_for_timeout(300)
            check("Ô mã học sinh bị khoá, đúng mã mời", await pg.locator("#f-code").get_attribute("readonly") is not None
                  and await pg.locator("#f-code").input_value() == "HS801")
            await pg.fill("#f-nick", "Giả 801"); await pg.locator("#f-nick").dispatch_event("change")
            await pg.fill("#g-toan", "8.5"); await pg.locator("#g-toan").dispatch_event("change")
            await pg.click('#main [data-go="2"]'); await pg.wait_for_timeout(300)
            check("Không có nút điền ngẫu nhiên khi làm thật", await pg.locator('[data-action="fill-demo"]').count() == 0)
            # trả lời đủ 3 trắc nghiệm bằng thao tác thật trên vài câu, phần còn lại đặt thẳng vào trạng thái
            await pg.click('[data-action="hol"][data-k="R"][data-i="0"][data-v="4"]')
            await pg.evaluate("""() => { const s = window.CTV_APP.state();
                ['R','I','A','S','E','C'].forEach((k, j) => s.tests.holland[k] = Array(9).fill(j < 2 ? 4 : 1));
                s.tests.eysenck = s.tests.eysenck.map((_, i) => i % 2 ? '+' : '-'); s.tests.mbti = s.tests.mbti.map(() => 'a'); }""")
            await pg.click('[data-action="hol"][data-k="R"][data-i="0"][data-v="4"]'); await pg.wait_for_timeout(200)
            nxt = pg.locator('#main .nav-row [data-go="9"]')
            check("Bước 2 dẫn sang bước nộp", await nxt.count() == 1)
            await nxt.click(); await pg.wait_for_timeout(300)
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            check("Không tràn ngang ở 390px", sw <= 391, str(sw))
            await pg.click('[data-action="home-submit"]'); await pg.wait_for_timeout(1200)
            body = await pg.inner_text("body")
            check("Nộp thành công", "Đã gửi cho giáo viên lúc" in body, body[:200])
            check("Không lỗi JS phía phụ huynh", not errs, "; ".join(errs[:2]))
            rec = json.loads((Path(data_dir) / "profiles" / "HS801.json").read_text("utf-8"))
            check("Máy chủ lưu bài: mã, lớp, tên gọi, trắc nghiệm, đồng thuận",
                  rec["code"] == "HS801" and rec["className"] == "10A8" and rec["data"]["profile"]["nickname"] == "Giả 801"
                  and rec["data"]["tests"]["holland"]["R"] == [4] * 9 and rec["data"]["home"]["consent"]["parent"] is True and rec["unanswered"] == 0)
            await ctx.close()

            # ---------- 2. Link sai / mở bằng file ----------
            pg = await b.new_page()
            await pg.goto(f"{base}/?moi=SaiMaMoi123456"); await pg.wait_for_timeout(1000)
            check("Link sai → báo hết hiệu lực", "Link không còn hiệu lực" in await pg.inner_text("body"))
            await pg.goto((ROOT / "index.html").as_uri() + f"?moi={tok}"); await pg.wait_for_timeout(800)
            check("Mở bằng file → yêu cầu mở qua địa chỉ nhà trường", "cần mở qua địa chỉ của nhà trường" in await pg.inner_text("body"))
            await pg.goto(base + "/"); await pg.wait_for_timeout(800)
            check("Link thường không bị ảnh hưởng", "Bạn là ai?" in await pg.inner_text("body"))
            await pg.close()

            # ---------- 3. Giáo viên mở hồ sơ; dữ liệu độc hại không làm nhiễm prototype ----------
            prof_dir = Path(data_dir) / "profiles"
            # Ghi thẳng file (bỏ qua máy chủ) để kiểm tra lớp bảo vệ phía trình duyệt
            (prof_dir / "HS802.json").write_text(json.dumps({"code": "HS802", "name": "Giả 802", "data": json.loads(
                '{"v":2,"profile":{"nickname":"Giả 802","__proto__":{"parent":true,"cv68":true}},"final":{"checks":{}}}')}), "utf-8")
            (prof_dir / "HS803.json").write_text(json.dumps({"code": "HS803", "name": "Giả 803", "data": {"v": 2, "profile": {"nickname": "Giả 803"}, "final": {"checks": {}}}}), "utf-8")
            pg = await b.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(base + "/"); await pg.wait_for_timeout(1000)
            await pg.click('[data-go="8"]'); await pg.wait_for_timeout(300)
            await pg.fill("input[type=password]", PW); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(1000)
            await pg.click('[data-action="open-archive"][data-code="HS801"]'); await pg.wait_for_timeout(1000)
            st = await pg.evaluate("() => { const s = window.CTV_APP.state(); return [s.profile.nickname, window.CTV_APP.hollandStats().done]; }")
            check("Giáo viên mở được hồ sơ phụ huynh vừa nộp", st == ["Giả 801", True], str(st))
            for code in ("HS802", "HS803"):
                await pg.click('[data-go="8"]'); await pg.wait_for_timeout(500)
                await pg.click(f'[data-action="open-archive"][data-code="{code}"]'); await pg.wait_for_timeout(800)
            v = await pg.evaluate("() => [({}).parent === undefined, Object.keys(window.CTV_APP.state().final.checks).length, !!window.CTV_APP.state().final.checks.parent]")
            check("Hồ sơ có __proto__ không làm nhiễm prototype hay tự tick ô đồng ý ở hồ sơ khác", v == [True, 0, False], str(v))
            check("Không lỗi JS phía giáo viên", not errs, "; ".join(errs[:2]))
            await pg.close()

            # ---------- 4. Bước 6: mục "phù hợp ngành mục tiêu" không chặn xác nhận ----------
            pg = await b.new_page()
            await pg.goto((ROOT / "index.html").as_uri()); await pg.wait_for_timeout(600)
            # tìm một tổ hợp mẫu mà mục "phù hợp ngành mục tiêu" tự kiểm là CHƯA ĐẠT, rồi kiểm tra nút xác nhận vẫn bật
            ok6 = await pg.evaluate("""() => { const A = window.CTV_APP, s = A.state();
                for (const sch of A.allSchools()) for (const c of sch.combos) {
                  s.role = 'hs'; s.final.schoolId = sch.id; s.final.comboKey = c.subjects.slice().sort().join('+'); s.final.cd = c.cd || [];
                  s.final.checks = { parent: true, deadline: true, cv68: true }; s.careerFb = {}; s.shortlist = []; A.go(6);
                  if (document.body.innerText.includes('chỉ để lưu ý')) { const btn = document.querySelector('[data-action="confirm-final"]'); return [c.subjects.join('+'), !!btn && !btn.disabled]; }
                }
                return [null, false]; }""")
            check("Bước 6 xác nhận được dù mục ngành mục tiêu chưa đạt (chỉ cảnh báo)", ok6[0] is not None and ok6[1] is True, str(ok6))
            # ---------- 5. Điền ngẫu nhiên hỏi trước khi ghi đè ----------
            await pg.evaluate("() => { window.CTV_APP.go(2); }"); await pg.wait_for_timeout(200)
            await pg.click('[data-action="hol"][data-k="R"][data-i="0"][data-v="4"]')
            msgs = []
            pg.once("dialog", lambda d: (msgs.append(d.message), asyncio.ensure_future(d.dismiss())))
            await pg.click('[data-action="fill-demo"][data-test="holland"]'); await pg.wait_for_timeout(300)
            still = await pg.evaluate("() => window.CTV_APP.hollandStats().answered")
            check("Điền ngẫu nhiên hỏi xác nhận và giữ nguyên khi huỷ", bool(msgs) and still == 1, f"{msgs} {still}")

            # ---------- 6. Nhận diện khủng hoảng ----------
            await pg.click("#chatFab"); await pg.wait_for_timeout(300)
            cases = [("Em có tư tưởng muốn học khối A", False), ("Mình bị đánh giá học lực thấp", False), ("Em sẽ từ từ suy nghĩ thêm", False),
                     ("em muốn tự tử", True), ("em muon tu tu", True), ("em bị đánh ở lớp", True), ("Em muốn biến mất", True)]
            for text, want in cases:
                n0 = await pg.locator(".msg.alert").count()
                await pg.fill("#chatInput", text); await pg.press("#chatInput", "Enter"); await pg.wait_for_timeout(450)
                got = await pg.locator(".msg.alert").count() > n0
                check(f"Khủng hoảng: “{text}” → {'cảnh báo' if want else 'không cảnh báo'}", got == want)
            await b.close()

        log.flush()
        logtxt = (Path(data_dir) / "proxy.log").read_text("utf-8")
        check("Log máy chủ không chứa mã mời", tok not in logtxt)
    finally:
        srv.terminate(); srv.wait(5)
    bad = [n for n, ok in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(bad)}/{len(RESULTS)} đạt")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    asyncio.run(main())
