/* =========================================================
   Cổng thông tin tư vấn học sinh – ỨNG DỤNG DEMO (7 bước)
   © 2026 Dr. Duyen Nguyen. All rights reserved.
   ========================================================= */
(function () {
  "use strict";
  const D = window.CTV_DATA;
  const KEY = "ctv_state_v1", KEY_SCHOOLS = "ctv_schools_v1", KEY_ARCHIVE = "ctv_archive_v1", KEY_TOKEN = "ctv_teacher_token";

  /* ================= TRẠNG THÁI ================= */
  function blankState() {
    const hol = {}; D.HOLLAND.forEach(g => hol[g.key] = Array(9).fill(null));
    return {
      v: 2, role: null, step: 0,
      profile: { code: "", nickname: "", className: "", schoolId: "", schoolOther: "", province: "", grades: {}, exam10: "", talents: "",
        liked: [], disliked: [], cond: { extra: "", time: "", device: "", econ: "" }, health: "", wish: "", familyWish: "" },
      tests: { holland: hol, eysenck: Array(D.EYSENCK.length).fill(null), mbti: Array(D.MBTI.length).fill(null) },
      careerFb: {}, careerGroup: "",
      constraints: { must: [] },
      shortlist: [], final: { schoolId: "", comboKey: "", cd: [], checks: {}, confirmed: false },
      tracking: [],
      ui: { testTab: "holland", step4School: "", openWhy: [], showDiagram: false }
    };
  }
  const safeGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } };
  function merge(base, src) {
    for (const k in src) {
      if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k]) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) merge(base[k], src[k]);
      else base[k] = src[k];
    }
    return base;
  }
  function localSchools() { try { return JSON.parse(safeGet(KEY_SCHOOLS) || "[]"); } catch (e) { return []; } }
  function saveLocalSchools(a) { safeSet(KEY_SCHOOLS, JSON.stringify(a)); }
  function upgrade(s) {
    // từ phiên bản 1: chuyển trường tự nhập sang kho trường, bỏ TPB, gộp “môn không học”
    if (!s) return s;
    if (Array.isArray(s.schools) && s.schools.length) { const loc = localSchools(); s.schools.forEach(x => { if (!loc.find(y => y.id === x.id)) loc.push(x); }); saveLocalSchools(loc); }
    delete s.schools; delete s.builder;
    if (s.tests) { delete s.tests.tpb; delete s.tests.pers; delete s.tests.gardner; } // đã thay bằng Eysenck và MBTI
    if (s.constraints && s.constraints.exclude) { s.profile = s.profile || {}; s.profile.disliked = [...new Set([...(s.profile.disliked || []), ...s.constraints.exclude])]; delete s.constraints.exclude; }
    if (s.ui && ["tpb", "pers", "gardner"].includes(s.ui.testTab)) s.ui.testTab = "holland";
    s.v = 2;
    return s;
  }
  function load() {
    try { const raw = safeGet(KEY); if (raw) { const s = upgrade(JSON.parse(raw)); if (s && s.v === 2) return merge(blankState(), s); } } catch (e) { /* bỏ qua */ }
    return blankState();
  }
  let S = load();
  function save() { safeSet(KEY, JSON.stringify(S)); }

  /* ================= MÁY CHỦ (khi web được mở qua trạm trung gian) ================= */
  const SRV = { on: false, info: null, schools: [], token: (() => { try { return sessionStorage.getItem(KEY_TOKEN) || ""; } catch (e) { return ""; } })() };
  async function api(path, opts = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (SRV.token) headers.Authorization = "Bearer " + SRV.token;
    const res = await fetch(path, Object.assign({}, opts, { headers }));
    let data = null; try { data = await res.json(); } catch (e) { /* bỏ qua */ }
    if (res.status === 401) { SRV.token = ""; try { sessionStorage.removeItem(KEY_TOKEN); } catch (e) { /* bỏ qua */ } }
    if (!res.ok) throw new Error((data && data.error) || ("HTTP " + res.status));
    return data;
  }
  async function detectServer() {
    if (!/^https?:/.test(location.protocol) || /\.github\.io$/i.test(location.hostname)) return; // GitHub Pages: web tĩnh, không có máy chủ
    try { SRV.info = await api("/api/info"); SRV.on = true; await refreshServerSchools(); } catch (e) { SRV.on = false; }
  }
  async function refreshServerSchools() { if (!SRV.on) return; try { const r = await api("/api/schools"); SRV.schools = (r.schools || []).map(s => Object.assign(s, { shared: true })); } catch (e) { /* bỏ qua */ } }

  /* ================= TIỆN ÍCH ================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 1) => (n == null || isNaN(n)) ? "–" : Number(n).toFixed(d).replace(".", ",");
  const avg = a => { const v = a.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((p, c) => p + c, 0) / v.length : null; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim();
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }
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
  function allSchools() {
    const seen = new Set(), out = [];
    D.SAMPLE_SCHOOLS.concat(SRV.schools, localSchools()).forEach(s => { if (!seen.has(s.id)) { seen.add(s.id); out.push(s); } });
    return out;
  }
  function findSchool(id) { return allSchools().find(s => s.id === id) || null; }
  const THCS_PF = Object.fromEntries(D.THCS.filter(s => s.passFail).map(s => [s.key, true]));
  function grade(key) {
    const raw = S.profile.grades[key];
    if (THCS_PF[key]) return raw === "Đạt" ? 7.5 : raw === "Chưa đạt" ? 4.5 : null;
    const v = parseFloat(String(raw ?? "").replace(",", ".")); return isNaN(v) ? null : clamp(v, 0, 10);
  }
  const gradeText = key => THCS_PF[key] ? (S.profile.grades[key] || "–") : fmt(grade(key));
  const thcsName = k => (D.THCS.find(t => t.key === k) || {}).name || k;
  function wordsMatch(text, name) {
    const t = norm(text); if (!t) return false;
    const words = norm(name).split(/[\s–\-&,()]+/).filter(w => w.length > 2 && !["nganh", "hoc", "khoa", "cong", "nghe", "ky", "thuat"].includes(w));
    return words.some(w => t.includes(w)) || (name === "Y đa khoa" && /\b(y|bac si)\b/.test(t)) || (name === "Công nghệ thông tin" && /cntt|lap trinh/.test(t));
  }

  /* ================= BƯỚC 1 ================= */
  function strengthLists() {
    const strong = [], mid = [], weak = [];
    D.THCS.forEach(s => {
      const g = grade(s.key); if (g == null) return;
      const label = s.name + " (" + gradeText(s.key) + ")";
      if (THCS_PF[s.key]) { (g >= 7 ? mid : weak).push(label); return; }
      (g >= 8 ? strong : g >= 6.5 ? mid : weak).push(label);
    });
    return { strong, mid, weak };
  }

  /* ================= BƯỚC 2 ================= */
  function hollandStats() {
    const sc = {}; let answered = 0;
    D.HOLLAND.forEach(g => { const a = S.tests.holland[g.key]; answered += a.filter(x => x != null).length; sc[g.key] = a.reduce((p, c) => p + (c || 0), 0); });
    const done = answered === 54;
    const order = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
    return { sc, answered, done, order, code: order.slice(0, 3).join(""), flat: done && (sc[order[0]] - sc[order[2]] < 4 || sc[order[0]] < 14) };
  }
  // Eysenck: mỗi câu cho 1 điểm vào thang của cột nếu câu trả lời trùng dấu (bảng khoá trong data.js)
  function eysenckStats() {
    const sc = { HN: 0, KOD: 0, S: 0 }; let answered = 0;
    S.tests.eysenck.forEach((v, i) => { if (!v) return; answered++; const [k, sign] = D.EYSENCK_KEY[i % 12]; if (v === sign) sc[k]++; });
    const done = answered === D.EYSENCK.length, M = D.EYSENCK_MID;
    // Trục ngang HN, trục dọc KOD, tâm = 12; điểm đúng bằng 12 nằm trên ranh giới nên xét cả hai phía
    const side = (v, hi, lo) => v > M ? [hi] : v < M ? [lo] : [hi, lo];
    const Q = { iu: "uuTu", is: "binhThan", eu: "nongNay", es: "hangHai" }, types = [];
    if (done) side(sc.HN, "e", "i").forEach(x => side(sc.KOD, "u", "s").forEach(y => types.push(Q[x + y])));
    // Tài liệu không nêu ngưỡng cho S; theo cách dùng thang L của Eysenck, thành thật dưới 5/9 thì kết quả kém tin cậy
    const lowS = done && sc.S <= 4;
    return { sc, answered, done, types, lowS, usable: done && !lowS };
  }
  const eyName = ks => ks.map(k => D.EYSENCK_TYPES[k].name).join(" / ");
  const eyText = es => es.done ? eyName(es.types) + ` (HN ${es.sc.HN}, KOD ${es.sc.KOD}, S ${es.sc.S}/9)` : es.answered ? `chưa đủ (${es.answered}/${D.EYSENCK.length})` : "–";
  // MBTI: câu n thuộc cột (n − 1) % 7; a → chữ trước, b → chữ sau của chiều tương ứng
  function mbtiStats() {
    const res = {}; let answered = 0;
    D.MBTI_DIMS.forEach(d => res[d.dim] = { a: 0, b: 0 });
    S.tests.mbti.forEach((v, i) => { if (!v) return; answered++; res[D.MBTI_DIMS.find(d => d.cols.includes(i % 7)).dim][v]++; });
    const letters = D.MBTI_DIMS.map(d => { const r = res[d.dim]; return r.letter = r.a > r.b ? d.a : r.b > r.a ? d.b : d.a + "/" + d.b; });
    return { res, answered, done: answered === D.MBTI.length, type: letters.some(l => l.length > 1) ? letters.join(" · ") : letters.join("") };
  }
  const mbtiText = ms => ms.done ? ms.type : ms.answered ? `chưa đủ (${ms.answered}/${D.MBTI.length})` : "–";

  /* ================= BƯỚC 3 – chấm ngành có truy vết ================= */
  const LONG_PROGRAMS = ["Y đa khoa", "Răng – Hàm – Mặt", "Dược học", "Kiến trúc"];
  function careerNeeds(c) {
    const sets = c.th.map(k => D.TO_HOP[k].sel).filter(s => s.length);
    const count = {}; sets.forEach(s => s.forEach(x => count[x] = (count[x] || 0) + 1));
    return { sets, subjects: Object.keys(count).sort((a, b) => count[b] - count[a]) };
  }
  function careerAnalysis(c) {
    const hs = hollandStats(), es = eysenckStats(), p = S.profile;
    const rows = [], notes = [];
    if (hs.answered) { const w = [0.5, 0.3, 0.2]; const H = c.h.split("").reduce((s, L, i) => s + w[i] * (hs.sc[L] / 36), 0) * 40;
      rows.push({ f: "Sở thích nghề nghiệp (Holland)", d: `Ngành hợp nhóm ${c.h}; điểm: ${c.h.split("").map(L => L + " " + hs.sc[L] + "/36").join(", ")}`, v: H, max: 40 }); }
    else rows.push({ f: "Sở thích nghề nghiệp (Holland)", d: "Chưa làm trắc nghiệm – tạm tính mức trung bình", v: 20, max: 40 });
    // Khí chất Eysenck: chỉ dùng gợi ý nghề có trong tài liệu (c.ey); ngành tài liệu không nhắc tới tính mức trung bình
    const EF = "Khí chất (Eysenck)";
    if (!es.done) rows.push({ f: EF, d: "Chưa làm đủ trắc nghiệm – tạm tính mức trung bình", v: 5, max: 10 });
    else if (es.lowS) rows.push({ f: EF, d: `Điểm thành thật thấp (${es.sc.S}/9) – chưa dùng kết quả, tạm tính mức trung bình`, v: 5, max: 10 });
    else if (!c.ey) rows.push({ f: EF, d: "Tài liệu Eysenck không nêu nhóm nghề này – tạm tính mức trung bình", v: 5, max: 10 });
    else { const hit = es.types.filter(k => c.ey[k]);
      rows.push({ f: EF, d: hit.length ? `Khí chất ${eyName(hit)}: tài liệu gợi ý “${c.ey[hit[0]]}”` : `Tài liệu gợi ý ngành này cho khí chất ${eyName(Object.keys(c.ey))}; ${T("bạn", "học sinh")} thuộc khí chất ${eyName(es.types)}`, v: hit.length ? 10 : 0, max: 10 }); }
    const ag = avg(c.thcs.map(k => grade(k)));
    rows.push({ f: "Kết quả học tập lớp 9", d: c.thcs.map(k => thcsName(k) + " " + gradeText(k)).join(", ") + (ag == null ? " – chưa có điểm, tạm tính" : ""), v: (ag == null ? 0.65 : ag / 10) * 25, max: 25 });
    const need = careerNeeds(c);
    const likedHit = need.subjects.filter(s => p.liked.includes(s));
    if (likedHit.length) rows.push({ f: "Môn yêu thích", d: "Ngành dùng môn " + T("bạn", "học sinh") + " thích: " + likedHit.map(subjName).join(", "), v: Math.min(10, likedHit.length * 5), max: 10 });
    if (need.sets.length && p.disliked.length) {
      const blocked = need.sets.filter(s => s.some(x => p.disliked.includes(x))).length;
      const X = blocked === need.sets.length ? -15 : blocked ? -5 : 0;
      if (X) rows.push({ f: "Môn không muốn học", d: (X === -15 ? "Mọi tổ hợp xét tuyển chính đều cần môn không muốn học: " : "Một số tổ hợp xét tuyển cần môn không muốn học: ") + need.subjects.filter(s => p.disliked.includes(s)).map(subjName).join(", "), v: X, max: 0 });
    }
    if (p.wish) { const W = wordsMatch(p.wish, c.name) ? 10 : 0; rows.push({ f: "Nguyện vọng của học sinh", d: W ? `“${p.wish}” trùng với ngành này` : `“${p.wish}” – không trùng`, v: W, max: 10 }); }
    if (p.familyWish) { const F = wordsMatch(p.familyWish, c.name) ? 5 : 0; rows.push({ f: "Mong muốn của gia đình", d: F ? `“${p.familyWish}” trùng với ngành này` : `“${p.familyWish}” – không trùng`, v: F, max: 5 }); }
    if (p.talents) {
      const tal = norm(p.talents);
      const hit = D.TALENT_KEYS.some(t => t.k.some(k => tal.includes(norm(k))) && t.groups.includes(c.group));
      rows.push({ f: "Năng khiếu, giải thưởng, CLB", d: hit ? `“${p.talents}” liên quan nhóm ${c.group}` : `“${p.talents}” – chưa thấy liên quan`, v: hit ? 5 : 0, max: 5 });
    }
    if (p.cond.econ === "Khó khăn" && LONG_PROGRAMS.includes(c.name)) notes.push("Thời gian đào tạo dài, chi phí cao – nên tìm hiểu học bổng, chính sách hỗ trợ.");
    if (p.cond.time === "Dưới 1 giờ" && ["Y đa khoa", "Răng – Hàm – Mặt", "Dược học"].includes(c.name)) notes.push("Ngành đòi hỏi khối lượng học lớn; thời gian tự học hiện còn ít.");
    if (p.health) notes.push(`Đã khai lưu ý sức khoẻ (“${p.health}”) – kiểm tra yêu cầu sức khoẻ của ngành.`);
    return { c, rows, notes, total: Math.round(clamp(rows.reduce((s, r) => s + r.v, 0), 0, 100)) };
  }
  function rankedCareers() { return D.CAREERS.map(careerAnalysis).sort((a, b) => b.total - a.total); }
  // Nhóm ngành phù hợp: nhóm của 6 ngành điểm cao nhất (như báo cáo H2) và nhóm có ngành đã “Thích”, xếp theo ngành tốt nhất của nhóm
  function suitableGroups(ranked = rankedCareers()) {
    const set = new Set(ranked.slice(0, 6).map(x => x.c.group));
    D.CAREERS.forEach(c => { if (S.careerFb[c.name] === "like") set.add(c.group); });
    return [...set].map(g => { const cs = ranked.filter(x => x.c.group === g); return { g, best: cs[0], n: cs.length, why: groupReasons(cs.map(x => x.c)) }; })
      .sort((a, b) => b.best.total - a.best.total);
  }
  // Đặc điểm ở Bước 1–2 khớp với nhóm ngành
  function groupReasons(cs) {
    const hs = hollandStats(), es = eysenckStats(), p = S.profile, out = [];
    if (hs.answered) { const L = hs.order.slice(0, 3).filter(x => cs.some(c => c.h.slice(0, 2).includes(x))); if (L.length) out.push("Sở thích Holland " + L.join(", ")); }
    if (es.usable) { const E = es.types.filter(k => cs.some(c => c.ey && c.ey[k])); if (E.length) out.push("Khí chất " + eyName(E) + " (Eysenck)"); }
    const strong = D.THCS.filter(s => !s.passFail && grade(s.key) != null && grade(s.key) >= 8 && cs.some(c => c.thcs.includes(s.key)));
    if (strong.length) out.push("Học tốt " + strong.slice(0, 3).map(s => thcsName(s.key).replace("KHTN – mạch ", "").replace("LS&ĐL – phân môn ", "").replace(" (Tiếng Anh)", "") + " " + gradeText(s.key)).join(", "));
    const liked = p.liked.filter(s => cs.some(c => careerNeeds(c).subjects.includes(s)));
    if (liked.length) out.push("Thích môn " + liked.map(subjName).join(", "));
    if (cs.some(c => S.careerFb[c.name] === "like")) out.push("Có ngành đã đánh dấu “Thích”");
    return out;
  }
  function priorityCareers() {
    const liked = D.CAREERS.filter(c => S.careerFb[c.name] === "like");
    if (liked.length) return liked;
    return rankedCareers().filter(x => S.careerFb[x.c.name] !== "no").slice(0, 3).map(x => x.c);
  }

  /* ================= BƯỚC 4 ================= */
  function subjInterest() {
    const hs = hollandStats(); const raw = {};
    D.SUBJECT_ORDER.forEach(s => {
      let v = 0.3;
      if (hs.answered) Object.keys(D.HOLLAND_SUBJ).forEach(L => v += 0.5 * (hs.sc[L] / 36) * (D.HOLLAND_SUBJ[L][s] || 0));
      if (S.profile.liked.includes(s)) v += 0.35;
      raw[s] = v;
    });
    const mx = Math.max(...Object.values(raw), 0.01); const out = {}; for (const s in raw) out[s] = clamp(raw[s] / mx, 0, 1);
    return out;
  }
  const openedToHop = subs => Object.keys(D.TO_HOP).filter(k => D.TO_HOP[k].sel.every(s => subs.includes(s)));
  function validate(subs, cd, school) {
    const issues = [];
    const r1 = subs.length === 4 && new Set(subs).size === 4 && subs.every(s => D.SUBJECTS[s]);
    if (!r1) issues.push("Cần đúng 4 môn khác nhau trong 9 môn lựa chọn (TT 13/2022).");
    let r2 = null;
    if (cd && cd.length) { r2 = cd.length === 3 && new Set(cd).size === 3 && cd.every(k => D.CHUYEN_DE[k]); if (!r2) issues.push("Cần 3 cụm chuyên đề của 3 môn khác nhau."); }
    let r3 = null;
    if (school) { r3 = !!school.combos.find(c => comboKey(c.subjects) === comboKey(subs)); if (!r3) issues.push("Tổ hợp không có trong danh sách của " + school.name + "."); }
    return { r1, r2, r3, issues, ok: !issues.length };
  }
  function analyzeCombo(subs, cd, school) {
    const v = validate(subs, cd, school);
    const opened = openedToHop(subs);
    const nonTrivial = opened.filter(k => (D.TO_HOP[k].sel.length > 0 && (!D.TO_HOP[k].bonus || subs.includes(D.TO_HOP[k].bonus))) || (D.TO_HOP[k].bonus && subs.includes(D.TO_HOP[k].bonus)));
    const careerRows = priorityCareers().map(c => { const op = c.th.filter(k => opened.includes(k)); const strong = c.th.filter(k => nonTrivial.includes(k)); return { c, op, strong, fit: c.th.length ? 0.5 * (strong.length ? 1 : 0) + 0.5 * (op.length / c.th.length) : 0 }; });
    const fitCareer = careerRows.length ? avg(careerRows.map(r => r.fit)) : 0.5;
    const ab = avg(subs.map(s => grade(D.SUBJECTS[s].thcs)));
    const inter = subjInterest();
    const parts = { career: Math.round(40 * fitCareer), ability: Math.round(30 * (ab == null ? 0.7 : ab / 10)), interest: Math.round(20 * avg(subs.map(s => inter[s]))), flex: Math.round(10 * Math.min(nonTrivial.length, 9) / 9) };
    const mustMissing = S.constraints.must.filter(m => !subs.includes(m));
    const notes = mustMissing.length ? ["Thiếu môn bắt buộc phải có: " + mustMissing.map(subjName).join(", ")] : [];
    const disliked = subs.filter(s => S.profile.disliked.includes(s));
    const total = Math.max(0, parts.career + parts.ability + parts.interest + parts.flex - 10 * mustMissing.length);
    const risks = [];
    subs.forEach(s => { const g = grade(D.SUBJECTS[s].thcs); if (g != null && g < 6.5) risks.push(`${subjName(s)}: kết quả lớp 9 còn thấp (${gradeText(D.SUBJECTS[s].thcs)}) – cần kế hoạch củng cố.`); });
    if (["li", "hoa", "sinh"].every(s => subs.includes(s))) risks.push("Có cả Lí, Hoá, Sinh: khối lượng khoa học tự nhiên nặng, cần quỹ thời gian tự học tốt.");
    if (subs.includes("an") || subs.includes("mt")) risks.push("Âm nhạc/Mĩ thuật không phải môn thi tốt nghiệp – cân nhắc nếu không theo khối năng khiếu.");
    const exam = ["Ngoại ngữ", "Lịch sử"].concat(subs.filter(s => D.SUBJECTS[s].examable).map(subjName));
    return { subs, cd, v, opened, nonTrivial, careerRows, parts, total, risks, exam, notes, disliked, mustMissing };
  }
  // Chỉ dùng tổ hợp trường công bố; loại hẳn tổ hợp có môn không muốn học; phù hợp nhất lên đầu
  function recommendForSchool(school) {
    const all = school.combos.map(c => ({ combo: c, a: analyzeCombo(c.subjects, c.cd, school) }));
    const ok = all.filter(x => !x.a.disliked.length).sort((x, y) => y.a.total - x.a.total);
    const blocked = all.filter(x => x.a.disliked.length).sort((x, y) => x.a.disliked.length - y.a.disliked.length || y.a.total - x.a.total);
    return { ok, blocked };
  }

  /* ================= THÔNG TIN CÒN THIẾU ================= */
  function missingFields() {
    const p = S.profile, m = [];
    const add = (step, t) => m.push({ step, t });
    if (!String(p.code || "").trim()) add(1, "Mã học sinh");
    if (!p.nickname) add(1, "Tên gọi");
    if (!p.schoolId || (p.schoolId === "__other" && !p.schoolOther)) add(1, "Trường THPT");
    ["toan", "van", "anh"].forEach(k => { if (grade(k) == null) add(1, "Điểm lớp 9 – " + thcsName(k)); });
    if (["khtn_li", "khtn_hoa", "khtn_sinh"].every(k => grade(k) == null)) add(1, "Điểm lớp 9 – KHTN");
    if (!p.wish) add(1, "Nguyện vọng ngành/nghề");
    const hs = hollandStats(), es = eysenckStats(), ms = mbtiStats();
    if (!hs.done) add(2, `Trắc nghiệm Holland (${hs.answered}/54)`);
    if (!es.done) add(2, `Trắc nghiệm nhân cách Eysenck (${es.answered}/${D.EYSENCK.length})`);
    if (!ms.done) add(2, `Trắc nghiệm tính cách MBTI (${ms.answered}/${D.MBTI.length})`);
    if (!Object.values(S.careerFb).includes("like")) add(3, "Chưa đánh dấu ngành “Thích”");
    if (!S.shortlist.length) add(4, "Chưa có phương án trong danh sách cân nhắc");
    if (!S.final.checks.talked) add(5, "Chưa xác nhận đã trao đổi với giáo viên, cha mẹ");
    if (!S.final.confirmed) add(6, "Chưa chốt phương án chính thức");
    if (!S.tracking.length) add(7, "Chưa có lần theo dõi");
    return m;
  }

  /* ================= TÓM TẮT ================= */
  function finalCombo() {
    if (!S.final.comboKey) return null;
    const sch = findSchool(S.final.schoolId);
    if (sch) { const c = sch.combos.find(c => comboKey(c.subjects) === S.final.comboKey); if (c) return c; }
    return { subjects: S.final.comboKey.split("+"), cd: S.final.cd || [] };
  }
  function schoolName() { const p = S.profile, sch = findSchool(p.schoolId); return sch ? sch.name : (p.schoolOther || ""); }
  function summaryText() {
    const p = S.profile, hs = hollandStats(), es = eysenckStats(), ms = mbtiStats(), st = strengthLists();
    const liked = D.CAREERS.filter(c => S.careerFb[c.name] === "like").map(c => c.name);
    const fc = finalCombo(), lt = S.tracking[S.tracking.length - 1];
    return ["[MÃ HỒ SƠ – Cổng thông tin tư vấn học sinh]",
      "Ngày: " + new Date().toLocaleDateString("vi-VN") + " | Mã HS: " + (p.code || "–") + " | Vai trò: " + (ROLE_NAME[S.role] || "chưa chọn") + " | Trường: " + (schoolName() || "chưa nhập"),
      "B1: mạnh " + (st.strong.join(", ") || "–") + " | cần cố gắng " + (st.weak.join(", ") || "–") + " | nguyện vọng: " + (p.wish || "–"),
      "B2: Holland " + (hs.answered ? hs.code + (hs.done ? "" : " (chưa đủ)") : "–") + " | Eysenck " + eyText(es) + " | MBTI " + mbtiText(ms),
      "B3: ngành ưu tiên " + (liked.join(", ") || "chưa chọn"),
      "B4: danh sách cân nhắc " + (S.shortlist.length ? S.shortlist.map(k => k.split("|")[1].split("+").map(subjShort).join("-")).join("; ") : "–"),
      "B6: phương án chốt " + (fc ? comboLabel(fc.subjects) : "–"),
      "B7: lần theo dõi gần nhất " + (lt ? lt.period : "–")].join("\n");
  }

  /* ================= KHUNG: STEPPER ================= */
  const STEPS = [
    { n: 1, t: "Thu thập dữ liệu nền", s: "Hồ sơ học sinh" },
    { n: 2, t: "Tâm lý – năng lực – sở thích", s: "Trắc nghiệm" },
    { n: 3, t: "Khám phá nghề nghiệp", s: "Ngành nghề tiềm năng" },
    { n: 4, t: "Gợi ý tổ hợp tại trường", s: "Theo danh sách của trường" },
    { n: 5, t: "Tư vấn GV – cha mẹ – HS", s: "Phiếu tóm tắt" },
    { n: 6, t: "Chốt nguyện vọng", s: "Kiểm tra hợp lệ" },
    { n: 7, t: "Theo dõi – điều chỉnh", s: "Lưu hồ sơ, cảnh báo sớm" }
  ];
  function stepDone(n) {
    switch (n) {
      case 1: return !!(S.profile.code || S.profile.nickname || Object.keys(S.profile.grades).length);
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
    $("#steps").innerHTML = "<ol>" + STEPS.map(st => { const d = stepDone(st.n); return `<li><button type="button" class="step-btn ${S.step === st.n ? "current" : ""}" data-go="${st.n}" ${S.step === st.n ? 'aria-current="step"' : ""}>
      <span class="step-num">${st.n}${d ? '<span class="step-done" title="Đã có dữ liệu">✓</span>' : ""}</span><span class="step-label">${esc(st.t)}<small>${esc(st.s)}</small></span></button></li>`; }).join("") + "</ol>";
    const pill = $("#rolePill");
    if (S.role) { pill.hidden = false; pill.textContent = ROLE_NAME[S.role]; } else pill.hidden = true;
    const tb = $("#teacherBtn"); if (tb) tb.textContent = SRV.on && SRV.token ? "Giáo viên ✓" : "Giáo viên";
  }
  const stepHead = (n, title, desc) => `<div class="step-head"><span class="big-num" aria-hidden="true">${n}</span><div><h2>Bước ${n}: ${esc(title)}</h2><p>${desc}</p></div></div>`;
  const navRow = (prev, next, nextLabel) => `<div class="nav-row">${prev != null ? `<button class="btn ghost" type="button" data-go="${prev}">Quay lại</button>` : "<span></span>"}${next != null ? `<button class="btn" type="button" data-go="${next}">${esc(nextLabel || "Sang bước " + next)}</button>` : ""}</div>`;

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
            ${["hs", "ph", "gv"].map(r => `<button type="button" class="role-card" data-action="role" data-role="${r}" aria-pressed="${S.role === r}"><strong>${ROLE_NAME[r]}</strong><span>${{ hs: "Tự khám phá và chọn tổ hợp", ph: "Đồng hành cùng con", gv: "Hỗ trợ tư vấn, quản lý hồ sơ" }[r]}</span></button>`).join("")}
          </div>
          <div class="row">
            <button class="btn" type="button" data-go="1" ${S.role ? "" : "disabled"}>${hasData ? "Tiếp tục hồ sơ" : "Bắt đầu Bước 1"}</button>
            <button class="btn ghost" type="button" data-action="open-profile-code">Nhập mã hồ sơ đã lưu</button>
            ${S.role === "gv" ? `<button class="btn ghost" type="button" data-go="8">Khu vực giáo viên</button>` : ""}
          </div>
          ${S.role ? "" : '<p class="small muted" style="margin-top:8px">Chọn vai trò để trợ lý tư vấn xưng hô cho phù hợp.</p>'}
        </div>
        <div>
          <p class="hand">Thử ngay: chạm 4 ô để xem tổ hợp xét tuyển nào được mở.</p>
          ${boardHTML(S.ui.heroPick || [])}
          <div class="doors">${heroDoors(S.ui.heroPick || [])}</div>
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
  function boardHTML(picked) {
    return `<div class="board" role="group" aria-label="9 môn học lựa chọn">${D.SUBJECT_ORDER.map(k => {
      const s = D.SUBJECTS[k], on = picked.includes(k), dis = !on && picked.length >= 4;
      return `<button type="button" class="tile" style="--c:${s.color}" data-action="tile" data-k="${k}" data-fid="tile-${k}" aria-pressed="${on}" ${dis ? "disabled" : ""}>${esc(s.name)}<small>${s.examable ? "Được chọn thi TN" : "Không thi TN"}</small></button>`;
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
    const p = S.profile, st = strengthLists();
    const sel = (path, opts) => `<select id="${path.replace(/\./g, "-")}" data-bind="${path}">${opts.map(o => `<option value="${esc(o)}" ${getPath(path) === o ? "selected" : ""}>${esc(o || "– Chọn –")}</option>`).join("")}</select>`;
    return `<section class="sheet">
      ${stepHead(1, "Thu thập dữ liệu nền", T("Cho mình biết một chút về bạn. Chỉ cần tên gọi, không cần họ tên đầy đủ. Các câu hỏi về gia đình có thể bỏ qua.", "Nhập thông tin của học sinh. Chỉ cần tên gọi, không cần họ tên đầy đủ. Các câu hỏi về gia đình có thể bỏ qua."))}
      <fieldset><legend>Thông tin chung</legend>
        <div class="grid-3">
          <div class="field"><label for="f-code">Mã học sinh</label>
            <div class="row" style="gap:6px;flex-wrap:nowrap"><input id="f-code" type="text" data-bind="profile.code" value="${esc(p.code)}" placeholder="VD: 0123456789" autocomplete="off"><button type="button" class="btn ghost small" data-action="load-by-code" title="Mở hồ sơ đã lưu theo mã">Mở</button></div>
            <span class="hint">Nhập tay. Dùng để lưu hồ sơ và khớp kết quả khảo sát Google Form.</span></div>
          <div class="field"><label for="f-nick">Tên gọi</label><input id="f-nick" type="text" data-bind="profile.nickname" value="${esc(p.nickname)}" placeholder="VD: Minh"></div>
          <div class="field"><label for="f-class">Lớp</label><input id="f-class" type="text" data-bind="profile.className" value="${esc(p.className)}" placeholder="VD: 10A3"></div>
          <div class="field"><label for="f-school">Trường THPT</label>
            <select id="f-school" data-bind="profile.schoolId" data-rerender="1"><option value="">– Chọn trường –</option>${allSchools().map(s => `<option value="${s.id}" ${p.schoolId === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}<option value="__other" ${p.schoolId === "__other" ? "selected" : ""}>Trường khác…</option></select></div>
          <div class="field"><label for="f-prov">Tỉnh/thành</label><input id="f-prov" type="text" data-bind="profile.province" value="${esc(p.province)}" placeholder="VD: Hà Nội"></div>
        </div>
        ${p.schoolId === "__other" ? `<div class="field" style="margin-top:10px"><label for="f-other">Tên trường</label><input id="f-other" type="text" data-bind="profile.schoolOther" value="${esc(p.schoolOther)}" placeholder="VD: THPT …"><span class="hint">Thêm danh sách tổ hợp của trường ở Bước 4 (lấy từ website trường hoặc nhập tay).</span></div>` : ""}
      </fieldset>
      <fieldset><legend>Kết quả học tập lớp 9</legend>
        <p class="small muted">Nhập điểm trung bình cả năm (thang 10). Âm nhạc, Mĩ thuật đánh giá Đạt / Chưa đạt. Bỏ trống môn không nhớ.</p>
        <div class="grades">${D.THCS.map(s => s.passFail
          ? `<div class="field"><label for="g-${s.key}">${esc(s.name)}</label><select id="g-${s.key}" data-bind="profile.grades.${s.key}" style="width:120px">${["", "Đạt", "Chưa đạt"].map(o => `<option value="${o}" ${(p.grades[s.key] || "") === o ? "selected" : ""}>${o || "–"}</option>`).join("")}</select></div>`
          : `<div class="field"><label for="g-${s.key}">${esc(s.name)}</label><input id="g-${s.key}" type="number" min="0" max="10" step="0.1" inputmode="decimal" data-bind="profile.grades.${s.key}" value="${esc(p.grades[s.key] ?? "")}"></div>`).join("")}</div>
        <div class="grid-2" style="margin-top:12px">
          <div class="field"><label for="f-exam">Tổng điểm thi vào lớp 10 (nếu có)</label><input id="f-exam" type="text" data-bind="profile.exam10" value="${esc(p.exam10)}"></div>
          <div class="field"><label for="f-tal">Năng khiếu, giải thưởng, câu lạc bộ</label><input id="f-tal" type="text" data-bind="profile.talents" value="${esc(p.talents)}" placeholder="VD: CLB robot, giải vẽ cấp quận"></div>
        </div>
      </fieldset>
      <fieldset><legend>Sở thích môn học</legend>
        <div class="field"><span class="label">${T("Môn lựa chọn bạn thích", "Môn lựa chọn học sinh thích")}</span><div class="chips">${D.SUBJECT_ORDER.map(k => `<button type="button" class="chip" data-action="toggle-arr" data-path="profile.liked" data-k="${k}" data-fid="liked-${k}" aria-pressed="${p.liked.includes(k)}">${esc(D.SUBJECTS[k].name)}</button>`).join("")}</div></div>
        <div class="field" style="margin-top:12px"><span class="label">${T("Môn bạn không muốn học", "Môn học sinh không muốn học")}</span><div class="chips">${D.SUBJECT_ORDER.map(k => `<button type="button" class="chip bad" data-action="toggle-arr" data-path="profile.disliked" data-k="${k}" data-fid="disliked-${k}" aria-pressed="${p.disliked.includes(k)}">${esc(D.SUBJECTS[k].name)}</button>`).join("")}</div>
          <span class="hint">Tổ hợp có môn này sẽ không được gợi ý ở Bước 4.</span></div>
      </fieldset>
      <fieldset><legend>Điều kiện (không bắt buộc)</legend>
        <div class="grid-2">
          <div class="field"><label for="profile-cond-extra">Khả năng học thêm ngoài giờ</label>${sel("profile.cond.extra", ["", "Thuận lợi", "Có thể, hạn chế", "Khó khăn", "Không muốn chia sẻ"])}</div>
          <div class="field"><label for="profile-cond-time">Thời gian tự học mỗi ngày</label>${sel("profile.cond.time", ["", "Dưới 1 giờ", "1–2 giờ", "Trên 2 giờ"])}</div>
          <div class="field"><label for="profile-cond-device">Có máy tính ở nhà</label>${sel("profile.cond.device", ["", "Có", "Không", "Dùng chung"])}</div>
          <div class="field"><label for="profile-cond-econ">Điều kiện kinh tế gia đình</label>${sel("profile.cond.econ", ["", "Thuận lợi", "Bình thường", "Khó khăn", "Không muốn chia sẻ"])}</div>
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
        <p><b>Mã HS:</b> ${esc(p.code || "chưa nhập")} · <b>Lớp:</b> ${esc(p.className || "–")}<br>
        <b>Môn mạnh (≥ 8):</b> ${esc(st.strong.join(", ") || "chưa có dữ liệu")}<br>
        <b>Trung bình:</b> ${esc(st.mid.join(", ") || "–")}<br>
        <b>Cần cố gắng:</b> ${esc(st.weak.join(", ") || "–")}<br>
        <b>Nguyện vọng:</b> ${esc(p.wish || "–")} · <b>Gia đình:</b> ${esc(p.familyWish || "–")}</p>
      </div>
      ${navRow(0, 2)}
    </section>`;
  }

  /* ================= BƯỚC 2 ================= */
  function viewStep2() {
    const tab = S.ui.testTab;
    const hs = hollandStats(), es = eysenckStats(), ms = mbtiStats();
    const tabs = [["holland", "Holland", `${hs.answered}/54`], ["eysenck", "Nhân cách Eysenck", `${es.answered}/${D.EYSENCK.length}`], ["mbti", "Tính cách MBTI", `${ms.answered}/${D.MBTI.length}`], ["result", "Báo cáo", ""]];
    const body = tab === "eysenck" ? testEysenck(es) : tab === "mbti" ? testMbti(ms) : tab === "result" ? reportH2() : testHolland(hs);
    return `<section class="sheet">
      ${stepHead(2, "Đánh giá tâm lý – năng lực – sở thích", "Không có câu đúng hay sai. Kết quả chỉ để tham khảo, giúp hiểu bản thân hơn – không phải chẩn đoán.")}
      <div class="tabs" role="tablist">${tabs.map(([k, n, c]) => `<button type="button" class="tab" role="tab" aria-selected="${(tab || "holland") === k}" data-action="test-tab" data-tab="${k}">${n}${c ? `<span class="count">${c}</span>` : ""}</button>`).join("")}</div>
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
      <div class="row no-print"><button type="button" class="btn ghost small" data-action="fill-demo" data-test="holland">Điền ngẫu nhiên (để thử demo)</button><span class="spacer"></span>${hs.done ? `<button type="button" class="btn" data-action="test-tab" data-tab="eysenck">Tiếp: Nhân cách Eysenck</button>` : ""}</div>`;
  }
  // Không hiện điểm từng thang khi đang làm (tài liệu MBTI dặn không xem bảng điểm trước khi làm xong)
  function testEysenck(es) {
    const N = D.EYSENCK.length;
    return `<p>Chọn <b>Có</b> nếu câu hỏi đúng với bạn, <b>Không</b> nếu không đúng. Cố gắng dùng câu trả lời đầu tiên xuất hiện trong đầu, trả lời liên tục, trung thực, không bỏ câu nào. Với câu không quen thuộc, hãy trả lời theo cách nghĩ của mình. Tốc độ khoảng 2–3 câu một phút.</p>
      ${prog(es.answered, N)}
      <div class="q-group">${D.EYSENCK.map((it, i) => `<div class="q"><span class="q-text">${i + 1}. ${esc(it)}</span><span class="scale yn" role="group" aria-label="Câu ${i + 1}">${[["+", "Có", "y"], ["-", "Không", "n"]].map(([v, l, f]) => `<button type="button" data-action="ey" data-i="${i}" data-v="${v}" data-fid="ey-${i}-${f}" aria-pressed="${S.tests.eysenck[i] === v}">${l}</button>`).join("")}</span></div>`).join("")}</div>
      <div class="row no-print"><button type="button" class="btn ghost small" data-action="fill-demo" data-test="eysenck">Điền ngẫu nhiên (để thử demo)</button><span class="spacer"></span>${es.done ? `<button type="button" class="btn" data-action="test-tab" data-tab="mbti">Tiếp: Tính cách MBTI</button>` : ""}</div>`;
  }
  function testMbti(ms) {
    const N = D.MBTI.length;
    return `<p>Mỗi câu chọn <b>một</b> phương án phù hợp hơn với bạn. Không có câu trả lời đúng hay sai; chỉ đọc và chọn, không nên phân tích quá nhiều vì sẽ khiến kết quả kém chính xác. Thời gian khoảng 20 phút.</p>
      ${prog(ms.answered, N)}
      ${D.MBTI.map(([q, a, b], i) => `<div class="mb-q"><p class="q-text"><b>Câu ${i + 1}.</b> ${esc(q)}</p><div class="ab" role="group" aria-label="Câu ${i + 1}">${[["a", a], ["b", b]].map(([x, t]) => `<button type="button" data-action="mbti" data-i="${i}" data-v="${x}" data-fid="mbti-${i}-${x}" aria-pressed="${S.tests.mbti[i] === x}">${x}. ${esc(t)}</button>`).join("")}</div></div>`).join("")}
      <div class="row no-print"><button type="button" class="btn ghost small" data-action="fill-demo" data-test="mbti">Điền ngẫu nhiên (để thử demo)</button><span class="spacer"></span>${ms.done ? `<button type="button" class="btn" data-action="test-tab" data-tab="result">Xem báo cáo</button>` : ""}</div>`;
  }
  const bars = (rows, max) => `<div class="bars">${rows.map(([lab, val]) => `<div class="bar"><span>${esc(lab)}</span><span class="bar-track"><span class="bar-fill" style="width:${clamp(val / max * 100, 0, 100)}%"></span></span><span class="bar-val">${val}</span></div>`).join("")}</div>`;
  // Biểu đồ khí chất như trong tài liệu: trục ngang HN, trục dọc KOD, thang 0–24, tâm 12
  function eysenckChart(es) {
    const X = v => 70 + clamp(v, 0, 24) / 24 * 200, Y = v => 230 - clamp(v, 0, 24) / 24 * 200;
    const q = (x, y, k) => `<text x="${x}" y="${y}" class="ey-q${es.types.includes(k) ? " on" : ""}">${D.EYSENCK_TYPES[k].name}</text>`;
    return `<figure class="ey-chart"><svg viewBox="0 0 356 256" role="img" aria-label="Biểu đồ khí chất: hướng ngoại ${es.sc.HN}, không ổn định ${es.sc.KOD}, thuộc ô ${esc(eyName(es.types))}">
      <circle cx="170" cy="130" r="100" class="ey-ring"/>
      <line x1="62" y1="130" x2="278" y2="130" class="ey-ax"/><line x1="170" y1="24" x2="170" y2="236" class="ey-ax"/>
      <text x="170" y="16" class="ey-lab" text-anchor="middle">Không ổn định</text><text x="170" y="252" class="ey-lab" text-anchor="middle">Ổn định</text>
      <text x="58" y="134" class="ey-lab" text-anchor="end">Hướng nội</text><text x="282" y="134" class="ey-lab">Hướng ngoại</text>
      ${q(122, 84, "uuTu")}${q(218, 84, "nongNay")}${q(122, 184, "binhThan")}${q(218, 184, "hangHai")}
      <circle cx="${X(es.sc.HN)}" cy="${Y(es.sc.KOD)}" r="6" class="ey-pt"/>
    </svg></figure>`;
  }
  function eysenckReport(es) {
    if (!es.answered) return `<p class="muted">Chưa làm.</p>`;
    if (!es.done) return `<p class="muted">Mới trả lời ${es.answered}/${D.EYSENCK.length} câu – cần trả lời đủ để tính kết quả.</p>`;
    const typeHTML = k => { const t = D.EYSENCK_TYPES[k]; return `<p class="small"><b>Khí chất ${esc(t.name)}</b> (${esc(t.axis)}):</p><ul class="small">${t.traits.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="small"><b>Công việc phù hợp (theo tài liệu):</b> ${esc(t.jobs)}.</p>`; };
    return `<div class="code-big" style="font-size:1.8rem">${esc(eyName(es.types))}</div>
      <p class="small muted">HN (hướng ngoại) ${es.sc.HN}/25 · KOD (không ổn định) ${es.sc.KOD}/25 · S (thành thật) ${es.sc.S}/9</p>
      ${eysenckChart(es)}
      ${es.lowS ? `<div class="callout warn"><p>Điểm thành thật thấp (${es.sc.S}/9): có thể đã chọn theo điều “nên như thế” hơn là điều thật sự đúng với ${T("bạn", "học sinh")}. Nên làm lại hoặc trao đổi với giáo viên; kết quả này chưa được dùng để chấm ngành.</p></div>` : ""}
      ${es.types.length > 1 ? `<p class="small">Điểm nằm đúng trên ranh giới (${D.EYSENCK_MID}) nên mang nét của ${es.types.length} kiểu khí chất.</p>` : ""}
      ${es.types.map(typeHTML).join("")}
      <p class="small muted">Không có kiểu khí chất tốt hay xấu; mô tả chỉ là xu hướng và có thể thay đổi qua rèn luyện, hoàn cảnh.</p>`;
  }
  function mbtiReport(ms) {
    if (!ms.answered) return `<p class="muted">Chưa làm.</p>`;
    if (!ms.done) return `<p class="muted">Mới trả lời ${ms.answered}/${D.MBTI.length} câu – cần trả lời đủ để tính kết quả.</p>`;
    return `<div class="code-big" style="font-size:1.8rem">${esc(ms.type)}</div>
      <div class="table-wrap"><table class="t"><thead><tr><th>Chiều</th><th>Điểm</th><th>Nghiêng về</th></tr></thead><tbody>
        ${D.MBTI_DIMS.map(d => { const r = ms.res[d.dim]; return `<tr><td>${esc(d.label)}</td><td class="nowrap">${d.a} ${r.a} – ${d.b} ${r.b}</td><td>${r.letter.length > 1 ? `cân bằng giữa ${d.a} và ${d.b}` : esc(D.MBTI_DESC[r.letter])}</td></tr>`; }).join("")}
      </tbody></table></div>
      <p class="small muted">Tài liệu MBTI chỉ hướng dẫn cách tính 4 chữ cái, không kèm gợi ý ngành nghề, nên kết quả này dùng để hiểu bản thân và không tính vào điểm ngành. Đây là bản trắc nghiệm phổ biến, không phải bộ MBTI® chính thức.</p>`;
  }
  function reportH2() {
    const hs = hollandStats(), es = eysenckStats(), ms = mbtiStats(), st = strengthLists();
    if (!hs.answered && !es.answered && !ms.answered) return `<div class="callout info"><p>Chưa có dữ liệu. Hãy bắt đầu với tab Holland.</p></div>`;
    const top = hs.order[0] ? D.HOLLAND.find(g => g.key === hs.order[0]) : null;
    const groups = suitableGroups().map(x => x.g);
    const flags = [];
    if (hs.flat) flags.push("Điểm các nhóm sở thích Holland khá sát nhau hoặc đều thấp – nên gặp giáo viên tư vấn để khám phá thêm.");
    if (es.lowS) flags.push("Điểm thành thật của trắc nghiệm Eysenck thấp – nên làm lại hoặc trao đổi với giáo viên.");
    return `<h3>Báo cáo tâm lý – năng lực (H2)</h3><p class="muted small">Chỉ mang tính tham khảo.</p>
      <div class="grid-2">
        <div><h4>1. Sở thích nghề nghiệp (Holland)</h4>
          ${hs.answered ? `<div class="code-big">${hs.code}</div>${hs.done ? "" : `<p class="small muted">Mới trả lời ${hs.answered}/54 câu – kết quả chưa đầy đủ.</p>`}${bars(D.HOLLAND.map(g => [g.key + " – " + g.name.split("–")[1].trim(), hs.sc[g.key]]), 36)}
          ${top ? `<p class="small" style="margin-top:10px"><b>${esc(top.name)}:</b> ${esc(top.desc)}</p><p class="small"><b>Ngành nghề gợi ý:</b> ${esc(top.jobs)}</p>` : ""}` : `<p class="muted">Chưa làm.</p>`}
        </div>
        <div><h4>2. Nhân cách (Eysenck)</h4>${eysenckReport(es)}</div>
      </div>
      <hr class="rule">
      <div class="grid-2">
        <div><h4>3. Tính cách (MBTI)</h4>${mbtiReport(ms)}</div>
        <div><h4>4. Năng lực học tập (từ Bước 1)</h4><p class="small"><b>Mạnh:</b> ${esc(st.strong.join(", ") || "–")}<br><b>Cần cố gắng:</b> ${esc(st.weak.join(", ") || "–")}</p>
          <h4>5. Nhóm ngành gợi ý ban đầu</h4><p class="small">${esc(groups.join(", "))}</p>
          <h4>6. Có cần giáo viên tư vấn thêm?</h4>
          ${flags.length ? flags.map(f => `<div class="callout warn"><p>${f}</p></div>`).join("") : `<p class="small">${hs.done ? "Chưa thấy dấu hiệu cần hỗ trợ thêm." : "Hoàn thành Holland để đánh giá."}</p>`}
        </div>
      </div>`;
  }

  /* ================= BƯỚC 3 ================= */
  function viewStep3() {
    const hs = hollandStats(), ranked = rankedCareers(), sg = suitableGroups(ranked);
    const fitGroups = sg.map(x => x.g), otherGroups = [...new Set(D.CAREERS.map(c => c.group))].filter(g => !fitGroups.includes(g));
    const groups = S.ui.showOtherGroups ? fitGroups.concat(otherGroups) : fitGroups;
    let list = ranked.filter(x => groups.includes(x.c.group));
    if (groups.includes(S.careerGroup)) list = list.filter(x => x.c.group === S.careerGroup);
    const show = S.ui.showAllCareers ? list : list.slice(0, 10);
    const liked = D.CAREERS.filter(c => S.careerFb[c.name] === "like");
    return `<section class="sheet">
      ${stepHead(3, "Khám phá nghề nghiệp – ngành học", "Chỉ hiện các nhóm ngành phù hợp với đặc điểm ở Bước 1 và Bước 2: trắc nghiệm, điểm lớp 9, môn thích và không muốn học, nguyện vọng, mong muốn gia đình, năng khiếu. Bấm “Vì sao gợi ý ngành này?” để xem từng yếu tố.")}
      ${hs.answered ? "" : `<div class="callout warn"><p>Chưa có kết quả Holland nên phần sở thích đang tạm tính mức trung bình – nhóm ngành gợi ý chưa chính xác. <button type="button" class="btn small ghost" data-go="2">Làm trắc nghiệm</button></p></div>`}
      <h3>Nhóm ngành phù hợp với ${T("bạn", "học sinh")}</h3>
      <div class="group-cards" role="group" aria-label="Nhóm ngành phù hợp">${sg.map(x => `<button type="button" class="group-card" data-action="pick-group" data-g="${esc(x.g)}" data-fid="grp-${esc(x.g)}" aria-pressed="${S.careerGroup === x.g}">
        <strong>${esc(x.g)}</strong><span class="small">Ngành hợp nhất: ${esc(x.best.c.name)} – ${x.best.total}%</span>
        <span class="small muted">${esc(x.why.join(" · ") || "Điểm tổng hợp cao nhất trong các nhóm ngành")}</span></button>`).join("")}</div>
      <div class="row" style="margin-bottom:14px">
        <label for="grp" class="small"><b>Lọc theo nhóm ngành</b></label>
        <select id="grp" data-bind="careerGroup" data-rerender="1" style="max-width:260px"><option value="">${S.ui.showOtherGroups ? "Tất cả nhóm ngành" : "Tất cả nhóm phù hợp"}</option>${groups.map(g => `<option ${S.careerGroup === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>
        <button type="button" class="btn ghost small" data-action="toggle-other-groups" aria-expanded="${!!S.ui.showOtherGroups}">${S.ui.showOtherGroups ? "Chỉ xem nhóm phù hợp" : `Xem thêm ${otherGroups.length} nhóm ngành khác`}</button>
        <span class="spacer"></span>
        <button type="button" class="btn ghost small" data-action="toggle-diagram" aria-expanded="${!!S.ui.showDiagram}">${S.ui.showDiagram ? "Ẩn sơ đồ liên kết" : "Xem sơ đồ liên kết"}</button>
      </div>
      ${S.ui.showDiagram ? diagramHTML(list.slice(0, 8)) : ""}
      ${show.map(careerCard).join("")}
      ${list.length > 10 ? `<div class="row" style="margin-top:12px"><button type="button" class="btn ghost small" data-action="toggle-all-careers">${S.ui.showAllCareers ? "Thu gọn" : "Xem tất cả " + list.length + " ngành"}</button></div>` : ""}
      <hr class="rule">
      <h3>Danh sách ngành nghề tiềm năng (H3)</h3>
      ${liked.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Ngành</th><th>Nhóm</th><th>Phù hợp</th><th>Tổ hợp xét tuyển tham khảo</th><th>Môn lựa chọn nên có</th></tr></thead><tbody>
        ${liked.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.group)}</td><td>${careerAnalysis(c).total}%</td><td>${c.th.join(", ")}</td><td>${esc(mustSubjectsText(c))}</td></tr>`).join("")}</tbody></table></div>
        <p class="small muted" style="margin-top:8px">Tổ hợp xét tuyển thay đổi theo năm và từng trường đại học – cần kiểm tra đề án tuyển sinh mới nhất.</p>`
        : `<p class="muted">Chưa đánh dấu ngành nào. ${hs.flat ? "Nếu vẫn chưa xác định được, nên gặp giáo viên tư vấn thêm." : ""}</p>`}
      ${navRow(2, 4)}
    </section>`;
  }
  function careerCard(a) {
    const c = a.c, open = S.ui.openWhy.includes(c.name);
    return `<article class="career">
      <div class="career-top"><h4>${esc(c.name)}</h4><span class="fit">${a.total}% phù hợp</span></div>
      <p class="small" style="margin:4px 0 6px"><span class="tag">${esc(c.group)}</span><span class="tag">Holland ${c.h}</span></p>
      <p class="small" style="margin-bottom:4px">${esc(c.desc)}</p>
      <p class="small muted" style="margin:0">Tổ hợp xét tuyển hay gặp: ${c.th.map(k => `<b title="${esc(D.TO_HOP[k].label)}">${k}</b>`).join(", ")} · Môn lựa chọn nên có: ${esc(mustSubjectsText(c))}</p>
      <details class="why" data-why="${esc(c.name)}" ${open ? "open" : ""}><summary>Vì sao gợi ý ngành này?</summary>
        <div class="table-wrap"><table class="t why-t"><thead><tr><th>Yếu tố</th><th>Dữ liệu đã dùng</th><th class="num">Điểm</th></tr></thead><tbody>
        ${a.rows.map(r => `<tr><td>${esc(r.f)}</td><td>${esc(r.d)}</td><td class="num ${r.v < 0 ? "neg" : ""}">${r.v < 0 ? "−" : "+"}${fmt(Math.abs(r.v), 1)}${r.max ? `<span class="muted">/${r.max}</span>` : ""}</td></tr>`).join("")}
        <tr class="tot"><td colspan="2">Tổng (tối đa 100)</td><td class="num">${a.total}</td></tr></tbody></table></div>
        ${a.notes.length ? `<ul class="small why-notes">${a.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      </details>
      <div class="fb" role="group" aria-label="Đánh giá ngành">${[["like", "Thích"], ["maybe", "Phân vân"], ["no", "Không hợp"]].map(([v, l]) => `<button type="button" class="${v}" data-action="cfb" data-name="${esc(c.name)}" data-v="${v}" aria-pressed="${S.careerFb[c.name] === v}">${l}</button>`).join("")}</div>
    </article>`;
  }
  function mustSubjectsText(c) { const n = careerNeeds(c).subjects; return n.length ? n.map(subjName).join(", ") : "không bắt buộc môn lựa chọn (năng khiếu hoặc D01…)"; }

  // Sơ đồ liên kết 3 cột: điểm mạnh & sở thích → nhóm ngành → ngành
  function diagramHTML(top) {
    const hs = hollandStats(), es = eysenckStats(), p = S.profile;
    const left = [];
    if (hs.answered) hs.order.slice(0, 3).forEach(L => left.push({ label: "Holland " + L, kind: "h", L }));
    if (es.usable) left.push({ label: "Khí chất " + eyName(es.types), kind: "e" });
    D.THCS.filter(s => !s.passFail && grade(s.key) != null && grade(s.key) >= 8).sort((a, b) => grade(b.key) - grade(a.key)).slice(0, 3)
      .forEach(s => left.push({ label: s.name.replace("KHTN – mạch ", "").replace("LS&ĐL – phân môn ", "").replace(" (Tiếng Anh)", "") + " " + fmt(grade(s.key)), kind: "s", key: s.key }));
    p.liked.slice(0, 2).forEach(s => left.push({ label: "Thích " + subjName(s), kind: "l", s }));
    if (!left.length || !top.length) return `<div class="callout info"><p>Chưa đủ dữ liệu để vẽ sơ đồ. Hãy nhập điểm ở Bước 1 và làm trắc nghiệm ở Bước 2.</p></div>`;
    const w = [0.5, 0.3, 0.2];
    const contrib = (node, c) => {
      if (node.kind === "h") { const i = c.h.indexOf(node.L); return i < 0 ? 0 : w[i] * hs.sc[node.L] / 36 * 40; }
      if (node.kind === "e") return c.ey && es.types.some(k => c.ey[k]) ? 10 : 0;
      if (node.kind === "s") return c.thcs.includes(node.key) ? grade(node.key) / 10 * 25 / c.thcs.length : 0;
      if (node.kind === "l") return careerNeeds(c).subjects.includes(node.s) ? 5 : 0;
      return 0;
    };
    const groups = [...new Set(top.map(a => a.c.group))];
    const W = 840, H = Math.max(left.length, groups.length, top.length) * 36 + 40;
    const x0 = 160, x1 = 370, x2 = 520;
    const yOf = (i, n) => 26 + (H - 52) * (n === 1 ? 0.5 : i / (n - 1));
    const lp = []; let maxL = 0;
    left.forEach((n, i) => groups.forEach((g, j) => { const v = top.filter(a => a.c.group === g).reduce((s, a) => s + contrib(n, a.c), 0); if (v > 0) { lp.push({ i, j, v }); maxL = Math.max(maxL, v); } }));
    const path = (xa, ya, xb, yb) => `M${xa},${ya} C${(xa + xb) / 2},${ya} ${(xa + xb) / 2},${yb} ${xb},${yb}`;
    return `<figure class="diagram">
      <figcaption class="small muted">Cột trái: điểm mạnh và sở thích của ${T("bạn", "học sinh")} · cột giữa: nhóm ngành · cột phải: 8 ngành phù hợp nhất. Nét càng đậm, yếu tố góp càng nhiều điểm.</figcaption>
      <div class="table-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sơ đồ liên kết giữa điểm mạnh, sở thích và ngành nghề" style="min-width:660px;width:100%">
        ${lp.map(l => `<path d="${path(x0, yOf(l.i, left.length), x1, yOf(l.j, groups.length))}" class="lk" stroke-width="${(1.5 + 9 * l.v / (maxL || 1)).toFixed(1)}"/>`).join("")}
        ${top.map((a, k) => `<path d="${path(x1, yOf(groups.indexOf(a.c.group), groups.length), x2, yOf(k, top.length))}" class="lk2" stroke-width="${(1 + 6 * a.total / 100).toFixed(1)}"/>`).join("")}
        ${left.map((n, i) => `<circle cx="${x0}" cy="${yOf(i, left.length)}" r="5" class="nd"/><text x="${x0 - 10}" y="${yOf(i, left.length) + 4}" text-anchor="end" class="tx">${esc(n.label)}</text>`).join("")}
        ${groups.map((g, j) => `<rect x="${x1 - 6}" y="${yOf(j, groups.length) - 9}" width="12" height="18" rx="3" class="nd2"/><text x="${x1}" y="${yOf(j, groups.length) - 14}" text-anchor="middle" class="tx tx-g">${esc(g)}</text>`).join("")}
        ${top.map((a, k) => `<circle cx="${x2}" cy="${yOf(k, top.length)}" r="5" class="nd"/><text x="${x2 + 10}" y="${yOf(k, top.length) + 4}" class="tx">${esc(a.c.name)} – ${a.total}%</text>`).join("")}
      </svg></div></figure>`;
  }

  /* ================= BƯỚC 4 ================= */
  function viewStep4() {
    const sid = S.ui.step4School || (S.profile.schoolId && S.profile.schoolId !== "__other" ? S.profile.schoolId : "");
    const school = findSchool(sid);
    const pcs = priorityCareers();
    let results = "";
    if (school) {
      const r = recommendForSchool(school);
      const list = r.ok.length ? r.ok : r.blocked.slice(0, 3);
      results = `<h3 style="margin-top:6px">Phương án đề xuất tại ${esc(school.name)} (H4)</h3>
        <p class="small muted">Chỉ dùng các tổ hợp trong danh sách của trường (${school.combos.length} tổ hợp; nguồn: ${esc(sourceText(school))}), xếp từ phù hợp nhất. Điểm tối đa 100 = Phù hợp ngành 40 + Năng lực 30 + Sở thích 20 + Linh hoạt 10.</p>
        ${!r.ok.length ? `<div class="callout warn"><p><b>Mọi tổ hợp của trường đều có môn ${T("bạn", "học sinh")} không muốn học.</b> Dưới đây là các tổ hợp ít vướng nhất – nên trao đổi với giáo viên trước khi quyết định.</p></div>` : ""}
        ${list.map((x, i) => planCard(x, i, school)).join("")}
        ${r.ok.length && r.blocked.length ? `<details class="excluded"><summary>${r.blocked.length} tổ hợp đã loại vì có môn không muốn học</summary><ul class="plain">${r.blocked.map(x => `<li class="row" style="gap:8px;margin:6px 0">${miniTiles(x.combo.subjects)}<span class="small muted">vướng: ${esc(x.a.disliked.map(subjName).join(", "))}</span></li>`).join("")}</ul></details>` : ""}`;
    }
    return `<section class="sheet">
      ${stepHead(4, "Gợi ý tổ hợp môn học tại trường", "Gợi ý chỉ lấy từ danh sách tổ hợp trường công bố – không ghép thêm môn. Tổ hợp có môn không muốn học bị loại.")}
      <div class="grid-2">
        <div class="field"><label for="s4-school">Trường</label>
          <select id="s4-school" data-bind="ui.step4School" data-rerender="1"><option value="">– Chọn trường –</option>${allSchools().map(s => `<option value="${s.id}" ${sid === s.id ? "selected" : ""}>${esc(s.name)}${s.demo ? "" : s.shared ? " · CSDL chung" : " · máy này"}</option>`).join("")}</select></div>
      </div>
      ${schoolEntryHTML(school)}
      <fieldset style="margin-top:16px"><legend>Ràng buộc cá nhân</legend>
        <div class="field"><span class="label">Môn bắt buộc phải có (theo ngành mục tiêu)</span><div class="chips">${D.SUBJECT_ORDER.map(k => `<button type="button" class="chip" data-action="toggle-arr" data-path="constraints.must" data-k="${k}" aria-pressed="${S.constraints.must.includes(k)}">${esc(D.SUBJECTS[k].name)}</button>`).join("")}</div></div>
        <div class="field" style="margin-top:10px"><span class="label">Môn không muốn học (đồng bộ với Bước 1 – tổ hợp có môn này bị loại)</span><div class="chips">${D.SUBJECT_ORDER.map(k => `<button type="button" class="chip bad" data-action="toggle-arr" data-path="profile.disliked" data-k="${k}" data-fid="disliked-${k}" aria-pressed="${S.profile.disliked.includes(k)}">${esc(D.SUBJECTS[k].name)}</button>`).join("")}</div></div>
        <p class="small muted" style="margin-top:10px">Ngành đang ưu tiên: <b>${esc(pcs.map(c => c.name).join(", ") || "chưa có")}</b> ${Object.values(S.careerFb).includes("like") ? "" : "(tạm lấy 3 ngành phù hợp nhất – đánh dấu “Thích” ở Bước 3 để chính xác hơn)"}</p>
      </fieldset>
      ${school ? results : `<div class="callout info"><p>Chọn trường trong danh sách, hoặc nhập tổ hợp của trường ${T("bạn", "học sinh")} ở ô “Nhập tổ hợp của trường THPT” phía trên.</p></div>`}
      <hr class="rule">
      <h3>Danh sách cân nhắc (${S.shortlist.length})</h3>
      ${S.shortlist.length ? `<ul class="plain">${S.shortlist.map(k => { const [scId, ck, cdk] = k.split("|"); const sc = findSchool(scId); return `<li class="row" style="margin-bottom:6px">${miniTiles(ck.split("+"), cdk ? cdk.split(",") : [])}<span class="small muted">${esc(sc ? sc.name : "")}</span><button type="button" class="btn ghost small" data-action="unshortlist" data-key="${esc(k)}">Bỏ</button></li>`; }).join("")}</ul>` : `<p class="muted small">Chưa có. Bấm “Đưa vào danh sách cân nhắc” trên phương án phù hợp.</p>`}
      ${navRow(3, 5)}
    </section>`;
  }
  // Ô nhập tổ hợp ngay tại Bước 4: trường đã nhập (không phải minh hoạ) thì sửa, còn lại thì thêm trường mới. Bản nháp lưu theo từng trường.
  function schoolEntryHTML(school) {
    const edit = school && !school.demo, dk = edit ? school.id : "new";
    const dr = (S.ui.s4draft || {})[dk] || {};
    const name = dr.name ?? (edit ? school.name : (S.profile.schoolId === "__other" ? S.profile.schoolOther : ""));
    const prov = dr.prov ?? (edit ? school.province || "" : S.profile.province);
    const text = dr.combos ?? (edit ? school.combos.map(comboLine).join("\n") : "");
    const CD = ["toan", "van", "su"].concat(D.SUBJECT_ORDER);
    return `<details class="school-entry" ${!school || dr.combos != null ? "open" : ""}><summary>${edit ? "Sửa danh sách tổ hợp của trường" : "Nhập tổ hợp của trường THPT"}</summary>
      <p class="small muted">Nhập đúng danh sách tổ hợp trường công bố (thường có trong thông báo tuyển sinh lớp 10 hoặc website trường).</p>
      <div class="grid-2"><div class="field"><label for="s4-name">Tên trường</label><input id="s4-name" type="text" data-bind="ui.s4draft.${dk}.name" value="${esc(name)}" placeholder="VD: THPT Yên Hoà"></div>
      <div class="field"><label for="s4-prov">Tỉnh/thành</label><input id="s4-prov" type="text" data-bind="ui.s4draft.${dk}.prov" value="${esc(prov)}" placeholder="VD: Hà Nội"></div></div>
      <div class="field" style="margin-top:10px"><span class="label">Thêm nhanh: chọn 4 môn lựa chọn</span><div class="chips" id="s4-subs">${D.SUBJECT_ORDER.map(k => `<button type="button" class="chip" data-action="s4-pick" data-k="${k}" data-max="4" aria-pressed="false">${esc(subjShort(k))}</button>`).join("")}</div></div>
      <div class="field" style="margin-top:8px"><span class="label">và 3 cụm chuyên đề (nếu trường đã công bố)</span><div class="chips" id="s4-cds">${CD.map(k => `<button type="button" class="chip" data-action="s4-pick" data-k="${k}" data-max="3" aria-pressed="false">${esc(CD_SHORT[k] || subjShort(k))}</button>`).join("")}</div></div>
      <div class="row" style="margin-top:8px"><button type="button" class="btn ghost small" data-action="s4-addline">Thêm dòng vào danh sách</button></div>
      <div class="field" style="margin-top:10px"><label for="s4-combos">Danh sách tổ hợp – mỗi dòng một tổ hợp</label>
        <textarea id="s4-combos" data-bind="ui.s4draft.${dk}.combos" rows="6" placeholder="Lí, Hoá, Sinh, Tin | Toán, Lí, Hoá&#10;Địa, KT&amp;PL, Tin, CN | Văn, Sử, Địa">${esc(text)}</textarea>
        <span class="hint">4 môn lựa chọn cách nhau bằng dấu phẩy; nếu có cụm chuyên đề thì thêm dấu | và 3 cụm. Viết tắt: Lí, Hoá, Sinh, Địa, Tin, CN, KT&amp;PL, Nhạc, Mĩ thuật; chuyên đề thêm Toán, Văn, Sử.</span></div>
      <p class="small" id="s4-msg" role="status"></p>
      <div class="row"><button type="button" class="btn" data-action="s4-save" data-id="${edit ? school.id : ""}">Lưu và gợi ý tổ hợp</button><button type="button" class="btn ghost small" data-action="${edit ? "edit-school" : "add-school"}" data-id="${edit ? school.id : ""}">Lấy từ website / dán thông báo của trường…</button></div>
    </details>`;
  }
  function s4Msg(t, bad) { const el = $("#s4-msg"); if (el) { el.textContent = t; el.style.color = bad ? "var(--bad)" : "var(--ok)"; } }
  function s4AddLine() {
    const picked = id => [...document.querySelectorAll(`#${id} [aria-pressed=true]`)].map(b => b.dataset.k);
    const subs = picked("s4-subs"), cd = picked("s4-cds");
    if (subs.length !== 4) { s4Msg(`Hãy chọn đúng 4 môn lựa chọn (đang chọn ${subs.length}).`, true); return; }
    if (cd.length && cd.length !== 3) { s4Msg(`Cụm chuyên đề cần đúng 3 (đang chọn ${cd.length}) – hoặc bỏ chọn hết nếu trường chưa công bố.`, true); return; }
    const ta = $("#s4-combos"), line = comboLine({ subjects: D.SUBJECT_ORDER.filter(s => subs.includes(s)), cd });
    ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + line;
    ta.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelectorAll("#s4-subs [aria-pressed], #s4-cds [aria-pressed]").forEach(b => b.setAttribute("aria-pressed", "false"));
    s4Msg("Đã thêm: " + line);
  }
  async function s4Save(id) {
    try {
      const r = await saveSchool({ existing: id ? findSchool(id) : null, name: $("#s4-name").value.trim(), province: $("#s4-prov").value.trim(), sourceUrl: id ? (findSchool(id) || {}).sourceUrl || "" : "", text: $("#s4-combos").value });
      if (S.ui.s4draft) delete S.ui.s4draft[id || "new"];
      save(); render(); toast(r.updated ? "Đã cập nhật trường" : "Đã lưu trường");
    } catch (e) { s4Msg(e.message, true); }
  }
  function sourceText(s) { if (s.demo) return "dữ liệu minh hoạ"; return (s.sourceUrl ? s.sourceUrl : "nhập tay") + (s.updatedAt ? ", cập nhật " + new Date(s.updatedAt).toLocaleDateString("vi-VN") : ""); }
  function planCard(r, i, school) {
    const a = r.a, c = r.combo, key = school.id + "|" + comboKey(c.subjects) + "|" + (c.cd || []).join(",");
    const inList = S.shortlist.includes(key);
    const closed = a.careerRows.filter(x => !x.strong.length).map(x => x.c.name);
    const warnList = (a.disliked.length ? ["Có môn không muốn học: " + a.disliked.map(subjName).join(", ")] : []).concat(a.notes, a.risks);
    return `<article class="plan ${i === 0 && !a.disliked.length ? "top" : ""}">
      <div class="plan-head"><span class="plan-rank">Phương án ${i + 1}${c.id ? " · mã " + esc(c.id) : ""}</span><span class="score-ring">${a.total}<small>/100</small></span></div>
      ${miniTiles(c.subjects, c.cd)}
      <div class="crit crit-4"><div>Phù hợp ngành<b>${a.parts.career}/40</b></div><div>Năng lực<b>${a.parts.ability}/30</b></div><div>Sở thích<b>${a.parts.interest}/20</b></div><div>Linh hoạt<b>${a.parts.flex}/10</b></div></div>
      <div class="plan-cols">
        <div><h5>Kiểm tra hợp lệ</h5><ul><li><span class="${a.v.r1 ? "check" : "cross"}">${a.v.r1 ? "✓" : "✗"}</span> 4 môn khác nhau (TT 13/2022)</li><li><span class="${a.v.r2 !== false ? "check" : "cross"}">${a.v.r2 !== false ? "✓" : "✗"}</span> 3 cụm chuyên đề${a.v.r2 == null ? " (trường chưa công bố)" : ""}</li><li><span class="check">✓</span> Có trong danh sách trường</li></ul>
          <h5>Mở ra</h5><ul><li>Tổ hợp xét tuyển: ${a.nonTrivial.map(k => `<b title="${esc(D.TO_HOP[k].label)}">${k}</b>`).join(", ") || "–"} (và D01, D14)</li><li>Môn có thể chọn thi tốt nghiệp: ${esc(a.exam.join(", "))}</li>
          ${a.careerRows.filter(x => x.strong.length).map(x => `<li>${esc(x.c.name)}: qua ${x.strong.join(", ")}</li>`).join("")}</ul></div>
        <div>${closed.length ? `<h5>Hạn chế</h5><ul><li>Không mở tổ hợp đặc thù cho: ${esc(closed.join(", "))}</li></ul>` : ""}
          <h5>Rủi ro & lưu ý</h5>${warnList.length ? `<ul>${warnList.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : `<p class="small">Chưa thấy rủi ro đáng kể từ dữ liệu hiện có.</p>`}</div>
      </div>
      <div class="row" style="margin-top:12px">
        <button type="button" class="btn small ${inList ? "ok" : ""}" data-action="shortlist" data-key="${esc(key)}">${inList ? "Đã trong danh sách cân nhắc" : "Đưa vào danh sách cân nhắc"}</button>
        <button type="button" class="btn ghost small" data-action="set-final" data-school="${school.id}" data-ck="${comboKey(c.subjects)}">Chọn làm phương án chính</button>
      </div>
    </article>`;
  }

  /* ================= BƯỚC 5 ================= */
  function questionsForMeeting() {
    const q = [], p = S.profile, hs = hollandStats();
    if (p.wish && p.familyWish && norm(p.wish) !== norm(p.familyWish)) q.push(`Nguyện vọng của học sinh (“${p.wish}”) và mong muốn của gia đình (“${p.familyWish}”) khác nhau – điểm chung nào giữa hai hướng này?`);
    if (hs.flat) q.push("Sở thích nghề nghiệp chưa rõ – có thể cho học sinh trải nghiệm hoạt động nào để khám phá thêm?");
    const weak = strengthLists().weak; if (weak.length) q.push("Với các môn còn yếu (" + weak.join(", ") + "), có nên tránh hay có kế hoạch củng cố?");
    if (p.disliked.length) q.push("Học sinh không muốn học " + p.disliked.map(subjName).join(", ") + " – lý do là gì, có ảnh hưởng đến ngành mục tiêu không?");
    q.push("Nếu không đỗ ngành ưu tiên, phương án dự phòng là gì?");
    q.push("Gia đình có đồng ý với phương án chính và hiểu rằng môn lựa chọn cần giữ ổn định đến hết lớp 12?");
    return q;
  }
  function viewStep5() {
    const p = S.profile, hs = hollandStats(), es = eysenckStats(), ms = mbtiStats(), st = strengthLists();
    const liked = D.CAREERS.filter(c => S.careerFb[c.name] === "like");
    const fc = finalCombo();
    return `<section class="sheet">
      ${stepHead(5, "Tư vấn giáo viên – cha mẹ – học sinh", "Đây là buổi trao đổi trực tiếp. Web chuẩn bị phiếu tóm tắt và câu hỏi gợi ý để buổi gặp hiệu quả hơn.")}
      <div class="callout info no-print"><p>${{ hs: "Bạn chỉ chia sẻ phiếu này với thầy cô và cha mẹ khi bạn đồng ý.", ph: "Anh/chị hãy cùng con xem phiếu trước buổi gặp và để con nói lên mong muốn của mình.", gv: "Thầy/cô có thể dùng phiếu như dữ liệu đầu vào; các con số chỉ mang tính tham khảo." }[S.role || "hs"]}</p></div>
      <div class="summary-doc" id="printArea">
        <h3>PHIẾU TÓM TẮT TƯ VẤN CHỌN MÔN LỚP 10 (H5)</h3>
        <p class="small">Học sinh: <b>${esc(p.nickname || "……")}</b> · Mã HS: <b>${esc(p.code || "……")}</b> · Lớp: ${esc(p.className || "……")} · Trường: <b>${esc(schoolName() || "……")}</b> · Ngày lập: ${new Date().toLocaleDateString("vi-VN")}</p>
        <h4>1. Học tập</h4><ul><li>Môn mạnh: ${esc(st.strong.join(", ") || "–")}</li><li>Cần cố gắng: ${esc(st.weak.join(", ") || "–")}</li><li>Năng khiếu/giải thưởng: ${esc(p.talents || "–")}</li></ul>
        <h4>2. Tâm lý – sở thích (tham khảo)</h4><ul><li>Holland: ${hs.answered ? "<b>" + hs.code + "</b>" + (hs.done ? "" : " (chưa đủ câu)") : "–"}</li><li>Nhân cách Eysenck: ${esc(eyText(es))}</li><li>Tính cách MBTI: ${esc(mbtiText(ms))}</li><li>Môn thích: ${esc(p.liked.map(subjName).join(", ") || "–")} · Không muốn học: ${esc(p.disliked.map(subjName).join(", ") || "–")}</li></ul>
        <h4>3. Nguyện vọng & ngành ưu tiên</h4><ul><li>Học sinh: ${esc(p.wish || "–")} · Gia đình: ${esc(p.familyWish || "–")}</li><li>Ngành ưu tiên: ${esc(liked.map(c => c.name + " (" + careerAnalysis(c).total + "%)").join(", ") || "chưa chọn")}</li></ul>
        <h4>4. Phương án đang cân nhắc</h4>
        ${S.shortlist.length ? `<ul>${S.shortlist.map(k => { const [scId, ck] = k.split("|"); const a = analyzeCombo(ck.split("+"), null, findSchool(scId)); return `<li>${esc(comboLabel(ck.split("+")))} – ${a.total}/100 – mở ${esc(a.nonTrivial.join(", ") || "–")}</li>`; }).join("")}</ul>` : "<p class='small'>Chưa có.</p>"}
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
      ${navRow(4, 6)}
    </section>`;
  }

  /* ================= BƯỚC 6 ================= */
  function viewStep6() {
    const fc = finalCombo(); const sch = findSchool(S.final.schoolId);
    const a = fc ? analyzeCombo(fc.subjects, fc.cd && fc.cd.length ? fc.cd : null, sch) : null;
    const auto = a ? a.v : null;
    const options = S.shortlist.map(k => { const [scId, ck] = k.split("|"); return { scId, ck }; });
    // Dự phòng = tổ hợp mở ≥ 2 ngành mục tiêu, hoặc còn phương án khác trong danh sách cân nhắc; chưa rõ thì để người dùng tự đánh dấu.
    const fitN = a ? a.careerRows.filter(r => r.strong.length).length : 0;
    const hasBackup = fitN >= 2 || !!fc && options.some(o => o.ck !== fc.comboKey || o.scId !== fc.schoolId);
    const careerAuto = !a ? null : !fitN ? false : hasBackup ? true : null;
    const items = [
      { k: "r1", t: "Đúng 4 môn lựa chọn, khác nhau, trong 9 môn (TT 13/2022)", auto: auto ? auto.r1 : null },
      { k: "r2", t: "3 cụm chuyên đề của 3 môn khác nhau, đúng theo tổ hợp của trường", auto: auto ? auto.r2 : null },
      { k: "r3", t: "Tổ hợp có trong danh sách trường công khai; đúng định hướng Công nghệ (công nghiệp/nông nghiệp) nếu có", auto: auto ? auto.r3 : null },
      { k: "career", t: "Phù hợp ít nhất 1 ngành mục tiêu và có phương án dự phòng", auto: careerAuto },
      { k: "parent", t: "Cha mẹ/người giám hộ đã biết và đồng ý" },
      { k: "deadline", t: "Biết thời hạn và cách nộp phiếu đăng ký của trường" },
      { k: "cv68", t: "Hiểu: giữ ổn định đến hết lớp 12; chỉ đổi vào cuối năm học, cần cam kết tự bổ sung kiến thức có xác nhận của cha mẹ và Hiệu trưởng đồng ý (CV 68)" }
    ];
    const allOk = fc && items.every(it => it.auto === false ? false : (it.auto === true || S.final.checks[it.k]));
    return `<section class="sheet">
      ${stepHead(6, "Chốt nguyện vọng và đăng ký chính thức", "Chọn phương án cuối cùng, kiểm tra hợp lệ trước khi điền phiếu đăng ký của trường.")}
      <div class="field"><span class="label">Phương án chính</span>
        ${fc ? `<div class="row">${miniTiles(fc.subjects, fc.cd)}<span class="small muted">${esc(sch ? sch.name : "")}</span><button type="button" class="btn ghost small" data-action="clear-final">Đổi phương án</button></div>`
          : options.length ? `<div class="chips">${options.map(o => `<button type="button" class="chip" data-action="set-final" data-school="${o.scId}" data-ck="${o.ck}">${esc(comboLabel(o.ck.split("+")))}</button>`).join("")}</div>`
          : `<p class="muted">Chưa có phương án trong danh sách cân nhắc. <button type="button" class="btn ghost small" data-go="4">Về Bước 4</button></p>`}
      </div>
      <h3 style="margin-top:18px">Danh sách kiểm tra</h3>
      <ul class="checklist">${items.map(it => `<li>${it.auto == null ? `<input type="checkbox" id="ck-${it.k}" data-action="check" data-k="${it.k}" ${S.final.checks[it.k] ? "checked" : ""}>` : `<span aria-hidden="true" class="${it.auto ? "check" : "cross"}" style="width:20px;text-align:center">${it.auto ? "✓" : "✗"}</span>`}
        ${it.auto == null ? `<label for="ck-${it.k}">${esc(it.t)}</label>` : `<span>${esc(it.t)}<span class="auto-flag ${it.auto ? "y" : "n"}">${it.auto ? "tự kiểm tra: đạt" : "tự kiểm tra: chưa đạt"}</span></span>`}</li>`).join("")}</ul>
      ${a && a.v.issues.length ? a.v.issues.map(t => `<div class="callout bad"><p>${esc(t)}</p></div>`).join("") : ""}
      ${a && a.disliked.length ? `<div class="callout warn"><p>Phương án có môn ${T("bạn", "học sinh")} không muốn học: ${esc(a.disliked.map(subjName).join(", "))}.</p></div>` : ""}
      <div class="row" style="margin-top:16px">
        <button type="button" class="btn ok" data-action="confirm-final" ${allOk ? "" : "disabled"}>${S.final.confirmed ? "Đã xác nhận phương án" : "Xác nhận phương án chính thức"}</button>
        ${allOk ? "" : '<span class="small muted">Hoàn thành tất cả mục để xác nhận.</span>'}
      </div>
      ${S.final.confirmed && fc ? `<div class="callout ok" style="margin-top:16px"><h4>Xác nhận phương án (H6)</h4><p>${esc(S.profile.nickname || "Học sinh")} chọn tổ hợp <b>${esc(comboLabel(fc.subjects))}</b>${fc.cd && fc.cd.length ? " với cụm chuyên đề " + esc(fc.cd.map(k => D.CHUYEN_DE[k]).join(", ")) : ""}. Hãy điền đúng phương án này vào phiếu đăng ký của trường.</p></div>` : ""}
      ${navRow(5, 7)}
    </section>`;
  }

  /* ================= BƯỚC 7 ================= */
  function warningsFor(entry, prev) {
    const w = [];
    Object.keys(entry.scores || {}).forEach(s => {
      const v = entry.scores[s];
      if (v != null && v < 5) w.push({ k: "bad", t: `${subjName(s)}: điểm ${fmt(v)} dưới 5,0.`, fix: "Gặp giáo viên bộ môn để xác định lỗ hổng kiến thức; lập kế hoạch tự học 2–3 buổi/tuần; tham gia nhóm học tập." });
      if (prev && prev.scores && prev.scores[s] != null && v != null && prev.scores[s] - v >= 1.5) w.push({ k: "warn", t: `${subjName(s)}: giảm ${fmt(prev.scores[s] - v)} điểm so với ${prev.period}.`, fix: "Xem lại phương pháp học, thời gian tự học và các yếu tố ảnh hưởng gần đây." });
    });
    Object.keys(entry.sat || {}).forEach(s => { if (entry.sat[s] != null && entry.sat[s] <= 2) w.push({ k: "warn", t: `${subjName(s)}: mức hài lòng thấp (${entry.sat[s]}/5).`, fix: "Trao đổi với GVCN về khó khăn; tìm cách học khiến môn học thú vị hơn (dự án, thực hành)." }); });
    if (entry.overall != null && entry.overall <= 2) w.push({ k: "warn", t: `Mức hài lòng chung với tổ hợp thấp (${entry.overall}/5).`, fix: "Nên gặp giáo viên tư vấn sớm để đánh giá lại." });
    if (entry.stress != null && entry.stress >= 4) w.push({ k: "bad", t: `Mức căng thẳng ${entry.stress >= 5 ? "rất cao" : "cao"} (${entry.stress}/5).`, fix: "Hãy chia sẻ với cha mẹ, GVCN hoặc tổ tư vấn tâm lý của trường. Nếu có lúc nghĩ đến việc làm hại bản thân, gọi ngay Tổng đài quốc gia bảo vệ trẻ em 111 (miễn phí, 24/7)." });
    return w;
  }
  const scaleRadios = (name, list) => `<div class="rubric" role="radiogroup">${list.map((t, i) => { const [head, ...rest] = t.split(" – "); return `<label class="rub"><input type="radio" name="${name}" value="${i + 1}"><span><b>${i + 1} · ${esc(head)}</b><small>${esc(rest.join(" – "))}</small></span></label>`; }).join("")}</div>`;
  function viewStep7() {
    const fc = finalCombo();
    const subs = fc ? fc.subjects : [];
    const last = S.tracking[S.tracking.length - 1], prev = S.tracking[S.tracking.length - 2];
    const warns = last ? warningsFor(last, prev) : [];
    const miss = missingFields();
    const histSubs = subs.length ? subs : [...new Set(S.tracking.flatMap(e => Object.keys(e.sat || {}).concat(Object.keys(e.scores || {}))))];
    return `<section class="sheet">
      ${stepHead(7, "Theo dõi – đánh giá – điều chỉnh", "Cập nhật kết quả vào cuối học kỳ 1 và cuối năm, hoặc nhập kết quả khảo sát Google Form ở Khu vực giáo viên. Lưu hồ sơ để lần tư vấn sau không phải nhập lại.")}
      <div class="save-bar no-print">
        <div><b>Hồ sơ ${esc(S.profile.code ? "mã " + S.profile.code : "– chưa có mã học sinh")}</b><span class="small muted">${miss.length ? `Còn ${miss.length} mục chưa đầy đủ – vẫn lưu được.` : "Đã đủ thông tin."}</span></div>
        <div class="row"><button type="button" class="btn" data-action="save-profile">Lưu hồ sơ</button><button type="button" class="btn ghost" data-go="8">Danh mục hồ sơ</button></div>
      </div>
      ${!fc ? `<div class="callout info"><p>Chưa có phương án chính thức nên chưa nhập theo dõi theo môn được. <button type="button" class="btn ghost small" data-go="6">Về Bước 6</button></p></div>` : `
      <form id="trackForm" class="no-print">
        <div class="field" style="max-width:280px"><label for="t-period">Thời điểm</label><select id="t-period" name="period">${D.PERIODS.map(x => `<option>${x}</option>`).join("")}</select></div>
        <div class="grid-2" style="margin-top:14px">
          <fieldset><legend>Mức hài lòng chung với tổ hợp</legend>${scaleRadios("overall", D.SATISFACTION)}</fieldset>
          <fieldset><legend>Mức căng thẳng trong học tập</legend>${scaleRadios("stress", D.STRESS)}</fieldset>
        </div>
        <div class="table-wrap"><table class="t"><thead><tr><th>Môn</th><th>Điểm TB (0–10)</th><th>Mức hài lòng với môn</th></tr></thead><tbody>
          ${subs.map(s => `<tr><td>${esc(subjName(s))}</td><td><input name="score-${s}" aria-label="Điểm TB ${esc(subjName(s))}" type="number" min="0" max="10" step="0.1" style="max-width:110px"></td><td><select name="sat-${s}" aria-label="Mức hài lòng với môn ${esc(subjName(s))}"><option value="">– Chọn –</option>${D.SUBJECT_SAT.map((t, i) => `<option value="${i + 1}">${i + 1} · ${esc(t.split(" – ")[0])}</option>`).join("")}</select></td></tr>`).join("")}
        </tbody></table></div>
        <details class="small" style="margin-top:8px"><summary>Cách chấm mức hài lòng với từng môn</summary><ul>${D.SUBJECT_SAT.map((t, i) => `<li><b>${i + 1}</b> – ${esc(t)}</li>`).join("")}</ul></details>
        <label class="row small" style="gap:6px;margin-top:10px"><input type="checkbox" name="wantChange"> ${T("Mình đang muốn đổi môn lựa chọn", "Học sinh đang muốn đổi môn lựa chọn")}</label>
        <div class="row" style="margin-top:12px"><button type="submit" class="btn">Ghi lần theo dõi</button></div>
      </form>`}
      ${last ? `<hr class="rule"><h3>Báo cáo theo dõi (H7) – ${esc(last.period)}${last.source === "form" ? " (từ Google Form)" : ""}</h3>
        ${warns.length ? warns.map(x => `<div class="callout ${x.k}"><p><b>${esc(x.t)}</b><br>${esc(x.fix)}</p></div>`).join("") : `<div class="callout ok"><p>Chưa có cảnh báo. Tiếp tục duy trì!</p></div>`}
        ${last.wantChange ? `<div class="callout info"><h4>Nếu muốn đổi môn (CV 68/BGDĐT-GDTrH)</h4><ul class="small"><li>Chỉ thực hiện vào <b>cuối năm học</b>; Hiệu trưởng xem xét, quyết định theo khả năng của trường.</li><li>Phải có <b>bản cam kết tự bổ sung</b> kiến thức của môn mới ở lớp trước, có xác nhận của cha mẹ/người giám hộ.</li><li>Nhà trường tổ chức <b>kiểm tra</b> việc tự bổ sung.</li><li>Nên gặp GVCN sớm, cân nhắc kỹ lợi – hại trước khi quyết định.</li></ul></div>` : ""}
        <h4>Lịch sử</h4><div class="table-wrap"><table class="t"><thead><tr><th>Thời điểm</th>${histSubs.map(s => `<th>${esc(subjShort(s))}<br><span class="muted small">điểm / hài lòng</span></th>`).join("")}<th>Hài lòng chung</th><th>Căng thẳng</th><th>Nguồn</th><th></th></tr></thead><tbody>
          ${S.tracking.map((e, i) => `<tr><td>${esc(e.period)}</td>${histSubs.map(s => `<td>${fmt((e.scores || {})[s])} / ${(e.sat || {})[s] ?? "–"}</td>`).join("")}<td>${e.overall ?? "–"}</td><td>${e.stress ?? "–"}</td><td class="small">${e.source === "form" ? "Google Form" : "Nhập tay"}</td><td><button type="button" class="btn ghost small" data-action="del-track" data-i="${i}">Xoá</button></td></tr>`).join("")}
        </tbody></table></div>` : ""}
      ${navRow(6, null)}
    </section>`;
  }

  /* ================= KHU VỰC GIÁO VIÊN ================= */
  function viewTeacher() {
    const needLogin = SRV.on && !SRV.token;
    const where = SRV.on ? "máy chủ (dùng chung cho mọi máy)" : "trình duyệt của máy này – mở web qua máy chủ để dùng chung";
    return `<section class="sheet">
      <div class="step-head"><span class="big-num" aria-hidden="true">GV</span><div><h2>Khu vực giáo viên</h2><p>Danh mục hồ sơ đã lưu, nhập kết quả khảo sát Google Form, cơ sở dữ liệu trường. Dữ liệu đang lưu trên ${where}.</p></div></div>
      ${needLogin ? `<form id="loginForm" class="callout info" style="max-width:460px"><h4>Đăng nhập giáo viên</h4><div class="field"><label for="tpass">Mật khẩu</label><input id="tpass" type="password" autocomplete="current-password"></div><div class="row" style="margin-top:10px"><button class="btn" type="submit">Đăng nhập</button></div><p class="small muted" style="margin-top:8px">Mật khẩu do người quản trị đặt trên máy chủ (TEACHER_PASSWORD).</p></form>` : `
      <div class="row" style="margin-bottom:10px"><h3 style="margin:0">Danh mục hồ sơ</h3><span class="spacer"></span><label class="sr-only" for="arcSearch">Tìm hồ sơ</label><input type="text" id="arcSearch" placeholder="Tìm theo mã, tên, lớp, trường…" value="${esc(S.ui.arcSearch || "")}" style="max-width:280px">${SRV.on ? `<button type="button" class="btn ghost small" data-action="logout">Đăng xuất</button>` : ""}</div>
      <div id="arcList"><p class="muted small">Đang tải…</p></div>
      <hr class="rule">
      <h3>Nhập kết quả khảo sát Google Form</h3>
      <p class="small">Tải kết quả từ Google Form (Google Sheets → Tệp → Tải xuống → .csv hoặc .xlsx) rồi chọn file. Web khớp theo <b>Mã học sinh</b>, thêm vào lịch sử theo dõi và chạy cảnh báo sớm. Mẫu câu hỏi: <a href="docs/MAU-GOOGLE-FORM.md" target="_blank" rel="noopener">docs/MAU-GOOGLE-FORM.md</a> · file thử: <a href="docs/mau-ket-qua-google-form.csv" download>mau-ket-qua-google-form.csv</a>.</p>
      <div class="row"><label class="sr-only" for="formFile">File kết quả</label><input type="file" id="formFile" accept=".csv,.xlsx,.xls"><button type="button" class="btn" data-action="import-form">Nhập kết quả</button></div>
      <div id="importReport"></div>
      <hr class="rule">
      <h3>Cơ sở dữ liệu trường</h3>
      ${schoolTable()}`}
    </section>`;
  }
  function schoolTable() {
    return `<div class="table-wrap"><table class="t"><thead><tr><th>Trường</th><th>Tỉnh/thành</th><th>Số tổ hợp</th><th>Nguồn</th><th>Lưu ở</th><th></th></tr></thead><tbody>
      ${allSchools().map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.province || "–")}</td><td>${s.combos.length}</td><td class="small">${esc(sourceText(s))}</td><td class="small">${s.demo ? "Minh hoạ" : s.shared ? "CSDL chung" : "Máy này"}</td><td class="nowrap">${s.demo ? "" : `<button type="button" class="btn ghost small" data-action="edit-school" data-id="${s.id}">Sửa</button> <button type="button" class="btn ghost small" data-action="del-school" data-id="${s.id}">Xoá</button>`}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="row" style="margin-top:10px"><button type="button" class="btn ghost" data-action="add-school">Thêm / cập nhật trường</button></div>`;
  }
  async function fillArchive() {
    const box = $("#arcList"); if (!box) return;
    try {
      const list = await Archive.list();
      const q = norm(S.ui.arcSearch || "");
      const rows = list.filter(r => !q || norm([r.code, r.name, r.className, r.school].join(" ")).includes(q)).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      box.innerHTML = rows.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Mã HS</th><th>Tên gọi</th><th>Lớp</th><th>Trường</th><th>Tổ hợp chốt</th><th>Lần theo dõi</th><th>Còn thiếu</th><th>Cập nhật</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><b>${esc(r.code)}</b></td><td>${esc(r.name || "–")}</td><td>${esc(r.className || "–")}</td><td>${esc(r.school || "–")}</td><td>${esc(r.combo || "–")}</td><td>${r.trackCount || 0}</td><td>${r.missing ? `<span class="auto-flag n" title="${esc((r.missingList || []).join("; "))}">${r.missing} mục</span>` : `<span class="auto-flag y">đủ</span>`}</td><td class="small">${r.updatedAt ? new Date(r.updatedAt).toLocaleString("vi-VN") : "–"}</td>
          <td class="nowrap"><button type="button" class="btn small" data-action="open-archive" data-code="${esc(r.code)}">Mở</button> <button type="button" class="btn ghost small" data-action="del-archive" data-code="${esc(r.code)}">Xoá</button></td></tr>`).join("")}</tbody></table></div>
        <p class="small muted">Rê chuột vào ô “Còn thiếu” để xem các mục chưa đầy đủ.</p>`
        : `<p class="muted">Chưa có hồ sơ nào${q ? " khớp tìm kiếm" : ""}. Hồ sơ được lưu bằng nút “Lưu hồ sơ” ở Bước 7.</p>`;
    } catch (e) { box.innerHTML = `<div class="callout bad"><p>Không tải được danh mục: ${esc(e.message)}</p></div>`; }
  }

  /* ================= KHO HỒ SƠ ================= */
  const Archive = {
    localAll() { try { return JSON.parse(safeGet(KEY_ARCHIVE) || "{}"); } catch (e) { return {}; } },
    async list() { if (SRV.on) return (await api("/api/profiles")).profiles || []; return Object.values(this.localAll()).map(r => Object.assign({}, r, { data: undefined })); },
    async get(code) { if (SRV.on) { try { return (await api("/api/profiles/" + encodeURIComponent(code))).profile; } catch (e) { if (/404|not found|không/i.test(e.message)) return null; throw e; } } return this.localAll()[code] || null; },
    async put(rec) { if (SRV.on) { await api("/api/profiles/" + encodeURIComponent(rec.code), { method: "PUT", body: JSON.stringify(rec) }); return; } const all = this.localAll(); all[rec.code] = rec; safeSet(KEY_ARCHIVE, JSON.stringify(all)); },
    async del(code) { if (SRV.on) { await api("/api/profiles/" + encodeURIComponent(code), { method: "DELETE" }); return; } const all = this.localAll(); delete all[code]; safeSet(KEY_ARCHIVE, JSON.stringify(all)); }
  };
  function withState(st, fn) { const keep = S; S = st; try { return fn(); } finally { S = keep; } }
  function recordFromState(st) {
    return withState(st, () => {
      const fc = finalCombo(), miss = missingFields();
      return { code: String(st.profile.code).trim(), name: st.profile.nickname, className: st.profile.className, school: schoolName(), combo: fc ? comboLabel(fc.subjects) : "", trackCount: st.tracking.length,
        missing: miss.length, missingList: miss.map(m => "B" + m.step + ": " + m.t), updatedAt: new Date().toISOString(), data: JSON.parse(JSON.stringify(st)) };
    });
  }
  function saveProfileFlow() {
    if (SRV.on && !SRV.token) { toast("Cần đăng nhập Khu vực giáo viên để lưu vào danh mục"); go(8); return; }
    const miss = missingFields();
    const byStep = {}; miss.forEach(m => (byStep[m.step] = byStep[m.step] || []).push(m.t));
    dialog(`<h3>Lưu hồ sơ</h3>
      <div class="field"><label for="sv-code">Mã học sinh</label><input id="sv-code" type="text" value="${esc(S.profile.code)}" autocomplete="off"></div>
      ${miss.length ? `<div class="callout warn" style="margin-top:12px"><h4>Còn ${miss.length} mục chưa đầy đủ</h4><ul class="small">${Object.keys(byStep).map(k => `<li><b>Bước ${k}:</b> ${esc(byStep[k].join("; "))}</li>`).join("")}</ul><p class="small">Vẫn có thể lưu và bổ sung sau.</p></div>` : `<div class="callout ok" style="margin-top:12px"><p>Thông tin đã đầy đủ.</p></div>`}
      <p class="small muted">Lưu vào ${SRV.on ? "danh mục trên máy chủ" : "trình duyệt của máy này"}. Hồ sơ cùng mã sẽ được cập nhật.</p>
      <p class="small" id="sv-err" style="color:var(--bad)"></p>
      <div class="row"><button type="button" class="btn" id="sv-ok">${miss.length ? "Vẫn lưu" : "Lưu"}</button><button type="button" class="btn ghost" id="sv-no">${miss.length ? "Quay lại bổ sung" : "Huỷ"}</button></div>`, root => {
      $("#sv-no", root).onclick = closeDialog;
      $("#sv-ok", root).onclick = async () => {
        const code = $("#sv-code", root).value.trim();
        if (!code) { $("#sv-err", root).textContent = "Hãy nhập mã học sinh."; return; }
        S.profile.code = code; save();
        try { await Archive.put(recordFromState(S)); closeDialog(); render(); toast("Đã lưu hồ sơ " + code); }
        catch (e) { $("#sv-err", root).textContent = "Không lưu được: " + e.message; }
      };
    });
  }
  async function openArchive(code) {
    try {
      const rec = await Archive.get(code); if (!rec || !rec.data) { toast("Không tìm thấy hồ sơ mã " + code); return; }
      const role = S.role; S = merge(blankState(), upgrade(rec.data)); if (role) S.role = role; save(); go(1); toast("Đã mở hồ sơ " + code);
    } catch (e) { toast("Không mở được: " + e.message); }
  }

  /* ================= NHẬP GOOGLE FORM ================= */
  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim() !== ""));
  }
  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = () => ok(window.XLSX); s.onerror = () => bad(new Error("Không tải được thư viện đọc Excel – hãy dùng file .csv")); document.head.appendChild(s); });
  }
  async function readSheet(file) {
    if (/\.csv$/i.test(file.name)) return parseCSV(await file.text());
    const X = await loadSheetJS(); const wb = X.read(await file.arrayBuffer(), { type: "array" });
    return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
  }
  const SUBJ_PATTERNS = { dia: /dia ?l[iy]/, gdkt: /kinh te|ktpl|gdkt/, li: /vat ?l[iy]/, hoa: /hoa hoc|\bhoa\b/, sinh: /sinh hoc|\bsinh\b/, cn: /cong nghe/, tin: /tin hoc|\btin\b/, an: /am nhac|\bnhac\b/, mt: /m[iy] thuat/ };
  function mapFormHeaders(h) {
    const m = { sat: {}, score: {} };
    h.forEach((raw, i) => {
      const t = norm(raw);
      const br = t.match(/\[(.+)\]/);
      if (br) {
        const key = Object.keys(SUBJ_PATTERNS).find(k => SUBJ_PATTERNS[k].test(br[1]));
        if (key) { if (/diem/.test(t)) m.score[key] = i; else m.sat[key] = i; }
      }
      else if (/ma hoc sinh|ma hs\b|ma so hoc sinh/.test(t)) m.code = i;
      else if (/cang thang/.test(t)) m.stress = i;
      else if (/doi mon/.test(t)) m.change = i;
      else if (/hai long/.test(t)) m.overall = i;
      else if (/thoi diem|dot khao sat/.test(t)) m.period = i;
    });
    return m;
  }
  const firstNum = v => { const x = String(v ?? "").replace(",", ".").match(/\d+(\.\d+)?/); return x ? parseFloat(x[0]) : null; };
  async function importForm() {
    const f = $("#formFile").files[0], out = $("#importReport");
    if (!f) { toast("Hãy chọn file kết quả"); return; }
    out.innerHTML = `<p class="muted small">Đang xử lý…</p>`;
    try {
      const rows = await readSheet(f); if (rows.length < 2) throw new Error("File không có dữ liệu");
      const m = mapFormHeaders(rows[0]);
      if (m.code == null) throw new Error("Không thấy cột “Mã học sinh” – xem mẫu câu hỏi");
      const byCode = {};
      rows.slice(1).forEach(r => {
        const code = String(r[m.code] || "").trim(); if (!code) return;
        const n15 = i => { if (i == null) return null; const v = firstNum(r[i]); return v == null ? null : clamp(v, 1, 5); };
        const e = { period: m.period != null && String(r[m.period] || "").trim() ? String(r[m.period]).trim() : "Khảo sát", source: "form", stamp: String(r[0] || ""),
          overall: n15(m.overall), stress: n15(m.stress), wantChange: m.change != null ? /^co\b|^yes/.test(norm(r[m.change])) : false, sat: {}, scores: {} };
        Object.keys(m.sat).forEach(k => { const v = firstNum(r[m.sat[k]]); if (v != null) e.sat[k] = clamp(v, 1, 5); });
        Object.keys(m.score).forEach(k => { const v = firstNum(r[m.score[k]]); if (v != null) e.scores[k] = clamp(v, 0, 10); });
        (byCode[code] = byCode[code] || []).push(e);
      });
      const report = [];
      for (const code of Object.keys(byCode)) {
        const rec = await Archive.get(code);
        const isCurrent = String(S.profile.code || "").trim() === code;
        if (!rec && !isCurrent) { report.push({ code, ok: false, msg: "Không có hồ sơ với mã này" }); continue; }
        const st = rec && rec.data ? merge(blankState(), upgrade(rec.data)) : JSON.parse(JSON.stringify(S));
        let added = 0, warn = 0;
        byCode[code].forEach(e => {
          if (st.tracking.some(x => x.source === "form" && x.stamp === e.stamp && x.period === e.period)) return;
          const prev = st.tracking[st.tracking.length - 1]; st.tracking.push(e); added++;
          warn += withState(st, () => warningsFor(e, prev).length);
        });
        await Archive.put(recordFromState(st));
        if (isCurrent) { S.tracking = st.tracking; save(); }
        report.push({ code, ok: true, msg: `Thêm ${added} lần theo dõi${added < byCode[code].length ? ` (bỏ qua ${byCode[code].length - added} dòng đã nhập trước đó)` : ""}${warn ? ` · ${warn} cảnh báo` : ""}` });
      }
      out.innerHTML = `<div class="callout ${report.some(r => !r.ok) ? "warn" : "ok"}" style="margin-top:12px"><h4>Kết quả nhập: ${report.filter(r => r.ok).length}/${report.length} mã học sinh khớp</h4>
        <div class="table-wrap"><table class="t"><thead><tr><th>Mã HS</th><th>Kết quả</th><th></th></tr></thead><tbody>${report.map(r => `<tr><td>${esc(r.code)}</td><td>${r.ok ? "" : "<span class='cross'>✗</span> "}${esc(r.msg)}</td><td>${r.ok ? `<button type="button" class="btn ghost small" data-action="open-archive" data-code="${esc(r.code)}">Mở</button>` : ""}</td></tr>`).join("")}</tbody></table></div>
        <p class="small muted">Đã nhận: ${["code", "period", "overall", "stress", "change"].filter(k => m[k] != null).length} cột chung, ${Object.keys(m.sat).length} cột hài lòng theo môn, ${Object.keys(m.score).length} cột điểm. Mã chưa khớp: tạo và lưu hồ sơ cho học sinh đó trước, rồi nhập lại file.</p></div>`;
      fillArchive();
    } catch (e) { out.innerHTML = `<div class="callout bad" style="margin-top:12px"><p>${esc(e.message)}</p></div>`; }
  }

  /* ================= TRƯỜNG: LẤY TỪ WEBSITE / NHẬP TAY ================= */
  const ELECTIVE_RX = { li: /\bvat ?l[iy]\b|(?<!dia )\bl[iy]\b/, hoa: /\bhoa hoc\b|\bhoa\b/, sinh: /\bsinh hoc\b|\bsinh\b/, dia: /\bdia l[iy]\b|\bdia\b/, gdkt: /giao duc kinh te|kinh te (va )?phap luat|\bgdkt|\bktpl\b|\bkt ?& ?pl\b/, cn: /\bcong nghe\b|\bcn\b/, tin: /\btin hoc\b|\btin\b/, an: /\bam nhac\b|\bnhac\b/, mt: /\bm[iy] thuat\b/ };
  const CD_EXTRA_RX = { toan: /\btoan\b/, van: /\bngu van\b|\bvan\b/, su: /\blich su\b|\bsu\b/ };
  const CD_RX = Object.assign({}, CD_EXTRA_RX, ELECTIVE_RX);
  const NOISE = /hoc sinh|thi sinh|sinh vien|sinh nhat|giang sinh|khai sinh|dia chi|dia diem|dia phuong|dia ban|thong tin|tin tuc|tin bai|tin nhan|cong nghe thong tin|van hoa|hoa binh|quan ly|nhac nho|su dung|su kien|su phat trien|lich su hinh thanh/g;
  const cleanLine = t => " " + norm(t).replace(NOISE, " ") + " ";
  const findSubjects = (t, rx) => Object.keys(rx).filter(k => rx[k].test(t));
  function parseCombos(text) {
    const out = [], seen = new Set();
    String(text || "").split(/\n|•/).forEach(line => {
      const t = cleanLine(line); if (t.trim().length < 6) return;
      const cut = t.indexOf("chuyen de");
      let subs = findSubjects(cut >= 0 ? t.slice(0, cut) : t, ELECTIVE_RX);
      let cd = cut >= 0 ? findSubjects(t.slice(cut), CD_RX) : [];
      if (cut < 0 && t.includes("|")) {
        // dòng bảng: ô có đúng 4 môn lựa chọn, ô sau có 3 cụm chuyên đề
        const cells = t.split("|");
        const i = cells.findIndex(c => findSubjects(c, ELECTIVE_RX).length === 4);
        if (i >= 0) { subs = findSubjects(cells[i], ELECTIVE_RX); const nx = cells.slice(i + 1).find(c => findSubjects(c, CD_RX).length); cd = nx ? findSubjects(nx, CD_RX) : []; }
      }
      if (subs.length !== 4) return;
      if (cd.length !== 3) cd = [];
      const k = comboKey(subs); if (seen.has(k)) return; seen.add(k);
      out.push({ subjects: D.SUBJECT_ORDER.filter(s => subs.includes(s)), cd });
    });
    return out;
  }
  const CD_SHORT = { toan: "Toán", van: "Văn", su: "Sử" };
  const comboLine = c => c.subjects.map(subjShort).join(", ") + (c.cd && c.cd.length ? " | " + c.cd.map(k => CD_SHORT[k] || subjShort(k)).join(", ") : "");
  function parseSubj(txt, isCd) {
    return [...new Set(String(txt || "").split(/[,;–\-\/]+/).map(x => { const k = findSubjects(cleanLine(x), isCd ? CD_RX : ELECTIVE_RX); return k.length === 1 ? k[0] : null; }).filter(Boolean))];
  }
  function openSchoolDialog(existing) {
    const s = existing || { name: S.profile.schoolOther || "", province: S.profile.province || "", sourceUrl: "", combos: [] };
    const canScrape = SRV.on && !!SRV.token;
    dialog(`<h3>${existing ? "Sửa danh sách tổ hợp" : "Thêm / cập nhật trường"}</h3>
      <div class="grid-2"><div class="field"><label for="ns-name">Tên trường</label><input id="ns-name" type="text" value="${esc(s.name)}" placeholder="VD: THPT Yên Hoà"></div>
      <div class="field"><label for="ns-prov">Tỉnh/thành</label><input id="ns-prov" type="text" value="${esc(s.province || "")}" placeholder="VD: Hà Nội"></div></div>
      <h4 style="margin-top:14px">1. Lấy từ website của trường</h4>
      <div class="row" style="flex-wrap:nowrap"><label class="sr-only" for="ns-url">Link</label><input id="ns-url" type="text" value="${esc(s.sourceUrl || "")}" placeholder="Dán link trang thông báo tổ hợp môn của trường"><button type="button" class="btn ghost" id="ns-fetch" ${canScrape ? "" : "disabled"}>Lấy dữ liệu</button></div>
      <p class="small muted">${canScrape ? "Máy chủ đọc trang và tự nhận diện các dòng có đúng 4 môn lựa chọn. Thông báo dạng ảnh hoặc PDF scan thì cần nhập tay." : SRV.on ? "Đăng nhập Khu vực giáo viên để dùng chức năng lấy dữ liệu tự động." : "Lấy tự động cần mở web qua máy chủ. Ở chế độ này: mở trang của trường, sao chép nội dung và dán vào ô dưới."}</p>
      <details ${canScrape ? "" : "open"}><summary class="small">Hoặc dán nội dung trang web vào đây</summary><label class="sr-only" for="ns-paste">Nội dung</label><textarea id="ns-paste" placeholder="Dán nội dung thông báo tổ hợp môn…"></textarea><button type="button" class="btn ghost small" id="ns-parse" style="margin-top:6px">Phân tích nội dung</button></details>
      <h4 style="margin-top:14px">2. Kiểm tra và chỉnh danh sách</h4>
      <label class="sr-only" for="ns-combos">Danh sách tổ hợp</label><textarea id="ns-combos">${esc(s.combos.map(comboLine).join("\n"))}</textarea>
      <p class="small" id="ns-msg"></p>
      <p class="small muted">Lưu vào ${SRV.on && SRV.token ? "cơ sở dữ liệu chung trên máy chủ (mọi máy dùng được)" : "trình duyệt của máy này"}. Trường cùng tên sẽ được cập nhật.</p>
      <div class="row"><button type="button" class="btn" id="ns-save">Xác nhận và lưu</button><button type="button" class="btn ghost" id="ns-close">Huỷ</button></div>`, root => {
      const msg = (t, bad) => { const el = $("#ns-msg", root); el.textContent = t; el.style.color = bad ? "var(--bad)" : "var(--ok)"; };
      const fill = text => { const found = parseCombos(text); if (!found.length) { msg("Không nhận diện được tổ hợp nào – hãy nhập tay.", true); return; } $("#ns-combos", root).value = found.map(comboLine).join("\n"); msg(`Đã nhận diện ${found.length} tổ hợp. Hãy kiểm tra lại trước khi lưu.`); };
      $("#ns-close", root).onclick = closeDialog;
      $("#ns-parse", root).onclick = () => fill($("#ns-paste", root).value);
      $("#ns-fetch", root).onclick = async () => {
        const url = $("#ns-url", root).value.trim(); if (!/^https?:\/\//i.test(url)) { msg("Link phải bắt đầu bằng http:// hoặc https://", true); return; }
        msg("Đang đọc trang…");
        try { const r = await api("/api/scrape", { method: "POST", body: JSON.stringify({ url }) }); $("#ns-paste", root).value = r.text || ""; fill(r.text || ""); if (!$("#ns-name", root).value && r.title) $("#ns-name", root).value = r.title; }
        catch (e) { msg("Không đọc được trang: " + e.message + ". Hãy sao chép nội dung và dán vào ô dưới.", true); root.querySelector("details").open = true; }
      };
      $("#ns-save", root).onclick = async () => {
        try {
          const r = await saveSchool({ existing, name: $("#ns-name", root).value.trim(), province: $("#ns-prov", root).value.trim(), sourceUrl: $("#ns-url", root).value.trim(), text: $("#ns-combos", root).value });
          if (S.ui.s4draft) delete S.ui.s4draft[existing ? existing.id : "new"];
          save(); closeDialog(); render(); toast(r.updated ? "Đã cập nhật trường" : "Đã lưu trường");
        } catch (e) { msg(e.message, true); }
      };
    });
  }
  // Kiểm tra và lưu danh sách tổ hợp (dùng chung cho hộp thoại và ô nhập ở Bước 4); lỗi trả về qua exception
  async function saveSchool({ existing, name, province, sourceUrl, text }) {
    const lines = String(text || "").split(/\n+/).map(x => x.trim()).filter(Boolean);
    if (!name) throw new Error("Hãy nhập tên trường.");
    const combos = [], errs = [];
    lines.forEach((ln, i) => { const [a, b] = ln.split("|"); const subs = parseSubj(a, false); const cd = b ? parseSubj(b, true) : [];
      const v = validate(subs, cd.length ? cd : null, null);
      if (!v.r1 || v.r2 === false) errs.push(`Dòng ${i + 1}: ${v.issues.join(" ")}`); else combos.push({ id: "T" + (i + 1), subjects: subs, cd }); });
    if (errs.length) throw new Error(errs.join(" "));
    if (!combos.length) throw new Error("Hãy có ít nhất 1 tổ hợp.");
    const same = allSchools().find(x => !x.demo && (existing ? x.id === existing.id : norm(x.name) === norm(name)));
    const rec = { id: same ? same.id : "sch-" + Date.now(), name, province, sourceUrl, combos, updatedAt: new Date().toISOString() };
    try {
      if (SRV.on && SRV.token) { await api("/api/schools", { method: "POST", body: JSON.stringify(rec) }); await refreshServerSchools(); }
      else { const loc = localSchools().filter(x => x.id !== rec.id); loc.push(rec); saveLocalSchools(loc); }
    } catch (e) { throw new Error("Không lưu được: " + e.message); }
    S.ui.step4School = rec.id; if (!S.profile.schoolId || S.profile.schoolId === "__other") S.profile.schoolId = rec.id;
    return { rec, updated: !!same };
  }
  async function deleteSchool(id) {
    const s = findSchool(id); if (!s || s.demo) return;
    if (!window.confirm("Xoá trường " + s.name + " khỏi cơ sở dữ liệu?")) return;
    try {
      if (s.shared) { await api("/api/schools/" + encodeURIComponent(id), { method: "DELETE" }); await refreshServerSchools(); }
      else saveLocalSchools(localSchools().filter(x => x.id !== id));
      if (S.ui.step4School === id) S.ui.step4School = ""; save(); render(); toast("Đã xoá trường");
    } catch (e) { toast("Không xoá được: " + e.message); }
  }

  /* ================= RENDER ================= */
  const VIEWS = { 0: viewWelcome, 1: viewStep1, 2: viewStep2, 3: viewStep3, 4: viewStep4, 5: viewStep5, 6: viewStep6, 7: viewStep7, 8: viewTeacher };
  function render(opts = {}) {
    const fid = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fid : null;
    const y = window.scrollY;
    renderSteps();
    $("#main").innerHTML = (VIEWS[S.step] || viewWelcome)();
    if (opts.top) { window.scrollTo(0, 0); $("#main").focus({ preventScroll: true }); } else window.scrollTo(0, y);
    if (fid) { const el = document.querySelector(`[data-fid="${fid}"]`); if (el) el.focus({ preventScroll: true }); }
    const tf = $("#trackForm"); if (tf) tf.addEventListener("submit", onTrackSubmit);
    const lf = $("#loginForm"); if (lf) lf.addEventListener("submit", onLogin);
    const as = $("#arcSearch"); if (as) as.addEventListener("input", () => { S.ui.arcSearch = as.value; save(); fillArchive(); });
    if (S.step === 8) fillArchive();
  }
  function go(n) { S.step = clamp(n, 0, 8); save(); render({ top: true }); document.dispatchEvent(new CustomEvent("ctv:step", { detail: S.step })); }

  /* ================= SỰ KIỆN ================= */
  document.addEventListener("toggle", e => {
    const d = e.target; if (!d.dataset || !d.dataset.why) return;
    const set = new Set(S.ui.openWhy); if (d.open) set.add(d.dataset.why); else set.delete(d.dataset.why); S.ui.openWhy = [...set]; save();
  }, true);
  document.addEventListener("click", e => {
    const g = e.target.closest("[data-go]");
    if (g && !g.disabled) { go(+g.dataset.go); return; }
    const b = e.target.closest("[data-action]");
    if (!b || b.disabled) return;
    const A = b.dataset.action, ds = b.dataset;
    switch (A) {
      case "role": S.role = ds.role; save(); render(); document.dispatchEvent(new CustomEvent("ctv:role")); break;
      case "tile": { const arr = (S.ui.heroPick = S.ui.heroPick || []); const i = arr.indexOf(ds.k); if (i >= 0) arr.splice(i, 1); else if (arr.length < 4) arr.push(ds.k); save(); render(); break; }
      case "toggle-arr": { const arr = getPath(ds.path); const i = arr.indexOf(ds.k); if (i >= 0) arr.splice(i, 1); else arr.push(ds.k);
        if (i < 0) {
          const others = { "profile.liked": ["profile.disliked"], "profile.disliked": ["profile.liked", "constraints.must"], "constraints.must": ["profile.disliked"] }[ds.path] || [];
          others.forEach(o => { const a2 = getPath(o); const j = a2.indexOf(ds.k); if (j >= 0) a2.splice(j, 1); });
        }
        save(); render(); break; }
      case "test-tab": S.ui.testTab = ds.tab; save(); render({ top: true }); break;
      case "hol": S.tests.holland[ds.k][+ds.i] = +ds.v; save(); render(); break;
      case "ey": S.tests.eysenck[+ds.i] = ds.v; save(); render(); break;
      case "mbti": S.tests.mbti[+ds.i] = ds.v; save(); render(); break;
      case "fill-demo": fillDemo(ds.test); save(); render(); toast("Đã điền ngẫu nhiên để thử demo"); break;
      case "cfb": S.careerFb[ds.name] = S.careerFb[ds.name] === ds.v ? undefined : ds.v; save(); render(); break;
      case "pick-group": S.careerGroup = S.careerGroup === ds.g ? "" : ds.g; save(); render(); break;
      case "toggle-other-groups": S.ui.showOtherGroups = !S.ui.showOtherGroups; if (!S.ui.showOtherGroups && !suitableGroups().some(x => x.g === S.careerGroup)) S.careerGroup = ""; save(); render(); break;
      case "toggle-all-careers": S.ui.showAllCareers = !S.ui.showAllCareers; save(); render(); break;
      case "toggle-diagram": S.ui.showDiagram = !S.ui.showDiagram; save(); render(); break;
      case "shortlist": { const i = S.shortlist.indexOf(ds.key); if (i >= 0) S.shortlist.splice(i, 1); else S.shortlist.push(ds.key); save(); render(); break; }
      case "unshortlist": S.shortlist = S.shortlist.filter(k => k !== ds.key); save(); render(); break;
      case "set-final": { const sch = findSchool(ds.school); S.final.schoolId = sch ? ds.school : ""; S.final.comboKey = ds.ck; S.final.confirmed = false;
        const c = sch ? sch.combos.find(x => comboKey(x.subjects) === ds.ck) : null; S.final.cd = c && c.cd ? c.cd : [];
        save(); toast("Đã đặt làm phương án chính"); if (S.step !== 6) go(6); else render(); break; }
      case "clear-final": S.final.comboKey = ""; S.final.schoolId = ""; S.final.confirmed = false; save(); render(); break;
      case "check": S.final.checks[ds.k] = b.checked; if (ds.k !== "talked") S.final.confirmed = false; save(); render(); break;
      case "confirm-final": S.final.confirmed = true; save(); render(); toast("Đã xác nhận phương án chính thức"); break;
      case "print": window.print(); break;
      case "open-diagram": { const d = $("#diagramDialog"), f = $("#diagramFrame"); if (!f.getAttribute("src")) f.setAttribute("src", "so-do.html"); if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); break; }
      case "close-diagram": { const d = $("#diagramDialog"); if (d.close) d.close(); else d.removeAttribute("open"); break; }
      case "copy-summary": copyText(summaryText()); break;
      case "add-school": openSchoolDialog(null); break;
      case "s4-pick": { const on = b.getAttribute("aria-pressed") === "true"; if (!on && b.parentElement.querySelectorAll("[aria-pressed=true]").length >= +ds.max) { s4Msg(`Tối đa ${ds.max} – bỏ chọn một ô trước.`, true); break; } b.setAttribute("aria-pressed", String(!on)); break; }
      case "s4-addline": s4AddLine(); break;
      case "s4-save": s4Save(ds.id); break;
      case "edit-school": openSchoolDialog(findSchool(ds.id)); break;
      case "del-school": deleteSchool(ds.id); break;
      case "del-track": S.tracking.splice(+ds.i, 1); save(); render(); break;
      case "open-profile-code": openProfileCode(); break;
      case "save-profile": saveProfileFlow(); break;
      case "open-archive": openArchive(ds.code); break;
      case "del-archive": if (window.confirm("Xoá hồ sơ " + ds.code + "?")) Archive.del(ds.code).then(() => { toast("Đã xoá hồ sơ"); fillArchive(); }, err => toast("Không xoá được: " + err.message)); break;
      case "import-form": importForm(); break;
      case "load-by-code": { const code = String(($("#f-code") || {}).value || S.profile.code || "").trim(); if (!code) { toast("Hãy nhập mã học sinh"); break; } if (SRV.on && !SRV.token) { toast("Đăng nhập Khu vực giáo viên để mở hồ sơ đã lưu"); break; } openArchive(code); break; }
      case "logout": SRV.token = ""; try { sessionStorage.removeItem(KEY_TOKEN); } catch (err) { /* bỏ qua */ } render(); toast("Đã đăng xuất"); break;
    }
  });
  document.addEventListener("change", e => {
    const el = e.target.closest("[data-bind]"); if (!el) return;
    if (el.type === "number" && (el.validity.rangeOverflow || el.validity.rangeUnderflow || el.validity.badInput)) {
      el.value = ""; el.setAttribute("aria-invalid", "true");
      toast(`Giá trị phải từ ${el.min} đến ${el.max}`); el.focus(); return;
    }
    el.removeAttribute("aria-invalid");
    setPath(el.dataset.bind, el.value); save();
    if (el.dataset.rerender) render(); else renderSteps();
  });
  async function onLogin(e) {
    e.preventDefault();
    try { const r = await api("/api/login", { method: "POST", body: JSON.stringify({ password: $("#tpass").value }) }); SRV.token = r.token; try { sessionStorage.setItem(KEY_TOKEN, r.token); } catch (err) { /* bỏ qua */ } await refreshServerSchools(); render(); toast("Đã đăng nhập"); }
    catch (err) { toast("Đăng nhập không thành công: " + err.message); }
  }
  function fillDemo(test) {
    const r = n => Math.floor(Math.random() * n);
    if (test === "holland") D.HOLLAND.forEach((g, gi) => { const bias = [3, 2, 1, 1, 2, 1][(gi + r(6)) % 6]; S.tests.holland[g.key] = g.items.map(() => clamp(bias + r(3) - 1, 0, 4)); });
    if (test === "eysenck") S.tests.eysenck = D.EYSENCK.map(() => r(2) ? "+" : "-");
    if (test === "mbti") S.tests.mbti = D.MBTI.map(() => r(2) ? "a" : "b");
  }
  function onTrackSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.target); const fc = finalCombo(); if (!fc) return;
    const num = (k, lo, hi) => { const v = parseFloat(String(f.get(k) || "").replace(",", ".")); return isNaN(v) ? null : clamp(v, lo, hi); };
    const entry = { period: f.get("period"), source: "manual", overall: num("overall", 1, 5), stress: num("stress", 1, 5), wantChange: !!f.get("wantChange"), scores: {}, sat: {} };
    fc.subjects.forEach(s => { entry.scores[s] = num("score-" + s, 0, 10); entry.sat[s] = num("sat-" + s, 1, 5); });
    S.tracking.push(entry); save(); render(); toast("Đã ghi lần theo dõi – nhớ bấm “Lưu hồ sơ”");
  }
  function copyText(t) {
    const done = () => toast("Đã sao chép");
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, () => fallback()); else fallback();
    function fallback() { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { toast("Không sao chép được – hãy bôi đen và sao chép thủ công"); } ta.remove(); }
  }

  /* ================= HỘP THOẠI ================= */
  function dialog(html, onOpen) { const d = $("#dialog"); $("#dialogInner").innerHTML = html; if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); if (onOpen) onOpen($("#dialogInner")); }
  function closeDialog() { const d = $("#dialog"); if (d.close) d.close(); else d.removeAttribute("open"); }
  const b64 = s => btoa(unescape(encodeURIComponent(s)));
  const unb64 = s => decodeURIComponent(escape(atob(s)));
  function openProfileCode() {
    const code = b64(JSON.stringify(S));
    dialog(`<h3>Mã hồ sơ</h3>
      <p class="small">Mã hồ sơ chứa toàn bộ dữ liệu đã nhập trên trình duyệt này. Lưu lại để tiếp tục ở máy khác, hoặc dán mã đã có để khôi phục. Giáo viên nên dùng “Lưu hồ sơ” ở Bước 7 để lưu vào danh mục.</p>
      <h4>Tóm tắt</h4><div class="code-box">${esc(summaryText())}</div>
      <h4 style="margin-top:12px">Mã đầy đủ</h4><textarea id="pcode" spellcheck="false" aria-label="Mã hồ sơ">${esc(code)}</textarea>
      <div class="row" style="margin-top:12px">
        <button type="button" class="btn" id="pc-copy">Sao chép mã</button>
        <button type="button" class="btn ghost" id="pc-dl">Tải file hồ sơ (.json)</button>
        <button type="button" class="btn ghost" id="pc-load">Khôi phục từ mã đã dán</button>
        <span class="spacer"></span>
        <button type="button" class="btn ghost small" id="pc-reset">Hồ sơ mới</button>
        <button type="button" class="btn ghost small" id="pc-close">Đóng</button>
      </div>`, root => {
      $("#pc-copy", root).onclick = () => copyText($("#pcode", root).value);
      $("#pc-dl", root).onclick = () => { const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ho-so-" + (S.profile.code || S.profile.nickname || "hoc-sinh") + ".json"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      $("#pc-load", root).onclick = () => {
        const txt = $("#pcode", root).value.trim();
        try { const obj = upgrade(txt.startsWith("{") ? JSON.parse(txt) : JSON.parse(unb64(txt))); if (!obj || obj.v !== 2) throw 0; S = merge(blankState(), obj); save(); closeDialog(); render({ top: true }); toast("Đã khôi phục hồ sơ"); }
        catch (e) { toast("Mã không hợp lệ – hãy dán đúng mã hoặc nội dung file .json"); }
      };
      $("#pc-reset", root).onclick = () => { if (window.confirm("Bắt đầu hồ sơ mới? Dữ liệu đang nhập chưa lưu sẽ bị xoá.")) { const role = S.role; S = blankState(); S.role = role; save(); closeDialog(); render({ top: true }); toast("Đã tạo hồ sơ mới"); } };
      $("#pc-close", root).onclick = closeDialog;
    });
  }

  /* ================= API cho trợ lý tư vấn ================= */
  window.CTV_APP = {
    state: () => S, go, summaryText, rankedCareers, priorityCareers, analyzeCombo, recommendForSchool, hollandStats, findSchool, allSchools,
    subjName, comboLabel, parseCombos, roleName: () => ROLE_NAME[S.role] || null
  };

  render();
  detectServer().then(() => { if (SRV.on) render(); });
})();
