/* =========================================================
   Cổng thông tin tư vấn học sinh – ỨNG DỤNG DEMO (7 bước)
   © 2026 Dr. Duyen Nguyen. All rights reserved.
   ========================================================= */
(function () {
  "use strict";
  const D = window.CTV_DATA;
  const HOLLAND_SCORER = window.CTV_HOLLAND;
  const KEY = "ctv_state_v1";
  const RECORDS_URL = String((window.CTV_CONFIG || {}).recordsUrl || "").replace(/\/+$/, "");

  /* ================= TRẠNG THÁI ================= */
  function blankState() {
    const hol = {}; D.HOLLAND.forEach(g => hol[g.key] = Array(9).fill(null));
    const pers = {}; D.PERSONALITY.forEach(p => pers[p.dim] = Array(4).fill(null));
    const gar = {}; D.GARDNER.forEach(g => gar[g.key] = Array(3).fill(null));
    const tpb = {}; D.TPB.forEach(t => tpb[t.key] = Array(t.items.length).fill(null));
    return {
      v: 1, role: null, step: 0,
      profile: { nickname: "", schoolId: "", schoolOther: "", province: "", grades: {}, exam10: "", talents: "",
        liked: [], disliked: [], cond: { extra: "", time: "", device: "", econ: "" }, health: "", wish: "", familyWish: "" },
      tests: { holland: hol, pers: pers, gardner: gar, tpb: { combo: null, ans: tpb } },
      careerFb: {}, careerGroup: "",
      schools: [], constraints: { must: [], exclude: [] },
      builder: { subjects: [], cd: [] },
      shortlist: [], final: { schoolId: "", comboKey: "", checks: {} },
      tracking: [],
      record: { code: "", savedAt: "" },
      ui: { testTab: "holland", step4School: "" }
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) return merge(blankState(), s); }
    } catch (e) { /* bỏ qua */ }
    return blankState();
  }
  function merge(base, src) {
    for (const k in src) {
      if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k]) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) merge(base[k], src[k]);
      else base[k] = src[k];
    }
    return base;
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* bỏ qua */ } }

  /* ================= TIỆN ÍCH ================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 1) => (n == null || isNaN(n)) ? "–" : Number(n).toFixed(d).replace(".", ",");
  const avg = a => { const v = a.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((p, c) => p + c, 0) / v.length : null; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200); }
  const isHS = () => S.role === "hs" || !S.role;
  const T = (hs, other) => isHS() ? hs : other;
  const ROLE_NAME = { hs: "Học sinh", ph: "Cha mẹ / người giám hộ", gv: "Giáo viên / CBQL" };
  function getPath(path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), S); }
  function setPath(path, val) { const ks = path.split("."); let o = S; ks.slice(0, -1).forEach(k => { if (o[k] == null) o[k] = {}; o = o[k]; }); o[ks[ks.length - 1]] = val; }
  const subjShort = k => D.SUBJECTS[k] ? D.SUBJECTS[k].short : k;
  const subjName = k => D.SUBJECTS[k] ? D.SUBJECTS[k].name : (D.CHUYEN_DE[k] || k);
  const comboKey = subs => subs.slice().sort().join("+");
  const comboLabel = subs => subs.map(subjShort).join(" – ");
  function miniTiles(subs, cd) {
    let h = '<span class="tiles-inline">' + subs.map(k => `<span class="mini-tile" style="--c:${D.SUBJECTS[k].color}">${esc(subjShort(k))}</span>`).join("");
    if (cd && cd.length) h += cd.map(k => `<span class="mini-cd" title="Cụm chuyên đề">CĐ ${esc(D.CHUYEN_DE[k] || k)}</span>`).join("");
    return h + "</span>";
  }
  function allSchools() { return D.SAMPLE_SCHOOLS.concat(S.schools); }
  function findSchool(id) { return allSchools().find(s => s.id === id) || null; }
  function grade(key) { const v = parseFloat(String(S.profile.grades[key] ?? "").replace(",", ".")); return isNaN(v) ? null : clamp(v, 0, 10); }

  /* ================= TÍNH TOÁN – BƯỚC 1 ================= */
  function strengthLists() {
    const strong = [], mid = [], weak = [];
    D.THCS.forEach(s => { const g = grade(s.key); if (g == null) return; (g >= 8 ? strong : g >= 6.5 ? mid : weak).push(s.name + " (" + fmt(g) + ")"); });
    return { strong, mid, weak };
  }

  /* ================= TÍNH TOÁN – BƯỚC 2 ================= */
  function hollandStats() {
    return HOLLAND_SCORER.score(S.tests.holland);
  }
  function hollandLabel(hs) {
    return !hs.done ? "Chưa đủ dữ liệu" : hs.code || "Các nhóm đồng điểm";
  }
  function persStats() {
    let answered = 0; const res = {};
    D.PERSONALITY.forEach(p => { const a = S.tests.pers[p.dim]; answered += a.filter(Boolean).length; const ca = a.filter(x => x === "a").length, cb = a.filter(x => x === "b").length; res[p.dim] = { a: ca, b: cb, letter: ca > cb ? p.a : cb > ca ? p.b : p.a + "/" + p.b }; });
    const done = answered === 16;
    return { res, answered, done, type: D.PERSONALITY.map(p => res[p.dim].letter).join(" – ") };
  }
  function gardnerStats() {
    let answered = 0; const sc = {};
    D.GARDNER.forEach(g => { const a = S.tests.gardner[g.key]; answered += a.filter(x => x != null).length; sc[g.key] = a.reduce((p, c) => p + (c || 0), 0); });
    const done = answered === 24;
    const top = Object.keys(sc).sort((a, b) => sc[b] - sc[a]).slice(0, 3);
    return { sc, answered, done, top };
  }
  function tpbStats() {
    const t = S.tests.tpb; let answered = 0, total = 0; const m = {};
    D.TPB.forEach(g => { const a = t.ans[g.key]; total += a.length; answered += a.filter(x => x != null).length; m[g.key] = avg(a); });
    return { m, answered, total, done: answered === total && !!t.combo, combo: t.combo };
  }
  const level = v => v == null ? "–" : v >= 4 ? "cao" : v >= 3 ? "trung bình" : "thấp";
  function tpbPatterns(m) {
    const out = []; if (!m || m.ATT == null) return out;
    if (m.ATT >= 4 && m.SN < 3) out.push({ k: "warn", t: "Bạn thích phương án này nhưng gia đình/thầy cô chưa ủng hộ → nên chuẩn bị trao đổi ở Bước 5." });
    if (m.ATT < 3 && m.SN >= 4) out.push({ k: "warn", t: "Có vẻ đang chọn vì người khác mong muốn → nên khám phá lại sở thích thật của bản thân." });
    if (m.PBC < 3) out.push({ k: "warn", t: "Mức tự tin/điều kiện còn thấp → xem lại năng lực thực tế, kế hoạch hỗ trợ hoặc phương án thay thế." });
    if (m.INT < 3 && m.ATT >= 3.5 && m.SN >= 3.5 && m.PBC >= 3.5) out.push({ k: "info", t: "Mọi điều kiện khá thuận lợi nhưng ý định còn thấp → cần làm rõ điều gì khiến bạn còn phân vân." });
    if (m.ATT >= 4 && m.SN >= 4 && m.PBC >= 4 && m.INT >= 4) out.push({ k: "ok", t: "Thái độ, sự ủng hộ, sự tự tin và ý định đều cao → sẵn sàng chốt ở Bước 6." });
    return out;
  }

  /* ================= TÍNH TOÁN – BƯỚC 3 ================= */
  function careerScore(c) {
    const hs = hollandStats(), gs = gardnerStats();
    let H = 0.5;
    if (hs.done) { const w = [0.5, 0.3, 0.2]; H = c.h.split("").reduce((p, L, i) => p + w[i] * (hs.sc[L] / 36), 0); }
    let G = 0.5;
    if (gs.answered > 0) G = avg(c.g.map(k => (gs.sc[k] - 3) / 12)) ?? 0.5; G = clamp(G, 0, 1);
    const Sg = avg(c.thcs.map(k => grade(k))); const SS = Sg == null ? 0.65 : Sg / 10;
    const wish = (S.profile.wish || "").toLowerCase();
    const words = c.name.toLowerCase().split(/[\s–\-&,()]+/).filter(w => w.length > 2);
    const W = wish && words.some(w => wish.includes(w)) ? 0.15 : 0;
    return Math.round(clamp(0.45 * H + 0.25 * G + 0.30 * SS + W, 0, 1) * 100);
  }
  function rankedCareers() { return D.CAREERS.map(c => ({ c, s: careerScore(c) })).sort((a, b) => b.s - a.s); }
  function priorityCareers() {
    const liked = D.CAREERS.filter(c => S.careerFb[c.name] === "like");
    if (liked.length) return liked;
    return rankedCareers().filter(x => S.careerFb[x.c.name] !== "no").slice(0, 3).map(x => x.c);
  }

  /* ================= TÍNH TOÁN – BƯỚC 4 ================= */
  function subjInterest() {
    const hs = hollandStats(), gs = gardnerStats(); const raw = {};
    D.SUBJECT_ORDER.forEach(s => {
      let v = 0.3;
      if (hs.done) Object.keys(D.HOLLAND_SUBJ).forEach(L => v += 0.5 * (hs.sc[L] / 36) * (D.HOLLAND_SUBJ[L][s] || 0));
      if (gs.answered) Object.keys(D.GARDNER_SUBJ).forEach(k => v += 0.3 * clamp((gs.sc[k] - 3) / 12, 0, 1) * (D.GARDNER_SUBJ[k][s] || 0));
      if (S.profile.liked.includes(s)) v += 0.35;
      if (S.profile.disliked.includes(s)) v -= 0.5;
      raw[s] = v;
    });
    const mx = Math.max(...Object.values(raw), 0.01);
    const out = {}; for (const s in raw) out[s] = clamp(raw[s] / mx, 0, 1);
    return out;
  }
  function openedToHop(subs) {
    return Object.keys(D.TO_HOP).filter(k => D.TO_HOP[k].sel.every(s => subs.includes(s)));
  }
  function validate(subs, cd, school) {
    const issues = [];
    const uniq = new Set(subs);
    const r1 = subs.length === 4 && uniq.size === 4 && subs.every(s => D.SUBJECTS[s]);
    if (!r1) issues.push("Cần chọn đúng 4 môn khác nhau trong 9 môn lựa chọn (TT 13/2022).");
    let r2 = null;
    if (cd) { r2 = cd.length === 3 && new Set(cd).size === 3 && cd.every(k => D.CHUYEN_DE[k]); if (!r2) issues.push("Cần chọn 3 cụm chuyên đề của 3 môn khác nhau."); }
    let r3 = null, offered = null;
    if (school) { offered = school.combos.find(c => comboKey(c.subjects) === comboKey(subs)) || null; r3 = !!offered; if (!r3) issues.push("Tổ hợp này không có trong danh sách của " + school.name + "."); }
    return { r1, r2, r3, offered, issues, ok: issues.length === 0 };
  }
  function analyzeCombo(subs, cd, school) {
    const v = validate(subs, cd, school);
    const opened = openedToHop(subs);
    const nonTrivial = opened.filter(k => (D.TO_HOP[k].sel.length > 0 && (!D.TO_HOP[k].bonus || subs.includes(D.TO_HOP[k].bonus))) || (D.TO_HOP[k].bonus && subs.includes(D.TO_HOP[k].bonus)));
    const pcs = priorityCareers();
    const careerRows = pcs.map(c => {
      const op = c.th.filter(k => opened.includes(k));
      const strong = c.th.filter(k => nonTrivial.includes(k));
      return { c, op, strong, fit: c.th.length ? 0.5 * (strong.length ? 1 : 0) + 0.5 * (op.length / c.th.length) : 0 };
    });
    const fitCareer = careerRows.length ? avg(careerRows.map(r => r.fit)) : 0.5;
    const ab = avg(subs.map(s => grade(D.SUBJECTS[s].thcs)));
    const ability = ab == null ? 0.7 : ab / 10;
    const inter = subjInterest(); const interest = avg(subs.map(s => inter[s]));
    const flex = Math.min(nonTrivial.length, 9) / 9;
    let cons = 1; const consNotes = [];
    S.constraints.must.forEach(m => { if (!subs.includes(m)) { cons -= 0.5; consNotes.push("Thiếu môn bắt buộc phải có: " + subjName(m)); } });
    const exc = S.constraints.exclude.filter(e => subs.includes(e));
    if (exc.length) { cons = 0; consNotes.push("Có môn bạn không muốn học: " + exc.map(subjName).join(", ")); }
    const tp = tpbStats();
    if (tp.combo && comboKey(tp.combo.subjects) === comboKey(subs) && tp.m.ATT != null) { cons = (Math.max(cons, 0) + avg([tp.m.ATT, tp.m.SN, tp.m.PBC]) / 5) / 2; consNotes.push("Đã tính điểm TPB cho phương án này."); }
    cons = clamp(cons, 0, 1);
    const parts = { career: Math.round(35 * fitCareer), ability: Math.round(25 * ability), interest: Math.round(20 * interest), flex: Math.round(10 * flex), cons: Math.round(10 * cons) };
    const total = parts.career + parts.ability + parts.interest + parts.flex + parts.cons;
    const risks = [];
    subs.forEach(s => { const g = grade(D.SUBJECTS[s].thcs); if (g != null && g < 6.5) risks.push(`${subjName(s)}: kết quả lớp 9 còn thấp (${fmt(g)}) – cần kế hoạch củng cố.`); });
    subs.filter(s => S.profile.disliked.includes(s)).forEach(s => risks.push(`${subjName(s)}: là môn bạn không thích – dễ giảm động lực.`));
    if (["li", "hoa", "sinh"].every(s => subs.includes(s))) risks.push("Có cả Lí, Hoá, Sinh: khối lượng khoa học tự nhiên nặng, cần quỹ thời gian tự học tốt.");
    if (subs.includes("an") || subs.includes("mt")) risks.push("Âm nhạc/Mĩ thuật không phải môn thi tốt nghiệp – cân nhắc nếu không theo khối năng khiếu.");
    const exam = ["Ngoại ngữ", "Lịch sử"].concat(subs.filter(s => D.SUBJECTS[s].examable).map(subjName));
    return { subs, cd, v, opened, nonTrivial, careerRows, parts, total, risks, exam, consNotes };
  }
  function rankSchoolCombos(school) {
    return school.combos.map(c => ({ combo: c, a: analyzeCombo(c.subjects, c.cd, school) })).sort((x, y) => y.a.total - x.a.total);
  }

  /* ================= TÓM TẮT (dùng cho phiếu & chatbot) ================= */
  function summaryText() {
    const p = S.profile, hs = hollandStats(), ps = persStats(), gs = gardnerStats(), tp = tpbStats();
    const sch = findSchool(p.schoolId); const st = strengthLists();
    const lines = [];
    lines.push("[MÃ HỒ SƠ – Cổng thông tin tư vấn học sinh]");
    lines.push("Ngày: " + new Date().toLocaleDateString("vi-VN") + " | Vai trò: " + (ROLE_NAME[S.role] || "chưa chọn") + " | Trường: " + (sch ? sch.name : (p.schoolOther || "chưa nhập")));
    lines.push("B1: mạnh " + (st.strong.join(", ") || "–") + " | cần cố gắng " + (st.weak.join(", ") || "–") + " | nguyện vọng: " + (p.wish || "–"));
    lines.push("B2: Holland " + (hs.answered ? hollandLabel(hs) : "–") + " | 4 chiều " + (ps.answered ? ps.type : "–") + " | Gardner " + (gs.answered ? gs.top.map(k => D.GARDNER.find(g => g.key === k).name).join(", ") : "–") + " | TPB " + (tp.answered ? `ATT ${fmt(tp.m.ATT)}/SN ${fmt(tp.m.SN)}/PBC ${fmt(tp.m.PBC)}/INT ${fmt(tp.m.INT)}` : "–"));
    const liked = D.CAREERS.filter(c => S.careerFb[c.name] === "like").map(c => c.name);
    lines.push("B3: ngành ưu tiên " + (liked.join(", ") || "chưa chọn"));
    lines.push("B4: danh sách cân nhắc " + (S.shortlist.length ? S.shortlist.map(k => k.split("|")[1].split("+").map(subjShort).join("-")).join("; ") : "–"));
    const fc = finalCombo();
    lines.push("B6: phương án chốt " + (fc ? comboLabel(fc.subjects) : "–"));
    const lt = S.tracking[S.tracking.length - 1];
    lines.push("B7: lần theo dõi gần nhất " + (lt ? lt.period : "–"));
    return lines.join("\n");
  }
  function finalCombo() {
    if (!S.final.comboKey) return null;
    const sch = findSchool(S.final.schoolId);
    if (sch) { const c = sch.combos.find(c => comboKey(c.subjects) === S.final.comboKey); if (c) return c; }
    return { subjects: S.final.comboKey.split("+"), cd: S.final.cd || [] };
  }

  /* ================= KHUNG: STEPPER ================= */
  const STEPS = [
    { n: 1, t: "Thu thập dữ liệu nền", s: "Hồ sơ học sinh" },
    { n: 2, t: "Tâm lý – năng lực – sở thích", s: "Trắc nghiệm" },
    { n: 3, t: "Khám phá nghề nghiệp", s: "Ngành nghề tiềm năng" },
    { n: 4, t: "Gợi ý tổ hợp tại trường", s: "3–5 phương án" },
    { n: 5, t: "Tư vấn GV – cha mẹ – HS", s: "Phiếu tóm tắt", human: true },
    { n: 6, t: "Chốt nguyện vọng", s: "Kiểm tra hợp lệ" },
    { n: 7, t: "Theo dõi – điều chỉnh", s: "Cảnh báo sớm" }
  ];
  function stepDone(n) {
    switch (n) {
      case 1: return !!(S.profile.nickname || S.profile.schoolId || Object.keys(S.profile.grades).length);
      case 2: return hollandStats().done;
      case 3: return Object.values(S.careerFb).includes("like");
      case 4: return S.shortlist.length > 0;
      case 5: return !!S.final.checks.talked;
      case 6: return !!S.final.comboKey && !!S.final.confirmed;
      case 7: return S.tracking.length > 0;
    }
    return false;
  }
  function renderSteps() {
    $("#steps").innerHTML = '<div class="steps-inner"><ol>' + STEPS.map(st => `<li><button type="button" class="step-btn ${stepDone(st.n) ? "done" : ""} ${S.step === st.n ? "current" : ""} ${st.human ? "human" : ""}" data-go="${st.n}" ${S.step === st.n ? 'aria-current="step"' : ""}>
      <span class="step-num">${st.n}</span><span class="step-label">${esc(st.t)}<small>${esc(st.s)}</small></span></button></li>`).join("") +
      `</ol></div>`;
    const pill = $("#rolePill");
    if (S.role) { pill.hidden = false; pill.textContent = ROLE_NAME[S.role]; } else pill.hidden = true;
  }
  function stepHead(n, title, desc) {
    return `<div class="step-head"><span class="big-num" aria-hidden="true">${n}</span><div><h2>Bước ${n}: ${esc(title)}</h2><p>${desc}</p></div></div>`;
  }
  function navRow(prev, next, nextLabel) {
    return `<div class="nav-row">${prev != null ? `<button class="btn ghost" type="button" data-go="${prev}">Quay lại</button>` : "<span></span>"}${next != null ? `<button class="btn" type="button" data-go="${next}">${esc(nextLabel || "Sang bước " + next)}</button>` : ""}</div>`;
  }

  /* ================= TRANG ĐẦU ================= */
  function viewWelcome() {
    const hasData = stepDone(1) || hollandStats().answered > 0;
    return `<section class="sheet">
      <div class="hero">
        <div>
          <h1>Chọn 4 môn, mở đúng cánh cửa.</h1>
          <p class="lead">Lớp 10 cần chọn 4 trong 9 môn học lựa chọn và học ổn định đến hết lớp 12. Cổng thông tin tư vấn học sinh đồng hành cùng bạn qua 7 bước, từ hiểu bản thân đến chốt tổ hợp phù hợp với trường.</p>
          <h3>Bạn là ai?</h3>
          <div class="role-cards">
            ${["hs", "ph", "gv"].map(r => `<button type="button" class="role-card" data-action="role" data-role="${r}" aria-pressed="${S.role === r}"><strong>${ROLE_NAME[r]}</strong><span>${{ hs: "Tự khám phá và chọn tổ hợp", ph: "Đồng hành cùng con", gv: "Hỗ trợ tư vấn cho học sinh" }[r]}</span></button>`).join("")}
          </div>
          <div class="row">
            <button class="btn" type="button" data-go="1" ${S.role ? "" : "disabled"}>${hasData ? "Tiếp tục hồ sơ" : "Bắt đầu Bước 1"}</button>
            <button class="btn ghost" type="button" data-action="open-profile-code">${RECORDS_URL ? "Mở hồ sơ bằng mã phiếu" : "Lưu / tải mã hồ sơ"}</button>
          </div>
          ${S.role ? "" : '<p class="small muted" style="margin-top:8px">Chọn vai trò để trợ lý tư vấn xưng hô cho phù hợp.</p>'}
        </div>
        <div>
          <p class="hand">Thử ngay: chạm 4 ô để xem tổ hợp xét tuyển nào được mở.</p>
          ${boardHTML(S.ui.heroPick || [], "hero")}
          <div class="doors" id="heroDoors">${heroDoors(S.ui.heroPick || [])}</div>
        </div>
      </div>
      <hr class="rule">
      <div class="rules-strip">
        <div><b>4 / 9</b>Chọn đúng 4 môn trong 9 môn lựa chọn – không còn quy tắc “mỗi nhóm ít nhất 1 môn” (TT 13/2022).</div>
        <div><b>3 cụm</b>Chọn 3 cụm chuyên đề học tập của 3 môn, theo phương án nhà trường công khai.</div>
        <div><b>Đến lớp 12</b>Giữ ổn định đến hết lớp 12; chỉ đổi vào cuối năm học, cần cam kết và Hiệu trưởng đồng ý (CV 68).</div>
      </div>
    </section>`;
  }
  function boardHTML(picked, scope, opts = {}) {
    return `<div class="board" role="group" aria-label="9 môn học lựa chọn">${D.SUBJECT_ORDER.map(k => {
      const s = D.SUBJECTS[k], on = picked.includes(k), dis = !on && picked.length >= 4;
      return `<button type="button" class="tile" style="--c:${s.color}" data-action="tile" data-scope="${scope}" data-k="${k}" aria-pressed="${on}" ${dis ? "disabled" : ""}>${esc(s.name)}<small>${s.examable ? "Được chọn thi TN" : "Không thi TN"}</small></button>`;
    }).join("")}</div>`;
  }
  function heroDoors(p) {
    if (p.length < 4) return `<p class="muted small">Đã chọn ${p.length}/4 môn.</p>`;
    const op = openedToHop(p).filter(k => D.TO_HOP[k].sel.length > 0);
    const careers = D.CAREERS.filter(c => c.th.some(k => op.includes(k))).map(c => c.name);
    return `<h4>Tổ hợp xét tuyển được mở thêm</h4><div class="door-list">${op.map(k => `<span class="door" title="${esc(D.TO_HOP[k].label)}">${k}</span>`).join("") || '<span class="muted small">Chỉ còn các tổ hợp dùng môn bắt buộc (D01, D14…)</span>'}</div>
      <p class="small" style="margin-top:8px">Một số ngành liên quan: ${esc(careers.slice(0, 8).join(", ") || "–")}${careers.length > 8 ? "…" : ""}</p>
      <p class="small muted">Ngoài ra luôn có D01 (Văn – Toán – Anh) vì đây đều là môn bắt buộc.</p>`;
  }

  /* ================= BƯỚC 1 ================= */
  function viewStep1() {
    const p = S.profile, sch = allSchools();
    const st = strengthLists();
    const sel = (path, opts) => `<select data-bind="${path}">${opts.map(o => `<option value="${esc(o)}" ${getPath(path) === o ? "selected" : ""}>${esc(o || "– Chọn –")}</option>`).join("")}</select>`;
    return `<section class="sheet">
      ${stepHead(1, "Thu thập dữ liệu nền", T("Cho mình biết một chút về bạn. Chỉ cần tên gọi, không cần họ tên đầy đủ. Các câu hỏi về gia đình có thể bỏ qua.", "Nhập thông tin của học sinh. Chỉ cần tên gọi, không cần họ tên đầy đủ. Các câu hỏi về gia đình có thể bỏ qua."))}
      <fieldset><legend>Thông tin chung</legend>
        <div class="grid-3">
          <div class="field"><label for="f-nick">Tên gọi</label><input id="f-nick" type="text" data-bind="profile.nickname" value="${esc(p.nickname)}" placeholder="VD: Minh"></div>
          <div class="field"><label for="f-school">Trường THPT</label>
            <select id="f-school" data-bind="profile.schoolId" data-rerender="1"><option value="">– Chọn trường –</option>${sch.map(s => `<option value="${s.id}" ${p.schoolId === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}<option value="__other" ${p.schoolId === "__other" ? "selected" : ""}>Trường khác…</option></select></div>
          <div class="field"><label for="f-prov">Tỉnh/thành</label><input id="f-prov" type="text" data-bind="profile.province" value="${esc(p.province)}" placeholder="VD: Hà Nội"></div>
        </div>
        ${p.schoolId === "__other" ? `<div class="field" style="margin-top:10px"><label for="f-other">Tên trường</label><input id="f-other" type="text" data-bind="profile.schoolOther" value="${esc(p.schoolOther)}" placeholder="VD: THPT …"><span class="hint">Bản có AI sẽ tự tra cứu tổ hợp môn của trường trên web. Ở bản demo, bạn nhập danh sách tổ hợp của trường ở Bước 4.</span></div>` : ""}
      </fieldset>
      <fieldset><legend>Kết quả học tập lớp 9 (thang 10)</legend>
        <p class="small muted">Nhập điểm trung bình cả năm nếu nhớ; bỏ trống môn không nhớ.</p>
        <div class="grades">${D.THCS.map(s => `<div class="field"><label for="g-${s.key}">${esc(s.name)}</label><input id="g-${s.key}" type="number" min="0" max="10" step="0.1" inputmode="decimal" data-bind="profile.grades.${s.key}" value="${esc(p.grades[s.key] ?? "")}"></div>`).join("")}</div>
        <div class="grid-2" style="margin-top:12px">
          <div class="field"><label for="f-exam">Tổng điểm thi vào lớp 10 (nếu có)</label><input id="f-exam" type="text" data-bind="profile.exam10" value="${esc(p.exam10)}"></div>
          <div class="field"><label for="f-tal">Năng khiếu, giải thưởng, câu lạc bộ</label><input id="f-tal" type="text" data-bind="profile.talents" value="${esc(p.talents)}" placeholder="VD: CLB robot, giải vẽ cấp quận"></div>
        </div>
      </fieldset>
      <fieldset><legend>Sở thích môn học</legend>
        <div class="field"><span class="label">${T("Môn lựa chọn bạn thích", "Môn lựa chọn học sinh thích")}</span><div class="chips">${D.SUBJECT_ORDER.map(k => `<button type="button" class="chip" data-action="toggle-arr" data-path="profile.liked" data-k="${k}" aria-pressed="${p.liked.includes(k)}">${esc(D.SUBJECTS[k].name)}</button>`).join("")}</div></div>
        <div class="field" style="margin-top:12px"><span class="label">${T("Môn bạn không muốn học", "Môn học sinh không muốn học")}</span><div class="chips">${D.SUBJECT_ORDER.map(k => `<button type="button" class="chip bad" data-action="toggle-arr" data-path="profile.disliked" data-k="${k}" aria-pressed="${p.disliked.includes(k)}">${esc(D.SUBJECTS[k].name)}</button>`).join("")}</div></div>
      </fieldset>
      <fieldset><legend>Điều kiện (không bắt buộc)</legend>
        <div class="grid-2">
          <div class="field"><label>Khả năng học thêm ngoài giờ</label>${sel("profile.cond.extra", ["", "Thuận lợi", "Có thể, hạn chế", "Khó khăn", "Không muốn chia sẻ"])}</div>
          <div class="field"><label>Thời gian tự học mỗi ngày</label>${sel("profile.cond.time", ["", "Dưới 1 giờ", "1–2 giờ", "Trên 2 giờ"])}</div>
          <div class="field"><label>Có máy tính ở nhà</label>${sel("profile.cond.device", ["", "Có", "Không", "Dùng chung"])}</div>
          <div class="field"><label>Điều kiện kinh tế gia đình</label>${sel("profile.cond.econ", ["", "Thuận lợi", "Bình thường", "Khó khăn", "Không muốn chia sẻ"])}</div>
        </div>
        <div class="field" style="margin-top:10px"><label for="f-health">Lưu ý sức khoẻ liên quan nghề nghiệp (nếu muốn chia sẻ)</label><input id="f-health" type="text" data-bind="profile.health" value="${esc(p.health)}" placeholder="VD: dị ứng hoá chất, mắt khó phân biệt màu"></div>
      </fieldset>
      <fieldset><legend>Nguyện vọng ban đầu</legend>
        <div class="grid-2">
          <div class="field"><label for="f-wish">${T("Ngành/nghề bạn mơ ước", "Ngành/nghề học sinh mơ ước")}</label><input id="f-wish" type="text" data-bind="profile.wish" value="${esc(p.wish)}" placeholder="VD: bác sĩ, lập trình viên"></div>
          <div class="field"><label for="f-fam">Mong muốn của gia đình</label><input id="f-fam" type="text" data-bind="profile.familyWish" value="${esc(p.familyWish)}" placeholder="VD: muốn theo ngành Y"></div>
        </div>
      </fieldset>
      <div class="callout info">
        <h4>Hồ sơ học sinh (H1)</h4>
        <p><b>Môn mạnh (≥ 8):</b> ${esc(st.strong.join(", ") || "chưa có dữ liệu")}<br>
        <b>Trung bình (6,5–7,9):</b> ${esc(st.mid.join(", ") || "–")}<br>
        <b>Cần cố gắng (&lt; 6,5):</b> ${esc(st.weak.join(", ") || "–")}<br>
        <b>Nguyện vọng:</b> ${esc(p.wish || "–")} · <b>Gia đình:</b> ${esc(p.familyWish || "–")}</p>
      </div>
      ${navRow(0, 2)}
    </section>`;
  }

  /* ================= BƯỚC 2 ================= */
  function viewStep2() {
    const tab = S.ui.testTab;
    const hs = hollandStats(), ps = persStats(), gs = gardnerStats(), tp = tpbStats();
    const tabs = [["holland", "Holland", `${hs.answered}/54`], ["pers", "Tính cách 4 chiều", `${ps.answered}/16`], ["gardner", "Đa trí tuệ", `${gs.answered}/24`], ["tpb", "TPB", `${tp.answered}/${tp.total}`], ["result", "Báo cáo", ""]];
    let body = "";
    if (tab === "holland") body = testHolland(hs);
    else if (tab === "pers") body = testPers(ps);
    else if (tab === "gardner") body = testGardner(gs);
    else if (tab === "tpb") body = testTPB(tp);
    else body = reportH2();
    return `<section class="sheet">
      ${stepHead(2, "Đánh giá tâm lý – năng lực – sở thích", "Không có câu đúng hay sai. Kết quả chỉ để tham khảo, giúp hiểu bản thân hơn – không phải chẩn đoán.")}
      <div class="tabs" role="tablist">${tabs.map(([k, n, c]) => `<button type="button" class="tab" role="tab" aria-selected="${tab === k}" data-action="test-tab" data-tab="${k}">${n}${c ? `<span class="count">${c}</span>` : ""}</button>`).join("")}</div>
      ${body}
      ${navRow(1, 3)}
    </section>`;
  }
  const prog = (a, t) => `<div class="progress" aria-hidden="true"><span style="width:${Math.round(a / t * 100)}%"></span></div>`;
  function testHolland(hs) {
    return `<p>Cho điểm mức độ đúng với bản thân: <b>0</b> ${D.HOLLAND_SCALE[0]} · <b>1</b> ${D.HOLLAND_SCALE[1]} · <b>2</b> ${D.HOLLAND_SCALE[2]} · <b>3</b> ${D.HOLLAND_SCALE[3]} · <b>4</b> ${D.HOLLAND_SCALE[4]}. Khoảng 15 phút.</p>
      ${prog(hs.answered, 54)}
      ${D.HOLLAND.map(g => `<div class="q-group"><h4>Bảng ${g.key} – ${esc(g.name)} <span class="muted small">(${hs.sc[g.key]}/36)</span></h4>
        ${g.items.map((it, i) => `<div class="q"><span class="q-text">${i + 1}. ${esc(it)}</span><span class="scale" role="group" aria-label="${esc(it)}">${[0, 1, 2, 3, 4].map(v => `<button type="button" data-action="hol" data-k="${g.key}" data-i="${i}" data-v="${v}" data-fid="hol-${g.key}-${i}-${v}" aria-pressed="${S.tests.holland[g.key][i] === v}" title="${D.HOLLAND_SCALE[v]}">${v}</button>`).join("")}</span></div>`).join("")}
      </div>`).join("")}
      <div class="row no-print"><button type="button" class="btn ghost small" data-action="fill-demo" data-test="holland">Điền ngẫu nhiên (để thử demo)</button><span class="spacer"></span>${hs.done ? `<button type="button" class="btn" data-action="test-tab" data-tab="pers">Tiếp: Tính cách 4 chiều</button>` : ""}</div>`;
  }
  function testPers(ps) {
    return `<p>Mỗi dòng chọn câu gần với bạn hơn. <span class="muted small">Bản rút gọn tham khảo, không phải bộ MBTI® chính thức.</span></p>
      ${prog(ps.answered, 16)}
      ${D.PERSONALITY.map(p => `<div class="q-group"><h4>${esc(p.label)} (${p.a} / ${p.b})</h4>
        ${p.items.map((pair, i) => `<div class="ab">${["a", "b"].map((x, j) => `<button type="button" data-action="pers" data-k="${p.dim}" data-i="${i}" data-v="${x}" data-fid="pers-${p.dim}-${i}-${x}" aria-pressed="${S.tests.pers[p.dim][i] === x}">${esc(pair[j])}</button>`).join("")}</div>`).join("")}
      </div>`).join("")}
      <div class="row no-print"><button type="button" class="btn ghost small" data-action="fill-demo" data-test="pers">Điền ngẫu nhiên (để thử demo)</button><span class="spacer"></span>${ps.done ? `<button type="button" class="btn" data-action="test-tab" data-tab="gardner">Tiếp: Đa trí tuệ</button>` : ""}</div>`;
  }
  function testGardner(gs) {
    return `<p>Mức độ giống bạn: <b>1</b> Hoàn toàn không giống … <b>5</b> Rất giống mình.</p>
      ${prog(gs.answered, 24)}
      ${D.GARDNER.map(g => `<div class="q-group"><h4>${esc(g.name)} <span class="muted small">(${gs.sc[g.key]}/15)</span></h4>
        ${g.items.map((it, i) => `<div class="q"><span class="q-text">${esc(it)}</span><span class="scale" role="group" aria-label="${esc(it)}">${[1, 2, 3, 4, 5].map(v => `<button type="button" data-action="gar" data-k="${g.key}" data-i="${i}" data-v="${v}" data-fid="gar-${g.key}-${i}-${v}" aria-pressed="${S.tests.gardner[g.key][i] === v}" title="${D.LIKERT5[v - 1]}">${v}</button>`).join("")}</span></div>`).join("")}
      </div>`).join("")}
      <div class="row no-print"><button type="button" class="btn ghost small" data-action="fill-demo" data-test="gardner">Điền ngẫu nhiên (để thử demo)</button><span class="spacer"></span>${gs.done ? `<button type="button" class="btn" data-action="test-tab" data-tab="result">Xem báo cáo</button>` : ""}</div>`;
  }
  function testTPB(tp) {
    const c = tp.combo;
    const X = c ? comboLabel(c.subjects) : "[X]";
    return `<p>Thang đo theo Thuyết hành vi có kế hoạch (TPB) cho <b>một tổ hợp cụ thể</b>. Nên làm sau khi có phương án ở Bước 4. <span class="muted small">Bản dùng tạm, sẽ chuẩn hóa sau.</span></p>
      <div class="field" style="max-width:520px;margin-bottom:12px"><span class="label">Tổ hợp đang đánh giá</span>
        ${c ? `<div class="row">${miniTiles(c.subjects)}<button type="button" class="btn ghost small" data-action="tpb-clear">Đổi tổ hợp</button></div>` : boardHTML(S.ui.tpbPick || [], "tpb") + `<p class="small muted">Chạm chọn 4 môn để đặt tổ hợp cần đánh giá, hoặc bấm “Đánh giá TPB” trên một phương án ở Bước 4.</p>`}
      </div>
      ${c ? `<p class="scale-legend">1 Hoàn toàn không đồng ý · 2 Không đồng ý · 3 Phân vân · 4 Đồng ý · 5 Hoàn toàn đồng ý</p>${prog(tp.answered, tp.total)}
      ${D.TPB.map(g => `<div class="q-group"><h4>${g.key} – ${esc(g.name)} <span class="muted small">(TB ${fmt(tp.m[g.key])})</span></h4>
        ${g.items.map((it, i) => `<div class="q"><span class="q-text">${esc(it.replace("[X]", X))}</span><span class="scale">${[1, 2, 3, 4, 5].map(v => `<button type="button" data-action="tpb" data-k="${g.key}" data-i="${i}" data-v="${v}" data-fid="tpb-${g.key}-${i}-${v}" aria-pressed="${S.tests.tpb.ans[g.key][i] === v}" title="${D.AGREE5[v - 1]}">${v}</button>`).join("")}</span></div>`).join("")}</div>`).join("")}
      ${tp.answered ? tpbPatterns(tp.m).map(x => `<div class="callout ${x.k}"><p>${esc(x.t)}</p></div>`).join("") : ""}
      <div class="row no-print"><button type="button" class="btn ghost small" data-action="fill-demo" data-test="tpb">Điền ngẫu nhiên (để thử demo)</button></div>` : ""}`;
  }
  function bars(rows, max) {
    return `<div class="bars">${rows.map(([lab, val]) => `<div class="bar"><span>${esc(lab)}</span><span class="bar-track"><span class="bar-fill" style="width:${clamp(val / max * 100, 0, 100)}%"></span></span><span class="bar-val">${val}</span></div>`).join("")}</div>`;
  }
  function reportH2() {
    const hs = hollandStats(), ps = persStats(), gs = gardnerStats(), tp = tpbStats(), st = strengthLists();
    if (!hs.answered && !ps.answered && !gs.answered) return `<div class="callout info"><p>Chưa có dữ liệu. Hãy bắt đầu với tab Holland.</p></div>`;
    const top = hs.done && hs.sc[hs.order[0]] > hs.sc[hs.order[1]] ? D.HOLLAND.find(g => g.key === hs.order[0]) : null;
    const gNames = gs.top.map(k => D.GARDNER.find(g => g.key === k).name);
    const groups = [...new Set(rankedCareers().slice(0, 6).map(x => x.c.group))];
    return `<h3>Báo cáo tâm lý – năng lực (H2)</h3><p class="muted small">Chỉ mang tính tham khảo.</p>
      <div class="grid-2">
        <div><h4>1. Sở thích nghề nghiệp (Holland)</h4>
          ${hs.answered ? `<div class="code-big">${hollandLabel(hs)}</div>${hs.done ? "" : `<p class="small muted">Mới có ${hs.answered}/54 câu hợp lệ${hs.invalid.length ? `; ${hs.invalid.length} câu không hợp lệ` : ""} – chưa có mã kết quả.</p>`}${hs.done && !hs.code ? `<p class="small muted">Đồng điểm ở các nhóm dẫn đầu: ${hs.tieGroups.map(g => g.join("/ ")).join(", ")}. Cần trao đổi thêm trước khi diễn giải mã ba chữ.</p>` : ""}${bars(D.HOLLAND.map(g => [g.key + " – " + g.name.split("–")[1].trim(), hs.sc[g.key]]), 36)}
          ${top ? `<p class="small" style="margin-top:10px"><b>${esc(top.name)}:</b> ${esc(top.desc)}</p><p class="small"><b>Ngành nghề gợi ý:</b> ${esc(top.jobs)}</p>` : ""}` : `<p class="muted">Chưa làm.</p>`}
        </div>
        <div><h4>2. Xu hướng tính cách 4 chiều</h4>
          ${ps.answered ? `<div class="code-big" style="font-size:1.8rem">${esc(ps.type)}</div><ul class="small">${D.PERSONALITY.map(p => { const r = ps.res[p.dim]; const L = r.a > r.b ? p.a : r.b > r.a ? p.b : null; return `<li>${esc(p.label)}: ${L ? esc(D.PERSONALITY_DESC[L]) : "cân bằng giữa " + p.a + " và " + p.b}</li>`; }).join("")}</ul>` : `<p class="muted">Chưa làm.</p>`}
          <h4 style="margin-top:16px">3. Trí thông minh nổi trội (Gardner)</h4>
          ${gs.answered ? `${bars(D.GARDNER.map(g => [g.name, gs.sc[g.key]]), 15)}<p class="small" style="margin-top:8px"><b>Nổi trội:</b> ${esc(gNames.join(", "))}</p>` : `<p class="muted">Chưa làm.</p>`}
        </div>
      </div>
      <hr class="rule">
      <div class="grid-2">
        <div><h4>4. Năng lực học tập (từ Bước 1)</h4><p class="small"><b>Mạnh:</b> ${esc(st.strong.join(", ") || "–")}<br><b>Cần cố gắng:</b> ${esc(st.weak.join(", ") || "–")}</p>
          <h4>5. Nhóm ngành gợi ý ban đầu</h4><p class="small">${esc(groups.join(", "))}</p></div>
        <div><h4>6. TPB</h4>${tp.answered ? `<p class="small">Tổ hợp ${esc(tp.combo ? comboLabel(tp.combo.subjects) : "")}: Thái độ ${level(tp.m.ATT)} (${fmt(tp.m.ATT)}), Chuẩn chủ quan ${level(tp.m.SN)} (${fmt(tp.m.SN)}), Kiểm soát ${level(tp.m.PBC)} (${fmt(tp.m.PBC)}), Ý định ${level(tp.m.INT)} (${fmt(tp.m.INT)}).</p>` : `<p class="small muted">Chưa làm (nên làm sau Bước 4).</p>`}
          <h4>7. Có cần giáo viên tư vấn thêm?</h4>
          ${hs.flat ? `<div class="callout warn"><p>Điểm các nhóm sở thích khá sát nhau hoặc đều thấp theo ngưỡng gợi ý của bản demo (heuristic, chưa chuẩn hóa) – nên trao đổi với giáo viên tư vấn.</p></div>` : `<p class="small">${hs.done ? "Ngưỡng gợi ý của bản demo chưa đánh dấu điểm sát nhau hoặc thấp; vẫn nên trao đổi khi phân vân." : "Hoàn thành Holland để xem gợi ý."}</p>`}
        </div>
      </div>`;
  }

  /* ================= BƯỚC 3 ================= */
  function viewStep3() {
    const hs = hollandStats();
    const groups = [...new Set(D.CAREERS.map(c => c.group))];
    let list = rankedCareers();
    if (S.careerGroup) list = list.filter(x => x.c.group === S.careerGroup);
    const show = S.ui.showAllCareers ? list : list.slice(0, 10);
    const liked = D.CAREERS.filter(c => S.careerFb[c.name] === "like");
    return `<section class="sheet">
      ${stepHead(3, "Khám phá nghề nghiệp – ngành học", T("Danh sách được xếp theo mức phù hợp với sở thích, trí tuệ nổi trội và kết quả học tập của bạn. Hãy đánh dấu ngành bạn thích để mình gợi ý tổ hợp ở Bước 4.", "Danh sách xếp theo mức phù hợp với kết quả trắc nghiệm và học tập của học sinh. Đánh dấu ngành ưu tiên để gợi ý tổ hợp ở Bước 4."))}
      ${hs.answered ? "" : `<div class="callout warn"><p>Chưa có kết quả Holland nên gợi ý chủ yếu dựa vào điểm học tập. <button type="button" class="btn small ghost" data-go="2">Làm trắc nghiệm</button></p></div>`}
      <div class="row" style="margin-bottom:14px"><label for="grp" class="small"><b>Lọc theo nhóm ngành</b></label>
        <select id="grp" data-bind="careerGroup" data-rerender="1" style="max-width:280px"><option value="">Tất cả nhóm ngành</option>${groups.map(g => `<option ${S.careerGroup === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></div>
      ${show.map(({ c, s }) => `<article class="career">
        <div class="career-top"><h4>${esc(c.name)}</h4><span class="fit">${s}% phù hợp</span></div>
        <p class="small" style="margin:4px 0 6px"><span class="tag">${esc(c.group)}</span><span class="tag">Holland ${c.h}</span></p>
        <p class="small" style="margin-bottom:4px">${esc(c.desc)}</p>
        <p class="small muted" style="margin:0">Tổ hợp xét tuyển hay gặp: ${c.th.map(k => `<b title="${esc(D.TO_HOP[k].label)}">${k}</b>`).join(", ")} · Môn lựa chọn nên có: ${esc(mustSubjectsText(c))}</p>
        <div class="fb" role="group" aria-label="Đánh giá ngành">${[["like", "Thích"], ["maybe", "Phân vân"], ["no", "Không hợp"]].map(([v, l]) => `<button type="button" class="${v}" data-action="cfb" data-name="${esc(c.name)}" data-v="${v}" aria-pressed="${S.careerFb[c.name] === v}">${l}</button>`).join("")}</div>
      </article>`).join("")}
      ${list.length > 10 ? `<div class="row" style="margin-top:12px"><button type="button" class="btn ghost small" data-action="toggle-all-careers">${S.ui.showAllCareers ? "Thu gọn" : "Xem tất cả " + list.length + " ngành"}</button></div>` : ""}
      <hr class="rule">
      <h3>Danh sách ngành nghề tiềm năng (H3)</h3>
      ${liked.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Ngành</th><th>Nhóm</th><th>Phù hợp</th><th>Tổ hợp xét tuyển tham khảo</th><th>Môn lựa chọn nên có</th></tr></thead><tbody>
        ${liked.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.group)}</td><td>${careerScore(c)}%</td><td>${c.th.join(", ")}</td><td>${esc(mustSubjectsText(c))}</td></tr>`).join("")}</tbody></table></div>
        <p class="small muted" style="margin-top:8px">Tổ hợp xét tuyển thay đổi theo năm và từng trường đại học – cần kiểm tra đề án tuyển sinh mới nhất.</p>`
        : `<p class="muted">Chưa đánh dấu ngành nào. ${hs.flat ? "Nếu vẫn chưa xác định được, nên gặp giáo viên tư vấn thêm." : ""}</p>`}
      <div class="margin-note small">Gợi ý trải nghiệm: hỏi chuyện người đang làm nghề, tham gia câu lạc bộ, ngày hội tư vấn tuyển sinh, tham quan trường đại học/doanh nghiệp.</div>
      ${navRow(2, 4)}
    </section>`;
  }
  function mustSubjectsText(c) {
    const sets = c.th.map(k => D.TO_HOP[k].sel).filter(s => s.length);
    if (!sets.length) return "không bắt buộc môn lựa chọn (năng khiếu hoặc D01…)";
    const count = {}; sets.forEach(s => s.forEach(x => count[x] = (count[x] || 0) + 1));
    return Object.keys(count).sort((a, b) => count[b] - count[a]).map(subjName).join(", ");
  }

  /* ================= BƯỚC 4 ================= */
  function viewStep4() {
    const sid = S.ui.step4School || (S.profile.schoolId && S.profile.schoolId !== "__other" ? S.profile.schoolId : "");
    const school = findSchool(sid);
    const pcs = priorityCareers();
    let results = "";
    if (school) {
      const ranked = rankSchoolCombos(school);
      results = `<h3 style="margin-top:6px">Phương án đề xuất tại ${esc(school.name)} (H4)</h3>
        <p class="small muted">Nguồn danh sách tổ hợp: ${school.demo ? "dữ liệu minh hoạ của bản demo" : "do người dùng nhập – chưa xác minh với thông báo chính thức của trường"}. Điểm tối đa 100 = Phù hợp ngành 35 + Năng lực 25 + Sở thích 20 + Linh hoạt 10 + Điều kiện/TPB 10.</p>
        ${ranked.slice(0, 5).map((r, i) => planCard(r, i, school)).join("")}
        ${ranked.length > 5 ? `<p class="small muted">Còn ${ranked.length - 5} tổ hợp khác có điểm thấp hơn.</p>` : ""}`;
    }
    const b = S.builder;
    const ba = b.subjects.length === 4 ? analyzeCombo(b.subjects, b.cd.length ? b.cd : null, school) : null;
    return `<section class="sheet">
      ${stepHead(4, "Gợi ý tổ hợp môn học tại trường", "Đối chiếu nguyện vọng, năng lực và sở thích với danh sách tổ hợp mà trường công khai, rồi mô phỏng kết quả từng phương án.")}
      <div class="grid-2">
        <div class="field"><label for="s4-school">Trường</label>
          <select id="s4-school" data-bind="ui.step4School" data-rerender="1"><option value="">– Chọn trường –</option>${allSchools().map(s => `<option value="${s.id}" ${sid === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
          <span class="hint">Bản có AI sẽ tự tra cứu tổ hợp của trường trên web. Bản demo dùng trường minh hoạ hoặc bạn tự nhập.</span></div>
        <div class="field"><span class="label">&nbsp;</span><div class="row"><button type="button" class="btn ghost" data-action="add-school">Thêm trường và tổ hợp</button>${school && !school.demo ? `<button type="button" class="btn ghost small" data-action="del-school" data-id="${school.id}">Xoá trường này</button>` : ""}</div></div>
      </div>
      <fieldset style="margin-top:16px"><legend>Ràng buộc cá nhân</legend>
        <div class="field"><span class="label">Môn bắt buộc phải có</span><div class="chips">${D.SUBJECT_ORDER.map(k => `<button type="button" class="chip" data-action="toggle-arr" data-path="constraints.must" data-k="${k}" aria-pressed="${S.constraints.must.includes(k)}">${esc(D.SUBJECTS[k].name)}</button>`).join("")}</div></div>
        <div class="field" style="margin-top:10px"><span class="label">Môn tuyệt đối không học</span><div class="chips">${D.SUBJECT_ORDER.map(k => `<button type="button" class="chip bad" data-action="toggle-arr" data-path="constraints.exclude" data-k="${k}" aria-pressed="${S.constraints.exclude.includes(k)}">${esc(D.SUBJECTS[k].name)}</button>`).join("")}</div></div>
        <p class="small muted" style="margin-top:10px">Ngành đang ưu tiên: <b>${esc(pcs.map(c => c.name).join(", ") || "chưa có")}</b> ${Object.values(S.careerFb).includes("like") ? "" : "(tạm lấy 3 ngành phù hợp nhất – đánh dấu “Thích” ở Bước 3 để chính xác hơn)"}</p>
      </fieldset>
      ${school ? results : `<div class="callout info"><p>Chọn một trường để xem phương án đề xuất.</p></div>`}
      <hr class="rule">
      <h3>Tự ghép tổ hợp và kiểm tra</h3>
      <p class="small muted">Chạm 4 môn và chọn 3 cụm chuyên đề để kiểm tra hợp lệ theo TT 13/2022${school ? " và đối chiếu với danh sách của trường" : ""}.</p>
      <div class="grid-2">
        <div>${boardHTML(b.subjects, "builder")}</div>
        <div>
          <div class="field"><span class="label">3 cụm chuyên đề (${b.cd.length}/3)</span><div class="chips">${Object.keys(D.CHUYEN_DE).map(k => `<button type="button" class="chip" data-action="cd" data-k="${k}" aria-pressed="${b.cd.includes(k)}" ${!b.cd.includes(k) && b.cd.length >= 3 ? "disabled" : ""}>${esc(D.CHUYEN_DE[k])}</button>`).join("")}</div></div>
          ${ba ? `<div style="margin-top:12px">${ba.v.issues.length ? ba.v.issues.map(t => `<div class="callout bad"><p>${esc(t)}</p></div>`).join("") : `<div class="callout ok"><p>Hợp lệ${school ? " và có trong danh sách của trường" : ""}.</p></div>`}
            <p class="small"><b>Điểm phù hợp:</b> ${ba.total}/100 · <b>Mở thêm tổ hợp:</b> ${ba.nonTrivial.join(", ") || "–"}</p>
            <div class="row"><button type="button" class="btn small" data-action="shortlist-builder">Đưa vào danh sách cân nhắc</button><button type="button" class="btn ghost small" data-action="tpb-set" data-subs="${b.subjects.join(",")}">Đánh giá TPB</button></div></div>` : `<p class="small muted" style="margin-top:12px">Đã chọn ${b.subjects.length}/4 môn.</p>`}
        </div>
      </div>
      <hr class="rule">
      <h3>Danh sách cân nhắc (${S.shortlist.length})</h3>
      ${S.shortlist.length ? `<ul>${S.shortlist.map(k => { const [scId, ck, cdk] = k.split("|"); const sc = findSchool(scId); return `<li class="row" style="margin-bottom:6px">${miniTiles(ck.split("+"), cdk ? cdk.split(",") : [])}<span class="small muted">${esc(sc ? sc.name : "Tự ghép")}</span><button type="button" class="btn ghost small" data-action="unshortlist" data-key="${esc(k)}">Bỏ</button></li>`; }).join("")}</ul>` : `<p class="muted small">Chưa có. Bấm “Đưa vào danh sách cân nhắc” trên phương án phù hợp.</p>`}
      ${navRow(3, 5)}
    </section>`;
  }
  function planCard(r, i, school) {
    const a = r.a, c = r.combo, key = school.id + "|" + comboKey(c.subjects) + "|" + (c.cd || []).join(",");
    const inList = S.shortlist.includes(key);
    const closed = a.careerRows.filter(x => !x.strong.length).map(x => x.c.name);
    return `<article class="plan ${i === 0 ? "top" : ""}">
      <div class="plan-head"><span class="plan-rank">Phương án ${i + 1}${c.id ? " · mã " + esc(c.id) : ""}</span><span class="score-ring">${a.total}<small>/100</small></span></div>
      ${miniTiles(c.subjects, c.cd)}
      <div class="crit"><div>Phù hợp ngành<b>${a.parts.career}/35</b></div><div>Năng lực<b>${a.parts.ability}/25</b></div><div>Sở thích<b>${a.parts.interest}/20</b></div><div>Linh hoạt<b>${a.parts.flex}/10</b></div><div>Điều kiện/TPB<b>${a.parts.cons}/10</b></div></div>
      <div class="plan-cols">
        <div><h5>Kiểm tra hợp lệ</h5><ul><li><span class="${a.v.r1 ? "check" : "cross"}">${a.v.r1 ? "✓" : "✗"}</span> 4 môn khác nhau (TT 13/2022)</li><li><span class="${a.v.r2 !== false ? "check" : "cross"}">${a.v.r2 !== false ? "✓" : "✗"}</span> 3 cụm chuyên đề</li><li><span class="check">✓</span> Có trong danh sách trường</li></ul>
          <h5>Mở ra</h5><ul><li>Tổ hợp xét tuyển: ${a.nonTrivial.map(k => `<b title="${esc(D.TO_HOP[k].label)}">${k}</b>`).join(", ") || "–"} (và D01, D14)</li><li>Môn có thể chọn thi tốt nghiệp: ${esc(a.exam.join(", "))}</li>
          ${a.careerRows.filter(x => x.strong.length).map(x => `<li>${esc(x.c.name)}: qua ${x.strong.join(", ")}</li>`).join("")}</ul></div>
        <div>${closed.length ? `<h5>Hạn chế</h5><ul><li>Không mở tổ hợp đặc thù cho: ${esc(closed.join(", "))}</li></ul>` : ""}
          ${a.risks.length || a.consNotes.length ? `<h5>Rủi ro & lưu ý</h5><ul>${a.risks.concat(a.consNotes).map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : `<h5>Rủi ro & lưu ý</h5><p class="small">Chưa thấy rủi ro đáng kể từ dữ liệu hiện có.</p>`}</div>
      </div>
      <div class="row" style="margin-top:12px">
        <button type="button" class="btn small ${inList ? "ok" : ""}" data-action="shortlist" data-key="${esc(key)}">${inList ? "Đã trong danh sách cân nhắc" : "Đưa vào danh sách cân nhắc"}</button>
        <button type="button" class="btn ghost small" data-action="tpb-set" data-subs="${c.subjects.join(",")}">Đánh giá TPB</button>
        <button type="button" class="btn ghost small" data-action="set-final" data-school="${school.id}" data-ck="${comboKey(c.subjects)}">Chọn làm phương án chính</button>
      </div>
    </article>`;
  }

  /* ================= BƯỚC 5 ================= */
  function questionsForMeeting() {
    const q = [], p = S.profile, tp = tpbStats(), hs = hollandStats();
    if (p.wish && p.familyWish && p.wish.trim().toLowerCase() !== p.familyWish.trim().toLowerCase()) q.push(`Nguyện vọng của học sinh (“${p.wish}”) và mong muốn của gia đình (“${p.familyWish}”) khác nhau – điểm chung nào giữa hai hướng này?`);
    if (tp.m.ATT >= 4 && tp.m.SN < 3) q.push("Gia đình/thầy cô còn băn khoăn điều gì về tổ hợp học sinh đang thích?");
    if (tp.m.PBC != null && tp.m.PBC < 3) q.push("Học sinh cần hỗ trợ gì (thời gian, phương pháp, học liệu) để tự tin học tốt tổ hợp?");
    if (hs.flat) q.push("Sở thích nghề nghiệp chưa rõ – có thể cho học sinh trải nghiệm hoạt động nào để khám phá thêm?");
    const weak = strengthLists().weak; if (weak.length) q.push("Với các môn còn yếu (" + weak.join(", ") + "), có nên tránh hay có kế hoạch củng cố?");
    q.push("Nếu không đỗ ngành ưu tiên, phương án dự phòng là gì?");
    q.push("Gia đình có đồng ý với phương án chính và hiểu rằng môn lựa chọn cần giữ ổn định đến hết lớp 12?");
    return q;
  }
  function viewStep5() {
    const p = S.profile, hs = hollandStats(), ps = persStats(), gs = gardnerStats(), tp = tpbStats(), st = strengthLists();
    const sch = findSchool(p.schoolId);
    const liked = D.CAREERS.filter(c => S.careerFb[c.name] === "like");
    const fc = finalCombo();
    return `<section class="sheet">
      ${stepHead(5, "Tư vấn giáo viên – cha mẹ – học sinh", "Bước 5 là buổi gặp trực tiếp với thầy cô và cha mẹ – web chỉ chuẩn bị phiếu tóm tắt và câu hỏi gợi ý.")}
      <div class="callout info no-print"><p>${{ hs: "Bạn chỉ chia sẻ phiếu này với thầy cô và cha mẹ khi bạn đồng ý.", ph: "Anh/chị hãy cùng con xem phiếu trước buổi gặp và để con nói lên mong muốn của mình.", gv: "Thầy/cô có thể dùng phiếu như dữ liệu đầu vào; các con số chỉ mang tính tham khảo." }[S.role || "hs"]}</p></div>
      <div class="summary-doc" id="printArea">
        <h3>PHIẾU TÓM TẮT TƯ VẤN CHỌN MÔN LỚP 10 (H5)</h3>
        <p class="small">Học sinh: <b>${esc(p.nickname || "……")}</b> · Trường: <b>${esc(sch ? sch.name : (p.schoolOther || "……"))}</b> · Ngày lập: ${new Date().toLocaleDateString("vi-VN")}</p>
        <h4>1. Học tập</h4><ul><li>Môn mạnh: ${esc(st.strong.join(", ") || "–")}</li><li>Cần cố gắng: ${esc(st.weak.join(", ") || "–")}</li><li>Năng khiếu/giải thưởng: ${esc(p.talents || "–")}</li></ul>
        <h4>2. Tâm lý – sở thích (tham khảo)</h4><ul><li>Holland: ${hs.answered ? "<b>" + hollandLabel(hs) + "</b>" : "–"}</li><li>Tính cách 4 chiều: ${ps.answered ? esc(ps.type) : "–"}</li><li>Trí tuệ nổi trội: ${gs.answered ? esc(gs.top.map(k => D.GARDNER.find(g => g.key === k).name).join(", ")) : "–"}</li>
          <li>TPB${tp.combo ? " (" + esc(comboLabel(tp.combo.subjects)) + ")" : ""}: ${tp.answered ? `Thái độ ${fmt(tp.m.ATT)} · Chuẩn chủ quan ${fmt(tp.m.SN)} · Kiểm soát ${fmt(tp.m.PBC)} · Ý định ${fmt(tp.m.INT)}` : "–"}</li></ul>
        <h4>3. Nguyện vọng & ngành ưu tiên</h4><ul><li>Học sinh: ${esc(p.wish || "–")} · Gia đình: ${esc(p.familyWish || "–")}</li><li>Ngành ưu tiên: ${esc(liked.map(c => c.name).join(", ") || "chưa chọn")}</li></ul>
        <h4>4. Phương án đang cân nhắc</h4>
        ${S.shortlist.length ? `<ul>${S.shortlist.map(k => { const [scId, ck] = k.split("|"); const sc = findSchool(scId); const a = analyzeCombo(ck.split("+"), null, null); return `<li>${esc(comboLabel(ck.split("+")))} – ${a.total}/100 – mở ${esc(a.nonTrivial.join(", ") || "–")}${sc ? "" : " (tự ghép)"}</li>`; }).join("")}</ul>` : "<p class='small'>Chưa có.</p>"}
        ${fc ? `<p class="small"><b>Phương án chính dự kiến:</b> ${esc(comboLabel(fc.subjects))}</p>` : ""}
        <h4>5. Câu hỏi gợi ý cho buổi gặp</h4><ol class="small">${questionsForMeeting().map(x => `<li>${esc(x)}</li>`).join("")}</ol>
        <h4>6. Ghi chú sau buổi gặp</h4><p style="min-height:60px;border-bottom:1px dotted #999"></p>
        <div class="sign-row"><div>Học sinh</div><div>Cha mẹ/người giám hộ</div><div>Giáo viên tư vấn</div></div>
        <p class="small muted" style="margin-top:14px">Cổng thông tin tư vấn học sinh (bản demo) – © 2026 Dr. Duyen Nguyen. Kết quả chỉ mang tính tham khảo.</p>
      </div>
      <div class="row no-print" style="margin-top:14px">
        <button type="button" class="btn" data-action="print">In / lưu PDF phiếu</button>
        <button type="button" class="btn ghost" data-action="copy-summary">Sao chép tóm tắt</button>
        <label class="row small" style="gap:6px"><input type="checkbox" data-action="check" data-k="talked" ${S.final.checks.talked ? "checked" : ""}> Đã trao đổi với giáo viên và cha mẹ</label>
      </div>
      ${submitBox()}
      ${navRow(4, 6)}
    </section>`;
  }

  /* ================= BƯỚC 6 ================= */
  function viewStep6() {
    const fc = finalCombo(); const sch = findSchool(S.final.schoolId);
    let auto = null, a = null;
    if (fc) { a = analyzeCombo(fc.subjects, fc.cd && fc.cd.length ? fc.cd : null, sch); auto = a.v; }
    const options = [];
    S.shortlist.forEach(k => { const [scId, ck] = k.split("|"); options.push({ scId, ck }); });
    const items = [
      { k: "r1", t: "Đúng 4 môn lựa chọn, khác nhau, trong 9 môn (TT 13/2022)", auto: auto ? auto.r1 : null },
      { k: "r2", t: "3 cụm chuyên đề của 3 môn khác nhau, đúng theo tổ hợp của trường", auto: auto ? (auto.r2 === null ? null : auto.r2) : null },
      { k: "r3", t: "Tổ hợp có trong danh sách trường công khai; đúng định hướng Công nghệ (công nghiệp/nông nghiệp) nếu có", auto: auto ? (auto.r3 === null ? null : auto.r3) : null },
      { k: "career", t: "Phù hợp ít nhất 1 ngành mục tiêu và có phương án dự phòng", auto: a ? a.careerRows.some(r => r.strong.length) : null },
      { k: "parent", t: "Cha mẹ/người giám hộ đã biết và đồng ý" },
      { k: "deadline", t: "Biết thời hạn và cách nộp phiếu đăng ký của trường" },
      { k: "cv68", t: "Hiểu: giữ ổn định đến hết lớp 12; chỉ đổi vào cuối năm học, cần cam kết tự bổ sung kiến thức có xác nhận của cha mẹ và Hiệu trưởng đồng ý (CV 68)" }
    ];
    const allOk = fc && items.every(it => it.auto === false ? false : (it.auto === true || S.final.checks[it.k]));
    return `<section class="sheet">
      ${stepHead(6, "Chốt nguyện vọng và đăng ký chính thức", "Chọn phương án cuối cùng, kiểm tra hợp lệ trước khi điền phiếu đăng ký của trường.")}
      <div class="field"><span class="label">Phương án chính</span>
        ${fc ? `<div class="row">${miniTiles(fc.subjects, fc.cd)}<span class="small muted">${esc(sch ? sch.name : "Tự ghép")}</span><button type="button" class="btn ghost small" data-action="clear-final">Đổi phương án</button></div>`
          : options.length ? `<div class="chips">${options.map(o => `<button type="button" class="chip" data-action="set-final" data-school="${o.scId}" data-ck="${o.ck}">${esc(comboLabel(o.ck.split("+")))}${findSchool(o.scId) ? "" : " (tự ghép)"}</button>`).join("")}</div>`
          : `<p class="muted">Chưa có phương án trong danh sách cân nhắc. <button type="button" class="btn ghost small" data-go="4">Về Bước 4</button></p>`}
      </div>
      <h3 style="margin-top:18px">Danh sách kiểm tra</h3>
      <ul class="checklist">${items.map(it => `<li>${it.auto == null ? `<input type="checkbox" id="ck-${it.k}" data-action="check" data-k="${it.k}" ${S.final.checks[it.k] ? "checked" : ""}>` : `<span aria-hidden="true" class="${it.auto ? "check" : "cross"}" style="width:20px;text-align:center">${it.auto ? "✓" : "✗"}</span>`}
        <label for="ck-${it.k}">${esc(it.t)}${it.auto == null ? "" : `<span class="auto-flag ${it.auto ? "y" : "n"}">${it.auto ? "tự kiểm tra: đạt" : "tự kiểm tra: chưa đạt"}</span>`}</label></li>`).join("")}</ul>
      ${a && a.v.issues.length ? a.v.issues.map(t => `<div class="callout bad"><p>${esc(t)}</p></div>`).join("") : ""}
      <div class="row" style="margin-top:16px">
        <button type="button" class="btn ok" data-action="confirm-final" ${allOk ? "" : "disabled"}>${S.final.confirmed ? "Đã xác nhận phương án" : "Xác nhận phương án chính thức"}</button>
        ${allOk ? "" : '<span class="small muted">Hoàn thành tất cả mục để xác nhận.</span>'}
      </div>
      ${S.final.confirmed && fc ? `<div class="callout ok" style="margin-top:16px"><h4>Xác nhận phương án (H6)</h4><p>${esc(S.profile.nickname || "Học sinh")} chọn tổ hợp <b>${esc(comboLabel(fc.subjects))}</b>${fc.cd && fc.cd.length ? " với cụm chuyên đề " + esc(fc.cd.map(k => D.CHUYEN_DE[k]).join(", ")) : ""}. Hãy điền đúng phương án này vào phiếu đăng ký của trường.</p></div>
        <h3>Mã hồ sơ</h3><p class="small muted">Lưu lại để tiếp tục ở lần sau, hoặc gửi cho thầy cô.</p><div class="code-box">${esc(summaryText())}</div>
        <div class="row" style="margin-top:10px"><button type="button" class="btn ghost small" data-action="open-profile-code">Lưu / tải mã hồ sơ</button></div>` : ""}
      ${updateBar()}
      ${navRow(5, 7)}
    </section>`;
  }

  /* ================= BƯỚC 7 ================= */
  function warningsFor(entry, prev) {
    const w = [];
    Object.keys(entry.scores).forEach(s => {
      const v = entry.scores[s];
      if (v != null && v < 5) w.push({ k: "bad", t: `${subjName(s)}: điểm ${fmt(v)} dưới 5,0.`, fix: "Gặp giáo viên bộ môn để xác định lỗ hổng kiến thức; lập kế hoạch tự học 2–3 buổi/tuần; tham gia nhóm học tập." });
      if (prev && prev.scores[s] != null && v != null && prev.scores[s] - v >= 1.5) w.push({ k: "warn", t: `${subjName(s)}: giảm ${fmt(prev.scores[s] - v)} điểm so với ${prev.period}.`, fix: "Xem lại phương pháp học, thời gian tự học và các yếu tố ảnh hưởng gần đây." });
      if (entry.sat[s] != null && entry.sat[s] <= 2) w.push({ k: "warn", t: `${subjName(s)}: mức hài lòng thấp (${entry.sat[s]}/5).`, fix: "Trao đổi với GVCN về khó khăn; tìm cách học khiến môn học thú vị hơn (dự án, thực hành)." });
    });
    if (entry.overall != null && entry.overall <= 2) w.push({ k: "warn", t: `Mức hài lòng chung với tổ hợp thấp (${entry.overall}/5).`, fix: "Nên gặp giáo viên tư vấn sớm để đánh giá lại." });
    if (entry.stress != null && entry.stress >= 4) w.push({ k: "bad", t: "Mức căng thẳng cao.", fix: "Hãy chia sẻ với cha mẹ, GVCN hoặc tổ tư vấn tâm lý của trường. Nếu có lúc nghĩ đến việc làm hại bản thân, gọi ngay Tổng đài quốc gia bảo vệ trẻ em 111 (miễn phí, 24/7)." });
    return w;
  }
  function viewStep7() {
    const fc = finalCombo();
    const subs = fc ? fc.subjects : [];
    const last = S.tracking[S.tracking.length - 1];
    const prev = S.tracking[S.tracking.length - 2];
    const warns = last ? warningsFor(last, prev) : [];
    return `<section class="sheet">
      ${stepHead(7, "Theo dõi – đánh giá – điều chỉnh", "Quay lại vào cuối học kỳ 1 và cuối năm để cập nhật kết quả. Web sẽ cảnh báo sớm và gợi ý biện pháp hỗ trợ.")}
      ${!fc ? `<div class="callout info"><p>Chưa có phương án chính thức. <button type="button" class="btn ghost small" data-go="6">Về Bước 6</button></p></div>` : `
      <form id="trackForm" class="no-print">
        <div class="grid-3">
          <div class="field"><label for="t-period">Thời điểm</label><select id="t-period" name="period">${["Giữa HK1", "Cuối HK1", "Giữa HK2", "Cuối năm lớp 10", "Cuối HK1 lớp 11", "Cuối năm lớp 11"].map(x => `<option>${x}</option>`).join("")}</select></div>
          <div class="field"><label for="t-overall">Hài lòng chung với tổ hợp (1–5)</label><input id="t-overall" name="overall" type="number" min="1" max="5" step="1"></div>
          <div class="field"><label for="t-stress">Mức căng thẳng học tập (1–5)</label><input id="t-stress" name="stress" type="number" min="1" max="5" step="1"></div>
        </div>
        <div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Môn</th><th>Điểm TB (0–10)</th><th>Hài lòng (1–5)</th></tr></thead><tbody>
          ${subs.map(s => `<tr><td>${esc(subjName(s))}</td><td><input name="score-${s}" type="number" min="0" max="10" step="0.1" style="max-width:110px"></td><td><input name="sat-${s}" type="number" min="1" max="5" step="1" style="max-width:90px"></td></tr>`).join("")}
        </tbody></table></div>
        <label class="row small" style="gap:6px;margin-top:10px"><input type="checkbox" name="wantChange"> ${T("Mình đang muốn đổi môn lựa chọn", "Học sinh đang muốn đổi môn lựa chọn")}</label>
        <div class="row" style="margin-top:12px"><button type="submit" class="btn">Lưu lần theo dõi</button></div>
      </form>`}
      ${last ? `<hr class="rule"><h3>Báo cáo theo dõi (H7) – ${esc(last.period)}</h3>
        ${warns.length ? warns.map(x => `<div class="callout ${x.k}"><p><b>${esc(x.t)}</b><br>${esc(x.fix)}</p></div>`).join("") : `<div class="callout ok"><p>Chưa có cảnh báo. Tiếp tục duy trì!</p></div>`}
        ${last.wantChange ? `<div class="callout info"><h4>Nếu muốn đổi môn (CV 68/BGDĐT-GDTrH)</h4><ul class="small"><li>Chỉ thực hiện vào <b>cuối năm học</b>; Hiệu trưởng xem xét, quyết định theo khả năng của trường.</li><li>Phải có <b>bản cam kết tự bổ sung</b> kiến thức của môn mới ở lớp trước, có xác nhận của cha mẹ/người giám hộ.</li><li>Nhà trường tổ chức <b>kiểm tra</b> việc tự bổ sung.</li><li>Nên gặp GVCN sớm, cân nhắc kỹ lợi – hại trước khi quyết định.</li></ul></div>` : ""}
        <h4>Lịch sử</h4><div class="table-wrap"><table class="t"><thead><tr><th>Thời điểm</th>${subs.map(s => `<th>${esc(subjShort(s))}</th>`).join("")}<th>Hài lòng chung</th><th>Căng thẳng</th><th></th></tr></thead><tbody>
          ${S.tracking.map((e, i) => `<tr><td>${esc(e.period)}</td>${subs.map(s => `<td>${fmt(e.scores[s])}</td>`).join("")}<td>${e.overall ?? "–"}</td><td>${e.stress ?? "–"}</td><td><button type="button" class="btn ghost small" data-action="del-track" data-i="${i}">Xoá</button></td></tr>`).join("")}
        </tbody></table></div>
        <p class="small muted">Lịch kiểm tra lại gợi ý: cuối HK1 và cuối năm học.</p>` : ""}
      ${updateBar()}
      ${navRow(6, null)}
    </section>`;
  }

  /* ================= RENDER ================= */
  const VIEWS = [viewWelcome, viewStep1, viewStep2, viewStep3, viewStep4, viewStep5, viewStep6, viewStep7];
  function render(opts = {}) {
    const fid = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fid : null;
    const y = window.scrollY;
    renderSteps();
    $("#main").innerHTML = VIEWS[S.step]();
    if (opts.top) { window.scrollTo(0, 0); $("#main").focus({ preventScroll: true }); }
    else window.scrollTo(0, y);
    if (fid) { const el = document.querySelector(`[data-fid="${fid}"]`); if (el) el.focus({ preventScroll: true }); }
    const tf = $("#trackForm"); if (tf) tf.addEventListener("submit", onTrackSubmit);
  }
  function go(n) { S.step = clamp(n, 0, 7); save(); render({ top: true }); document.dispatchEvent(new CustomEvent("ctv:step", { detail: S.step })); }

  /* ================= SỰ KIỆN ================= */
  document.addEventListener("click", e => {
    const g = e.target.closest("[data-go]");
    if (g && !g.disabled) { go(+g.dataset.go); return; }
    const b = e.target.closest("[data-action]");
    if (!b || b.disabled) return;
    const A = b.dataset.action, ds = b.dataset;
    switch (A) {
      case "role": S.role = ds.role; save(); render(); document.dispatchEvent(new CustomEvent("ctv:role")); break;
      case "tile": {
        const scope = ds.scope;
        const arr = scope === "hero" ? (S.ui.heroPick = S.ui.heroPick || []) : scope === "tpb" ? (S.ui.tpbPick = S.ui.tpbPick || []) : S.builder.subjects;
        const i = arr.indexOf(ds.k); if (i >= 0) arr.splice(i, 1); else if (arr.length < 4) arr.push(ds.k);
        if (scope === "tpb" && arr.length === 4) { S.tests.tpb.combo = { subjects: arr.slice() }; S.ui.tpbPick = []; }
        save(); render(); break;
      }
      case "toggle-arr": { const arr = getPath(ds.path); const i = arr.indexOf(ds.k); if (i >= 0) arr.splice(i, 1); else arr.push(ds.k);
        if (ds.path === "profile.liked") { const j = S.profile.disliked.indexOf(ds.k); if (i < 0 && j >= 0) S.profile.disliked.splice(j, 1); }
        if (ds.path === "profile.disliked") { const j = S.profile.liked.indexOf(ds.k); if (i < 0 && j >= 0) S.profile.liked.splice(j, 1); }
        if (ds.path === "constraints.must") { const j = S.constraints.exclude.indexOf(ds.k); if (i < 0 && j >= 0) S.constraints.exclude.splice(j, 1); }
        if (ds.path === "constraints.exclude") { const j = S.constraints.must.indexOf(ds.k); if (i < 0 && j >= 0) S.constraints.must.splice(j, 1); }
        save(); render(); break; }
      case "test-tab": S.ui.testTab = ds.tab; save(); render({ top: true }); break;
      case "hol": S.tests.holland[ds.k][+ds.i] = +ds.v; save(); render(); break;
      case "pers": S.tests.pers[ds.k][+ds.i] = ds.v; save(); render(); break;
      case "gar": S.tests.gardner[ds.k][+ds.i] = +ds.v; save(); render(); break;
      case "tpb": S.tests.tpb.ans[ds.k][+ds.i] = +ds.v; save(); render(); break;
      case "tpb-clear": S.tests.tpb.combo = null; D.TPB.forEach(t => S.tests.tpb.ans[t.key] = Array(t.items.length).fill(null)); save(); render(); break;
      case "tpb-set": S.tests.tpb.combo = { subjects: ds.subs.split(",") }; D.TPB.forEach(t => S.tests.tpb.ans[t.key] = Array(t.items.length).fill(null)); S.ui.testTab = "tpb"; save(); go(2); break;
      case "fill-demo": fillDemo(ds.test); save(); render(); toast("Đã điền ngẫu nhiên để thử demo"); break;
      case "cfb": S.careerFb[ds.name] = S.careerFb[ds.name] === ds.v ? undefined : ds.v; save(); render(); break;
      case "toggle-all-careers": S.ui.showAllCareers = !S.ui.showAllCareers; save(); render(); break;
      case "cd": { const arr = S.builder.cd; const i = arr.indexOf(ds.k); if (i >= 0) arr.splice(i, 1); else if (arr.length < 3) arr.push(ds.k); save(); render(); break; }
      case "shortlist": { const i = S.shortlist.indexOf(ds.key); if (i >= 0) S.shortlist.splice(i, 1); else S.shortlist.push(ds.key); save(); render(); break; }
      case "shortlist-builder": { const sid = S.ui.step4School || ""; const sc = findSchool(sid); const v = validate(S.builder.subjects, S.builder.cd.length ? S.builder.cd : null, sc);
        if (!v.r1) { toast("Cần đủ 4 môn khác nhau"); break; }
        const key = (v.offered ? sid : "custom") + "|" + comboKey(S.builder.subjects) + "|" + S.builder.cd.join(",");
        if (!S.shortlist.includes(key)) S.shortlist.push(key); save(); render(); toast("Đã thêm vào danh sách cân nhắc"); break; }
      case "unshortlist": S.shortlist = S.shortlist.filter(k => k !== ds.key); save(); render(); break;
      case "set-final": { S.final.schoolId = findSchool(ds.school) ? ds.school : ""; S.final.comboKey = ds.ck; S.final.confirmed = false;
        const sk = S.shortlist.find(k => k.split("|")[1] === ds.ck); S.final.cd = sk && sk.split("|")[2] ? sk.split("|")[2].split(",") : [];
        save(); toast("Đã đặt làm phương án chính"); if (S.step !== 6) go(6); else render(); break; }
      case "clear-final": S.final.comboKey = ""; S.final.schoolId = ""; S.final.confirmed = false; save(); render(); break;
      case "check": S.final.checks[ds.k] = b.checked; if (ds.k !== "talked") S.final.confirmed = false; save(); render(); break;
      case "confirm-final": S.final.confirmed = true; save(); render(); toast("Đã xác nhận phương án chính thức"); break;
      case "print": window.print(); break;
      case "copy-summary": copyText(summaryText()); break;
      case "add-school": openAddSchool(); break;
      case "del-school": S.schools = S.schools.filter(s => s.id !== ds.id); if (S.ui.step4School === ds.id) S.ui.step4School = ""; save(); render(); break;
      case "del-track": S.tracking.splice(+ds.i, 1); save(); render(); break;
      case "open-profile-code": openProfileCode(); break;
      case "record-consent": S.ui.recordConsent = b.checked; render(); break;
      case "submit-record": submitRecord(true, b); break;
      case "update-record": submitRecord(false, b); break;
    }
  });
  document.addEventListener("change", e => {
    const el = e.target.closest("[data-bind]");
    if (!el) return;
    let v = el.value;
    setPath(el.dataset.bind, v); save();
    if (el.dataset.rerender) render();
  });

  function fillDemo(test) {
    const r = n => Math.floor(Math.random() * n);
    if (test === "holland") D.HOLLAND.forEach((g, gi) => { const bias = [3, 2, 1, 1, 2, 1][(gi + r(6)) % 6]; S.tests.holland[g.key] = g.items.map(() => clamp(bias + r(3) - 1, 0, 4)); });
    if (test === "pers") D.PERSONALITY.forEach(p => S.tests.pers[p.dim] = p.items.map(() => r(2) ? "a" : "b"));
    if (test === "gardner") D.GARDNER.forEach(g => S.tests.gardner[g.key] = g.items.map(() => 1 + r(5)));
    if (test === "tpb") D.TPB.forEach(t => S.tests.tpb.ans[t.key] = t.items.map(() => 2 + r(4)));
  }
  function onTrackSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.target); const fc = finalCombo(); if (!fc) return;
    const num = (k, lo, hi) => { const v = parseFloat(String(f.get(k) || "").replace(",", ".")); return isNaN(v) ? null : clamp(v, lo, hi); };
    const entry = { period: f.get("period"), overall: num("overall", 1, 5), stress: num("stress", 1, 5), wantChange: !!f.get("wantChange"), scores: {}, sat: {} };
    fc.subjects.forEach(s => { entry.scores[s] = num("score-" + s, 0, 10); entry.sat[s] = num("sat-" + s, 1, 5); });
    S.tracking.push(entry); save(); render(); toast("Đã lưu lần theo dõi");
  }
  function copyText(t) {
    const done = () => toast("Đã sao chép");
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, () => fallback());
    else fallback();
    function fallback() { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { toast("Không sao chép được – hãy bôi đen và sao chép thủ công"); } ta.remove(); }
  }

  /* ================= HỘP THOẠI ================= */
  function dialog(html, onOpen) {
    const d = $("#dialog"); $("#dialogInner").innerHTML = html; if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
    if (onOpen) onOpen($("#dialogInner"));
  }
  function closeDialog() { const d = $("#dialog"); if (d.close) d.close(); else d.removeAttribute("open"); }
  const b64 = s => btoa(unescape(encodeURIComponent(s)));
  const unb64 = s => decodeURIComponent(escape(atob(s)));
  function openProfileCode() {
    const code = b64(JSON.stringify(S));
    dialog(`${RECORDS_URL ? `<h3>Mở hồ sơ đã nộp</h3>
      <p class="small">Nhập mã phiếu nhận được sau khi nộp ở Bước 5 để tiếp tục Bước 6–7. Dữ liệu đang có trên máy này sẽ được thay thế.</p>
      <div class="row"><label class="sr-only" for="rc-code">Mã phiếu</label><input id="rc-code" type="text" autocomplete="off" spellcheck="false" placeholder="VD: 2026minhanh" style="max-width:220px">
        <button type="button" class="btn" id="rc-load">Mở hồ sơ</button></div>
      <p class="small" id="rc-err" style="color:var(--bad)"></p><hr class="rule">` : ""}<h3>Mã hồ sơ</h3>
      <p class="small">Mã hồ sơ chứa toàn bộ dữ liệu đã nhập trên trình duyệt này. Có thể sao chép hoặc tải tệp để tự lưu. Vì an toàn, bản thử nghiệm không hỗ trợ nhập/khôi phục mã từ nguồn ngoài.</p>
      <h4>Tóm tắt</h4><div class="code-box">${esc(summaryText())}</div>
      <h4 style="margin-top:12px">Mã đầy đủ</h4><textarea id="pcode" spellcheck="false">${esc(code)}</textarea>
      <div class="row" style="margin-top:12px">
        <button type="button" class="btn" id="pc-copy">Sao chép mã</button>
        <button type="button" class="btn ghost" id="pc-dl">Tải file hồ sơ (.json)</button>
        <span class="spacer"></span>
        <button type="button" class="btn ghost small" id="pc-reset">Xoá dữ liệu, làm lại</button>
        <button type="button" class="btn ghost small" id="pc-close">Đóng</button>
      </div>`, root => {
      $("#pc-copy", root).onclick = () => copyText($("#pcode", root).value);
      $("#pc-dl", root).onclick = () => { const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ho-so-tu-van-" + (S.profile.nickname || "hoc-sinh") + ".json"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      $("#pc-reset", root).onclick = () => { if (window.confirm("Xoá toàn bộ dữ liệu đã nhập trên trình duyệt này?")) { S = blankState(); save(); closeDialog(); render({ top: true }); toast("Đã xoá dữ liệu"); } };
      $("#pc-close", root).onclick = closeDialog;
      if (RECORDS_URL) $("#rc-load", root).onclick = () => loadRecord($("#rc-code", root).value, $("#rc-err", root), $("#rc-load", root));
    });
  }
  function openAddSchool() {
    dialog(`<h3>Thêm trường và tổ hợp</h3>
      <p class="small">Nhập theo thông báo chính thức của trường. Mỗi dòng một tổ hợp: <b>4 môn</b>, có thể thêm <b>| 3 cụm chuyên đề</b>.<br>
      Viết tắt môn: Địa, KT&PL (hoặc GDKT), Lí, Hoá, Sinh, CN, Tin, Nhạc, Mĩ thuật. Chuyên đề thêm: Văn, Toán, Sử.</p>
      <div class="grid-2"><div class="field"><label for="ns-name">Tên trường</label><input id="ns-name" type="text" placeholder="VD: THPT Yên Hoà"></div>
      <div class="field"><label for="ns-prov">Tỉnh/thành</label><input id="ns-prov" type="text" placeholder="VD: Hà Nội"></div></div>
      <div class="field" style="margin-top:10px"><label for="ns-combos">Danh sách tổ hợp</label><textarea id="ns-combos" placeholder="Lí, Hoá, Sinh, Tin | Toán, Lí, Hoá&#10;Địa, KT&PL, Tin, CN | Văn, Sử, Địa"></textarea></div>
      <p class="small" id="ns-err" style="color:var(--bad)"></p>
      <div class="row"><button type="button" class="btn" id="ns-save">Lưu trường</button><button type="button" class="btn ghost" id="ns-close">Huỷ</button></div>`, root => {
      $("#ns-close", root).onclick = closeDialog;
      $("#ns-save", root).onclick = () => {
        const name = $("#ns-name", root).value.trim(); const lines = $("#ns-combos", root).value.split(/\n+/).map(x => x.trim()).filter(Boolean);
        if (!name) { $("#ns-err", root).textContent = "Hãy nhập tên trường."; return; }
        const combos = [], errs = [];
        lines.forEach((ln, i) => {
          const [a, b] = ln.split("|"); const subs = parseSubj(a, false); const cd = b ? parseSubj(b, true) : [];
          const v = validate(subs, cd.length ? cd : null, null);
          if (!v.r1 || v.r2 === false) errs.push(`Dòng ${i + 1}: ${v.issues.join(" ")}`); else combos.push({ id: "T" + (i + 1), subjects: subs, cd });
        });
        if (errs.length) { $("#ns-err", root).textContent = errs.join(" "); return; }
        if (!combos.length) { $("#ns-err", root).textContent = "Hãy nhập ít nhất 1 tổ hợp."; return; }
        const id = "u-" + Date.now();
        S.schools.push({ id, name, province: $("#ns-prov", root).value.trim(), combos }); S.ui.step4School = id;
        if (!S.profile.schoolId || S.profile.schoolId === "__other") S.profile.schoolId = id;
        save(); closeDialog(); render(); toast("Đã lưu trường");
      };
    });
  }
  function parseSubj(txt, isCd) {
    const map = { "địa": "dia", "dia": "dia", "địa lí": "dia", "địa lý": "dia", "kt&pl": "gdkt", "gdkt": "gdkt", "gdktpl": "gdkt", "gdkt&pl": "gdkt", "ktpl": "gdkt", "lí": "li", "lý": "li", "li": "li", "vật lí": "li", "vật lý": "li",
      "hoá": "hoa", "hóa": "hoa", "hoa": "hoa", "hoá học": "hoa", "hóa học": "hoa", "sinh": "sinh", "sinh học": "sinh", "cn": "cn", "công nghệ": "cn", "tin": "tin", "tin học": "tin",
      "nhạc": "an", "âm nhạc": "an", "mĩ thuật": "mt", "mỹ thuật": "mt", "mt": "mt", "văn": "van", "ngữ văn": "van", "toán": "toan", "sử": "su", "lịch sử": "su" };
    return (txt || "").split(/[,;–\-\/]+/).map(x => map[x.trim().toLowerCase()]).filter(k => k && (isCd ? D.CHUYEN_DE[k] : D.SUBJECTS[k]));
  }

  /* ================= KHO HỒ SƠ (máy chủ) ================= */
  function submitBox() {
    if (!RECORDS_URL) return `<div class="callout info no-print"><p class="small">Bản này chưa kết nối kho lưu hồ sơ. Hãy in hoặc tải mã hồ sơ để lưu.</p></div>`;
    const ok = !!S.ui.recordConsent && !!S.profile.nickname.trim();
    return `<div class="callout ${S.record.code ? "ok" : "info"} no-print" style="margin-top:16px">
      <h4>Nộp hồ sơ cho nhà trường</h4>
      ${S.record.code ? `<p class="small">Hồ sơ này đã có mã phiếu <b>${esc(S.record.code)}</b>. Nộp lại sẽ cập nhật đúng phiếu đó.</p>` : ""}
      <p class="small">Sau khi nộp, phiếu được lưu để giáo viên tư vấn xem; dữ liệu trên máy này được xoá để bắt đầu lượt mới. ${T("Bạn", "Học sinh")} nhận một <b>mã phiếu</b> để mở lại hồ sơ ở Bước 6–7.</p>
      <label class="row small" style="gap:6px"><input type="checkbox" data-action="record-consent" ${S.ui.recordConsent ? "checked" : ""}> ${T("Mình", "Học sinh và gia đình")} đồng ý gửi phiếu này cho nhà trường lưu trữ phục vụ tư vấn chọn môn.</label>
      ${S.profile.nickname.trim() ? "" : `<p class="small" style="color:var(--bad)">Cần nhập tên gọi ở Bước 1 để thầy cô nhận ra phiếu. <button type="button" class="btn ghost small" data-go="1">Về Bước 1</button></p>`}
      <div class="row" style="margin-top:8px"><button type="button" class="btn ok" data-action="submit-record" ${ok ? "" : "disabled"}>Nộp hồ sơ và bắt đầu lượt mới</button></div>
    </div>`;
  }
  function updateBar() {
    if (!RECORDS_URL || !S.record.code) return "";
    return `<div class="row no-print small" style="margin-top:16px;gap:10px"><span>Mã phiếu: <b>${esc(S.record.code)}</b>${S.record.savedAt ? " · lưu lần cuối " + esc(new Date(S.record.savedAt).toLocaleString("vi-VN")) : ""}</span>
      <button type="button" class="btn ghost small" data-action="update-record">Cập nhật hồ sơ lên kho</button></div>`;
  }
  function recordPayload() {
    const p = S.profile, sch = findSchool(p.schoolId), hs = hollandStats(), fc = finalCombo();
    const state = JSON.parse(JSON.stringify(S));
    delete state.record; state.ui = {};
    return {
      code: S.record.code || undefined, consent: true, state,
      summary: {
        role: S.role || "", nickname: p.nickname.trim().slice(0, 300), school: (sch ? sch.name : p.schoolOther || "").slice(0, 300),
        holland: hs.answered ? hollandLabel(hs).replace(/<[^>]*>/g, "").slice(0, 300) : "",
        finalCombo: fc ? comboLabel(fc.subjects).slice(0, 300) : "",
        shortlist: S.shortlist.map(k => comboLabel(k.split("|")[1].split("+"))).join("; ").slice(0, 300)
      },
      summaryText: summaryText().slice(0, 6000)
    };
  }
  async function recordsFetch(path, body) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(RECORDS_URL + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal, credentials: "omit" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(data.error || "HTTP " + r.status); e.status = r.status; throw e; }
      return data;
    } finally { clearTimeout(t); }
  }
  async function submitRecord(startNew, btn) {
    if (btn) btn.disabled = true;
    let data;
    try { data = await recordsFetch("/api/records", recordPayload()); }
    catch (e) {
      if (btn) btn.disabled = false;
      toast(e.status === 404 ? "Không tìm thấy mã phiếu trên máy chủ" : e.status === 429 ? "Gửi quá nhiều lần, hãy thử lại sau ít phút" : "Chưa lưu được – kiểm tra kết nối rồi thử lại");
      return;
    }
    if (!startNew) { S.record = { code: data.code, savedAt: data.savedAt }; save(); render(); toast("Đã cập nhật hồ sơ " + data.code); return; }
    // Đã lưu trên máy chủ: xoá dữ liệu máy này ngay, rồi mới hiện mã phiếu.
    try { localStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ }
    const restart = () => { try { localStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ } window.location.reload(); };
    dialog(`<h3>Đã nộp hồ sơ</h3>
      <p>Mã phiếu của ${esc(S.profile.nickname)}:</p>
      <p style="font-size:1.8rem;font-weight:800;letter-spacing:.08em;margin:8px 0">${esc(data.code)}</p>
      <p class="small">Hãy chụp ảnh hoặc ghi lại mã này. Dùng mã ở nút “Mở hồ sơ bằng mã phiếu” trên trang đầu để tiếp tục Bước 6–7. Dữ liệu trên máy này đã được xoá.</p>
      <div class="row" style="margin-top:12px"><button type="button" class="btn ghost" id="rd-copy">Sao chép mã</button><span class="spacer"></span><button type="button" class="btn" id="rd-new">Bắt đầu lượt mới</button></div>`, root => {
      $("#rd-copy", root).onclick = () => copyText(data.code);
      $("#rd-new", root).onclick = restart;
      $("#dialog").addEventListener("close", restart, { once: true });
    });
  }
  function stripUnsafe(v) {
    if (Array.isArray(v)) return v.map(stripUnsafe);
    if (v && typeof v === "object") { const o = {}; Object.keys(v).forEach(k => { if (k !== "__proto__" && k !== "constructor" && k !== "prototype") o[k] = stripUnsafe(v[k]); }); return o; }
    return v;
  }
  async function loadRecord(raw, errEl, btn) {
    const code = String(raw || "").toLowerCase().replace(/[\s-]/g, "");
    if (!/^\d{4}[a-z0-9]{1,40}$/.test(code)) { errEl.textContent = "Mã phiếu gồm năm và tên gọi viết liền không dấu, ví dụ 2026minhanh."; return; }
    errEl.textContent = ""; btn.disabled = true;
    try {
      const data = await recordsFetch("/api/records/load", { code });
      const st = stripUnsafe(data.state);
      if (!st || st.v !== 1 || typeof st.profile !== "object") throw new Error("bad state");
      S = merge(blankState(), st);
      S.record = { code: data.code, savedAt: data.updatedAt || "" };
      S.ui = blankState().ui;
      S.step = 6; save(); closeDialog(); render({ top: true }); toast("Đã mở hồ sơ " + data.code);
    } catch (e) {
      btn.disabled = false;
      errEl.textContent = e.status === 404 ? "Không tìm thấy mã phiếu này." : e.status === 429 ? "Thử quá nhiều lần, hãy chờ ít phút." : "Không mở được hồ sơ – kiểm tra kết nối rồi thử lại.";
    }
  }

  /* ================= API cho chatbot ================= */
  window.CTV_APP = {
    state: () => S, go, summaryText, rankedCareers, priorityCareers, analyzeCombo, hollandStats, findSchool, allSchools,
    subjName, comboLabel, roleName: () => ROLE_NAME[S.role] || null
  };

  render();
})();
