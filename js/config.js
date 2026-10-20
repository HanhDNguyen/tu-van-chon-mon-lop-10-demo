/* =========================================================
   CẤU HÌNH TRỢ LÝ TƯ VẤN – Cổng thông tin tư vấn học sinh
   - Để trống apiUrl: trợ lý chạy chế độ demo (trả lời theo bộ câu hỏi có sẵn).
   - Khi đã có máy chủ AI (ví dụ dùng Claude API, hoặc chung máy chủ với bot Telegram),
     điền địa chỉ vào apiUrl. Web sẽ gửi POST JSON:
       { "messages": [{ "role": "user"|"assistant", "content": "..." }],
         "role": "hs"|"ph"|"gv", "profileSummary": "..." }
     và chờ trả về JSON: { "reply": "..." }
   ========================================================= */
window.CTV_CONFIG = {
  apiUrl: "/chat",     // Phương án A: web mở qua trạm trung gian trên Mac (Tailscale Funnel) → gọi "/chat" cùng địa chỉ.
                       // Mở trực tiếp file index.html thì tự chạy chế độ demo. Để "" nếu muốn luôn chạy demo.
  timeoutMs: 90000,    // agent có thể cần tra cứu web nên chờ tối đa 90 giây
  // Bot Telegram: điền tên bot (không cần @) để hiện nút "Tiếp tục trò chuyện trên Telegram"
  telegramBot: "",     // chỉ điền bot Telegram RIÊNG cho tư vấn (gắn profile tuvan), KHÔNG dùng bot cá nhân
  telegramStart: "web" // tham số /start gửi kèm khi mở bot từ web (tuỳ chọn)
};
