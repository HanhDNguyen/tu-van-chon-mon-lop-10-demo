/* Chấm điểm phiếu Holland dự án 2026. Nội dung câu hỏi vẫn chờ duyệt E9. */
(function (root) {
  "use strict";
  const KEYS = ["R", "I", "A", "S", "E", "C"];
  const VERSION = "project-holland-2026-v1-scoring";

  function score(answers) {
    const sc = {}, invalid = [];
    let answered = 0;
    for (const key of KEYS) {
      const values = answers && answers[key];
      sc[key] = 0;
      if (!Array.isArray(values) || values.length !== 9) {
        invalid.push(key + ".length");
        continue;
      }
      values.forEach((value, index) => {
        if (value === null || value === undefined) return;
        if (!Number.isInteger(value) || value < 0 || value > 4) {
          invalid.push(key + (index + 1));
          return;
        }
        answered += 1;
        sc[key] += value;
      });
    }
    const done = answered === 54 && invalid.length === 0;
    const order = KEYS.slice().sort((a, b) => sc[b] - sc[a] || KEYS.indexOf(a) - KEYS.indexOf(b));
    const tieGroups = [];
    for (const key of order) {
      const previous = tieGroups[tieGroups.length - 1];
      if (previous && sc[previous[0]] === sc[key]) previous.push(key);
      else tieGroups.push([key]);
    }
    const topThreeDistinct = sc[order[0]] > sc[order[1]] &&
      sc[order[1]] > sc[order[2]] && sc[order[2]] > sc[order[3]];
    const code = done && topThreeDistinct ? order.slice(0, 3).join("") : null;
    // Ngưỡng này là heuristic của bản demo, chưa được chuẩn hóa tâm trắc.
    const flat = done && (sc[order[0]] - sc[order[2]] < 4 || sc[order[0]] < 14);
    return { version: VERSION, sc, answered, done, invalid, order,
      tieGroups: tieGroups.filter(g => g.length > 1 && g.some(key => order.indexOf(key) < 3)), code, flat };
  }

  const api = { VERSION, score };
  root.CTV_HOLLAND = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
