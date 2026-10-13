/* =========================================================
   Cổng thông tin tư vấn học sinh – TRỢ LÝ TƯ VẤN (DEMO)
   - Không có apiUrl: trả lời theo bộ câu hỏi có sẵn (rule-based).
   - Có apiUrl (js/config.js): gửi hội thoại tới máy chủ AI.
   © 2026 Dr. Duyen Nguyen. All rights reserved.
   ========================================================= */
(function () {
  "use strict";
  const D = window.CTV_DATA, APP = window.CTV_APP, CFG = Object.assign({}, window.CTV_CONFIG || {});
  // apiUrl dạng "/chat" chỉ dùng được khi web được mở qua trạm trung gian (http/https).
  // Mở trực tiếp file index.html (file://) thì tự chuyển sang chế độ demo.
  if (CFG.apiUrl && CFG.apiUrl.startsWith("/") && location.protocol === "file:") CFG.apiUrl = "";
  const $ = s => document.querySelector(s);
  const fab = $("#chatFab"), panel = $("#chatPanel"), log = $("#chatLog"), form = $("#chatForm"), input = $("#chatInput"), chips = $("#chatChips");
  const history = [];
  let greeted = false;

  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim();
  const has = (t, arr) => arr.some(w => t.includes(w));
  function who() {
    const r = APP.state().role;
    if (r === "ph") return { me: "tôi", you: "anh/chị", You: "Anh/chị" };
    if (r === "gv") return { me: "tôi", you: "thầy/cô", You: "Thầy/cô" };
    return { me: "mình", you: "bạn", You: "Bạn" };
  }
  if (CFG.apiUrl) $("#chatMode").textContent = "Câu hỏi được gửi tới hệ thống AI để trả lời. Không nhập họ tên đầy đủ, địa chỉ, số điện thoại.";
  if (CFG.telegramBot) {
    const tg = $("#chatTg"), u = String(CFG.telegramBot).replace(/^@/, "");
    tg.href = "https://t.me/" + encodeURIComponent(u) + (CFG.telegramStart ? "?start=" + encodeURIComponent(CFG.telegramStart) : "");
    tg.textContent = "Tiếp tục trò chuyện trên Telegram (@" + u + ")";
    tg.hidden = false;
  }

  /* ---------- Hiển thị ---------- */
  function add(from, text, cls) {
    const d = document.createElement("div");
    d.className = "msg " + from + (cls ? " " + cls : "");
    d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    return d;
  }
  function open() {
    panel.hidden = false; fab.hidden = true; fab.setAttribute("aria-expanded", "true");
    if (!greeted) { greeted = true; greet(); }
    renderChips(); setTimeout(() => input.focus(), 50);
  }
  function close() { panel.hidden = true; fab.hidden = false; fab.setAttribute("aria-expanded", "false"); fab.focus(); }
  function greet() {
    const s = APP.state(), w = who();
    let t = `Xin chào, ${w.me} là trợ lý tư vấn của Cổng thông tin tư vấn học sinh. ${w.You === "Bạn" ? "Mình" : "Tôi"} hỗ trợ chọn 4 môn học lựa chọn lớp 10 theo quy trình 7 bước.`;
    if (!s.role) t += "\nBạn là học sinh, phụ huynh hay giáo viên? (Gõ “Tôi là học sinh”, “Tôi là phụ huynh” hoặc “Tôi là giáo viên”.)";
    else t += `\n${w.You} có thể hỏi về quy định chọn môn, tổ hợp xét tuyển, ngành nghề, hoặc nhờ ${w.me} gợi ý tổ hợp.`;
    t += "\n(Bản demo – kết quả chỉ mang tính tham khảo.)";
    say(t);
  }
  function say(text, cls) { history.push({ role: "assistant", content: text }); add("bot", text, cls); }
  function renderChips() {
    const step = APP.state().step;
    const base = {
      0: ["Phải chọn mấy môn?", "Môn nào bắt buộc?", "Tổ hợp A00 gồm gì?"],
      1: ["Vì sao cần điểm lớp 9?", "Phải chọn mấy môn?"],
      2: ["Holland là gì?", "TPB là gì?", "Trắc nghiệm có chính xác không?"],
      3: ["Ngành Y cần học môn gì?", "Ngành CNTT cần môn gì?", "Ngành Luật cần môn gì?"],
      4: ["Nên chọn tổ hợp nào?", "Chuyên đề học tập là gì?", "Môn nào được thi tốt nghiệp?"],
      5: ["Nói chuyện với bố mẹ thế nào?", "Nên chọn tổ hợp nào?"],
      6: ["Có được đổi môn không?", "Môn nào được thi tốt nghiệp?"],
      7: ["Có được đổi môn không?", "Học kém một môn thì sao?"]
    }[step] || [];
    chips.innerHTML = base.concat(["Bản quyền web"]).map(c => `<button type="button">${c}</button>`).join("");
  }
  chips.addEventListener("click", e => { const b = e.target.closest("button"); if (b) send(b.textContent); });
  fab.addEventListener("click", open);
  document.addEventListener("click", e => { if (e.target.closest('[data-action="close-chat"]')) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) close(); });
  document.addEventListener("ctv:step", renderChips);
  form.addEventListener("submit", e => { e.preventDefault(); const t = input.value.trim(); if (t) { input.value = ""; send(t); } });

  /* ---------- Gửi ---------- */
  async function send(text) {
    add("user", text);
    const t = norm(text);
    // Nội dung khủng hoảng chỉ xử lý tại chỗ, không ghi vào lịch sử hay gửi máy chủ.
    if (isCrisis(t)) { add("bot", crisisReply(), "alert"); return; }
    history.push({ role: "user", content: text });
    if (CFG.apiUrl) {
      const typing = add("bot", "Đang soạn câu trả lời…", "typing");
      try {
        const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), CFG.timeoutMs || 30000);
        const res = await fetch(CFG.apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
          body: JSON.stringify({ messages: history.slice(-20), role: APP.state().role, profileSummary: APP.summaryText() }) });
        clearTimeout(to);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json(); typing.remove();
        say(data.reply || "(Máy chủ không trả về nội dung.)");
        return;
      } catch (err) {
        typing.remove();
        say("Không kết nối được máy chủ AI (" + err.message + "). Chuyển sang trả lời theo bộ câu hỏi có sẵn:");
      }
    }
    setTimeout(() => say(ruleReply(t, text)), 250);
  }

  /* ---------- An toàn ---------- */
  function isCrisis(t) {
    return has(t, ["tu tu", "tu sat", "muon chet", "khong muon song", "chan song", "tu hai", "tu lam hai", "cat tay", "rach tay", "ket thuc cuoc doi",
      "bi danh", "bi bao luc", "bi xam hai", "bi quay roi", "bi de doa", "bi bat nat", "tram cam", "khong muon ton tai"]);
  }
  function crisisReply() {
    const w = who();
    return `${w.You === "Bạn" ? "Mình" : "Tôi"} rất tiếc khi nghe điều này, và cảm ơn ${w.you} đã chia sẻ. Lúc này điều quan trọng nhất là sự an toàn của ${w.you === "bạn" ? "bạn" : "học sinh"}, chuyện chọn môn có thể để sau.\n\n` +
      "• Hãy nói ngay với một người lớn tin cậy: bố mẹ, giáo viên chủ nhiệm hoặc tổ tư vấn tâm lý của trường.\n" +
      "• Gọi Tổng đài quốc gia bảo vệ trẻ em 111 (miễn phí, 24/7).\n" +
      "• Nếu đang gặp nguy hiểm tức thời: gọi 115 hoặc đến cơ sở y tế gần nhất.\n\n" +
      `${w.You} không phải đối mặt một mình. ${w.You === "Bạn" ? "Mình" : "Tôi"} vẫn ở đây nếu ${w.you} muốn nói thêm.`;
  }

  /* ---------- Trả lời theo luật ---------- */
  function ruleReply(t, raw) {
    const w = who(), s = APP.state();
    const Me = w.me === "mình" ? "Mình" : "Tôi";

    // Vai trò
    if (/toi la (hoc sinh|hs)|em la hoc sinh|minh la hoc sinh/.test(t)) return setRole("hs");
    if (/toi la (phu huynh|bo|me|cha)|la phu huynh/.test(t)) return setRole("ph");
    if (/toi la (giao vien|thay|co giao)|la giao vien/.test(t)) return setRole("gv");

    if (has(t, ["ban quyen", "ai lam", "ai phat trien", "so huu", "tac gia", "cua ai"]))
      return "Cổng thông tin tư vấn học sinh thuộc bản quyền của Dr. Duyen Nguyen (© 2026). All rights reserved.";

    if (/^(xin chao|chao|hello|hi|alo)\b/.test(t)) return `Chào ${w.you}! ${w.You} muốn bắt đầu tư vấn đầy đủ, làm trắc nghiệm, hay hỏi nhanh về quy định chọn môn?`;

    if (has(t, ["giai bai", "lam bai tap", "giai toan", "viet van", "lam ho"]))
      return `${Me} chỉ hỗ trợ tư vấn chọn môn và định hướng nghề nghiệp nên không làm bài tập hộ được. ${w.You} có muốn quay lại việc chọn tổ hợp không?`;

    // Tổ hợp xét tuyển theo mã
    const m = raw.toUpperCase().match(/\b([ABCDHNV]\d{2})\b/);
    if (m && D.TO_HOP[m[1]]) {
      const th = D.TO_HOP[m[1]];
      return `${m[1]}: ${th.label}.\n` + (th.sel.length ? `Ở lớp 10 cần chọn: ${th.sel.map(APP.subjName).join(" + ")}.` : "Không cần môn lựa chọn nào (dùng các môn bắt buộc hoặc thi năng khiếu).") +
        "\nLưu ý: tổ hợp xét tuyển do từng trường đại học quy định theo năm – cần kiểm tra đề án tuyển sinh mới nhất.";
    }

    if (has(t, ["doi mon", "chuyen doi", "doi to hop", "cv 68", "cong van 68", "thay doi mon"]))
      return "Theo CV 68/BGDĐT-GDTrH: môn lựa chọn và cụm chuyên đề cần giữ ổn định đến hết lớp 12. Trường hợp đặc biệt muốn đổi:\n• Chỉ đổi vào cuối năm học, Hiệu trưởng xem xét, quyết định.\n• Phải có bản cam kết tự bổ sung kiến thức của môn mới ở lớp trước, có xác nhận của cha mẹ/người giám hộ.\n• Nhà trường tổ chức kiểm tra việc tự bổ sung.\nVì vậy nên chọn kỹ ngay từ đầu.";

    if (has(t, ["chuyen de"]))
      return "Mỗi lớp 10, 11, 12 học sinh chọn 3 cụm chuyên đề học tập của 3 môn (mỗi cụm 35 tiết/năm), nhằm học sâu, thực hành và định hướng nghề nghiệp. Các môn có cụm chuyên đề: Ngữ văn, Toán, Lịch sử, Địa lí, GDKT&PL, Vật lí, Hoá học, Sinh học, Công nghệ, Tin học, Âm nhạc, Mĩ thuật. Thường trường sẽ gắn sẵn cụm chuyên đề với từng tổ hợp.";

    if (has(t, ["thi tot nghiep", "mon thi", "thi thpt", "duoc thi"]))
      return "Theo TT 24/2024 (áp dụng từ 2025): thi bắt buộc Ngữ văn, Toán và chọn 2 môn trong các môn đã học ở lớp 12: Ngoại ngữ, Lịch sử, Vật lí, Hoá học, Sinh học, Địa lí, GDKT&PL, Tin học, Công nghệ. Âm nhạc và Mĩ thuật không phải môn thi tốt nghiệp. Nên kiểm tra lại quy chế của năm thi.";

    if (has(t, ["bat buoc"]))
      return "Môn và hoạt động bắt buộc ở THPT: " + D.COMPULSORY.join(", ") + ". Ngoài ra chọn 4 môn trong 9 môn lựa chọn và 3 cụm chuyên đề.";

    if (has(t, ["may mon", "bao nhieu mon", "chon 4", "chon 5", "mon lua chon", "mon tu chon", "nhom mon"]))
      return "Theo TT 13/2022: học sinh chọn ĐÚNG 4 môn trong 9 môn lựa chọn: " + D.SUBJECT_ORDER.map(k => D.SUBJECTS[k].name).join(", ") + ".\nKhông còn quy tắc “chọn 5 môn, mỗi nhóm ít nhất 1 môn” như bản chương trình cũ. Phương án phải nằm trong danh sách tổ hợp trường công khai.";

    if (has(t, ["holland"]))
      return "Trắc nghiệm Holland chia sở thích nghề nghiệp thành 6 nhóm: R (thực tế), I (nghiên cứu), A (nghệ sĩ), S (xã hội), E (dám nghĩ dám làm), C (quy củ). 3 nhóm điểm cao nhất tạo thành mã Holland, dùng để gợi ý ngành phù hợp. Làm ở Bước 2, khoảng 15 phút.";
    if (has(t, ["tpb", "hanh vi co ke hoach"]))
      return "TPB (Thuyết hành vi có kế hoạch) đo 4 yếu tố với một tổ hợp cụ thể: Thái độ (mình thấy tổ hợp có lợi, thú vị?), Chuẩn chủ quan (người quan trọng có ủng hộ?), Nhận thức kiểm soát (mình có tự tin, đủ điều kiện?), và Ý định. Kết quả giúp nhận ra mâu thuẫn, ví dụ thích nhưng gia đình chưa ủng hộ. Bản demo dùng thang tạm thời.";
    if (has(t, ["mbti", "tinh cach"]))
      return "Phần tính cách 4 chiều là bản rút gọn tham khảo (không phải bộ MBTI® chính thức), giúp hiểu cách bạn nạp năng lượng, tiếp nhận thông tin, ra quyết định và tổ chức công việc. Không dùng để kết luận nghề.";
    if (has(t, ["gardner", "da tri tue", "tri thong minh"]))
      return "Thuyết đa trí tuệ của Gardner gồm 8 loại: ngôn ngữ, logic – toán, không gian, vận động, âm nhạc, giao tiếp, nội tâm, thiên nhiên. Bản demo dùng 24 câu rút gọn để tìm 3 trí tuệ nổi trội.";
    if (has(t, ["chinh xac", "tin duoc khong", "dung khong"]))
      return "Các trắc nghiệm chỉ mang tính tham khảo, giúp gợi mở chứ không quyết định thay. Nên kết hợp với kết quả học tập thực tế, trải nghiệm và trao đổi với thầy cô, cha mẹ.";
    if (has(t, ["diem lop 9", "vi sao can diem"]))
      return "Kết quả lớp 9 giúp ước lượng năng lực ở các môn nền tảng (ví dụ mạch Vật lí của KHTN cho môn Vật lí lớp 10). Đây là một trong 5 tiêu chí chấm điểm phương án ở Bước 4.";

    if (has(t, ["bo me", "cha me", "gia dinh khong dong y", "noi chuyen voi"]))
      return "Gợi ý trò chuyện với gia đình:\n1. Chọn lúc thoải mái, nói rõ mong muốn và lý do (sở thích, năng lực, ngành nghề).\n2. Lắng nghe lo lắng của bố mẹ, hỏi bố mẹ mong điều gì.\n3. Cùng xem Phiếu tóm tắt ở Bước 5 và tìm điểm chung, ví dụ tổ hợp vừa mở ngành con thích vừa có phương án dự phòng bố mẹ yên tâm.\n4. Nhờ giáo viên chủ nhiệm cùng tham gia nếu cần.";

    if (has(t, ["hoc kem", "diem kem", "bi kem", "duoi 5"]))
      return "Nếu một môn lựa chọn đang yếu: gặp giáo viên bộ môn để biết lỗ hổng, lập kế hoạch tự học 2–3 buổi/tuần, học nhóm. Ở Bước 7 bạn có thể nhập điểm để web cảnh báo sớm. Việc đổi môn chỉ xét vào cuối năm học theo CV 68.";

    // Ngành nghề
    const career = D.CAREERS.find(c => {
      const n = norm(c.name);
      const keys = n.split(/[\s–\-&,()]+/).filter(x => x.length > 2 && !["nganh", "hoc", "ky", "thuat", "cong", "nghe", "khoa"].includes(x));
      return keys.some(k => t.includes(k)) || (t.includes("cntt") && c.name.includes("Công nghệ thông tin")) || (/\by\b/.test(t) && c.name === "Y đa khoa");
    });
    if (career && has(t, ["nganh", "nghe", "can", "mon", "hoc", "lam"])) {
      const need = career.th.map(k => D.TO_HOP[k]).filter(x => x.sel.length);
      return `${career.name} (${career.group}): ${career.desc}\nTổ hợp xét tuyển hay gặp: ${career.th.join(", ")}.\nMôn lựa chọn nên có ở lớp 10: ${[...new Set(need.flatMap(x => x.sel))].map(APP.subjName).join(", ") || "không bắt buộc"}.\nNhóm Holland phù hợp: ${career.h}. Hãy kiểm tra đề án tuyển sinh của trường đại học mục tiêu.`;
    }

    // Gợi ý tổ hợp
    if (has(t, ["nen chon", "goi y", "to hop nao", "chon gi", "phu hop", "tu van cho"])) {
      const sid = s.ui.step4School || s.profile.schoolId;
      const sch = APP.findSchool(sid);
      if (!sch) return `${Me} cần biết trường của ${w.you}. Hãy chọn trường ở Bước 1 hoặc Bước 4 (bản demo có trường minh hoạ, hoặc ${w.you} tự nhập danh sách tổ hợp của trường). Bản có AI sẽ tự tra cứu trên web.`;
      const ranked = sch.combos.map(c => ({ c, a: APP.analyzeCombo(c.subjects, c.cd, sch) })).sort((x, y) => y.a.total - x.a.total).slice(0, 3);
      const hs = APP.hollandStats();
      let r = `Dựa trên dữ liệu hiện có (${hs.done ? "Holland " + (hs.code || "các nhóm đồng điểm") : hs.answered ? "Holland chưa đủ câu hợp lệ" : "chưa làm Holland"}, ngành ưu tiên: ${APP.priorityCareers().map(c => c.name).join(", ")}), 3 phương án cao nhất tại ${sch.name}:\n`;
      ranked.forEach((x, i) => { r += `${i + 1}. ${APP.comboLabel(x.c.subjects)} – ${x.a.total}/100, mở thêm ${x.a.nonTrivial.join(", ") || "–"}\n`; });
      return r + `Chi tiết và rủi ro từng phương án xem ở Bước 4. Quyết định cuối cùng là của ${w.you === "bạn" ? "bạn và gia đình" : "học sinh và gia đình"}.`;
    }

    if (has(t, ["quy trinh", "buoc", "bat dau"]))
      return "Quy trình 7 bước: (1) Thu thập dữ liệu nền → (2) Trắc nghiệm tâm lý – năng lực – sở thích → (3) Khám phá ngành nghề → (4) Gợi ý tổ hợp tại trường → (5) Trao đổi với giáo viên, cha mẹ → (6) Chốt và đăng ký → (7) Theo dõi, điều chỉnh. Bấm số bước ở cột bên trái để chuyển.";

    return `${Me} chưa hiểu rõ câu hỏi. Trong bản demo, ${w.me} trả lời được các chủ đề: số môn phải chọn, môn bắt buộc, chuyên đề, đổi môn, thi tốt nghiệp, tổ hợp xét tuyển (VD: “A00 gồm gì?”), ngành nghề (VD: “Ngành Dược cần môn gì?”), Holland/TPB, và gợi ý tổ hợp. Khi tích hợp AI, chatbot sẽ trả lời linh hoạt hơn.`;
  }
  function setRole(r) {
    APP.state().role = r;
    try { localStorage.setItem("ctv_state_v1", JSON.stringify(APP.state())); } catch (e) { /* bỏ qua */ }
    document.dispatchEvent(new CustomEvent("ctv:role"));
    APP.go(APP.state().step);
    const w = who();
    return `Cảm ơn ${w.you}! Từ giờ ${w.me} sẽ xưng hô cho phù hợp. ${w.You} muốn bắt đầu từ Bước 1 hay hỏi nhanh điều gì?`;
  }
})();
