// ตรวจว่าคำทุกคำอยู่ในบทเดียวพอดี: node tools/validate-units.js
global.window = {};
for (const l of ["a1", "a2", "b1", "b2", "c1"]) require("../data/" + l + ".js");
require("../data/units.js");
let ok = true;
for (const [lv, rows] of Object.entries(window.WORDS)) {
  const all = new Set(rows.map((r) => r[0]));
  const seen = new Map();
  (window.UNITS[lv] || []).forEach((u, i) => u.words.trim().split(/\s+/).forEach((w) => {
    if (!all.has(w)) { ok = false; console.log(`${lv} บท ${i + 1}: ไม่มีคำ "${w}" ในข้อมูล`); }
    if (seen.has(w)) { ok = false; console.log(`${lv}: "${w}" ซ้ำในบท ${seen.get(w)} และ ${i + 1}`); }
    seen.set(w, i + 1);
  }));
  for (const w of all) if (!seen.has(w)) { ok = false; console.log(`${lv}: "${w}" ยังไม่อยู่ในบทไหน`); }
  console.log(lv, (window.UNITS[lv] || []).map((u) => u.words.trim().split(/\s+/).length).join(" "));
}
console.log(ok ? "OK" : "FAILED");
process.exit(ok ? 0 : 1);
