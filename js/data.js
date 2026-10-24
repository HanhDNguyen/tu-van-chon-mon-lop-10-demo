/* =========================================================
   Cổng thông tin tư vấn học sinh – DỮ LIỆU DEMO
   © 2026 Dr. Duyen Nguyen. All rights reserved.
   Dữ liệu dùng tạm cho bản demo, sẽ chuẩn hóa sau.
   ========================================================= */

window.CTV_DATA = (function () {

  /* ---------- 9 môn học lựa chọn (TT 13/2022) ---------- */
  const SUBJECTS = {
    dia:  { name: "Địa lí",                       short: "Địa",    color: "#2E8B6E", thcs: "dia",       examable: true },
    gdkt: { name: "Giáo dục kinh tế và pháp luật", short: "KT&PL",  color: "#B5651D", thcs: "gdcd",      examable: true },
    li:   { name: "Vật lí",                        short: "Lí",     color: "#2F5DA8", thcs: "khtn_li",   examable: true },
    hoa:  { name: "Hoá học",                       short: "Hoá",    color: "#8E3B8F", thcs: "khtn_hoa",  examable: true },
    sinh: { name: "Sinh học",                      short: "Sinh",   color: "#4C8A2B", thcs: "khtn_sinh", examable: true },
    cn:   { name: "Công nghệ",                     short: "CN",     color: "#6B6B2A", thcs: "cn",        examable: true },
    tin:  { name: "Tin học",                       short: "Tin",    color: "#1F7A8C", thcs: "tin",       examable: true },
    an:   { name: "Âm nhạc",                       short: "Nhạc",   color: "#C0446A", thcs: "an",        examable: false },
    mt:   { name: "Mĩ thuật",                      short: "Mĩ thuật", color: "#D0732B", thcs: "mt",      examable: false }
  };
  const SUBJECT_ORDER = ["dia", "gdkt", "li", "hoa", "sinh", "cn", "tin", "an", "mt"];

  /* Môn có cụm chuyên đề học tập (TT 13/2022) */
  const CHUYEN_DE = {
    van: "Ngữ văn", toan: "Toán", su: "Lịch sử",
    dia: "Địa lí", gdkt: "GDKT&PL", li: "Vật lí", hoa: "Hoá học", sinh: "Sinh học",
    cn: "Công nghệ", tin: "Tin học", an: "Âm nhạc", mt: "Mĩ thuật"
  };

  const COMPULSORY = ["Ngữ văn", "Toán", "Ngoại ngữ 1", "Lịch sử", "Giáo dục thể chất", "GDQP-AN",
    "Hoạt động trải nghiệm, hướng nghiệp", "Nội dung giáo dục địa phương"];

  /* ---------- Môn học lớp 9 (THCS) để nhập điểm ---------- */
  const THCS = [
    { key: "toan", name: "Toán" }, { key: "van", name: "Ngữ văn" }, { key: "anh", name: "Ngoại ngữ (Tiếng Anh)" },
    { key: "khtn_li", name: "KHTN – mạch Vật lí" }, { key: "khtn_hoa", name: "KHTN – mạch Hoá học" }, { key: "khtn_sinh", name: "KHTN – mạch Sinh học" },
    { key: "su", name: "LS&ĐL – phân môn Lịch sử" }, { key: "dia", name: "LS&ĐL – phân môn Địa lí" },
    { key: "gdcd", name: "Giáo dục công dân" }, { key: "cn", name: "Công nghệ" }, { key: "tin", name: "Tin học" },
    { key: "an", name: "Âm nhạc", passFail: true }, { key: "mt", name: "Mĩ thuật", passFail: true }
  ];

  /* ---------- Tổ hợp xét tuyển (tham khảo – mỗi trường ĐH mỗi khác) ----------
     sel = các môn LỰA CHỌN cần có ở lớp 10; base = môn bắt buộc (luôn có) */
  const TO_HOP = {
    A00: { label: "Toán – Vật lí – Hoá học", sel: ["li", "hoa"] },
    A01: { label: "Toán – Vật lí – Tiếng Anh", sel: ["li"] },
    B00: { label: "Toán – Hoá học – Sinh học", sel: ["hoa", "sinh"] },
    B08: { label: "Toán – Sinh học – Tiếng Anh", sel: ["sinh"] },
    C00: { label: "Ngữ văn – Lịch sử – Địa lí", sel: ["dia"] },
    C01: { label: "Ngữ văn – Toán – Vật lí", sel: ["li"] },
    C14: { label: "Ngữ văn – Toán – GDKT&PL", sel: ["gdkt"] },
    D01: { label: "Ngữ văn – Toán – Tiếng Anh", sel: [] },
    D07: { label: "Toán – Hoá học – Tiếng Anh", sel: ["hoa"] },
    D14: { label: "Ngữ văn – Lịch sử – Tiếng Anh", sel: [] },
    D15: { label: "Ngữ văn – Địa lí – Tiếng Anh", sel: ["dia"] },
    "T-TIN": { label: "Toán – Tin học – Tiếng Anh (mã tuỳ trường)", sel: ["tin"] },
    "T-LT":  { label: "Toán – Vật lí – Tin học (mã tuỳ trường)", sel: ["li", "tin"] },
    "T-CN":  { label: "Toán – Vật lí – Công nghệ (mã tuỳ trường)", sel: ["li", "cn"] },
    V00: { label: "Toán – Vật lí – Vẽ mĩ thuật (năng khiếu)", sel: ["li"], bonus: "mt" },
    H00: { label: "Ngữ văn – Năng khiếu vẽ 1 – Năng khiếu vẽ 2", sel: [], bonus: "mt" },
    N00: { label: "Ngữ văn – Năng khiếu nhạc 1 – Năng khiếu nhạc 2", sel: [], bonus: "an" }
  };

  /* ---------- Trắc nghiệm Holland (phiếu của dự án, 54 câu) ---------- */
  const HOLLAND = [
    { key: "R", name: "Realistic – Người thực tế", items: ["Có tính tự lập", "Có đầu óc suy nghĩ thực tế", "Dễ thích nghi với môi trường mới", "Điều khiển các máy móc, thiết bị", "Làm tốt các công việc thủ công như gấp giấy, cắt, dán, đan, móc", "Thích tiếp xúc với thiên nhiên, động, thực vật", "Thích làm công việc thực hành, tay chân", "Thích làm những công việc thực tế", "Thích làm việc ngoài trời"],
      desc: "Có khả năng về kỹ thuật, công nghệ, hệ thống; ưa thích làm việc với đồ vật, máy móc, động thực vật; thích làm các công việc ngoài trời.",
      jobs: "Kiến trúc, an toàn lao động, xây dựng, thủy sản, kỹ thuật, máy tàu thủy, nông – lâm nghiệp, cơ khí, điện – điện tử, địa chất – đo đạc, dầu khí, hải dương học, quản lý công nghiệp…" },
    { key: "I", name: "Investigative – Người nghiên cứu", items: ["Thích tìm hiểu, khám phá vấn đề mới", "Có khả năng phân tích vấn đề", "Có tư duy logic, suy nghĩ mạch lạc, chặt chẽ", "Thích quan sát, nghiên cứu", "Có khả năng tổng hợp, khái quát, suy đoán", "Thích hoạt động điều tra, phân loại, kiểm tra, đánh giá", "Biết tự tổ chức, sắp xếp công việc", "Thích thử thách, khó khăn", "Có khả năng giải quyết vấn đề"],
      desc: "Có khả năng quan sát, khám phá, phân tích đánh giá và giải quyết các vấn đề.",
      jobs: "Khoa học tự nhiên (toán, lý, hóa, sinh, địa chất, thống kê…), khoa học xã hội (tâm lý, nhân học…), y – dược, công nghệ thông tin, môi trường, nông học, thú y…" },
    { key: "A", name: "Artistic – Người có tính nghệ sĩ", items: ["Dễ xúc động", "Giàu trí tưởng tượng", "Thích tự do, không theo khuôn mẫu", "Giỏi thuyết trình, diễn xuất", "Thích chụp ảnh, vẽ, trang trí, điêu khắc", "Có năng khiếu âm nhạc", "Có khả năng viết, trình bày ý tưởng", "Thích sự mới mẻ, công việc sáng tạo", "Thoải mái biểu lộ những ý thích riêng"],
      desc: "Có khả năng về nghệ thuật, trực giác, tưởng tượng cao; thích môi trường ngẫu hứng, không khuôn mẫu.",
      jobs: "Văn chương, báo chí – truyền thông, điện ảnh, sân khấu, mỹ thuật, ca nhạc, múa, kiến trúc, thời trang, thiết kế, bảo tàng – bảo tồn…" },
    { key: "S", name: "Social – Người có tính xã hội", items: ["Thân thiện, hay giúp đỡ người khác", "Thích gặp gỡ, làm việc với nhiều người", "Lịch thiệp, tử tế", "Thích khuyên bảo, giảng giải cho người khác", "Biết lắng nghe, chia sẻ", "Thích các công việc chăm sóc sức khỏe", "Thích hoạt động công tác xã hội, phục vụ cộng đồng", "Mong muốn được đóng góp để xã hội tốt đẹp hơn", "Có khả năng hòa giải, giải quyết mâu thuẫn"],
      desc: "Có khả năng ngôn ngữ, giảng giải; thích giảng dạy, cung cấp thông tin, chăm sóc, giúp đỡ, huấn luyện người khác.",
      jobs: "Sư phạm, tư vấn – hướng nghiệp, công tác xã hội, y tế cộng đồng, điều dưỡng, tâm lý, nhân sự, du lịch, thư viện…" },
    { key: "E", name: "Enterprising – Dám nghĩ, dám làm", items: ["Thích phiêu lưu", "Có tính quyết đoán", "Năng động", "Có khả năng diễn đạt, tranh luận, thuyết phục", "Thích làm quản lý, chỉ đạo, nhận xét, đánh giá, đặt ra mục tiêu, kế hoạch", "Thích tạo ảnh hưởng đối với người khác", "Thích cạnh tranh để vượt qua người khác", "Muốn được mọi người kính trọng, vị nể", "Sẵn sàng chấp nhận rủi ro để đạt mục tiêu"],
      desc: "Có khả năng kinh doanh, mạnh dạn, dám nghĩ dám làm, có thể gây ảnh hưởng, thuyết phục người khác, có khả năng quản lý.",
      jobs: "Quản trị kinh doanh, thương mại, marketing, tài chính, luật, dịch vụ khách hàng, logistics, báo chí, khởi nghiệp…" },
    { key: "C", name: "Conventional – Người quy củ", items: ["Có đầu óc tổ chức, sắp xếp, ngăn nắp", "Cẩn thận, tỉ mỉ", "Chu đáo, chính xác, đáng tin cậy", "Có khả năng tính toán, so sánh, ghi chép số liệu", "Thích công việc lưu trữ, phân loại, cập nhật thông tin", "Thường dự kiến về chỉ tiêu, ngân sách", "Thích làm việc có nhiệm vụ, mục tiêu rõ ràng", "Có khả năng lên kế hoạch, điều phối công việc", "Thích làm việc với con số, theo hướng dẫn, quy trình"],
      desc: "Có khả năng về số học, thích công việc chi tiết, làm việc với số liệu, theo chỉ dẫn hoặc công việc văn phòng.",
      jobs: "Kế toán, kiểm toán, thống kê, hành chính, thanh tra, quản trị văn phòng, phân tích dữ liệu…" }
  ];
  const HOLLAND_SCALE = ["Chưa bao giờ đúng", "Đúng vài trường hợp", "Đúng khoảng ½", "Đúng đa số", "Luôn đúng"];

  /* ---------- Trắc nghiệm nhân cách EYSENCK (59 câu, theo tài liệu “2. TN NHÂN CÁCH EYSENCK”) ---------- */
  const EYSENCK = [
    "Bạn có thường xuyên bị lôi cuốn bởi những cảm tưởng, những ấn tượng mới mẻ hoặc đi tìm nguồn cảm xúc mạnh mẽ để giải buồn hoặc làm cho mình phấn chấn không?",
    "Bạn có thích luôn luôn có mặt ở trong nhóm, trong hội của mình không?",
    "Có đúng là bạn thích trò chuyện đến mức là không bao giờ bỏ lỡ cơ hội để được nói chuyện, kể cả với người không quen biết không?",
    "Bạn có muốn trước khi làm việc gì cũng phải cân nhắc, suy nghĩ, không vội vàng không?",
    "Bạn có thích làm những công việc đòi hỏi sự chú ý thường xuyên không?",
    "Bạn có thường xuyên cần có người ý hợp tâm đồng để động viên, an ủi không?",
    "Có đúng bạn là người đôi khi rất nhiệt tình trong công việc nhưng cũng có lúc hoàn toàn chán chường, uể oải không?",
    "Có nỗi đau nào làm cho bạn lo lắng không?",
    "Tâm trạng của bạn có thường hay thay đổi, lúc vui, lúc buồn không?",
    "Có bao giờ bạn run sợ không?",
    "Đôi lúc, bạn cũng nổi nóng, không kiềm chế được, phải không?",
    "Có khi nào bạn nói về những điều mà bạn không am hiểu không?",
    "Bạn là người vô tư, không bận tâm đến điều gì, phải không?",
    "Có phải lúc ai đó tăng dần quát tháo với bạn thì bạn cũng quát tháo lại không?",
    "Bạn có cảm thấy thật bất hạnh nếu trong thời gian dài không tiếp xúc rộng rãi với mọi người không?",
    "Bạn thích đọc sách hơn là trò chuyện với người khác, phải không?",
    "Bạn có cảm thấy khó chịu khi sống trong một tập thể mà mọi người hay giễu cợt nhau không?",
    "Bạn cảm thấy rất khó khăn khi phải từ bỏ những ý định của mình hoặc từ chối người khác ngay cả khi hoàn cảnh bắt phải như thế không?",
    "Bạn thường day dứt mỗi khi gặp sai lầm, phải không?",
    "Bạn có cho mình là người dễ xúc động, dễ phản ứng không?",
    "Bạn có dễ phật ý không?",
    "Bạn có hay bực tức không?",
    "Có những ý nghĩ mà bạn giữ kín, không cho người khác biết, phải không?",
    "Khi đã hứa làm việc gì, bất kể lời hứa đó có thuận lợi cho mình hay không, bạn vẫn luôn luôn giữ lời hứa, phải không?",
    "Bạn có hay nói và hành động một cách bột phát vội vàng, không kịp suy nghĩ không?",
    "Bạn có khả năng làm chủ được tình cảm của mình và hoàn toàn vui vẻ trong các buổi hội họp, phải không?",
    "Bạn có cho mình là người hoàn toàn tự tin không?",
    "Bạn có cho rằng chỉ cần ít bạn nhưng phải là những bạn thân không?",
    "Bạn đi đứng ung dung, thong thả, phải không?",
    "Có khi nào bạn thấy mình là người bất hạnh một cách vô duyên cớ không?",
    "Bạn có cho mình là người nhạy cảm và dễ bị kích động không?",
    "Bạn có hay phật ý khi người khác chỉ ra những lỗi lầm trong công tác, trong cuộc sống riêng tư của bạn không?",
    "Bạn có hay mơ ước không?",
    "Bạn hay có những cơn ác mộng không?",
    "Đôi khi bạn cũng thêm thắt câu chuyện cho sinh động, phải không?",
    "Tất cả thói quen của bạn đều tốt và hợp với mong muốn của bạn, phải không?",
    "Bạn có cho mình là người không hề lúng túng, không phải mất công tìm kiếm cũng luôn đưa ra lời giải đáp khi phải đánh giá, nhận xét một vấn đề nào đó và sẵn sàng làm tất cả để tranh luận đến cùng không?",
    "Người ta cho bạn là người hoạt bát, vui vẻ, phải không?",
    "Bạn có dễ dàng làm cho nhóm bạn bè của bạn đang buồn chán, tẻ nhạt thành sôi nổi, vui vẻ không?",
    "Ở chỗ đông người, bạn thường im lặng, phải không?",
    "Bạn có cho rằng khó có thể hài lòng trong một buổi gặp mặt liên hoan không?",
    "Bạn có thấy rụt rè, e thẹn khi muốn bắt chuyện với một người khác giới dễ mến nhưng chưa quen biết không?",
    "Sau khi làm xong một việc, bạn có cho rằng mình có thể làm việc đó tốt hơn không?",
    "Bạn có lo lắng về sức khoẻ bản thân không?",
    "Bạn có hay bị mất ngủ vì những ý nghĩ lộn xộn trong đầu không?",
    "Sự cảm nhận rằng mình thấp kém hơn người khác có làm bạn khó chịu không?",
    "Có bao giờ bạn đến nơi hẹn hoặc nơi làm hay đi học muộn giờ không?",
    "Nếu như không có người kiểm tra khi đi tàu xe, bạn có mua vé không?",
    "Bạn có hay hành động một cách bồng bột, nông nổi không?",
    "Bạn có thích làm những công việc hoàn toàn gấp gáp không?",
    "Bạn có thích được người khác cho mình là quan trọng không?",
    "Khi muốn biết một điều gì, bạn thường tự tìm trong sách vở, internet chứ không hỏi người khác, phải không?",
    "Bạn có thích trêu đùa người khác không?",
    "Bạn có hay ân hận về những lời bạn đã nói, về những việc bạn đã làm mà lẽ ra không nên nói, không nên làm như vậy không?",
    "Trước những sự việc có hoặc không thể xảy ra, bạn có hồi hộp không?",
    "Đôi lúc bạn tự cảm thấy mình thật sự lo lắng một điều vô lý nào đó mà không lý giải nổi, phải không?",
    "Có bao giờ bạn hồi hộp trước một sự kiện nào đó không?",
    "Bạn có bị mất ngủ không?",
    "Trong số những người quen, có người bạn không ưa họ một cách công khai, phải không?"
  ];
  // Bảng khoá: câu n nằm ở cột (n − 1) % 12; mỗi cột cho điểm 1 khi câu trả lời trùng dấu của cột.
  // Cột 1–5: HN (hướng ngoại), cột 6–10: KOD (không ổn định cảm xúc), cột 11–12: S (thành thật).
  // Bản gốc in dấu “−” ở cột 9–10 (câu 9, 10, 21, 22, 33, 34, 45, 46, 57, 58). Nội dung các câu này đều là
  // biểu hiện không ổn định (tâm trạng thay đổi, run sợ, bực tức, ác mộng, mất ngủ…), nên ở đây tính “+”.
  const EYSENCK_KEY = [["HN", "+"], ["HN", "+"], ["HN", "+"], ["HN", "-"], ["HN", "-"],
    ["KOD", "+"], ["KOD", "+"], ["KOD", "+"], ["KOD", "+"], ["KOD", "+"], ["S", "+"], ["S", "-"]];
  const EYSENCK_MID = 12; // tâm của biểu đồ trong tài liệu (trục 0–24)
  const EYSENCK_TYPES = {
    uuTu: { name: "Ưu tư", axis: "hướng nội, không ổn định", traits: [
      "Ý nghĩ và cảm xúc tập trung nhiều vào nội tâm, ít quan tâm đến xung quanh; thiên về phân tích những tâm trạng của bản thân.",
      "Rất dễ bi quan, hay lo âu; nhiều khi rất khắt khe với bản thân và với những người xung quanh.",
      "Sống khá dè dặt vì vậy khó hòa đồng với mọi người.",
      "Thao tác hơi chậm, đôi khi phản ứng một cách khó khăn, vụng về; dễ có cảm giác mệt mỏi.",
      "Hay bị lúng túng trong việc ứng xử ở những hoàn cảnh mới."],
      jobs: "nghiên cứu, thủ thư, công việc có sự lặp đi lặp lại trong các nhà máy và văn phòng, hoặc công việc sáng tạo trong nghệ thuật và quảng cáo" },
    binhThan: { name: "Bình thản", axis: "hướng nội, ổn định", traits: [
      "Trầm tính, luôn có cái nhìn chiều sâu về người khác.",
      "Khá sâu sắc về tình cảm, dễ đồng cảm với mọi người (tuy nhiên không dễ dàng rung cảm ngay trước những biến cố trong đời sống).",
      "Cẩn thận, điềm đạm nên trong mắt người khác là người rất đáng tin, mọi người hay tâm sự.",
      "Trong hành động không vội vàng hấp tấp, có căn cứ lý luận, kiên trì, làm đến cùng theo mục đích.",
      "Ưa sự ngăn nắp, gọn gàng."],
      jobs: "nghiên cứu, thủ thư, nhân viên văn phòng, luật sư, quản lí ngân hàng, kế toán" },
    nongNay: { name: "Nóng nảy", axis: "hướng ngoại, không ổn định", traits: [
      "Dễ bị kích động, không kiềm chế được bản thân (dễ có phản ứng gay gắt khi không đồng ý về một vấn đề nào đó).",
      "Các trạng thái tâm lý diễn ra nhanh với cường độ mạnh nhưng cũng kết thúc nhanh chóng.",
      "Dễ đồng cảm, dễ thiết lập các mối quan hệ với mọi người nhưng khó có chiều sâu trong các mối quan hệ.",
      "Dễ làm mất lòng người khác vì không lắng nghe họ nói.",
      "Rất dễ bị tự ái; sống lạc quan và khá chủ động."],
      jobs: "các ngành dịch vụ như hướng dẫn viên du lịch, nhân viên bán hàng; một số công việc mang tính sáng tạo về nghệ thuật hoặc quảng cáo" },
    hangHai: { name: "Hăng hái", axis: "hướng ngoại, ổn định", traits: [
      "Rất dễ hòa đồng với mọi người; nói nhiều và hay thổ lộ cảm xúc của mình với người xung quanh; dễ cảm thông.",
      "Luôn nhìn cuộc sống rất sống động và vui tươi.",
      "Thẳng thắn, kiên quyết, nói và làm đi đôi với nhau.",
      "Có khả năng lãnh đạo."],
      jobs: "hướng dẫn viên, nhân viên bán hàng, cảnh sát, phi công, nhân viên marketing, hoặc các lĩnh vực về truyền thông" }
  };

  /* ---------- Trắc nghiệm tính cách MBTI (70 câu, theo tài liệu “3. TN tinh-cach-MBTI”) ---------- */
  // [câu hỏi, lựa chọn a, lựa chọn b]
  const MBTI = [
    ["Tại một buổi tiệc, bạn sẽ:", "Giao tiếp với nhiều người, kể cả người lạ", "Chỉ giao tiếp với một số ít người mà bạn đã quen"],
    ["Bạn thấy mình là người nghiêng về kiểu nào nhiều hơn?", "Thực tế", "Sáng tạo"],
    ["Bạn nghĩ tình huống nào tồi tệ hơn?", "Đầu óc của bạn cứ “bay bổng trên mây”", "Cuộc sống của bạn thật nhàm chán và không bao giờ thay đổi"],
    ["Bạn sẽ bị ấn tượng hơn với:", "Các nguyên tắc", "Những cảm xúc"],
    ["Khi quyết định việc gì đó, bạn thường hay dựa vào:", "Sự thuyết phục", "Sự đồng cảm"],
    ["Bạn thích làm việc theo kiểu nào nhiều hơn?", "Theo đúng thời hạn", "Tùy hứng"],
    ["Bạn có khuynh hướng đưa ra các lựa chọn:", "Rất cẩn thận", "Phần nào theo cảm nhận"],
    ["Tại các bữa tiệc, bạn thường:", "Ở lại tới cùng và cảm thấy càng lúc càng hào hứng", "Ra về sớm vì cảm thấy mệt mỏi dần"],
    ["Kiểu người nào sẽ thu hút bạn hơn?", "Người thực tế và có lý lẽ", "Người giàu trí tưởng tượng"],
    ["Điều nào khiến bạn thấy thích thú hơn?", "Những điều thực tế", "Những ý tưởng khả thi"],
    ["Khi đánh giá hoặc phán xét người khác, bạn thường hay dựa vào điều gì?", "Luật lệ và nguyên tắc", "Hoàn cảnh"],
    ["Khi tiếp cận, tiếp xúc người khác, bạn nghiêng về hướng nào hơn?", "Tiếp cận theo hướng khách quan", "Tiếp cận theo hướng sử dụng trải nghiệm cá nhân"],
    ["Phong cách của bạn nghiêng về hướng nào hơn?", "Đúng giờ, nghiêm túc", "Nhàn nhã, thoải mái"],
    ["Bạn cảm thấy không thoải mái khi có những việc:", "Chưa hoàn thiện", "Đã quá hoàn thiện"],
    ["Trong các mối quan hệ xã hội, bạn thường:", "Luôn nắm bắt kịp thời thông tin về các vấn đề của mọi người", "Thường biết thông tin sau những người khác"],
    ["Với các công việc thông thường, bạn nghiêng về cách:", "Làm theo cách thông thường", "Làm theo cách của riêng mình"],
    ["Các nhà văn nên:", "Viết những gì họ nghĩ và chân thật với những gì mình viết", "Diễn đạt sự việc bằng cách so sánh hay liên tưởng"],
    ["Điều gì lôi cuốn bạn hơn?", "Tính nhất quán của tư duy, suy nghĩ", "Sự hòa hợp trong các mối quan hệ của con người"],
    ["Bạn cảm thấy thoải mái hơn khi đưa ra:", "Những đánh giá, nhận xét một cách logic", "Những đánh giá, nhận xét một cách có ý nghĩa"],
    ["Bạn thích những điều:", "Đã được sắp xếp, quyết định trước", "Chưa xác định, chưa được quyết định"],
    ["Bạn tự thấy mình:", "Nghiêm túc, quyết đoán", "Dễ gần, thoải mái"],
    ["Khi nói chuyện điện thoại, bạn:", "Cứ gọi bình thường", "Chuẩn bị trước những điều sẽ nói"],
    ["Những sự kiện trong thực tế:", "Bản thân nó giải thích cho chính nó", "Nó là bằng chứng giải thích cho các quy tắc, quy luật"],
    ["Những người có tầm nhìn xa/người lo xa:", "Thường gây khó chịu cho người khác", "Khá thú vị"],
    ["Bạn thường là người:", "Cái đầu lạnh", "Trái tim nóng"],
    ["Điều nào thì tồi tệ hơn?", "Không công bằng", "Tàn nhẫn"],
    ["Các sự kiện nên xảy ra theo hướng:", "Được lựa chọn và cân nhắc kỹ lưỡng", "Ngẫu nhiên và tự nhiên"],
    ["Bạn cảm thấy thoải mái hơn khi:", "Đã mua một thứ gì đó", "Đang lựa chọn để mua"],
    ["Trong công ty, bạn là người:", "Khởi xướng các câu chuyện", "Đợi người khác bắt chuyện với mình"],
    ["Đối với những quy ước, quy tắc thông thường trong xã hội, bạn:", "Ít khi nghi ngờ những điều này", "Thường xem xét lại tính đúng đắn của những điều đó"],
    ["Trẻ em thường:", "Chưa cố gắng đủ", "Chưa vui chơi đủ"],
    ["Khi đưa ra các quyết định, bạn sẽ thấy thoải mái hơn với:", "Các tiêu chuẩn", "Cảm xúc, cảm nhận"],
    ["Bạn nghiêng về tính cách nào hơn?", "Cứng rắn", "Nhẹ nhàng"],
    ["Theo bạn, khả năng nào đáng khâm phục hơn?", "Khả năng tổ chức và làm việc có phương pháp", "Khả năng thích ứng và xoay xở trước mọi tình huống"],
    ["Bạn đề cao tố chất nào hơn?", "Sự chắc chắn", "Sự cởi mở"],
    ["Khi phải tương tác với người khác ở các tình huống và vấn đề mới lạ, không thường gặp, bạn thường:", "Thấy phấn chấn và hào hứng", "Cảm thấy mệt mỏi"],
    ["Thường thì bạn là:", "Người thực tế", "Người có khả năng tưởng tượng phong phú"],
    ["Bạn thường có xu hướng:", "Xem người khác có thể làm được việc gì hữu ích", "Xem người khác sẽ nghĩ và cảm nhận như thế nào"],
    ["Bạn cảm thấy thoải mái hơn khi:", "Thảo luận một vấn đề kĩ lưỡng, triệt để", "Đạt được thỏa thuận, sự nhất trí về vấn đề"],
    ["Cái đầu hay trái tim chi phối bạn nhiều hơn?", "Cái đầu", "Trái tim"],
    ["Bạn cảm thấy thoải mái hơn khi làm các công việc theo dạng:", "Được giao trọn gói, làm xong hết rồi bàn giao", "Công việc làm hàng ngày, theo lịch"],
    ["Bạn có xu hướng tìm kiếm những điều:", "Theo trật tự, thứ tự", "Ngẫu nhiên"],
    ["Bạn thích kiểu nào hơn?", "Nhiều bạn bè ở mức độ xã giao", "Một vài người bạn thân"],
    ["Bạn thường dựa vào:", "Sự kiện, thông tin thực tế", "Nguyên lý, nguyên tắc"],
    ["Bạn hứng thú với việc gì hơn?", "Sản xuất và phân phối", "Thiết kế và nghiên cứu"],
    ["Lời khen nào giá trị hơn?", "“Đó là một người có suy nghĩ rất logic”", "“Đó là một người rất tình cảm, tinh tế”"],
    ["Bạn thích mình có tố chất nào hơn?", "Kiên định, vững vàng", "Toàn tâm, cống hiến"],
    ["Bạn thường thích điều nào hơn?", "Một tuyên bố cuối cùng, không thay đổi", "Một tuyên bố dự kiến, ban đầu"],
    ["Bạn thấy thoải mái hơn vào lúc:", "Trước khi đưa ra quyết định", "Sau khi đưa ra quyết định"],
    ["Bạn có thấy mình:", "Dễ dàng bắt chuyện và kéo dài cuộc trò chuyện với người mới gặp", "Khó mà trò chuyện nhiều với những người mới quen"],
    ["Bạn có xu hướng tin tưởng vào:", "Kinh nghiệm của mình", "Linh cảm của mình"],
    ["Bạn cho rằng mình thuộc tuýp người nào hơn?", "Người thực tế", "Người khôn khéo"],
    ["Theo bạn ai là người đáng được khen ngợi hơn?", "Một người giàu lý trí", "Một người giàu cảm xúc"],
    ["Bạn có xu hướng hành xử:", "Công bằng, vô tư", "Thông cảm, đồng cảm"],
    ["Bạn thích:", "Đảm bảo rằng mọi việc được chuẩn bị, thu xếp sẵn sàng", "Để mọi việc diễn ra tự nhiên"],
    ["Trong các mối quan hệ thì mọi việc:", "Có thể thảo luận để giải quyết được", "Diễn ra ngẫu nhiên và tùy theo điều kiện hoàn cảnh"],
    ["Khi chuông điện thoại reo, bạn sẽ:", "Là người đầu tiên nhấc máy", "Hi vọng có người khác sẽ nhấc máy"],
    ["Bạn đánh giá cao điều gì trong mình hơn?", "Nhận thức tốt về các yếu tố thực tế", "Có trí tưởng tượng phong phú, rực rỡ"],
    ["Bạn sẽ chú tâm hơn đến:", "Các nguyên tắc, nguyên lý cơ bản", "Các ngụ ý, hàm ý, ẩn ý"],
    ["Điều gì có vẻ sẽ là một lỗi lớn hơn?", "Quá nồng nhiệt, thiết tha", "Quá khách quan, thờ ơ"],
    ["Về cơ bản, bạn sẽ đánh giá mình là người thế nào?", "Thiết thực, ít bị chi phối bởi tình cảm", "Từ tâm, đa cảm"],
    ["Tình huống nào sẽ lôi cuốn bạn hơn?", "Tình huống rõ ràng, có kế hoạch", "Tình huống không xác định, không có kế hoạch"],
    ["Bạn là người có xu hướng nào hơn?", "Theo thói quen", "Hay thay đổi"],
    ["Bạn có xu hướng nào hơn?", "Là người dễ tiếp cận", "Ở mức độ nào đó là người kín đáo"],
    ["Khi viết, bạn thích:", "Viết theo hướng văn chương hơn", "Viết theo số liệu, dữ liệu hơn"],
    ["Đối với bạn, điều gì khó thực hiện hơn?", "Hiểu và chia sẻ với người khác", "Điều khiển người khác"],
    ["Bạn mong ước mình sẽ có thêm nhiều điều gì?", "Lí trí và khả năng nhận xét rõ ràng", "Tình thương, lòng trắc ẩn sâu sắc"],
    ["Điều gì sẽ là lỗi lớn hơn?", "Hành động bừa bãi, không cân nhắc", "Hành động chỉ trích, phê phán"],
    ["Bạn sẽ thích sự kiện nào hơn?", "Sự kiện có lên kế hoạch trước", "Sự kiện không có kế hoạch trước"],
    ["Bạn thường có hành động:", "Cân nhắc thận trọng", "Tự nhiên, tự phát"]
  ];
  // Bảng tính điểm: câu n nằm ở cột (n − 1) % 7. Cột 1 → E/I; cột 2–3 → S/N; cột 4–5 → T/F; cột 6–7 → J/P (a → chữ trước, b → chữ sau).
  const MBTI_DIMS = [
    { dim: "EI", a: "E", b: "I", label: "Nguồn năng lượng", cols: [0] },
    { dim: "SN", a: "S", b: "N", label: "Cách tiếp nhận thông tin", cols: [1, 2] },
    { dim: "TF", a: "T", b: "F", label: "Cách ra quyết định", cols: [3, 4] },
    { dim: "JP", a: "J", b: "P", label: "Cách tổ chức công việc", cols: [5, 6] }
  ];
  const MBTI_DESC = {
    E: "Hướng ngoại – nạp năng lượng khi giao tiếp, làm việc cùng nhiều người",
    I: "Hướng nội – nạp năng lượng khi ở một mình, tập trung sâu, làm việc độc lập tốt",
    S: "Giác quan – chú ý sự kiện, chi tiết cụ thể, tin vào kinh nghiệm thực tế",
    N: "Trực giác – chú ý ý tưởng, bức tranh tổng thể và các khả năng mới",
    T: "Lý trí – quyết định dựa trên logic, nguyên tắc, tính khách quan",
    F: "Cảm xúc – quyết định dựa trên giá trị, sự đồng cảm, hòa hợp giữa mọi người",
    J: "Nguyên tắc – thích kế hoạch rõ ràng, ngăn nắp, chốt việc sớm",
    P: "Linh hoạt – thích để ngỏ lựa chọn, thích ứng nhanh với tình huống"
  };

  /* ---------- Trọng số liên hệ sở thích → môn lựa chọn ---------- */
  const HOLLAND_SUBJ = {
    R: { cn: 1, li: .8, tin: .5, sinh: .4, dia: .4 },
    I: { li: 1, hoa: 1, sinh: 1, tin: .8, dia: .4 },
    A: { mt: 1, an: 1, tin: .4, dia: .3, gdkt: .3 },
    S: { gdkt: .8, sinh: .6, dia: .6, hoa: .4 },
    E: { gdkt: 1, dia: .6, tin: .6, li: .3 },
    C: { tin: 1, gdkt: .6, li: .4, dia: .4, hoa: .3 }
  };

  /* ---------- Ngành nghề (minh hoạ – tổ hợp xét tuyển cần kiểm tra theo từng trường) ----------
     ey: ngành nằm trong gợi ý nghề của tài liệu Eysenck cho khí chất nào (giá trị = cụm từ trích từ tài liệu) */
  const CAREERS = [
    { name: "Y đa khoa", group: "Sức khoẻ", h: "ISR", th: ["B00", "A00", "B08", "D07"], thcs: ["khtn_hoa", "khtn_sinh", "toan"], desc: "Khám, chẩn đoán, điều trị bệnh. Học dài (6 năm+), cần bền bỉ và tinh thần trách nhiệm cao." },
    { name: "Dược học", group: "Sức khoẻ", h: "ICR", th: ["A00", "B00", "D07"], thcs: ["khtn_hoa", "khtn_sinh", "toan"], desc: "Nghiên cứu, sản xuất, tư vấn sử dụng thuốc; làm ở nhà thuốc, bệnh viện, công ty dược." },
    { name: "Điều dưỡng", group: "Sức khoẻ", h: "SIR", th: ["B00", "B08", "A00"], thcs: ["khtn_sinh", "khtn_hoa"], desc: "Chăm sóc, theo dõi người bệnh; cần sự tận tâm, kiên nhẫn, sức khoẻ tốt." },
    { name: "Răng – Hàm – Mặt", group: "Sức khoẻ", h: "IRA", th: ["B00", "A00"], thcs: ["khtn_hoa", "khtn_sinh"], desc: "Chẩn đoán, điều trị bệnh răng miệng; cần sự khéo léo, tỉ mỉ." },
    { name: "Kỹ thuật xét nghiệm y học", group: "Sức khoẻ", h: "ICR", th: ["B00", "A00", "B08"], thcs: ["khtn_sinh", "khtn_hoa"], desc: "Thực hiện xét nghiệm hỗ trợ chẩn đoán; làm việc trong phòng thí nghiệm." },
    { name: "Công nghệ thông tin", group: "Công nghệ – Kỹ thuật", h: "IRC", th: ["A00", "A01", "D01", "T-TIN", "T-LT"], thcs: ["toan", "tin", "khtn_li"], desc: "Phát triển phần mềm, hệ thống, mạng; nhu cầu tuyển dụng rộng ở nhiều lĩnh vực." },
    { name: "Khoa học dữ liệu & Trí tuệ nhân tạo", group: "Công nghệ – Kỹ thuật", h: "ICR", ey: { uuTu: "nghiên cứu", binhThan: "nghiên cứu" }, th: ["A00", "A01", "D01", "T-TIN", "T-LT"], thcs: ["toan", "tin"], desc: "Phân tích dữ liệu, xây dựng mô hình AI; cần Toán tốt và tư duy logic." },
    { name: "An toàn thông tin", group: "Công nghệ – Kỹ thuật", h: "ICR", th: ["A00", "A01", "T-TIN", "T-LT"], thcs: ["toan", "tin"], desc: "Bảo vệ hệ thống, dữ liệu trước tấn công mạng." },
    { name: "Kỹ thuật điện – điện tử", group: "Công nghệ – Kỹ thuật", h: "RIC", th: ["A00", "A01", "T-CN", "T-LT"], thcs: ["khtn_li", "toan", "cn"], desc: "Thiết kế, vận hành hệ thống điện, mạch điện tử, thiết bị thông minh." },
    { name: "Kỹ thuật cơ khí – Cơ điện tử", group: "Công nghệ – Kỹ thuật", h: "RIC", th: ["A00", "A01", "T-CN"], thcs: ["khtn_li", "toan", "cn"], desc: "Thiết kế, chế tạo máy móc, robot, dây chuyền tự động." },
    { name: "Kỹ thuật ô tô", group: "Công nghệ – Kỹ thuật", h: "RIE", th: ["A00", "A01", "T-CN"], thcs: ["khtn_li", "cn"], desc: "Thiết kế, bảo dưỡng, sửa chữa ô tô và phương tiện điện." },
    { name: "Xây dựng", group: "Công nghệ – Kỹ thuật", h: "RIC", th: ["A00", "A01", "T-CN"], thcs: ["khtn_li", "toan"], desc: "Thiết kế, thi công, quản lý công trình." },
    { name: "Kiến trúc", group: "Công nghệ – Kỹ thuật", h: "AIR", th: ["V00", "A00", "A01"], thcs: ["toan", "mt", "khtn_li"], desc: "Thiết kế công trình, không gian; thường thi thêm năng khiếu vẽ." },
    { name: "Công nghệ sinh học", group: "Khoa học tự nhiên", h: "IRC", ey: { uuTu: "nghiên cứu", binhThan: "nghiên cứu" }, th: ["B00", "A00", "D07"], thcs: ["khtn_sinh", "khtn_hoa"], desc: "Ứng dụng sinh học trong y dược, nông nghiệp, thực phẩm." },
    { name: "Công nghệ thực phẩm", group: "Khoa học tự nhiên", h: "IRC", th: ["A00", "B00", "D07"], thcs: ["khtn_hoa", "khtn_sinh"], desc: "Chế biến, bảo quản, kiểm định chất lượng thực phẩm." },
    { name: "Khoa học môi trường", group: "Khoa học tự nhiên", h: "IRS", ey: { uuTu: "nghiên cứu", binhThan: "nghiên cứu" }, th: ["A00", "B00", "D07", "C00"], thcs: ["khtn_hoa", "khtn_sinh", "dia"], desc: "Đánh giá, xử lý, quản lý môi trường; phát triển bền vững." },
    { name: "Hoá học – Vật liệu", group: "Khoa học tự nhiên", h: "IRC", ey: { uuTu: "nghiên cứu", binhThan: "nghiên cứu" }, th: ["A00", "B00", "D07"], thcs: ["khtn_hoa", "toan"], desc: "Nghiên cứu, sản xuất hoá chất, vật liệu mới." },
    { name: "Nông nghiệp công nghệ cao", group: "Nông – Lâm – Thuỷ sản", h: "RIE", th: ["B00", "A00", "B08"], thcs: ["khtn_sinh", "cn"], desc: "Trồng trọt, chăn nuôi ứng dụng công nghệ, quản lý trang trại." },
    { name: "Thú y", group: "Nông – Lâm – Thuỷ sản", h: "IRS", th: ["B00", "A00"], thcs: ["khtn_sinh", "khtn_hoa"], desc: "Chăm sóc, chữa bệnh cho vật nuôi; kiểm dịch động vật." },
    { name: "Kinh tế – Quản trị kinh doanh", group: "Kinh tế – Quản lý", h: "ECS", th: ["A00", "A01", "D01", "C14"], thcs: ["toan", "anh", "gdcd"], desc: "Quản lý doanh nghiệp, nhân sự, vận hành; phù hợp người năng động, thích dẫn dắt." },
    { name: "Marketing", group: "Kinh tế – Quản lý", h: "EAS", ey: { hangHai: "nhân viên marketing", uuTu: "quảng cáo", nongNay: "quảng cáo" }, th: ["A01", "D01", "C14", "A00"], thcs: ["van", "anh", "toan"], desc: "Nghiên cứu thị trường, xây dựng thương hiệu, truyền thông sản phẩm." },
    { name: "Tài chính – Ngân hàng", group: "Kinh tế – Quản lý", h: "CEI", ey: { binhThan: "quản lí ngân hàng" }, th: ["A00", "A01", "D01", "C14"], thcs: ["toan", "anh"], desc: "Quản lý tài chính, đầu tư, ngân hàng; cần cẩn thận và giỏi tính toán." },
    { name: "Kế toán – Kiểm toán", group: "Kinh tế – Quản lý", h: "CIE", ey: { binhThan: "kế toán", uuTu: "công việc văn phòng" }, th: ["A00", "A01", "D01", "C14"], thcs: ["toan"], desc: "Ghi chép, phân tích, kiểm tra số liệu tài chính." },
    { name: "Logistics – Chuỗi cung ứng", group: "Kinh tế – Quản lý", h: "ECR", th: ["A00", "A01", "D01", "C00"], thcs: ["toan", "anh", "dia"], desc: "Quản lý vận tải, kho bãi, xuất nhập khẩu." },
    { name: "Luật", group: "Xã hội – Nhân văn", h: "ESI", ey: { binhThan: "luật sư" }, th: ["C00", "D01", "A00", "C14"], thcs: ["van", "gdcd", "su"], desc: "Tư vấn, bảo vệ quyền lợi pháp lý; cần lập luận chặt chẽ, diễn đạt tốt." },
    { name: "Báo chí – Truyền thông", group: "Xã hội – Nhân văn", h: "AES", ey: { hangHai: "truyền thông" }, th: ["C00", "D01", "D14", "D15"], thcs: ["van", "su", "dia"], desc: "Sản xuất tin tức, nội dung đa phương tiện, quan hệ công chúng." },
    { name: "Tâm lý học", group: "Xã hội – Nhân văn", h: "SIA", th: ["B00", "C00", "D01"], thcs: ["van", "khtn_sinh"], desc: "Nghiên cứu, tư vấn tâm lý trong trường học, doanh nghiệp, bệnh viện." },
    { name: "Sư phạm (Tiểu học, KHXH)", group: "Giáo dục", h: "SAC", th: ["C00", "D01", "D14", "D15"], thcs: ["van", "su", "dia"], desc: "Giảng dạy ở bậc tiểu học hoặc môn khoa học xã hội." },
    { name: "Sư phạm (Toán, KHTN, Tin)", group: "Giáo dục", h: "SIC", th: ["A00", "A01", "B00", "D01"], thcs: ["toan", "khtn_li", "khtn_hoa"], desc: "Giảng dạy Toán, Vật lí, Hoá học, Sinh học hoặc Tin học." },
    { name: "Ngôn ngữ Anh – Quan hệ quốc tế", group: "Xã hội – Nhân văn", h: "SEA", th: ["D01", "D14", "D15", "C00"], thcs: ["anh", "van"], desc: "Biên – phiên dịch, ngoại giao, làm việc trong môi trường quốc tế." },
    { name: "Du lịch – Khách sạn", group: "Dịch vụ", h: "ESA", ey: { nongNay: "hướng dẫn viên du lịch", hangHai: "hướng dẫn viên" }, th: ["C00", "D01", "D15", "A01"], thcs: ["dia", "anh", "van"], desc: "Hướng dẫn du lịch, quản lý khách sạn, tổ chức sự kiện." },
    { name: "Thiết kế đồ hoạ", group: "Nghệ thuật – Thiết kế", h: "AEI", ey: { uuTu: "sáng tạo nghệ thuật, quảng cáo", nongNay: "sáng tạo nghệ thuật, quảng cáo" }, th: ["H00", "V00", "T-TIN"], thcs: ["mt", "tin"], desc: "Thiết kế hình ảnh, nhận diện thương hiệu, giao diện số." },
    { name: "Thiết kế thời trang – nội thất", group: "Nghệ thuật – Thiết kế", h: "AER", ey: { uuTu: "sáng tạo nghệ thuật", nongNay: "sáng tạo nghệ thuật" }, th: ["H00", "V00"], thcs: ["mt"], desc: "Sáng tạo trang phục, không gian sống; thường thi năng khiếu vẽ." },
    { name: "Âm nhạc – Nghệ thuật biểu diễn", group: "Nghệ thuật – Thiết kế", h: "AES", ey: { uuTu: "sáng tạo nghệ thuật", nongNay: "sáng tạo nghệ thuật" }, th: ["N00"], thcs: ["an"], desc: "Biểu diễn, sáng tác, sản xuất âm nhạc; thi năng khiếu." },
    { name: "Công an – Quân đội", group: "An ninh – Quốc phòng", h: "RES", ey: { hangHai: "cảnh sát" }, th: ["A00", "A01", "C00", "D01"], thcs: ["toan", "van"], desc: "Bảo vệ an ninh, quốc phòng; có tiêu chuẩn sức khoẻ, sơ tuyển riêng." },
    { name: "Địa lí – Quản lý đất đai – Bản đồ", group: "Khoa học tự nhiên", h: "RIC", th: ["A00", "C00", "D15"], thcs: ["dia", "toan"], desc: "Đo đạc, bản đồ số, GIS, quy hoạch – quản lý tài nguyên đất." }
  ];

  /* ---------- Trường mẫu (DỮ LIỆU MINH HOẠ – không phải danh sách thật của trường nào) ---------- */
  const SAMPLE_SCHOOLS = [
    { id: "demo-a", name: "Trường THPT mẫu A (minh hoạ)", province: "Hà Nội", demo: true,
      combos: [
        { id: "A1", subjects: ["li", "hoa", "sinh", "tin"], cd: ["toan", "li", "hoa"] },
        { id: "A2", subjects: ["li", "hoa", "dia", "tin"], cd: ["toan", "li", "hoa"] },
        { id: "A3", subjects: ["li", "sinh", "tin", "dia"], cd: ["toan", "sinh", "tin"] },
        { id: "A4", subjects: ["li", "hoa", "tin", "cn"], cd: ["toan", "li", "tin"] },
        { id: "A5", subjects: ["hoa", "sinh", "dia", "cn"], cd: ["toan", "hoa", "sinh"] },
        { id: "A6", subjects: ["sinh", "dia", "gdkt", "cn"], cd: ["van", "dia", "gdkt"] },
        { id: "A7", subjects: ["li", "dia", "tin", "cn"], cd: ["toan", "li", "dia"] },
        { id: "A8", subjects: ["hoa", "dia", "gdkt", "cn"], cd: ["van", "dia", "gdkt"] }
      ] },
    { id: "demo-b", name: "Trường THPT mẫu B (minh hoạ)", province: "Bắc Ninh", demo: true,
      combos: [
        { id: "B1", subjects: ["li", "hoa", "sinh", "tin"], cd: ["toan", "hoa", "sinh"] },
        { id: "B2", subjects: ["li", "hoa", "gdkt", "tin"], cd: ["toan", "li", "hoa"] },
        { id: "B3", subjects: ["dia", "gdkt", "tin", "cn"], cd: ["van", "su", "dia"] },
        { id: "B4", subjects: ["dia", "gdkt", "sinh", "tin"], cd: ["van", "dia", "gdkt"] },
        { id: "B5", subjects: ["dia", "gdkt", "mt", "tin"], cd: ["van", "dia", "mt"] },
        { id: "B6", subjects: ["li", "tin", "cn", "mt"], cd: ["toan", "li", "tin"] }
      ] }
  ];

  /* ---------- Thang mô tả cho Bước 7 ---------- */
  const SATISFACTION = [
    "Rất không hài lòng – thấy đã chọn sai, không muốn tiếp tục học các môn này",
    "Không hài lòng – nhiều môn không hợp, học thấy nặng nề, hay nghĩ đến chuyện đổi môn",
    "Bình thường – có môn hợp, có môn chưa hợp nhưng vẫn theo được",
    "Hài lòng – phần lớn các môn hợp sở thích và năng lực, học có hứng thú",
    "Rất hài lòng – đúng mong muốn, học hứng thú, thấy rõ ích lợi cho định hướng nghề nghiệp"
  ];
  const SUBJECT_SAT = [
    "Rất không hài lòng – không theo kịp, không thấy hứng thú",
    "Không hài lòng – thấy khó, ít hứng thú",
    "Bình thường – theo được, hứng thú vừa phải",
    "Hài lòng – theo tốt, có hứng thú",
    "Rất hài lòng – học tốt và rất thích môn này"
  ];
  const STRESS = [
    "Rất thấp – thoải mái, ngủ đủ, theo kịp bài vở",
    "Thấp – đôi khi áp lực trước kiểm tra nhưng nhanh chóng ổn lại",
    "Trung bình – thường áp lực vào mùa kiểm tra, đôi lúc thiếu ngủ, vẫn tự cân bằng được",
    "Cao – thường xuyên lo lắng, mất ngủ hoặc mệt mỏi vì học, khó theo kịp, cần được hỗ trợ",
    "Rất cao – căng thẳng kéo dài, ảnh hưởng ăn ngủ và sức khoẻ, muốn bỏ cuộc; cần gặp giáo viên/tư vấn tâm lý ngay"
  ];
  const PERIODS = ["Giữa HK1", "Cuối HK1", "Giữa HK2", "Cuối năm lớp 10", "Cuối HK1 lớp 11", "Cuối năm lớp 11", "Cuối HK1 lớp 12"];

  /* ---------- Từ khoá năng khiếu → nhóm ngành (Bước 3) ---------- */
  const TALENT_KEYS = [
    { k: ["robot", "stem", "khoa học kỹ thuật", "kĩ thuật", "lắp ráp", "điện tử"], groups: ["Công nghệ – Kỹ thuật"] },
    { k: ["lập trình", "tin học", "code", "máy tính"], groups: ["Công nghệ – Kỹ thuật"] },
    { k: ["vẽ", "mĩ thuật", "mỹ thuật", "thiết kế", "hội hoạ", "hội họa"], groups: ["Nghệ thuật – Thiết kế"] },
    { k: ["hát", "đàn", "nhạc", "múa"], groups: ["Nghệ thuật – Thiết kế"] },
    { k: ["tiếng anh", "ngoại ngữ", "ielts", "toefl"], groups: ["Xã hội – Nhân văn", "Dịch vụ"] },
    { k: ["văn", "viết", "báo", "mc", "dẫn chương trình", "hùng biện", "tranh biện"], groups: ["Xã hội – Nhân văn"] },
    { k: ["sinh học", "hoá", "hóa", "thí nghiệm"], groups: ["Khoa học tự nhiên", "Sức khoẻ"] },
    { k: ["toán"], groups: ["Kinh tế – Quản lý", "Công nghệ – Kỹ thuật"] },
    { k: ["thể thao", "bóng", "võ", "điền kinh"], groups: ["An ninh – Quốc phòng"] },
    { k: ["tình nguyện", "câu lạc bộ", "clb", "lớp trưởng", "bí thư"], groups: ["Giáo dục", "Kinh tế – Quản lý"] }
  ];

  return { SUBJECTS, SUBJECT_ORDER, CHUYEN_DE, COMPULSORY, THCS, TO_HOP, HOLLAND, HOLLAND_SCALE,
    EYSENCK, EYSENCK_KEY, EYSENCK_MID, EYSENCK_TYPES, MBTI, MBTI_DIMS, MBTI_DESC, HOLLAND_SUBJ, CAREERS, SAMPLE_SCHOOLS,
    SATISFACTION, SUBJECT_SAT, STRESS, PERIODS, TALENT_KEYS };
})();
