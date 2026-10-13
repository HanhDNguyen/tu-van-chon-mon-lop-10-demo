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
    { key: "an", name: "Âm nhạc (năng khiếu, 0–10)" }, { key: "mt", name: "Mĩ thuật (năng khiếu, 0–10)" }
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

  /* ---------- Xu hướng tính cách 4 chiều (không phải MBTI chính thức) ---------- */
  const PERSONALITY = [
    { dim: "EI", a: "E", b: "I", label: "Nguồn năng lượng", items: [
      ["Sau một ngày mệt, mình muốn gặp bạn bè", "Sau một ngày mệt, mình muốn ở một mình yên tĩnh"],
      ["Mình thường vừa nói vừa nghĩ", "Mình nghĩ kỹ rồi mới nói"],
      ["Mình thích làm việc nhóm đông", "Mình thích làm một mình hoặc nhóm nhỏ"],
      ["Mình dễ bắt chuyện với người lạ", "Mình cần thời gian để cởi mở"]] },
    { dim: "SN", a: "S", b: "N", label: "Cách tiếp nhận thông tin", items: [
      ["Mình chú ý chi tiết, sự kiện cụ thể", "Mình chú ý ý tưởng, bức tranh tổng thể"],
      ["Mình thích làm theo cách đã được chứng minh", "Mình thích thử cách mới"],
      ["Mình tin vào kinh nghiệm thực tế", "Mình tin vào trực giác, linh cảm"],
      ["Mình thích bài học có ví dụ thực tế rõ ràng", "Mình thích bài học về lý thuyết, khả năng tương lai"]] },
    { dim: "TF", a: "T", b: "F", label: "Cách ra quyết định", items: [
      ["Khi quyết định, mình ưu tiên lý lẽ, logic", "Khi quyết định, mình ưu tiên cảm xúc, giá trị của mọi người"],
      ["Mình góp ý thẳng thắn", "Mình góp ý tế nhị để không làm ai buồn"],
      ["Công bằng là áp dụng quy tắc như nhau", "Công bằng là xét hoàn cảnh từng người"],
      ["Mình bị thuyết phục bởi số liệu, bằng chứng", "Mình bị thuyết phục bởi câu chuyện, sự đồng cảm"]] },
    { dim: "JP", a: "J", b: "P", label: "Cách tổ chức cuộc sống", items: [
      ["Mình thích lập kế hoạch trước", "Mình thích linh hoạt, tùy tình huống"],
      ["Mình làm bài sớm trước hạn", "Mình thường làm gần sát hạn"],
      ["Bàn học của mình thường gọn gàng", "Bàn học của mình \"lộn xộn có trật tự\""],
      ["Mình thích quyết định nhanh để xong việc", "Mình thích để ngỏ thêm lựa chọn"]] }
  ];
  const PERSONALITY_DESC = {
    E: "hướng ngoại – nạp năng lượng khi tương tác, hợp làm việc nhóm",
    I: "hướng nội – tập trung sâu, làm việc độc lập tốt",
    S: "thực tế – chú ý chi tiết, thích cái cụ thể",
    N: "trực giác – nhìn bức tranh lớn, thích ý tưởng mới",
    T: "lý trí – quyết định dựa trên logic, bằng chứng",
    F: "cảm xúc – quyết định dựa trên giá trị, sự đồng cảm",
    J: "nguyên tắc – thích kế hoạch, ngăn nắp",
    P: "linh hoạt – thích ứng nhanh, cởi mở với lựa chọn"
  };

  /* ---------- Đa trí tuệ Gardner (rút gọn, 24 câu) ---------- */
  const GARDNER = [
    { key: "ngonNgu", name: "Ngôn ngữ", items: ["Mình thích đọc, viết, kể chuyện", "Mình dễ nhớ từ mới, câu nói hay", "Mình diễn đạt ý tưởng bằng lời/văn bản tốt"] },
    { key: "logic", name: "Logic – Toán học", items: ["Mình thích giải toán, câu đố logic", "Mình hay hỏi \"tại sao\" và tìm quy luật", "Mình thích sắp xếp, phân loại, tính toán"] },
    { key: "khongGian", name: "Không gian – Hình ảnh", items: ["Mình hình dung đồ vật trong đầu dễ dàng", "Mình thích vẽ, thiết kế, xem bản đồ, sơ đồ", "Mình nhớ tốt bằng hình ảnh, màu sắc"] },
    { key: "vanDong", name: "Vận động – Cơ thể", items: ["Mình học tốt khi được làm/thực hành", "Mình khéo tay hoặc giỏi thể thao", "Mình khó ngồi yên lâu, thích vận động"] },
    { key: "amNhac", name: "Âm nhạc", items: ["Mình dễ nhớ giai điệu, nhịp điệu", "Mình chơi nhạc cụ/hát hoặc thích sáng tác", "Mình nhận ra khi nốt nhạc bị sai"] },
    { key: "giaoTiep", name: "Giao tiếp (liên cá nhân)", items: ["Mình hiểu cảm xúc của người khác", "Bạn bè hay tìm mình để tâm sự/nhờ giúp", "Mình thích làm việc nhóm, điều phối nhóm"] },
    { key: "noiTam", name: "Nội tâm", items: ["Mình hiểu rõ điểm mạnh, điểm yếu của bản thân", "Mình thường tự đặt mục tiêu và tự theo dõi", "Mình thích suy ngẫm, viết nhật ký"] },
    { key: "thienNhien", name: "Thiên nhiên", items: ["Mình thích tìm hiểu cây cối, động vật, môi trường", "Mình dễ nhận biết, phân loại các loài/hiện tượng tự nhiên", "Mình quan tâm biến đổi khí hậu, bảo vệ môi trường"] }
  ];
  const LIKERT5 = ["Hoàn toàn không giống", "Ít giống", "Phân vân", "Khá giống", "Rất giống mình"];
  const AGREE5 = ["Hoàn toàn không đồng ý", "Không đồng ý", "Phân vân", "Đồng ý", "Hoàn toàn đồng ý"];

  /* ---------- TPB (bản dùng tạm, 15 câu) ---------- */
  const TPB = [
    { key: "ATT", name: "Thái độ", items: ["Với mình, chọn tổ hợp [X] là có lợi", "Học các môn trong [X] là thú vị với mình", "Chọn [X] là lựa chọn đáng giá cho tương lai của mình", "Tổ hợp [X] giúp mình tiến gần ngành nghề mong muốn"] },
    { key: "SN", name: "Chuẩn chủ quan", items: ["Bố mẹ/người giám hộ ủng hộ mình chọn [X]", "Thầy cô mình tin tưởng cho rằng mình nên chọn [X]", "Những người quan trọng với mình mong mình chọn [X]", "Nhiều bạn có năng lực giống mình cũng chọn [X]"] },
    { key: "PBC", name: "Nhận thức kiểm soát", items: ["Mình tự tin học tốt cả 4 môn trong [X]", "Việc chọn [X] phần lớn do mình quyết định", "Mình có đủ điều kiện (thời gian, tài liệu, hỗ trợ) để theo [X]", "Mình có khả năng được xếp vào [X] ở trường"] },
    { key: "INT", name: "Ý định", items: ["Mình dự định đăng ký [X]", "Mình sẵn sàng nỗ lực để học tốt [X]", "Khả năng mình đăng ký [X] là rất cao"] }
  ];

  /* ---------- Trọng số liên hệ sở thích → môn lựa chọn ---------- */
  const HOLLAND_SUBJ = {
    R: { cn: 1, li: .8, tin: .5, sinh: .4, dia: .4 },
    I: { li: 1, hoa: 1, sinh: 1, tin: .8, dia: .4 },
    A: { mt: 1, an: 1, tin: .4, dia: .3, gdkt: .3 },
    S: { gdkt: .8, sinh: .6, dia: .6, hoa: .4 },
    E: { gdkt: 1, dia: .6, tin: .6, li: .3 },
    C: { tin: 1, gdkt: .6, li: .4, dia: .4, hoa: .3 }
  };
  const GARDNER_SUBJ = {
    ngonNgu: { gdkt: .6, dia: .3 }, logic: { li: 1, hoa: .8, tin: 1 }, khongGian: { mt: 1, cn: .8, dia: .6 },
    vanDong: { cn: .8, sinh: .3 }, amNhac: { an: 1 }, giaoTiep: { gdkt: .7, dia: .4 }, noiTam: {},
    thienNhien: { sinh: 1, dia: .8, hoa: .5, cn: .4 }
  };

  /* ---------- Ngành nghề (minh hoạ – tổ hợp xét tuyển cần kiểm tra theo từng trường) ---------- */
  const CAREERS = [
    { name: "Y đa khoa", group: "Sức khoẻ", h: "ISR", g: ["logic", "thienNhien", "giaoTiep"], th: ["B00", "A00", "B08", "D07"], thcs: ["khtn_hoa", "khtn_sinh", "toan"], desc: "Khám, chẩn đoán, điều trị bệnh. Học dài (6 năm+), cần bền bỉ và tinh thần trách nhiệm cao." },
    { name: "Dược học", group: "Sức khoẻ", h: "ICR", g: ["logic", "thienNhien"], th: ["A00", "B00", "D07"], thcs: ["khtn_hoa", "khtn_sinh", "toan"], desc: "Nghiên cứu, sản xuất, tư vấn sử dụng thuốc; làm ở nhà thuốc, bệnh viện, công ty dược." },
    { name: "Điều dưỡng", group: "Sức khoẻ", h: "SIR", g: ["giaoTiep", "thienNhien"], th: ["B00", "B08", "A00"], thcs: ["khtn_sinh", "khtn_hoa"], desc: "Chăm sóc, theo dõi người bệnh; cần sự tận tâm, kiên nhẫn, sức khoẻ tốt." },
    { name: "Răng – Hàm – Mặt", group: "Sức khoẻ", h: "IRA", g: ["logic", "vanDong", "khongGian"], th: ["B00", "A00"], thcs: ["khtn_hoa", "khtn_sinh"], desc: "Chẩn đoán, điều trị bệnh răng miệng; cần sự khéo léo, tỉ mỉ." },
    { name: "Kỹ thuật xét nghiệm y học", group: "Sức khoẻ", h: "ICR", g: ["logic", "thienNhien"], th: ["B00", "A00", "B08"], thcs: ["khtn_sinh", "khtn_hoa"], desc: "Thực hiện xét nghiệm hỗ trợ chẩn đoán; làm việc trong phòng thí nghiệm." },
    { name: "Công nghệ thông tin", group: "Công nghệ – Kỹ thuật", h: "IRC", g: ["logic", "noiTam"], th: ["A00", "A01", "D01", "T-TIN", "T-LT"], thcs: ["toan", "tin", "khtn_li"], desc: "Phát triển phần mềm, hệ thống, mạng; nhu cầu tuyển dụng rộng ở nhiều lĩnh vực." },
    { name: "Khoa học dữ liệu & Trí tuệ nhân tạo", group: "Công nghệ – Kỹ thuật", h: "ICR", g: ["logic"], th: ["A00", "A01", "D01", "T-TIN", "T-LT"], thcs: ["toan", "tin"], desc: "Phân tích dữ liệu, xây dựng mô hình AI; cần Toán tốt và tư duy logic." },
    { name: "An toàn thông tin", group: "Công nghệ – Kỹ thuật", h: "ICR", g: ["logic", "noiTam"], th: ["A00", "A01", "T-TIN", "T-LT"], thcs: ["toan", "tin"], desc: "Bảo vệ hệ thống, dữ liệu trước tấn công mạng." },
    { name: "Kỹ thuật điện – điện tử", group: "Công nghệ – Kỹ thuật", h: "RIC", g: ["logic", "khongGian"], th: ["A00", "A01", "T-CN", "T-LT"], thcs: ["khtn_li", "toan", "cn"], desc: "Thiết kế, vận hành hệ thống điện, mạch điện tử, thiết bị thông minh." },
    { name: "Kỹ thuật cơ khí – Cơ điện tử", group: "Công nghệ – Kỹ thuật", h: "RIC", g: ["khongGian", "vanDong", "logic"], th: ["A00", "A01", "T-CN"], thcs: ["khtn_li", "toan", "cn"], desc: "Thiết kế, chế tạo máy móc, robot, dây chuyền tự động." },
    { name: "Kỹ thuật ô tô", group: "Công nghệ – Kỹ thuật", h: "RIE", g: ["vanDong", "khongGian"], th: ["A00", "A01", "T-CN"], thcs: ["khtn_li", "cn"], desc: "Thiết kế, bảo dưỡng, sửa chữa ô tô và phương tiện điện." },
    { name: "Xây dựng", group: "Công nghệ – Kỹ thuật", h: "RIC", g: ["khongGian", "logic"], th: ["A00", "A01", "T-CN"], thcs: ["khtn_li", "toan"], desc: "Thiết kế, thi công, quản lý công trình." },
    { name: "Kiến trúc", group: "Công nghệ – Kỹ thuật", h: "AIR", g: ["khongGian", "logic"], th: ["V00", "A00", "A01"], thcs: ["toan", "mt", "khtn_li"], desc: "Thiết kế công trình, không gian; thường thi thêm năng khiếu vẽ." },
    { name: "Công nghệ sinh học", group: "Khoa học tự nhiên", h: "IRC", g: ["thienNhien", "logic"], th: ["B00", "A00", "D07"], thcs: ["khtn_sinh", "khtn_hoa"], desc: "Ứng dụng sinh học trong y dược, nông nghiệp, thực phẩm." },
    { name: "Công nghệ thực phẩm", group: "Khoa học tự nhiên", h: "IRC", g: ["thienNhien", "logic"], th: ["A00", "B00", "D07"], thcs: ["khtn_hoa", "khtn_sinh"], desc: "Chế biến, bảo quản, kiểm định chất lượng thực phẩm." },
    { name: "Khoa học môi trường", group: "Khoa học tự nhiên", h: "IRS", g: ["thienNhien"], th: ["A00", "B00", "D07", "C00"], thcs: ["khtn_hoa", "khtn_sinh", "dia"], desc: "Đánh giá, xử lý, quản lý môi trường; phát triển bền vững." },
    { name: "Hoá học – Vật liệu", group: "Khoa học tự nhiên", h: "IRC", g: ["logic", "thienNhien"], th: ["A00", "B00", "D07"], thcs: ["khtn_hoa", "toan"], desc: "Nghiên cứu, sản xuất hoá chất, vật liệu mới." },
    { name: "Nông nghiệp công nghệ cao", group: "Nông – Lâm – Thuỷ sản", h: "RIE", g: ["thienNhien", "vanDong"], th: ["B00", "A00", "B08"], thcs: ["khtn_sinh", "cn"], desc: "Trồng trọt, chăn nuôi ứng dụng công nghệ, quản lý trang trại." },
    { name: "Thú y", group: "Nông – Lâm – Thuỷ sản", h: "IRS", g: ["thienNhien"], th: ["B00", "A00"], thcs: ["khtn_sinh", "khtn_hoa"], desc: "Chăm sóc, chữa bệnh cho vật nuôi; kiểm dịch động vật." },
    { name: "Kinh tế – Quản trị kinh doanh", group: "Kinh tế – Quản lý", h: "ECS", g: ["giaoTiep", "logic"], th: ["A00", "A01", "D01", "C14"], thcs: ["toan", "anh", "gdcd"], desc: "Quản lý doanh nghiệp, nhân sự, vận hành; phù hợp người năng động, thích dẫn dắt." },
    { name: "Marketing", group: "Kinh tế – Quản lý", h: "EAS", g: ["giaoTiep", "ngonNgu", "khongGian"], th: ["A01", "D01", "C14", "A00"], thcs: ["van", "anh", "toan"], desc: "Nghiên cứu thị trường, xây dựng thương hiệu, truyền thông sản phẩm." },
    { name: "Tài chính – Ngân hàng", group: "Kinh tế – Quản lý", h: "CEI", g: ["logic"], th: ["A00", "A01", "D01", "C14"], thcs: ["toan", "anh"], desc: "Quản lý tài chính, đầu tư, ngân hàng; cần cẩn thận và giỏi tính toán." },
    { name: "Kế toán – Kiểm toán", group: "Kinh tế – Quản lý", h: "CIE", g: ["logic", "noiTam"], th: ["A00", "A01", "D01", "C14"], thcs: ["toan"], desc: "Ghi chép, phân tích, kiểm tra số liệu tài chính." },
    { name: "Logistics – Chuỗi cung ứng", group: "Kinh tế – Quản lý", h: "ECR", g: ["logic", "giaoTiep"], th: ["A00", "A01", "D01", "C00"], thcs: ["toan", "anh", "dia"], desc: "Quản lý vận tải, kho bãi, xuất nhập khẩu." },
    { name: "Luật", group: "Xã hội – Nhân văn", h: "ESI", g: ["ngonNgu", "giaoTiep", "logic"], th: ["C00", "D01", "A00", "C14"], thcs: ["van", "gdcd", "su"], desc: "Tư vấn, bảo vệ quyền lợi pháp lý; cần lập luận chặt chẽ, diễn đạt tốt." },
    { name: "Báo chí – Truyền thông", group: "Xã hội – Nhân văn", h: "AES", g: ["ngonNgu", "giaoTiep"], th: ["C00", "D01", "D14", "D15"], thcs: ["van", "su", "dia"], desc: "Sản xuất tin tức, nội dung đa phương tiện, quan hệ công chúng." },
    { name: "Tâm lý học", group: "Xã hội – Nhân văn", h: "SIA", g: ["giaoTiep", "noiTam"], th: ["B00", "C00", "D01"], thcs: ["van", "khtn_sinh"], desc: "Nghiên cứu, tư vấn tâm lý trong trường học, doanh nghiệp, bệnh viện." },
    { name: "Sư phạm (Tiểu học, KHXH)", group: "Giáo dục", h: "SAC", g: ["giaoTiep", "ngonNgu"], th: ["C00", "D01", "D14", "D15"], thcs: ["van", "su", "dia"], desc: "Giảng dạy ở bậc tiểu học hoặc môn khoa học xã hội." },
    { name: "Sư phạm (Toán, KHTN, Tin)", group: "Giáo dục", h: "SIC", g: ["logic", "giaoTiep"], th: ["A00", "A01", "B00", "D01"], thcs: ["toan", "khtn_li", "khtn_hoa"], desc: "Giảng dạy Toán, Vật lí, Hoá học, Sinh học hoặc Tin học." },
    { name: "Ngôn ngữ Anh – Quan hệ quốc tế", group: "Xã hội – Nhân văn", h: "SEA", g: ["ngonNgu", "giaoTiep"], th: ["D01", "D14", "D15", "C00"], thcs: ["anh", "van"], desc: "Biên – phiên dịch, ngoại giao, làm việc trong môi trường quốc tế." },
    { name: "Du lịch – Khách sạn", group: "Dịch vụ", h: "ESA", g: ["giaoTiep", "ngonNgu"], th: ["C00", "D01", "D15", "A01"], thcs: ["dia", "anh", "van"], desc: "Hướng dẫn du lịch, quản lý khách sạn, tổ chức sự kiện." },
    { name: "Thiết kế đồ hoạ", group: "Nghệ thuật – Thiết kế", h: "AEI", g: ["khongGian"], th: ["H00", "V00", "T-TIN"], thcs: ["mt", "tin"], desc: "Thiết kế hình ảnh, nhận diện thương hiệu, giao diện số." },
    { name: "Thiết kế thời trang – nội thất", group: "Nghệ thuật – Thiết kế", h: "AER", g: ["khongGian", "vanDong"], th: ["H00", "V00"], thcs: ["mt"], desc: "Sáng tạo trang phục, không gian sống; thường thi năng khiếu vẽ." },
    { name: "Âm nhạc – Nghệ thuật biểu diễn", group: "Nghệ thuật – Thiết kế", h: "AES", g: ["amNhac", "vanDong"], th: ["N00"], thcs: ["an"], desc: "Biểu diễn, sáng tác, sản xuất âm nhạc; thi năng khiếu." },
    { name: "Công an – Quân đội", group: "An ninh – Quốc phòng", h: "RES", g: ["vanDong", "giaoTiep"], th: ["A00", "A01", "C00", "D01"], thcs: ["toan", "van"], desc: "Bảo vệ an ninh, quốc phòng; có tiêu chuẩn sức khoẻ, sơ tuyển riêng." },
    { name: "Địa lí – Quản lý đất đai – Bản đồ", group: "Khoa học tự nhiên", h: "RIC", g: ["khongGian", "thienNhien"], th: ["A00", "C00", "D15"], thcs: ["dia", "toan"], desc: "Đo đạc, bản đồ số, GIS, quy hoạch – quản lý tài nguyên đất." }
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

  return { SUBJECTS, SUBJECT_ORDER, CHUYEN_DE, COMPULSORY, THCS, TO_HOP, HOLLAND, HOLLAND_SCALE,
    PERSONALITY, PERSONALITY_DESC, GARDNER, LIKERT5, AGREE5, TPB, HOLLAND_SUBJ, GARDNER_SUBJ, CAREERS, SAMPLE_SCHOOLS };
})();
