/* Trang quản trị DEMO: đọc kho giả lập trong localStorage (cùng khoá với trang tư vấn, chế độ recordsUrl = "demo"). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const DB_KEY = "ctv_demo_records_v1", AUTH_KEY = "ctv_demo_admin";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ROLE = { hs: "Học sinh", ph: "Cha mẹ", gv: "Giáo viên" };
  const when = iso => iso ? new Date(iso).toLocaleString("vi-VN") : "";
  const db = () => { try { const d = JSON.parse(localStorage.getItem(DB_KEY) || "{}"); return d && typeof d === "object" ? d : {}; } catch (e) { return {}; } };
  const saveDb = d => localStorage.setItem(DB_KEY, JSON.stringify(d));
  const authed = () => { try { return sessionStorage.getItem(AUTH_KEY) === "1"; } catch (e) { return false; } };
  let timer = null;

  function show(on) {
    $("#login").hidden = on; $("#app").hidden = !on; $("#logout").hidden = !on;
    if (on) load(); else $("#user").focus();
  }
  function load() {
    const q = $("#q").value.trim().toLowerCase();
    const rows = Object.values(db()).filter(r => !q || [r.nickname, r.school, r.code].some(v => String(v || "").toLowerCase().includes(q)))
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    $("#count").textContent = rows.length + " hồ sơ" + (q ? " khớp tìm kiếm" : "");
    $("#rows").innerHTML = rows.map(r => `<tr class="pick" data-code="${esc(r.code)}" tabindex="0">
      <td><code>${esc(r.code)}</code></td><td>${esc(when(r.updated_at))}</td><td>${esc(ROLE[r.role] || r.role || "")}</td>
      <td>${esc(r.nickname)}</td><td>${esc(r.school)}</td><td>${esc(r.holland)}</td><td>${esc(r.final_combo)}</td><td>${esc(r.revision)}</td></tr>`).join("")
      || `<tr><td colspan="8" class="muted">Chưa có hồ sơ.</td></tr>`;
  }
  function download(name, type, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function openDetail(code) {
    const r = db()[code]; if (!r) return;
    const d = $("#detail"); d.hidden = false;
    d.innerHTML = `<div class="row"><h2 style="margin:0;flex:1">Phiếu <code>${esc(r.code)}</code> – ${esc(r.nickname)}</h2>
        <button type="button" class="ghost" id="dl">Tải JSON</button><button type="button" class="danger" id="del">Xoá hồ sơ</button><button type="button" class="ghost" id="closeD">Đóng</button></div>
      <p class="muted">Tạo: ${esc(when(r.created_at))} · Cập nhật: ${esc(when(r.updated_at))} · Lần nộp: ${esc(r.revision)} · Đồng ý lưu trữ lúc: ${esc(when(r.consent_at))}</p>
      <p><b>Trường:</b> ${esc(r.school)} · <b>Holland:</b> ${esc(r.holland)} · <b>Phương án chính:</b> ${esc(r.final_combo || "–")}</p>
      <p><b>Danh sách cân nhắc:</b> ${esc(r.shortlist || "–")}</p>
      <h3>Tóm tắt</h3><pre>${esc(r.summary_text)}</pre>
      <details><summary>Dữ liệu đầy đủ (JSON)</summary><pre>${esc(JSON.stringify(r.state, null, 2))}</pre></details>`;
    $("#closeD").onclick = () => { d.hidden = true; };
    $("#dl").onclick = () => download("ho-so-" + r.code + ".json", "application/json", JSON.stringify(r, null, 2));
    $("#del").onclick = () => {
      if (!window.confirm("Xoá hồ sơ " + r.code + "?")) return;
      const all = db(); delete all[r.code]; saveDb(all); d.hidden = true; load();
    };
    d.scrollIntoView({ behavior: "smooth" });
  }
  const cell = v => { const t = v == null ? "" : String(v); const safe = /^[=+\-@\t\r]/.test(t) ? "'" + t : t; return '"' + safe.replace(/"/g, '""') + '"'; };
  function exportCsv() {
    const head = ["Mã phiếu", "Tạo lúc", "Cập nhật", "Lần nộp", "Vai trò", "Tên gọi", "Trường", "Holland", "Phương án chính", "Danh sách cân nhắc", "Tóm tắt"];
    const rows = Object.values(db()).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map(r => [r.code, r.created_at, r.updated_at, r.revision, r.role, r.nickname, r.school, r.holland, r.final_combo, r.shortlist, r.summary_text]);
    download("ho-so-tu-van.csv", "text/csv;charset=utf-8", "﻿" + [head, ...rows].map(r => r.map(cell).join(",")).join("\r\n"));
  }
  function addSamples() {
    const all = db(), now = new Date().toISOString(), y = new Date().getFullYear();
    [["Lan Anh", "THPT Mẫu A", "SIA", ""], ["Minh Quân", "THPT Mẫu B", "RIC", "Lí – Hoá – Sinh – Tin"], ["Bảo Ngọc", "THPT Mẫu A", "ASE", "Địa – KT&PL – Văn – Anh"]].forEach(([n, s, h, f]) => {
      const slug = n.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
      let code = y + slug; for (let i = 2; all[code]; i++) code = y + slug + i;
      all[code] = { code, created_at: now, updated_at: now, revision: 1, consent_at: now, role: "hs", nickname: n, school: s, holland: h, final_combo: f, shortlist: f,
        summary_text: "[DỮ LIỆU MẪU]\nTên gọi: " + n + " | Trường: " + s + " | Holland: " + h, state: { v: 1, role: "hs", profile: { nickname: n }, sample: true } };
    });
    saveDb(all); load();
  }

  $("#login").addEventListener("submit", e => {
    e.preventDefault();
    if ($("#user").value.trim() === "admin" && $("#pw").value === "admin") {
      try { sessionStorage.setItem(AUTH_KEY, "1"); } catch (err) { /* bỏ qua */ }
      $("#pw").value = ""; $("#loginErr").textContent = ""; show(true);
    } else $("#loginErr").textContent = "Sai tên đăng nhập hoặc mật khẩu.";
  });
  $("#logout").onclick = () => { try { sessionStorage.removeItem(AUTH_KEY); } catch (e) { /* bỏ qua */ } show(false); };
  $("#reload").onclick = load;
  $("#sample").onclick = addSamples;
  $("#export").onclick = exportCsv;
  $("#q").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(load, 200); });
  $("#rows").addEventListener("click", e => { const tr = e.target.closest("tr[data-code]"); if (tr) openDetail(tr.dataset.code); });
  $("#rows").addEventListener("keydown", e => { const tr = e.target.closest("tr[data-code]"); if (tr && e.key === "Enter") openDetail(tr.dataset.code); });
  show(authed());
})();
