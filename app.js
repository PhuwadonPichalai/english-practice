(function () {
  "use strict";

  // ---------------- config ----------------
  const LEVELS = [
    { id: "A1", name: "A1", desc: "เริ่มต้น" },
    { id: "A2", name: "A2", desc: "พื้นฐาน" },
    { id: "B1", name: "B1", desc: "กลาง" },
    { id: "B2", name: "B2", desc: "กลาง-สูง" },
    { id: "C1", name: "C1", desc: "สูง" },
    { id: "ALL", name: "ทุกระดับ", desc: "" },
  ];

  const MODES = [
    { id: "flash", icon: "", title: "แฟลชการ์ด", desc: "ดูคำศัพท์ พลิกดูความหมาย แล้วบอกว่าจำได้ไหม" },
    { id: "en2th", icon: "", title: "เลือกความหมาย", desc: "เห็นคำอังกฤษ เลือกความหมายภาษาไทยที่ถูก" },
    { id: "th2en", icon: "", title: "เลือกคำศัพท์", desc: "เห็นความหมายไทย เลือกคำภาษาอังกฤษที่ถูก" },
    { id: "spell", icon: "", title: "พิมพ์สะกดคำ", desc: "เห็นความหมายไทย พิมพ์คำภาษาอังกฤษให้ถูก" },
    { id: "listen", icon: "", title: "ฟังแล้วตอบ", desc: "ฟังเสียงคำศัพท์ แล้วเลือกความหมายที่ถูก" },
    { id: "blank", icon: "", title: "เติมคำในประโยค", desc: "เลือกคำที่เหมาะกับช่องว่างในประโยค" },
  ];

  const ICONS = {flash: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 6V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/></svg>`, en2th: `<span class="dual"><b>EN</b><i>ไทย</i></span>`, th2en: `<span class="dual"><i>ไทย</i><b>EN</b></span>`, spell: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>`, listen: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>`, blank: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12h4M17 12h4"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" stroke="none" opacity=".35"/></svg>`};
  const COUNTS = [10, 20, 30];

  // ---------------- data ----------------
  const ALL_WORDS = [];
  Object.keys(window.WORDS).forEach((level) => {
    window.WORDS[level].forEach(([word, pos, th, ex, exTh]) => {
      ALL_WORDS.push({ word, pos, th, ex, exTh: exTh || "", level });
    });
  });

  // ---------------- storage (แยกตามบัญชี) ----------------
  const GUEST_KEY = "wu-progress-v1";
  const LAST_UID = "wu-last-uid";
  const readKey = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } };
  const writeKey = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const DEFAULTS = () => ({ words: {}, best: {}, streak: { last: null, count: 0 }, settings: { level: "A1", count: 10, learnCount: 5, autoNext: 3 }, totalAnswered: 0, xp: 0, daily: null, badges: [], sound: true, bestCombo: 0 });
  const cloudOn = () => !!(window.WU_FIREBASE_CONFIG);
  let storeKey = GUEST_KEY;
  // ถ้าเคยล็อกอินไว้ ให้โหลดข้อมูลที่แคชของบัญชีนั้นก่อน ระหว่างรอยืนยันตัวตน
  try { const u = localStorage.getItem(LAST_UID); if (u && cloudOn()) storeKey = "wu-progress-u-" + u; } catch (e) {}
  const data = DEFAULTS();
  function fillData(obj) {
    Object.keys(data).forEach((k) => delete data[k]);
    const d = DEFAULTS();
    Object.assign(data, d, obj || {});
    data.settings = Object.assign(d.settings, (obj && obj.settings) || {});
    migrate();
  }
  const store = { save(d) { writeKey(storeKey, d); } };
  const persist = () => { store.save(data); scheduleCloudSave(); };
  let cloudTimer = null;
  const sync = { state: "idle" };
  function setSync(state) {
    sync.state = state; sync.at = Date.now();
    // อัปเดตเฉพาะป้ายสถานะ ไม่แตะปุ่มรูปโปรไฟล์
    document.querySelectorAll(".sync-text").forEach((el) => { el.textContent = syncText() || "เชื่อมต่อกับบัญชีแล้ว"; el.dataset.sync = state; });
    const ab = document.getElementById("accountBtn");
    if (ab) ab.dataset.sync = state;
  }
  function syncText() {
    return { idle: "", loading: "กำลังโหลดความคืบหน้า…", saving: "กำลังบันทึก…", saved: "บันทึกลงบัญชีแล้ว", error: "บันทึกไม่สำเร็จ จะลองใหม่อัตโนมัติ" }[sync.state] || "";
  }
  function scheduleCloudSave() {
    const C = window.WUCloud;
    if (!C || !C.user || !C.save) return;
    clearTimeout(cloudTimer);
    setSync("saving");
    cloudTimer = setTimeout(cloudSaveNow, 1200);
  }
  async function cloudSaveNow() {
    const C = window.WUCloud;
    if (!C || !C.user || !C.save) return;
    clearTimeout(cloudTimer);
    setSync("saving");
    try { await C.save(data); setSync("saved"); }
    catch (e) { console.error(e); setSync("error"); cloudTimer = setTimeout(cloudSaveNow, 15000); }
  }
  window.addEventListener("online", () => { if (sync.state === "error") cloudSaveNow(); });

  const hasProgress = (g) => !!g && ((g.totalAnswered || 0) > 0 || Object.keys(g.words || {}).length > 0);
  const ymd = (s) => { if (!s) return 0; const [y, m, d] = s.split("-").map(Number); return y * 10000 + m * 100 + d; };
  // รวมความคืบหน้า 2 ชุดเข้าด้วยกัน โดยเก็บค่าที่ดีกว่าของแต่ละอย่าง
  function mergeProgress(a, b) {
    a = a || {}; b = b || {};
    const out = Object.assign(DEFAULTS(), a);
    out.settings = Object.assign(DEFAULTS().settings, b.settings || {}, a.settings || {});
    const words = Object.assign({}, a.words || {});
    Object.entries(b.words || {}).forEach(([k, v]) => {
      const o = words[k];
      if (!o || (v.r || 0) + (v.x || 0) > (o.r || 0) + (o.x || 0)) words[k] = v;
    });
    out.words = words;
    out.best = Object.assign({}, a.best || {});
    Object.entries(b.best || {}).forEach(([k, v]) => { out.best[k] = Math.max(out.best[k] ?? -1, v); });
    ["xp", "totalAnswered", "bestCombo"].forEach((k) => { out[k] = Math.max(a[k] || 0, b[k] || 0); });
    out.badges = [...new Set([...(a.badges || []), ...(b.badges || [])])];
    const sa = a.streak || {}, sb = b.streak || {};
    out.streak = ymd(sb.last) > ymd(sa.last) ? sb : ymd(sa.last) > ymd(sb.last) ? sa : { last: sa.last || sb.last || null, count: Math.max(sa.count || 0, sb.count || 0) };
    const da = a.daily, db = b.daily;
    out.daily = da && db && da.date === db.date ? { date: da.date, count: Math.max(da.count, db.count) } : (ymd(db && db.date) > ymd(da && da.date) ? db : da) || null;
    out.sound = a.sound ?? b.sound ?? true;
    return out;
  }

  // ---------------- spaced repetition (Leitner boxes) ----------------
  // box 0 = ต้องทบทวนวันนี้, 1..6 = เว้นช่วงทบทวนนานขึ้นเรื่อยๆ
  const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
  const MASTER_BOX = 4;
  const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  // ย้ายข้อมูลรุ่นเก่า (มีแค่ r/x) ให้เข้าระบบทบทวน
  function migrate() {
    Object.keys(data.words || {}).forEach((k) => {
      const st = data.words[k];
      if (st.box == null) {
        st.box = st.r >= 3 && st.r >= st.x * 2 ? 3 : Math.min(st.r || 0, 2);
        st.due = dayNum();
      }
    });
  }
  fillData(readKey(storeKey) || (storeKey !== GUEST_KEY ? null : null));
  function wordStat(w) { return data.words[w] || { r: 0, x: 0 }; }
  function status(w) {
    const s = data.words[w];
    if (!s) return "new";
    return s.box >= MASTER_BOX ? "mastered" : "learning";
  }
  const isDue = (w) => { const s = data.words[w]; return !!s && s.due <= dayNum(); };
  const dueWords = () => ALL_WORDS.filter((w) => isDue(w.word));
  const learnedCount = () => Object.keys(data.words).length;
  function nextReviewText(w) {
    const s = data.words[w];
    if (!s) return "";
    const d = s.due - dayNum();
    return d <= 0 ? "ทบทวนวันนี้" : d === 1 ? "ทบทวนพรุ่งนี้" : `ทบทวนอีก ${d} วัน`;
  }
  function record(w, ok) {
    const now = dayNum();
    const s = data.words[w] || { r: 0, x: 0, box: 0, due: now };
    if (ok) {
      s.r++;
      // เลื่อนขั้นเฉพาะตอนถึงเวลาทบทวน ตอบถูกซ้ำในวันเดียวกันไม่นับเพิ่ม
      if (s.due <= now) { s.box = Math.min(s.box + 1, INTERVALS.length - 1); s.due = now + INTERVALS[s.box]; }
    } else {
      s.x++;
      s.box = 0; s.due = now;
    }
    data.words[w] = s;
    data.totalAnswered = (data.totalAnswered || 0) + 1;
    if (!data.daily || data.daily.date !== today()) data.daily = { date: today(), count: 0 };
    data.daily.count++;
    persist();
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function bumpStreak() {
    const t = today();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yStr = y.getFullYear() + "-" + (y.getMonth() + 1) + "-" + y.getDate();
    if (data.streak.last === t) return;
    data.streak.count = data.streak.last === yStr ? data.streak.count + 1 : 1;
    data.streak.last = t;
    persist();
  }
  function currentStreak() {
    const t = today();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yStr = y.getFullYear() + "-" + (y.getMonth() + 1) + "-" + y.getDate();
    return data.streak.last === t || data.streak.last === yStr ? data.streak.count : 0;
  }

  // ---------------- helpers ----------------
  const $app = document.getElementById("app");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const poolFor = (level) => (level === "ALL" ? ALL_WORDS : ALL_WORDS.filter((w) => w.level === level));

  // คำที่ตอบผิดบ่อย / ยังไม่ค่อยเห็น จะถูกสุ่มมาก่อน
  function pickWords(level, n) {
    const pool = poolFor(level);
    const scored = pool.map((w) => {
      const s = data.words[w.word];
      const score = !s ? 4 : (isDue(w.word) ? -6 : 0) + s.box * 2 - s.x + Math.random() * 3;
      return { w, score };
    });
    scored.sort((a, b) => a.score - b.score);
    return shuffle(scored.slice(0, Math.min(n, pool.length)).map((x) => x.w));
  }

  function distractors(target, field, k = 3) {
    let pool = poolFor(target.level).filter((w) => w.word !== target.word && w[field] !== target[field]);
    const samePos = shuffle(pool.filter((w) => w.pos === target.pos));
    const other = shuffle(pool.filter((w) => w.pos !== target.pos));
    const out = [];
    const seen = new Set([target[field]]);
    for (const w of samePos.concat(other)) {
      if (!seen.has(w[field])) { out.push(w); seen.add(w[field]); }
      if (out.length >= k) break;
    }
    return out;
  }

  // ---------------- speech ----------------
  let voice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /en-US/i.test(v.lang) && /Google|Samantha|Microsoft/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text, rate) {
    if (rate == null) rate = (data.settings && data.settings.voiceRate) || 0.9;
    if (!("speechSynthesis" in window)) return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = rate;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
    return true;
  }
  const canSpeak = "speechSynthesis" in window;

  let S = null;
  // ---------------- game layer: XP, daily goal, badges, sound ----------------
  const DAILY_GOAL = 20;
  function levelInfo(xp) {
    let lv = 1, need = 100, acc = 0;
    while (xp >= acc + need) { acc += need; lv++; need = 100 + (lv - 1) * 50; }
    return { lv, into: xp - acc, need };
  }
  const dailyCount = () => (data.daily && data.daily.date === today() ? data.daily.count : 0);

  const BADGES = [
    { id: "first", mark: "1", color: "#ffe45c", name: "ก้าวแรก", desc: "เล่นจบ 1 รอบ" },
    { id: "combo10", mark: "×10", color: "#ffb39b", name: "ไฟลุก", desc: "ตอบถูกติดกัน 10 ข้อ" },
    { id: "perfect", mark: "100", color: "#9fe0b8", name: "เพอร์เฟกต์", desc: "ถูกทุกข้อใน 1 รอบ" },
    { id: "goal", mark: "20", color: "#a9d2ff", name: "ครบเป้า", desc: "ทำครบเป้าหมายรายวัน" },
    { id: "streak3", mark: "3", color: "#d6c1ff", name: "สามวันติด", desc: "ฝึก 3 วันติดต่อกัน" },
    { id: "speed15", mark: "60", color: "#ffd0e4", name: "มือไว", desc: "ถูก 15 ข้อใน 60 วินาที" },
    { id: "master25", mark: "25", color: "#b8ece6", name: "นักสะสมคำ", desc: "จำได้แล้ว 25 คำ" },
    { id: "lv5", mark: "Lv5", color: "#ffd98a", name: "เลเวล 5", desc: "สะสม XP ถึงเลเวล 5" },
  ];
  function checkBadges(ctx) {
    const have = new Set(data.badges || []);
    const earned = [];
    const mastered = ALL_WORDS.filter((w) => status(w.word) === "mastered").length;
    const cond = {
      first: true,
      combo10: (data.bestCombo || 0) >= 10,
      perfect: ctx.perfect,
      goal: dailyCount() >= DAILY_GOAL,
      streak3: currentStreak() >= 3,
      speed15: ctx.speedScore >= 15,
      master25: mastered >= 25,
      lv5: levelInfo(data.xp || 0).lv >= 5,
    };
    BADGES.forEach((b) => { if (cond[b.id] && !have.has(b.id)) { have.add(b.id); earned.push(b); } });
    data.badges = [...have];
    persist();
    return earned;
  }
  function badgeHTML(b, on) {
    return `<div class="badge ${on ? "on" : ""}" title="${esc(b.desc)}">
      <span class="medal" style="--mc:${b.color}">${b.mark}</span>
      <span class="badge-name">${b.name}</span><span class="badge-desc">${b.desc}</span>
    </div>`;
  }

  let actx = null;
  function tone(freqs, dur = 0.1, type = "sine", gap = 0.07, vol = 0.07) {
    if (!data.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime + 0.01;
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        const st = t0 + i * gap;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(vol, st + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g).connect(actx.destination);
        o.start(st); o.stop(st + dur + 0.03);
      });
    } catch (e) {}
  }
  const sfx = {
    ok: (c) => { const k = Math.pow(1.06, Math.min(c, 10)); tone([660 * k, 990 * k], 0.12); },
    bad: () => tone([233, 175], 0.18, "triangle", 0.1, 0.06),
    win: () => tone([523, 659, 784, 1047], 0.16, "sine", 0.09),
    level: () => tone([523, 784, 1047, 1319, 1568], 0.18, "triangle", 0.08, 0.06),
    tick: () => tone([1200], 0.04, "square", 0, 0.02),
  };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function confetti() {
    if (reduceMotion) return;
    const c = document.createElement("canvas");
    c.className = "confetti";
    document.body.appendChild(c);
    const dpr = window.devicePixelRatio || 1;
    const W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    const x = c.getContext("2d"); x.scale(dpr, dpr);
    const cols = ["#ffe45c", "#7cc4ff", "#ff8fa3", "#7fdca4", "#c9a7ff", "#ffb86b"];
    const P = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - .5) * 120, y: H * .35,
      vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0],
    }));
    const t0 = performance.now();
    (function frame(t) {
      x.clearRect(0, 0, W, H);
      P.forEach((p) => {
        p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); x.restore();
      });
      if (t - t0 < 2600) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  function floatText(text, anchor, cls = "") {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "float-xp " + cls;
    el.textContent = text;
    el.style.left = r.left + r.width / 2 + "px";
    el.style.top = r.top + window.scrollY + r.height * 0.3 + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function renderHUD() {
    const li = levelInfo(data.xp || 0);
    const hud = document.getElementById("hud");
    if (!hud) return;
    hud.innerHTML = `<span class="lv">Lv ${li.lv}</span><span class="xpbar"><span style="width:${(li.into / li.need) * 100}%"></span></span>`;
    hud.title = `${li.into} / ${li.need} XP ถึงเลเวลถัดไป`;
    const st = document.getElementById("soundToggle");
    if (st) { st.classList.toggle("muted", !data.sound); st.setAttribute("aria-pressed", String(!!data.sound)); }
  }
  function gainXP(n) {
    const before = levelInfo(data.xp || 0).lv;
    data.xp = (data.xp || 0) + n;
    persist();
    const after = levelInfo(data.xp).lv;
    renderHUD();
    const hud = document.getElementById("hud");
    if (hud) { hud.classList.remove("bump"); void hud.offsetWidth; hud.classList.add("bump"); }
    return after > before ? after : 0;
  }
  document.getElementById("soundToggle").addEventListener("click", () => {
    data.sound = !data.sound; persist(); renderHUD(); if (data.sound) sfx.ok(0);
  });

  // ---------------- theme ----------------
  document.getElementById("themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("wu-theme", next); } catch (e) {}
  });

  // ---------------- navigation ----------------
  let keyHandler = null;
  document.addEventListener("keydown", (e) => { if (keyHandler) keyHandler(e); });
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));

  // ---------------- routing ----------------
  const PAGES = ["home", "practice", "library", "progress", "account"];
  function currentPage() {
    const h = location.hash.replace("#", "");
    return PAGES.includes(h) ? h : "home";
  }
  function stopSession() {
    keyHandler = null;
    clearAutoNext();
    if (S && S.timer) { clearInterval(S.timer); S.timer = null; }
    if (canSpeak) speechSynthesis.cancel();
  }
  function renderPage() {
    stopSession();
    document.body.classList.remove("in-session");
    document.querySelectorAll(".confetti, .float-xp").forEach((el) => el.remove());
    const page = currentPage();
    document.querySelectorAll("[data-go]").forEach((n) => {
      if (n.classList.contains("navlink") || n.classList.contains("tab")) {
        n.classList.toggle("active", n.dataset.go === page);
        if (n.dataset.go === page) n.setAttribute("aria-current", "page"); else n.removeAttribute("aria-current");
      }
    });
    ({ home: renderHome, practice: renderPractice, library: renderLibrary, progress: renderProgress, account: renderAccount })[page]();
    document.getElementById("accountBtn").classList.toggle("active", page === "account");
    renderHUD();
    window.scrollTo(0, 0);
  }
  function go(view) {
    if (currentPage() === view && location.hash) renderPage();
    else location.hash = view;
  }
  window.addEventListener("hashchange", renderPage);
  const setNav = () => {};

  // ---------------- shared bits ----------------
  let wotdOffset = 0, homeAnimated = false;
  function wordOfDay() {
    const d = new Date();
    const seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
    return ALL_WORDS[(seed * 7919 + wotdOffset) % ALL_WORDS.length];
  }
  function highlight(sentence, word, cls) {
    const re = new RegExp("\\b(" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\b", "i");
    return esc(sentence).replace(re, `<mark class="hl ${cls || ""}">$1</mark>`);
  }
  const CHEV = '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
  const SPK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
  const CLOCK = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>';
  const PLAY = '<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const BOOK = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z"/><path d="M12 6.5V19"/></svg>';
  const REPEAT = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>';
  const levelName = (id) => LEVELS.find((l) => l.id === id).name;
  const modeTitle = (id) => ({ speed: "ท้าทาย 60 วินาที", learn: "เรียนคำใหม่", review: "ทบทวนคำ" }[id] || (MODES.find((m) => m.id === id) || MODES[1]).title);
  const masteredIn = (id) => poolFor(id).filter((x) => status(x.word) === "mastered").length;
  const levelPct = (id) => Math.round((masteredIn(id) / poolFor(id).length) * 100);

  function todayPanel() {
    const streak = currentStreak();
    const daily = dailyCount();
    const goalPct = Math.min(1, daily / DAILY_GOAL);
    const li = levelInfo(data.xp || 0);
    const mastered = ALL_WORDS.filter((w) => status(w.word) === "mastered").length;
    const C = 2 * Math.PI * 27;
    return `<section class="today">
        <div class="goal">
          <svg class="ring" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
            <circle cx="32" cy="32" r="27" fill="none" style="stroke:var(--paper)" stroke-width="7"/>
            <circle cx="32" cy="32" r="27" fill="none" style="stroke:var(--ink)" stroke-width="7" stroke-linecap="round"
              stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - goalPct)}" transform="rotate(-90 32 32)"/>
          </svg>
          <div><b>${Math.min(daily, DAILY_GOAL)} / ${DAILY_GOAL}</b><span>${daily >= DAILY_GOAL ? "ครบเป้าวันนี้แล้ว" : "เป้าหมายวันนี้ (ข้อ)"}</span></div>
        </div>
        <div class="today-item"><b>Lv ${li.lv}</b><span>${li.into} / ${li.need} XP</span><span class="xpbar big"><span style="width:${(li.into / li.need) * 100}%"></span></span></div>
        <div class="today-item"><b>${streak} <small>วัน</small></b><span>ฝึกต่อเนื่อง</span></div>
        <div class="today-item"><b>${learnedCount()} <small>/ ${ALL_WORDS.length}</small></b><span>คำที่เรียนแล้ว</span></div>
      </section>`;
  }

  function studyBlock() {
    const due = dueWords().length;
    const level = data.settings.level;
    const fresh = poolFor(level).filter((w) => !data.words[w.word]).length;
    return `<section class="study">
        <button class="study-btn review ${due ? "has-due" : ""}" id="reviewBtn" ${due ? "" : "disabled"}>
          <span class="quick-icon">${REPEAT}</span>
          <span><b>ทบทวนวันนี้${due ? ` <em class="due-count">${due}</em>` : ""}</b>
          <span>${due ? "คำที่ถึงเวลาทบทวนแล้ว ทบทวนก่อนจะลืม" : learnedCount() ? "ทบทวนครบแล้ว พรุ่งนี้ค่อยกลับมาใหม่" : "เรียนคำใหม่ก่อน แล้วคำจะมารอให้ทบทวนที่นี่"}</span></span>
        </button>
        <button class="study-btn learn" id="learnBtn">
          <span class="quick-icon">${BOOK}</span>
          <span><b>เรียนคำใหม่</b><span>${fresh ? `ระดับ ${levelName(level)} เหลือคำใหม่อีก ${fresh} คำ` : `เรียนครบทุกคำในระดับ ${levelName(level)} แล้ว ลองเลือกระดับอื่น`}</span></span>
        </button>
      </section>`;
  }
  function bindStudy() {
    const r = $app.querySelector("#reviewBtn");
    if (r) r.addEventListener("click", () => startSession("review"));
    const l = $app.querySelector("#learnBtn");
    if (l) l.addEventListener("click", () => openSetup({ mode: "learn" }));
  }

  // ---------------- page: home ----------------
  function renderHome() {
    const w = wordOfDay();
    const anim = homeAnimated ? "" : "hl-anim";
    homeAnimated = true;
    const streak = currentStreak();
    const first = (data.totalAnswered || 0) === 0;
    const lastMode = data.settings.lastMode || "en2th";
    const level = data.settings.level;
    const title = first ? "ยินดีต้อนรับสู่ WordUp" : streak > 0 ? `ฝึกต่อเนื่อง ${streak} วันแล้ว` : "กลับมาฝึกต่อกัน";
    const speedBest = data.best[level + ":speed"];

    $app.innerHTML = `
      <h1 class="page-title">${title}</h1>
      <p class="page-sub">${first ? "เริ่มจาก \"เรียนคำใหม่\" วันละ 5 คำ แล้วกลับมาทบทวนตามที่ระบบนัด จะจำศัพท์ได้นานขึ้นมาก" : "ทำให้ครบเป้าวันละ " + DAILY_GOAL + " ข้อ เพื่อรักษาสถิติฝึกต่อเนื่อง"}</p>

      ${todayPanel()}

      <h2 class="block-title">เรียนและทบทวน</h2>
      ${studyBlock()}

      <h2 class="block-title">เกมฝึกศัพท์</h2>
      <section class="quick">
        <button class="quick-btn primary" id="startBtn">
          <span class="quick-icon">${PLAY}</span>
          <span><b>เริ่มฝึก</b><span>เลือกระดับ วิธีฝึก และจำนวนข้อที่อยากเล่น</span></span>
        </button>
        <button class="quick-btn challenge-btn" id="quickSpeed">
          <span class="quick-icon">${CLOCK}</span>
          <span><b>ท้าทาย 60 วินาที</b><span>${speedBest != null ? `สถิติของคุณ ${speedBest} ข้อ` : "ตอบให้ได้มากที่สุดก่อนหมดเวลา"}</span></span>
        </button>
        ${first ? "" : `<button class="quick-link" id="continue">ฝึกต่อแบบเดิม: ${modeTitle(lastMode)} ระดับ ${levelName(level)}, ${data.settings.count} ข้อ ${CHEV}</button>`}
      </section>

      <section class="wotd card-soft">
        <div class="tags"><span class="tag">คำประจำวัน</span><span class="tag">${w.level}</span></div>
        <h2 class="headword">${esc(w.word)}</h2>
        <div class="entry-line"><span class="pos-i">${esc(w.pos)}</span><span>${esc(w.th)}</span></div>
        <p class="example">${highlight(w.ex, w.word, anim)}</p>
        <div class="entry-actions">
          ${canSpeak ? `<button class="btn ghost" data-speak="${esc(w.word)}">${SPK} ฟังเสียง</button>` : ""}
          <button class="btn ghost" id="nextWord">สุ่มคำอื่น</button>
        </div>
      </section>
    `;
    bindSpeak();
    $app.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    bindStudy();
    $app.querySelector("#startBtn").addEventListener("click", () => openSetup());
    $app.querySelector("#quickSpeed").addEventListener("click", () => openSetup({ mode: "speed" }));
    const cont = $app.querySelector("#continue");
    if (cont) cont.addEventListener("click", () => startSession(lastMode));
    $app.querySelector("#nextWord").addEventListener("click", () => { wotdOffset += 1; homeAnimated = false; renderHome(); });
  }

  // ---------------- page: practice ----------------
  function renderPractice() {
    const level = data.settings.level;
    const speedBest = data.best[level + ":speed"];
    $app.innerHTML = `
      <h1 class="page-title">ฝึก</h1>
      <p class="page-sub">เรียนคำใหม่และทบทวนตามรอบเพื่อให้จำได้นาน แล้วใช้เกมด้านล่างฝึกให้แม่นขึ้น</p>

      <h2 class="block-title">เรียนและทบทวน</h2>
      ${studyBlock()}

      <h2 class="block-title">เกมฝึกศัพท์</h2>
      <button class="quick-btn primary wide" id="startBtn">
        <span class="quick-icon">${PLAY}</span>
        <span><b>เริ่มฝึก</b><span>ตอนนี้ตั้งไว้ที่ระดับ ${levelName(level)}, ${data.settings.count} ข้อต่อรอบ</span></span>
      </button>

      <section class="section">
        <div class="section-head"><div><h2>โหมดทั้งหมด</h2><p>คะแนนดีที่สุดที่แสดงเป็นของระดับ ${levelName(level)}</p></div></div>
        <button class="challenge" data-mode="speed">
          <span class="challenge-clock" aria-hidden="true">${CLOCK}</span>
          <span class="challenge-text"><b>ท้าทาย 60 วินาที</b><span>ตอบให้ถูกมากที่สุดก่อนหมดเวลา ยิ่งตอบถูกติดกันยิ่งได้ XP เยอะ</span></span>
          <span class="challenge-best">${speedBest != null ? `สถิติ <b>${speedBest}</b> ข้อ` : "ยังไม่มีสถิติ"}</span>
        </button>
        <div class="mode-list">
          ${MODES.map((m) => {
            const best = data.best[level + ":" + m.id];
            return `<button class="mode-row" data-mode="${m.id}">
              <span class="glyph g-${m.id}">${ICONS[m.id]}</span>
              <span><span class="mode-title">${m.title}</span><span class="mode-desc">${m.desc}</span></span>
              <span class="mode-best">${best != null ? `ดีที่สุด <b>${best}%</b>` : "ยังไม่เคยเล่น"}</span>
              ${CHEV}
            </button>`;
          }).join("")}
        </div>
      </section>
    `;
    bindStudy();
    $app.querySelector("#startBtn").addEventListener("click", () => openSetup());
    $app.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => openSetup({ mode: b.dataset.mode })));
  }

  // ---------------- setup sheet (choose level, mode, count) ----------------
  const ALL_MODES = () => [{ id: "learn", title: "เรียนคำใหม่" }, { id: "speed", title: "ท้าทาย 60 วินาที", desc: "แข่งกับเวลา" }].concat(MODES);
  const LEARN_COUNTS = [5, 10, 15];
  function openSetup(preset = {}) {
    const draft = {
      level: data.settings.level,
      mode: preset.mode || data.settings.lastMode || "en2th",
      count: data.settings.count,
      learnCount: data.settings.learnCount || 5,
    };
    let dlg = document.getElementById("setup");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "setup";
      dlg.className = "sheet";
      dlg.setAttribute("aria-labelledby", "setupTitle");
      document.body.appendChild(dlg);
      dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener("close", () => document.body.classList.remove("sheet-open"));
    }
    const draw = () => {
      const prevBody = dlg.querySelector(".sheet-body");
      const keepScroll = prevBody ? prevBody.scrollTop : 0;
      const speed = draft.mode === "speed";
      const learn = draft.mode === "learn";
      const n = poolFor(draft.level).length;
      const fresh = poolFor(draft.level).filter((w) => !data.words[w.word]).length;
      dlg.innerHTML = `
        <div class="sheet-inner">
          <div class="sheet-head">
            <h2 id="setupTitle">ตั้งค่าก่อนเริ่มฝึก</h2>
            <button class="back" id="closeSetup" aria-label="ปิด"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
          </div>
          <div class="sheet-body">
            <fieldset class="pick">
              <legend><span class="step-no">1</span>เลือกระดับ</legend>
              <div class="level-grid">
                ${LEVELS.map((l) => {
                  const p = poolFor(l.id);
                  const m = p.filter((x) => status(x.word) === "mastered").length;
                  return `<button type="button" class="opt ${draft.level === l.id ? "on" : ""}" data-pl="${l.id}" aria-pressed="${draft.level === l.id}">
                    <b>${l.name}</b><span>${l.desc || "สุ่มจากทุกระดับ"}</span><small>จำได้ ${m}/${p.length}</small>
                  </button>`;
                }).join("")}
              </div>
            </fieldset>
            <fieldset class="pick">
              <legend><span class="step-no">2</span>เลือกวิธีฝึก</legend>
              <div class="mode-grid">
                ${ALL_MODES().map((m) => `<button type="button" class="opt mode-opt ${draft.mode === m.id ? "on" : ""} ${m.id === "speed" || m.id === "learn" ? "is-speed" : ""}" data-pm="${m.id}" aria-pressed="${draft.mode === m.id}">
                  <span class="glyph g-${m.id}">${m.id === "speed" ? CLOCK.replace(/36/g, "22") : m.id === "learn" ? BOOK.replace(/30/g, "22") : ICONS[m.id]}</span><b>${m.title}</b>
                </button>`).join("")}
              </div>
            </fieldset>
            <fieldset class="pick">
              <legend><span class="step-no">3</span>${learn ? "จำนวนคำใหม่" : "จำนวนข้อ"}</legend>
              ${learn
                ? (fresh
                  ? `<div class="seg big" role="group" aria-label="จำนวนคำใหม่">${LEARN_COUNTS.map((c) => `<button type="button" class="${draft.learnCount === c ? "active" : ""}" data-plc="${c}">${c} คำ</button>`).join("")}</div>
                     <p class="pick-note">ระดับนี้เหลือคำที่ยังไม่เคยเรียน ${fresh} คำ ระบบจะสอนทีละคำ แล้วทดสอบจนตอบถูกครบทุกคำ</p>`
                  : `<p class="pick-note warn">เรียนครบทุกคำในระดับนี้แล้ว ลองเลือกระดับอื่น</p>`)
                : speed
                ? `<p class="pick-note">โหมดนี้ไม่จำกัดจำนวนข้อ ตอบได้เรื่อยๆ จนครบ 60 วินาที</p>`
                : `<div class="seg big" role="group" aria-label="จำนวนข้อ">${COUNTS.map((c) => `<button type="button" class="${draft.count === c ? "active" : ""}" data-pc="${c}">${c} ข้อ</button>`).join("")}</div>
                   ${draft.count > n ? `<p class="pick-note">ระดับนี้มี ${n} คำ จะได้เล่น ${n} ข้อ</p>` : ""}`}
            </fieldset>
          </div>
          <div class="sheet-foot">
            <p class="summary">${modeTitle(draft.mode)}<br><span>ระดับ ${levelName(draft.level)}, ${speed ? "60 วินาที" : learn ? Math.min(draft.learnCount, fresh) + " คำใหม่" : Math.min(draft.count, n) + " ข้อ"}</span></p>
            <button class="btn big-start" id="goStart" ${learn && !fresh ? "disabled" : ""}>${PLAY.replace(/34/g, "18")} เริ่มฝึก</button>
          </div>
        </div>`;
      dlg.querySelector(".sheet-body").scrollTop = keepScroll;
      dlg.querySelector("#closeSetup").addEventListener("click", () => dlg.close());
      dlg.querySelectorAll("[data-pl]").forEach((b) => b.addEventListener("click", () => { draft.level = b.dataset.pl; draw(); dlg.querySelector(`[data-pl="${draft.level}"]`).focus({ preventScroll: true }); }));
      dlg.querySelectorAll("[data-pm]").forEach((b) => b.addEventListener("click", () => { draft.mode = b.dataset.pm; draw(); dlg.querySelector(`[data-pm="${draft.mode}"]`).focus({ preventScroll: true }); }));
      dlg.querySelectorAll("[data-plc]").forEach((b) => b.addEventListener("click", () => { draft.learnCount = +b.dataset.plc; draw(); dlg.querySelector(`[data-plc="${draft.learnCount}"]`).focus({ preventScroll: true }); }));
      dlg.querySelectorAll("[data-pc]").forEach((b) => b.addEventListener("click", () => { draft.count = +b.dataset.pc; draw(); dlg.querySelector(`[data-pc="${draft.count}"]`).focus({ preventScroll: true }); }));
      dlg.querySelector("#goStart").addEventListener("click", () => {
        data.settings.level = draft.level;
        data.settings.count = draft.count;
        data.settings.learnCount = draft.learnCount;
        persist();
        dlg.close();
        startSession(draft.mode);
      });
    };
    draw();
    document.body.classList.add("sheet-open");
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    dlg.querySelector(".sheet-body").scrollTop = 0;
    dlg.querySelector("#goStart").focus({ preventScroll: true });
  }

  // ---------------- page: progress ----------------
  function renderProgress() {
    const li = levelInfo(data.xp || 0);
    const lvls = LEVELS.filter((l) => l.id !== "ALL");
    const modes = MODES.map((m) => ({ id: m.id, title: m.title })).concat([{ id: "speed", title: "ท้าทาย 60 วินาที" }]);
    const have = data.badges || [];
    $app.innerHTML = `
      <h1 class="page-title">ความสำเร็จ</h1>
      <p class="page-sub">ดูพัฒนาการ สถิติ และเหรียญรางวัลของคุณ</p>

      ${todayPanel()}

      <section class="section">
        <div class="section-head"><div><h2>ภาพรวม</h2></div></div>
        <div class="stat-grid">
          <div><b>${data.xp || 0}</b><span>XP สะสม</span></div>
          <div><b>${learnedCount()}</b><span>คำที่เรียนแล้ว</span></div>
          <div><b>${dueWords().length}</b><span>ต้องทบทวนวันนี้</span></div>
          <div><b>${data.totalAnswered || 0}</b><span>ข้อที่ทำทั้งหมด</span></div>
          <div><b>×${data.bestCombo || 0}</b><span>คอมโบสูงสุด</span></div>
          <div><b>${have.length} / ${BADGES.length}</b><span>เหรียญรางวัล</span></div>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>ความคืบหน้าแต่ละระดับ</h2><p>คำจะนับว่า "จำได้แล้ว" เมื่อทบทวนตามรอบผ่านมาแล้ว ${MASTER_BOX} ครั้ง (ใช้เวลาประมาณ 10 วันขึ้นไป)</p></div></div>
        <div class="level-bars">
          ${lvls.map((l) => {
            const p = poolFor(l.id), n = p.length;
            const m = p.filter((x) => status(x.word) === "mastered").length;
            const g = p.filter((x) => status(x.word) === "learning").length;
            return `<div class="lbar">
              <span class="lbar-name">${l.name}</span>
              <span class="lbar-track" title="จำได้ ${m}, กำลังเรียนรู้ ${g}, ยังไม่เคยฝึก ${n - m - g}">
                <span class="seg-m" style="width:${(m / n) * 100}%"></span><span class="seg-l" style="width:${(g / n) * 100}%"></span>
              </span>
              <span class="lbar-num">${m}/${n}</span>
            </div>`;
          }).join("")}
          <div class="legend"><span><i class="dot mastered"></i> จำได้แล้ว</span><span><i class="dot learning"></i> กำลังเรียนรู้</span><span><i class="dot"></i> ยังไม่เคยเรียน</span></div>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>คะแนนดีที่สุด</h2><p>เปอร์เซ็นต์ที่ตอบถูกในแต่ละโหมด ส่วนโหมด 60 วินาทีนับเป็นจำนวนข้อ</p></div></div>
        <div class="scroll">
          <table class="best-table">
            <thead><tr><th>โหมด</th>${lvls.map((l) => `<th>${l.name}</th>`).join("")}<th>รวม</th></tr></thead>
            <tbody>
              ${modes.map((m) => `<tr><td>${m.title}</td>${lvls.concat([{ id: "ALL" }]).map((l) => {
                const v = data.best[l.id + ":" + m.id];
                return `<td class="${v == null ? "na" : ""}">${v == null ? "–" : m.id === "speed" ? v : v + "%"}</td>`;
              }).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>เหรียญรางวัล</h2><p>ได้แล้ว ${have.length} จาก ${BADGES.length} เหรียญ</p></div></div>
        <div class="badges">${BADGES.map((b) => badgeHTML(b, have.includes(b.id))).join("")}</div>
      </section>
    `;
  }

  // ---------------- session ----------------

  function startSession(mode) {
    stopSession();
    document.body.classList.add("in-session");
    if (!["speed", "learn", "review"].includes(mode)) { data.settings.lastMode = mode; persist(); }
    const level = data.settings.level;
    const speed = mode === "speed";
    let words;
    if (speed) words = shuffle(poolFor(level));
    else if (mode === "learn") words = shuffle(poolFor(level).filter((w) => !data.words[w.word])).slice(0, data.settings.learnCount || 5);
    else if (mode === "review") words = shuffle(dueWords().sort((a, b) => data.words[a.word].due - data.words[b.word].due).slice(0, 20));
    else words = pickWords(level, data.settings.count);
    if (!words.length) { document.body.classList.remove("in-session"); return renderPage(); }
    S = { mode, level, words, i: 0, correct: 0, wrong: [], answered: false, combo: 0, maxCombo: 0, xp: 0, levelUp: 0, answeredN: 0,
      requeue: mode === "learn" || mode === "review", retry: [], set: words.slice(), skipped: [] };
    if (mode === "learn") { S.phase = "intro"; S.introI = 0; renderLearnIntro(); window.scrollTo(0, 0); return; }
    if (speed) {
      S.endAt = Date.now() + 60000;
      S.timer = setInterval(() => {
        const left = Math.max(0, S.endAt - Date.now());
        const bar = $app.querySelector(".progress > span");
        const ct = $app.querySelector("#timeLeft");
        if (bar) bar.style.width = (left / 60000) * 100 + "%";
        if (ct) ct.textContent = Math.ceil(left / 1000) + " วิ";
        if (left <= 10000 && bar) bar.parentElement.classList.add("hurry");
        if (left <= 0) { clearInterval(S.timer); S.timer = null; renderResult(); }
      }, 100);
    }
    renderQuestion();
    window.scrollTo(0, 0);
  }

  function sessionHead() {
    const speed = S.mode === "speed";
    const pct = speed ? (Math.max(0, S.endAt - Date.now()) / 60000) * 100 : (S.i / S.words.length) * 100;
    const combo = S.combo >= 2 ? `<span class="combo-chip">คอมโบ ×${S.combo}</span>` : "";
    return `<div class="session-head ${speed ? "speed" : ""}">
      <button class="back" id="quit" aria-label="ออก">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="progress ${speed && pct <= 16.7 ? "hurry" : ""}"><span style="width:${pct}%"></span></div>
      <div class="counter">${speed ? `<span id="timeLeft">${Math.ceil(Math.max(0, S.endAt - Date.now()) / 1000)} วิ</span> <b class="score-chip">${S.correct}</b>` : `${S.i + 1} / ${S.words.length}`}</div>
    </div>
    <div class="combo-row" id="comboRow">${combo}</div>`;
  }

  function bindQuit() {
    $app.querySelector("#quit").addEventListener("click", () => renderPage());
  }

  function renderQuestion() {
    S.answered = false;
    const w = S.words[S.i];
    let mode = S.mode;
    if (mode === "speed") mode = Math.random() < 0.5 ? "en2th" : "th2en";
    else if (mode === "learn") mode = S.i % 2 ? "th2en" : "en2th";
    else if (mode === "review") {
      const st = data.words[w.word] || { box: 0 };
      const pool = ["en2th", "th2en", "blank"].concat(canSpeak ? ["listen"] : []).concat(st.box >= 2 ? ["spell", "spell"] : []);
      mode = pool[Math.floor(Math.random() * pool.length)];
    }
    switch (mode) {
      case "flash": return renderFlash(w);
      case "en2th": return renderChoice(w, {
        label: "คำนี้แปลว่าอะไร?",
        prompt: `<p class="prompt-word">${esc(w.word)}</p><span class="pos">${esc(w.pos)}</span>${S.mode === "speed" ? "" : speakBtn(w.word)}`,
        field: "th",
      });
      case "th2en": return renderChoice(w, {
        label: "คำภาษาอังกฤษของคำนี้คือ?",
        prompt: `<p class="prompt-thai">${esc(w.th)}</p><span class="pos">${esc(w.pos)}</span>`,
        field: "word",
      });
      case "listen": return renderChoice(w, {
        label: "ฟังแล้วเลือกความหมายที่ถูกต้อง",
        prompt: `<button class="speak-big" id="bigSpeak" aria-label="ฟังอีกครั้ง"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg></button><div class="hint">${canSpeak ? "กดเพื่อฟังอีกครั้ง" : "เบราว์เซอร์นี้ไม่รองรับเสียง"}</div>`,
        field: "th",
        autoSpeak: true,
      });
      case "blank": return renderChoice(w, {
        label: "เลือกคำที่เติมลงในช่องว่างได้ถูกต้อง",
        prompt: `<p class="prompt-sentence">${blankSentence(w)}</p>`,
        field: "word",
      });
      case "spell": return renderSpell(w);
    }
  }

  function speakBtn(text) {
    return canSpeak ? `<div><button class="speak" data-speak="${esc(text)}">${SPK} ฟังเสียง</button></div>` : "";
  }
  function bindSpeak(root = $app) {
    root.querySelectorAll("[data-speak]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); speak(b.dataset.speak); }));
  }

  function blankSentence(w) {
    const re = new RegExp("\\b" + w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    const parts = w.ex.split(re);
    if (parts.length < 2) return esc(w.ex) + ` <span class="blank"></span>`;
    return esc(parts[0]) + `<span class="blank"></span>` + esc(parts.slice(1).join(w.word));
  }

  function feedbackDetail(w) {
    return `<div class="fb-detail"><span class="w">${esc(w.word)}</span> <span class="pos-i" style="font:italic 14px var(--serif);color:var(--muted)">${esc(w.pos)}</span>&nbsp; ${esc(w.th)}<span class="ex">${highlight(w.ex, w.word)}</span>${w.exTh ? `<span class="ex-th">${esc(w.exTh)}</span>` : ""}</div>`;
  }

  // ----- multiple choice -----
  function renderChoice(w, cfg) {
    const opts = shuffle([w].concat(distractors(w, cfg.field)));
    $app.innerHTML = `
      ${sessionHead()}
      <div class="card">
        <div class="prompt-label">${cfg.label}</div>
        ${cfg.prompt}
      </div>
      <div class="options">
        ${opts.map((o, idx) => `<button class="option ${cfg.field === "word" ? "en" : ""}" data-idx="${idx}"><span class="key">${idx + 1}</span><span>${esc(o[cfg.field])}</span></button>`).join("")}
      </div>
      <div class="feedback" id="fb"></div>
      <div class="next-row" id="nextRow"></div>
      <div class="kbd-hint">กด <kbd>1</kbd>–<kbd>4</kbd> เพื่อเลือก${S.mode === "speed" ? "" : " แล้วกด <kbd>Enter</kbd> ไปข้อถัดไป"}</div>
    `;
    bindQuit(); bindSpeak();
    const big = $app.querySelector("#bigSpeak");
    if (big) big.addEventListener("click", () => speak(w.word, ((data.settings.voiceRate) || 0.9) - 0.05));
    if (cfg.autoSpeak) setTimeout(() => speak(w.word, ((data.settings.voiceRate) || 0.9) - 0.05), 250);

    const buttons = [...$app.querySelectorAll(".option")];
    const choose = (idx) => {
      if (S.answered) return;
      S.answered = true;
      const picked = opts[idx];
      const ok = picked.word === w.word;
      buttons.forEach((b, j) => {
        b.disabled = true;
        if (opts[j].word === w.word) b.classList.add("correct");
        else if (j === idx) b.classList.add("wrong");
      });
      answer(w, ok);
    };
    buttons.forEach((b) => b.addEventListener("click", () => choose(+b.dataset.idx)));
    keyHandler = (e) => {
      if (/^[1-4]$/.test(e.key) && !S.answered) { const n = +e.key - 1; if (n < opts.length) choose(n); }
      else if (e.key === "Enter" && S.answered) next();
    };
  }

  // ----- spelling -----
  function renderSpell(w) {
    const hint = w.word[0] + " " + "_ ".repeat(w.word.length - 1).trim();
    $app.innerHTML = `
      ${sessionHead()}
      <div class="card">
        <div class="prompt-label">พิมพ์คำภาษาอังกฤษของคำนี้</div>
        <p class="prompt-thai">${esc(w.th)}</p>
        <span class="pos">${esc(w.pos)}</span>
        <div class="spell-hint">${esc(hint)}</div>
      </div>
      <form class="answer-row" id="spellForm" autocomplete="off">
        <input class="text-input" id="spellInput" placeholder="พิมพ์คำตอบ…" autocapitalize="off" autocorrect="off" spellcheck="false" />
        <button class="btn" type="submit">ตรวจคำตอบ</button>
      </form>
      <div class="feedback" id="fb"></div>
      <div class="next-row" id="nextRow"></div>
      <div class="kbd-hint">กด <kbd>Enter</kbd> เพื่อตรวจ และกดอีกครั้งเพื่อไปข้อถัดไป</div>
    `;
    bindQuit();
    const input = $app.querySelector("#spellInput");
    input.focus();
    $app.querySelector("#spellForm").addEventListener("submit", (e) => {
      e.preventDefault();
      if (S.answered) return next();
      const v = input.value.trim().toLowerCase();
      if (!v) return;
      S.answered = true;
      const ok = v === w.word.toLowerCase();
      input.classList.add(ok ? "correct" : "wrong");
      input.readOnly = true;
      $app.querySelector("#spellForm .btn").style.display = "none";
      answer(w, ok);
    });
    keyHandler = (e) => { if (e.key === "Enter" && S.answered && document.activeElement !== input) next(); };
  }

  // ----- flashcards -----
  function renderFlash(w) {
    $app.innerHTML = `
      ${sessionHead()}
      <div class="flash" id="flash">
        <div class="flash-inner">
          <div class="flash-face">
            <div class="prompt-label">คำศัพท์</div>
            <p class="prompt-word">${esc(w.word)}</p>
            <span class="pos">${esc(w.pos)}</span>
            ${speakBtn(w.word)}
            <div class="hint">แตะการ์ดเพื่อดูความหมาย</div>
          </div>
          <div class="flash-face flash-back">
            <div class="prompt-label">ความหมาย</div>
            <p class="prompt-thai">${esc(w.th)}</p>
            <div class="flash-example">${highlight(w.ex, w.word)}</div>
            ${w.exTh ? `<div class="flash-example-th">${esc(w.exTh)}</div>` : ""}
            ${speakBtn(w.ex)}
          </div>
        </div>
      </div>
      <div class="flash-actions">
        <button class="btn ghost" id="fNo">ยังจำไม่ได้</button>
        <button class="btn hl-btn" id="fYes">จำได้แล้ว</button>
      </div>
      <div class="kbd-hint"><kbd>Space</kbd> พลิกการ์ด, <kbd>1</kbd> ยังจำไม่ได้, <kbd>2</kbd> จำได้แล้ว</div>
    `;
    bindQuit(); bindSpeak();
    const card = $app.querySelector("#flash");
    const flip = () => card.classList.toggle("flipped");
    card.addEventListener("click", flip);
    const mark = (ok) => {
      if (S.answered) return;
      S.answered = true;
      scoreAnswer(w, ok, 5);
      setTimeout(next, 260);
    };
    $app.querySelector("#fNo").addEventListener("click", () => mark(false));
    $app.querySelector("#fYes").addEventListener("click", () => mark(true));
    keyHandler = (e) => {
      if (e.key === " ") { e.preventDefault(); flip(); }
      else if (e.key === "1") mark(false);
      else if (e.key === "2") mark(true);
    };
  }

  // ----- shared answer/next -----
  function scoreAnswer(w, ok, base = 10) {
    record(w.word, ok);
    S.answeredN++;
    if (ok) {
      S.correct++; S.combo++;
      S.maxCombo = Math.max(S.maxCombo, S.combo);
      if (S.combo > (data.bestCombo || 0)) { data.bestCombo = S.combo; persist(); }
      const gain = base + Math.min(S.combo - 1, 5) * 2;
      S.xp += gain;
      const lv = gainXP(gain);
      if (lv) { S.levelUp = lv; sfx.level(); } else sfx.ok(S.combo);
      floatText("+" + gain + " XP", $app.querySelector(".card, .flash"));
    } else {
      if (!S.wrong.includes(w)) S.wrong.push(w);
      if (S.requeue && !S.retry.includes(w)) S.retry.push(w);
      S.combo = 0;
      sfx.bad();
    }
    const card = $app.querySelector(".card, .flash");
    if (card && !reduceMotion) { card.classList.remove("pop", "shake"); void card.offsetWidth; card.classList.add(ok ? "pop" : "shake"); }
    const row = $app.querySelector("#comboRow");
    if (row) row.innerHTML = S.combo >= 2 ? `<span class="combo-chip bump">คอมโบ ×${S.combo}</span>` : "";
    const sc = $app.querySelector(".score-chip");
    if (sc) sc.textContent = S.correct;
  }

  function answer(w, ok) {
    scoreAnswer(w, ok);
    if (S.mode === "speed") {
      setTimeout(() => { if (S && S.mode === "speed" && S.timer) next(); }, ok ? 380 : 900);
      return;
    }
    const blank = $app.querySelector(".blank");
    if (blank) { blank.textContent = w.word; blank.classList.add("filled"); }
    const fb = $app.querySelector("#fb");
    fb.className = "feedback show " + (ok ? "good" : "bad");
    fb.innerHTML = `<div class="fb-title">${ok ? "ถูกต้อง" : "ยังไม่ถูก คำตอบที่ถูกคือ"}</div>` + feedbackDetail(w);
    const last = S.i === S.words.length - 1;
    $app.querySelector("#nextRow").innerHTML = `<button class="btn" id="nextBtn">${last ? "ดูผลลัพธ์" : "ข้อถัดไป"}</button>`;
    const nb = $app.querySelector("#nextBtn");
    nb.addEventListener("click", next);
    const secs = data.settings.autoNext ?? 3;
    if (secs > 0) startAutoNext(ok ? secs : secs + 2, last);
    if (S.mode !== "spell") nb.focus({ preventScroll: true });
    if (S.mode === "en2th" || S.mode === "listen" || !ok) speak(w.word);
  }

  // ----- นับถอยหลังไปข้อถัดไปอัตโนมัติ -----
  let autoT = null, autoI = null;
  function clearAutoNext() { clearTimeout(autoT); clearInterval(autoI); autoT = autoI = null; }
  function startAutoNext(sec, last) {
    clearAutoNext();
    const nb = $app.querySelector("#nextBtn");
    const row = $app.querySelector("#nextRow");
    if (!nb || !row) return;
    const label = last ? "ดูผลลัพธ์" : "ข้อถัดไป";
    let left = sec;
    nb.classList.add("counting");
    nb.style.setProperty("--cd", sec + "s");
    nb.innerHTML = `<span class="cd-fill"></span><span class="cd-label">${label} <span class="cd-num">${left}</span></span>`;
    const hold = document.createElement("button");
    hold.className = "btn ghost"; hold.id = "holdBtn"; hold.textContent = "หยุดรอ";
    row.insertBefore(hold, nb);
    hold.addEventListener("click", () => {
      clearAutoNext();
      nb.classList.remove("counting");
      nb.textContent = label;
      hold.remove();
      nb.focus({ preventScroll: true });
    });
    autoI = setInterval(() => { left--; const n = nb.querySelector(".cd-num"); if (n) n.textContent = Math.max(left, 0); }, 1000);
    autoT = setTimeout(() => { clearAutoNext(); if (S && S.answered && $app.contains(nb)) next(); }, sec * 1000);
  }

  function next() {
    clearAutoNext();
    S.i++;
    if (S.mode === "speed") {
      if (S.i >= S.words.length) { S.words = shuffle(S.words); S.i = 0; }
      return renderQuestion();
    }
    if (S.i >= S.words.length && S.requeue && S.retry.length) {
      // คำที่ตอบผิดจะวนกลับมาถามอีกจนกว่าจะตอบถูก
      S.words = S.words.concat(shuffle(S.retry));
      S.retry = [];
    }
    if (S.i >= S.words.length) return renderResult();
    renderQuestion();
  }

  // ----- learn: introduce new words before quizzing -----
  function renderLearnIntro() {
    const w = S.words[S.introI];
    const n = S.words.length;
    $app.innerHTML = `
      <div class="session-head">
        <button class="back" id="quit" aria-label="ออก"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <div class="progress"><span style="width:${(S.introI / n) * 50}%"></span></div>
        <div class="counter">คำใหม่ ${S.introI + 1} / ${n}</div>
      </div>
      <div class="learn-card">
        <div class="tags"><span class="tag">คำใหม่</span><span class="tag">${w.level}</span></div>
        <h2 class="headword">${esc(w.word)}</h2>
        <div class="entry-line"><span class="pos-i">${esc(w.pos)}</span><span>${esc(w.th)}</span></div>
        <p class="example">${highlight(w.ex, w.word)}</p>
        ${w.exTh ? `<p class="example-th">${esc(w.exTh)}</p>` : ""}
        ${canSpeak ? `<div class="entry-actions"><button class="btn ghost" data-speak="${esc(w.word)}">${SPK} ฟังคำ</button><button class="btn ghost" data-speak="${esc(w.ex)}">${SPK} ฟังประโยค</button></div>` : ""}
      </div>
      <div class="learn-actions">
        <button class="btn ghost" id="knowIt">รู้จักคำนี้แล้ว ข้ามไป</button>
        <button class="btn" id="gotIt">${S.introI === n - 1 ? "ไปทดสอบเลย" : "คำถัดไป"}</button>
      </div>
      <div class="kbd-hint">กด <kbd>Enter</kbd> ไปคำถัดไป</div>
    `;
    bindQuit(); bindSpeak();
    setTimeout(() => speak(w.word), 200);
    const advance = () => {
      S.introI++;
      if (S.introI >= S.words.length) {
        if (!S.words.length) return renderResult();
        S.phase = "quiz"; S.words = shuffle(S.words); S.i = 0;
        return renderQuestion();
      }
      renderLearnIntro();
    };
    $app.querySelector("#gotIt").addEventListener("click", advance);
    $app.querySelector("#knowIt").addEventListener("click", () => {
      // คำที่รู้แล้ว: ตั้งให้ทบทวนอีก 7 วัน แล้วดึงคำใหม่มาแทน
      data.words[w.word] = { r: 1, x: 0, box: 3, due: dayNum() + INTERVALS[3] };
      persist();
      S.skipped.push(w);
      const fresh = shuffle(poolFor(S.level).filter((x) => !data.words[x.word] && !S.words.includes(x)))[0];
      if (fresh) { S.words[S.introI] = fresh; S.set = S.words.slice(); renderLearnIntro(); }
      else { S.words.splice(S.introI, 1); S.set = S.words.slice(); S.introI--; advance(); }
    });
    keyHandler = (e) => { if (e.key === "Enter") { e.preventDefault(); advance(); } };
  }

  // ---------------- result ----------------
  function renderResult() {
    keyHandler = null;
    document.body.classList.remove("in-session");
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    bumpStreak();
    if (S.mode === "learn" || S.mode === "review") return renderStudyResult();
    const speed = S.mode === "speed";
    const total = speed ? S.answeredN : S.words.length;
    const pct = total ? Math.round((S.correct / total) * 100) : 0;
    const key = S.level + ":" + S.mode;
    const prevBest = data.best[key];
    const val = speed ? S.correct : pct;
    const isBest = prevBest == null || val > prevBest;
    if (isBest) { data.best[key] = val; persist(); }
    const newBadges = checkBadges({ perfect: !speed && S.correct === total && total >= 10, speedScore: speed ? S.correct : 0 });
    const great = speed ? S.correct >= 12 : pct >= 80;
    const msg = speed
      ? (S.correct >= 20 ? "เร็วสุดๆ!" : S.correct >= 12 ? "มือไวมาก!" : S.correct >= 6 ? "กำลังดี ลองอีกรอบ" : "อุ่นเครื่องแล้ว ลุยอีกรอบ")
      : (pct === 100 ? "เพอร์เฟกต์ ถูกทุกข้อ" : pct >= 80 ? "เก่งมาก!" : pct >= 50 ? "ดีขึ้นเรื่อยๆ" : "ฝึกต่ออีกนิด สู้ๆ");
    const modeTitle = speed ? "ท้าทาย 60 วินาที" : MODES.find((m) => m.id === S.mode).title;
    const levelName = LEVELS.find((l) => l.id === S.level).name;
    const recordNote = isBest && prevBest != null ? `<span class="new-record">สถิติใหม่! (เดิม ${prevBest}${speed ? " ข้อ" : "%"})</span>` : "";

    $app.innerHTML = `
      <div class="result">
        ${S.levelUp ? `<div class="levelup">เลเวลอัป! ตอนนี้คุณอยู่ Lv ${S.levelUp}</div>` : ""}
        <div class="score-big">${S.correct}<small>${speed ? " ข้อ" : " / " + total}</small></div>
        <h2>${msg}</h2>
        <p>${modeTitle} ระดับ ${levelName}${speed ? `, ตอบไป ${total} ข้อ ถูก ${pct}%` : ""}</p>
        ${recordNote}
        <div class="earned">
          <div><b>+${S.xp}</b><span>XP ที่ได้</span></div>
          <div><b>×${S.maxCombo}</b><span>คอมโบสูงสุด</span></div>
          <div><b>${Math.min(dailyCount(), DAILY_GOAL)}/${DAILY_GOAL}</b><span>เป้าวันนี้</span></div>
        </div>
        ${newBadges.length ? `<div class="new-badges"><h3>ได้เหรียญใหม่</h3><div class="badges">${newBadges.map((b) => badgeHTML(b, true)).join("")}</div></div>` : ""}
        <div class="result-actions">
          <button class="btn" id="again">เล่นอีกรอบ</button>
          ${S.wrong.length && !speed ? `<button class="btn ghost" id="retryWrong">ฝึกเฉพาะคำที่ผิด (${S.wrong.length})</button>` : ""}
          <button class="btn ghost" id="home">เลือกโหมดอื่น</button>
        </div>
        ${S.wrong.length ? `
          <div class="review">
            <h3>คำที่ควรทบทวน</h3>
            <div class="word-list">
              ${S.wrong.map((w) => `<div class="word-row"><i class="dot ${status(w.word)}"></i><div><div class="w">${esc(w.word)}<small>${esc(w.pos)}</small></div><div class="t">${esc(w.th)}</div></div>${canSpeak ? `<button class="mini-speak" data-speak="${esc(w.word)}" aria-label="ฟังเสียง">${SPK}</button>` : "<span></span>"}</div>`).join("")}
            </div>
          </div>` : ""}
      </div>
    `;
    if (great || S.levelUp || newBadges.length) { confetti(); sfx.win(); }
    $app.querySelector("#again").addEventListener("click", () => startSession(S.mode));
    $app.querySelector("#home").addEventListener("click", () => go("practice"));
    const rw = $app.querySelector("#retryWrong");
    if (rw) rw.addEventListener("click", () => {
      S = { mode: S.mode, level: S.level, words: shuffle(S.wrong), i: 0, correct: 0, wrong: [], answered: false, combo: 0, maxCombo: 0, xp: 0, levelUp: 0, answeredN: 0 };
      renderQuestion();
    });
    keyHandler = (e) => { if (e.key === "Enter") startSession(S.mode); };
    bindSpeak();
    window.scrollTo(0, 0);
  }

  function renderStudyResult() {
    const learn = S.mode === "learn";
    const set = S.set;
    const firstTry = set.filter((w) => !S.wrong.includes(w)).length;
    const newBadges = checkBadges({ perfect: false, speedScore: 0 });
    const left = dueWords().length;
    const title = learn ? `เรียนคำใหม่ ${set.length} คำแล้ว` : `ทบทวนครบ ${set.length} คำ`;
    const sub = learn
      ? "คำเหล่านี้จะกลับมาให้ทบทวนพรุ่งนี้ ยิ่งจำได้ ระยะห่างก็จะยิ่งนานขึ้น"
      : left ? `ยังเหลือคำที่ต้องทบทวนวันนี้อีก ${left} คำ` : "วันนี้ไม่มีคำที่ต้องทบทวนแล้ว";
    $app.innerHTML = `
      <div class="result">
        ${S.levelUp ? `<div class="levelup">เลเวลอัป! ตอนนี้คุณอยู่ Lv ${S.levelUp}</div>` : ""}
        <div class="score-big">${set.length}<small> คำ</small></div>
        <h2>${title}</h2>
        <p>${sub}</p>
        <div class="earned">
          <div><b>${firstTry}/${set.length}</b><span>ถูกตั้งแต่ครั้งแรก</span></div>
          <div><b>+${S.xp}</b><span>XP ที่ได้</span></div>
          <div><b>${Math.min(dailyCount(), DAILY_GOAL)}/${DAILY_GOAL}</b><span>เป้าวันนี้</span></div>
        </div>
        ${newBadges.length ? `<div class="new-badges"><h3>ได้เหรียญใหม่</h3><div class="badges">${newBadges.map((b) => badgeHTML(b, true)).join("")}</div></div>` : ""}
        <div class="result-actions">
          ${learn ? `<button class="btn" id="again">เรียนคำใหม่อีก ${data.settings.learnCount || 5} คำ</button>` : left ? `<button class="btn" id="again">ทบทวนต่อ (${left} คำ)</button>` : ""}
          <button class="btn ${learn || left ? "ghost" : ""}" id="home">กลับหน้าแรก</button>
        </div>
        <div class="review">
          <h3>${learn ? "คำที่เพิ่งเรียน" : "คำที่ทบทวนรอบนี้"}</h3>
          <div class="word-list">
            ${set.concat(S.skipped).map((w) => `<div class="word-row"><i class="dot ${status(w.word)}"></i><div><div class="w">${esc(w.word)}<small>${esc(w.pos)}</small></div><div class="t">${esc(w.th)}</div></div><span class="due-chip">${nextReviewText(w.word)}</span></div>`).join("")}
          </div>
        </div>
      </div>`;
    if (firstTry === set.length || S.levelUp || newBadges.length) { confetti(); sfx.win(); }
    const again = $app.querySelector("#again");
    if (again) again.addEventListener("click", () => startSession(S.mode));
    $app.querySelector("#home").addEventListener("click", () => go("home"));
    keyHandler = (e) => { if (e.key === "Enter" && again) startSession(S.mode); };
    window.scrollTo(0, 0);
  }

  // ---------------- toast ----------------
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("out"), 3200);
    setTimeout(() => t.remove(), 3700);
  }

  // ---------------- account: auth state ----------------
  const PERSON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
  function avatarHTML(u, size = 28) {
    if (!u) return PERSON;
    if (u.photo) return `<img src="${esc(u.photo)}" alt="" width="${size}" height="${size}" referrerpolicy="no-referrer">`;
    return `<span class="initial">${esc((u.name || "?").trim().charAt(0).toUpperCase())}</span>`;
  }
  function updateAccountButton() {
    const b = document.getElementById("accountBtn");
    const u = window.WUCloud && window.WUCloud.user;
    b.innerHTML = avatarHTML(u);
    b.classList.toggle("signed-in", !!u);
    b.title = u ? `บัญชี: ${u.name}` : "บัญชีและการตั้งค่า";
  }
  let authBusy = false;
  async function onAuthChange(user) {
    if (user) {
      const userKey = "wu-progress-u-" + user.uid;
      setSync("loading");
      let cloud = null, cloudOk = true;
      try { cloud = await window.WUCloud.load(); } catch (e) { cloudOk = false; console.error(e); }
      let merged = mergeProgress(cloud || {}, readKey(userKey) || {});
      const guest = readKey(GUEST_KEY);
      const mergedGuest = hasProgress(guest);
      if (mergedGuest) { merged = mergeProgress(merged, guest); try { localStorage.removeItem(GUEST_KEY); } catch (e) {} }
      storeKey = userKey;
      try { localStorage.setItem(LAST_UID, user.uid); } catch (e) {}
      fillData(merged);
      store.save(data);
      if (cloudOk) await cloudSaveNow(); else setSync("error");
      if (authBusy) toast(mergedGuest ? "รวมความคืบหน้าในเครื่องนี้เข้ากับบัญชีแล้ว" : `ยินดีต้อนรับ ${user.name}`);
    } else {
      try { localStorage.removeItem(LAST_UID); } catch (e) {}
      const wasUser = storeKey !== GUEST_KEY;
      if (wasUser) { storeKey = GUEST_KEY; fillData(readKey(GUEST_KEY)); }
      setSync("idle");
      if (!wasUser && currentPage() !== "account") { authBusy = false; updateAccountButton(); return; }
    }
    authBusy = false;
    updateAccountButton();
    renderHUD();
    if (!document.body.classList.contains("in-session") && !$app.querySelector(".result")) renderPage();
  }

  // ---------------- page: account ----------------
  const IC = {
    timer: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    sound: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    voice: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>',
    theme: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
    trash: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
    cloud: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.3 12 3.5 3.5 0 0 0 6.5 19z"/></svg>',
    devices: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="14" height="10" rx="2"/><path d="M6 18h6"/><rect x="17" y="8" width="5" height="12" rx="1.5"/></svg>',
    merge: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6a6 6 0 0 0 6 6h6"/><path d="m15 12 3 3-3 3"/><circle cx="6" cy="3" r="0"/></svg>',
  };
  const themePref = () => { try { return localStorage.getItem("wu-theme") || "system"; } catch (e) { return "system"; } };
  function applyTheme(pref) {
    try { localStorage.setItem("wu-theme", pref); } catch (e) {}
    document.documentElement.dataset.theme = pref === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref;
  }
  function settingRow(icon, title, desc, control, cls = "") {
    return `<div class="set-row ${cls}"><span class="set-ic">${icon}</span><div class="set-text"><b>${title}</b><span>${desc}</span></div><div class="set-ctl">${control}</div></div>`;
  }
  const segCtl = (label, items, current, attr) =>
    `<div class="seg" role="group" aria-label="${label}">${items.map(([v, t]) => `<button class="${String(current) === String(v) ? "active" : ""}" ${attr}="${v}" aria-pressed="${String(current) === String(v)}">${t}</button>`).join("")}</div>`;

  let authTab = "signin";
  function renderAccount() {
    const C = window.WUCloud || { enabled: false };
    const u = C.user;
    const autoNext = data.settings.autoNext ?? 3;
    const li = levelInfo(data.xp || 0);
    let top;

    if (u) {
      top = `
        <section class="profile-hero">
          <div class="ph-main">
            <span class="avatar big">${avatarHTML(u, 72)}</span>
            <div class="ph-id">
              <h2>${esc(u.name)}</h2>
              <span class="ph-mail">${esc(u.email)}</span>
              <span class="sync-pill sync-text" data-sync="${sync.state}">${esc(syncText() || "เชื่อมต่อกับบัญชีแล้ว")}</span>
            </div>
            <div class="ph-actions">
              <button class="btn ghost" id="syncNow">${IC.cloud} บันทึกตอนนี้</button>
              <button class="btn ghost" id="signOut">ออกจากระบบ</button>
            </div>
          </div>
          <div class="ph-level">
            <span class="lv-badge">Lv ${li.lv}</span>
            <span class="xpbar big"><span style="width:${(li.into / li.need) * 100}%"></span></span>
            <span class="ph-xp">${li.into} / ${li.need} XP</span>
          </div>
          <div class="ph-stats">
            <div><b>${learnedCount()}</b><span>คำที่เรียนแล้ว</span></div>
            <div><b>${currentStreak()}</b><span>วันติดต่อกัน</span></div>
            <div><b>${data.totalAnswered || 0}</b><span>ข้อที่ทำ</span></div>
            <div><b>${(data.badges || []).length}/${BADGES.length}</b><span>เหรียญ</span></div>
          </div>
        </section>`;
    } else {
      let form;
      if (!cloudOn() || C.loadError) {
        form = `<div class="notice">${C.loadError ? "โหลดระบบบัญชีไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้าเว็บ" : "ระบบบัญชียังไม่ได้เปิดใช้งาน ความคืบหน้าถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น"}</div>`;
      } else if (!C.ready) {
        form = `<div class="notice">กำลังตรวจสอบบัญชี…</div>`;
      } else {
        form = `
          <h2 class="auth-title">${authTab === "signup" ? "สร้างบัญชีใหม่" : "เข้าสู่ระบบ"}</h2>
          <button class="btn google-btn" id="google"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> ดำเนินการต่อด้วย Google</button>
          <div class="or"><span>หรือใช้อีเมล</span></div>
          <form class="auth-form" id="authForm" novalidate>
            ${authTab === "signup" ? `<label>ชื่อที่แสดง<input class="field" name="name" autocomplete="nickname" maxlength="40" placeholder="เช่น น้ำฝน"></label>` : ""}
            <label>อีเมล<input class="field" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
            <label><span class="lbl-row">รหัสผ่าน${authTab === "signin" ? `<button type="button" class="link-btn" id="forgot">ลืมรหัสผ่าน?</button>` : ""}</span><input class="field" name="pass" type="password" autocomplete="${authTab === "signup" ? "new-password" : "current-password"}" required minlength="6" placeholder="อย่างน้อย 6 ตัวอักษร"></label>
            ${authTab === "signup" ? `<label>ยืนยันรหัสผ่าน<input class="field" name="pass2" type="password" autocomplete="new-password" required minlength="6" placeholder="พิมพ์รหัสผ่านอีกครั้ง"></label>` : ""}
            <label class="show-pass"><input type="checkbox" id="showPass"> แสดงรหัสผ่าน</label>
            <p class="form-msg" id="formMsg" role="alert"></p>
            <button class="btn" type="submit">${authTab === "signup" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</button>
          </form>
          <p class="switch-auth">${authTab === "signup" ? `มีบัญชีอยู่แล้ว? <button class="link-btn strong" data-tab="signin">เข้าสู่ระบบ</button>` : `ยังไม่มีบัญชี? <button class="link-btn strong" data-tab="signup">สมัครสมาชิกฟรี</button>`}</p>`;
      }
      top = `
        <section class="auth-split">
          <div class="auth-pitch">
            <h2>เก็บความคืบหน้าไว้ในบัญชี</h2>
            <ul class="perks">
              <li><span class="perk-ic">${IC.devices}</span><div><b>เล่นต่อได้ทุกเครื่อง</b><span>เริ่มบนมือถือ แล้วไปต่อบนคอมได้ทันที</span></div></li>
              <li><span class="perk-ic">${IC.cloud}</span><div><b>ข้อมูลไม่หาย</b><span>ล้างเบราว์เซอร์หรือเปลี่ยนเครื่องก็ยังอยู่ครบ</span></div></li>
              <li><span class="perk-ic">${IC.merge}</span><div><b>ไม่ต้องเริ่มใหม่</b><span>สิ่งที่เล่นไว้ในเครื่องนี้ (Lv ${li.lv}, ${learnedCount()} คำ) จะถูกรวมเข้าบัญชีให้</span></div></li>
            </ul>
          </div>
          <div class="auth-box">${form}</div>
        </section>`;
    }

    const tp = themePref();
    $app.innerHTML = `
      <h1 class="page-title">บัญชี</h1>
      <p class="page-sub">${u ? "ข้อมูลบัญชีและการตั้งค่าการเล่นของคุณ" : "เข้าสู่ระบบเพื่อเซฟความคืบหน้า หรือปรับการตั้งค่าการเล่นด้านล่าง"}</p>
      ${top}

      <h2 class="block-title">การตั้งค่า</h2>
      <section class="set-group">
        <h3>การเล่น</h3>
        ${settingRow(IC.timer, "นับถอยหลังไปข้อถัดไป", "หลังตอบจะไปข้อถัดไปเองเมื่อครบเวลา ถ้าตอบผิดจะได้เวลาอ่านเฉลยเพิ่มอีก 2 วินาที",
          segCtl("นับถอยหลัง", [[0, "ปิด"], [2, "2 วิ"], [3, "3 วิ"], [5, "5 วิ"]], autoNext, "data-auto"))}
        ${settingRow(IC.sound, "เสียงเอฟเฟกต์", "เสียงตอนตอบถูก ตอบผิด และเลเวลอัป",
          segCtl("เสียงเอฟเฟกต์", [[1, "เปิด"], [0, "ปิด"]], data.sound ? 1 : 0, "data-snd"))}
        ${settingRow(IC.voice, "ความเร็วเสียงอ่าน", "ความเร็วตอนอ่านออกเสียงคำศัพท์และประโยค",
          segCtl("ความเร็วเสียงอ่าน", [[0.7, "ช้า"], [0.9, "ปกติ"], [1.1, "เร็ว"]], data.settings.voiceRate ?? 0.9, "data-rate"))}
      </section>
      <section class="set-group">
        <h3>การแสดงผล</h3>
        ${settingRow(IC.theme, "ธีม", "เลือก \"ตามเครื่อง\" เพื่อให้เปลี่ยนตามการตั้งค่าของอุปกรณ์",
          segCtl("ธีม", [["light", "สว่าง"], ["dark", "มืด"], ["system", "ตามเครื่อง"]], tp, "data-theme-set"))}
      </section>
      <section class="set-group danger">
        <h3>ข้อมูล</h3>
        ${settingRow(IC.trash, "ล้างความคืบหน้าทั้งหมด", u ? "ลบคำที่เรียน สถิติ XP และเหรียญทั้งหมดในบัญชีนี้ ย้อนกลับไม่ได้" : "ลบคำที่เรียน สถิติ XP และเหรียญทั้งหมดในเบราว์เซอร์นี้ ย้อนกลับไม่ได้",
          `<button class="btn ghost danger-btn" id="reset">ล้างข้อมูล</button>`)}
      </section>
    `;

    $app.querySelectorAll("[data-auto]").forEach((b) => b.addEventListener("click", () => { data.settings.autoNext = +b.dataset.auto; persist(); renderAccount(); }));
    $app.querySelectorAll("[data-snd]").forEach((b) => b.addEventListener("click", () => { data.sound = b.dataset.snd === "1"; persist(); renderHUD(); renderAccount(); if (data.sound) sfx.ok(0); }));
    $app.querySelectorAll("[data-rate]").forEach((b) => b.addEventListener("click", () => { data.settings.voiceRate = +b.dataset.rate; persist(); renderAccount(); speak("Hello, this is the reading speed."); }));
    $app.querySelectorAll("[data-theme-set]").forEach((b) => b.addEventListener("click", () => { applyTheme(b.dataset.themeSet); renderAccount(); }));
    const on = (id, fn) => { const el = $app.querySelector(id); if (el) el.addEventListener("click", fn); };
    on("#signOut", async () => { await C.signOut(); toast("ออกจากระบบแล้ว"); });
    on("#syncNow", () => cloudSaveNow());
    on("#google", async (e) => {
      e.currentTarget.disabled = true; authBusy = true;
      const r = await C.signInGoogle();
      if (!r.ok) { authBusy = false; showFormMsg(r.error); const g = $app.querySelector("#google"); if (g) g.disabled = false; }
    });
    $app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { authTab = b.dataset.tab; renderAccount(); const f = $app.querySelector(".auth-form .field"); if (f) f.focus(); }));
    on("#forgot", async () => {
      const email = $app.querySelector('[name="email"]').value.trim();
      if (!email) return showFormMsg("ใส่อีเมลก่อน แล้วกด \"ลืมรหัสผ่าน?\" อีกครั้ง");
      const r = await C.resetPassword(email);
      showFormMsg(r.ok ? "ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว" : r.error, r.ok);
    });
    const form = $app.querySelector("#authForm");
    const sp = $app.querySelector("#showPass");
    if (sp) sp.addEventListener("change", () => form.querySelectorAll('[name="pass"], [name="pass2"]').forEach((i) => { i.type = sp.checked ? "text" : "password"; }));
    // บอกทันทีถ้ารหัสผ่านสองช่องไม่ตรงกัน
    const p2 = form && form.querySelector('[name="pass2"]');
    if (p2) p2.addEventListener("input", () => {
      const p1 = form.querySelector('[name="pass"]').value;
      const bad = p2.value && !p1.startsWith(p2.value);
      p2.classList.toggle("invalid", !!bad);
      showFormMsg(bad ? "รหัสผ่านทั้งสองช่องไม่ตรงกัน" : "");
    });
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const email = String(f.get("email") || "").trim(), pass = String(f.get("pass") || "");
      if (!email || !pass) return showFormMsg("กรุณาใส่อีเมลและรหัสผ่าน");
      if (authTab === "signup") {
        if (pass.length < 6) return showFormMsg("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
        if (pass !== String(f.get("pass2") || "")) { showFormMsg("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); const p2 = form.querySelector('[name="pass2"]'); p2.focus(); p2.select(); return; }
      }
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true; authBusy = true;
      const r = authTab === "signup" ? await C.signUpEmail(String(f.get("name") || "").trim(), email, pass) : await C.signInEmail(email, pass);
      if (!r.ok) { authBusy = false; btn.disabled = false; showFormMsg(r.error); }
    });
    const resetBtn = $app.querySelector("#reset");
    resetBtn.addEventListener("click", () => {
      if (resetBtn.dataset.armed) {
        const keep = { settings: data.settings, sound: data.sound };
        fillData(keep);
        persist(); renderHUD(); renderAccount();
        toast("ล้างความคืบหน้าทั้งหมดแล้ว");
      } else {
        resetBtn.dataset.armed = "1";
        resetBtn.textContent = "กดอีกครั้งเพื่อยืนยัน";
        resetBtn.classList.add("armed");
        setTimeout(() => { if (resetBtn.isConnected && resetBtn.dataset.armed) { delete resetBtn.dataset.armed; resetBtn.textContent = "ล้างข้อมูล"; resetBtn.classList.remove("armed"); } }, 4000);
      }
    });
  }
  function showFormMsg(msg, good) {
    const el = $app.querySelector("#formMsg");
    if (el) { el.textContent = msg; el.classList.toggle("good", !!good); } else toast(msg);
  }

  // ---------------- library ----------------
  let libLevel = null, libQuery = "", libFilter = "all";
  function renderLibrary() {
    setNav("library");
    keyHandler = null;
    if (!libLevel) libLevel = data.settings.level;
    $app.innerHTML = `
      <h1 class="page-title">คลังคำศัพท์</h1>
      <p class="page-sub">ดูคำทั้งหมดในแต่ละระดับ แตะที่คำเพื่อดูประโยคตัวอย่างและคำแปล</p>
      <div class="seg" style="margin-bottom:14px;flex-wrap:wrap">
        ${LEVELS.map((l) => `<button class="${l.id === libLevel ? "active" : ""}" data-lib="${l.id}">${l.name}</button>`).join("")}
      </div>
      <div class="lib-toolbar">
        <input class="search" id="q" placeholder="ค้นหาคำศัพท์หรือความหมาย…" value="${esc(libQuery)}" />
        <select class="filter" id="f" aria-label="กรองตามสถานะ">
          ${[["all", "ทุกสถานะ"], ["new", "ยังไม่เคยเรียน"], ["learning", "กำลังเรียนรู้"], ["mastered", "จำได้แล้ว"], ["due", "ถึงเวลาทบทวน"]].map(([v, t]) => `<option value="${v}" ${libFilter === v ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </div>
      <div class="legend">
        <span><i class="dot"></i> ยังไม่เคยเรียน</span>
        <span><i class="dot learning"></i> กำลังเรียนรู้</span>
        <span><i class="dot mastered"></i> จำได้แล้ว (ทบทวนผ่าน ${MASTER_BOX} รอบ)</span>
      </div>
      <div class="word-list" id="list"></div>
    `;
    const draw = () => {
      const q = libQuery.trim().toLowerCase();
      const list = poolFor(libLevel).filter((w) => (!q || w.word.toLowerCase().includes(q) || w.th.includes(q))
        && (libFilter === "all" || (libFilter === "due" ? isDue(w.word) : status(w.word) === libFilter)));
      $app.querySelector("#list").innerHTML = (list.length ? `<p class="list-count">${list.length} คำ</p>` : "") + (list.length
        ? list.map((w) => `<details class="word-item">
            <summary class="word-row">
              <i class="dot ${status(w.word)}"></i>
              <div><div class="w">${esc(w.word)}<small>${esc(w.pos)}${libLevel === "ALL" ? ", " + w.level : ""}</small></div><div class="t">${esc(w.th)}</div></div>
              <span class="row-end">${data.words[w.word] ? `<span class="due-chip ${isDue(w.word) ? "now" : ""}">${nextReviewText(w.word)}</span>` : ""}${canSpeak ? `<button class="mini-speak" data-speak="${esc(w.word)}" aria-label="ฟังเสียง">${SPK}</button>` : ""}</span>
            </summary>
            <div class="word-more"><p class="ex">${highlight(w.ex, w.word)}</p>${w.exTh ? `<p class="ex-th">${esc(w.exTh)}</p>` : ""}</div>
          </details>`).join("")
        : `<div class="empty">ไม่พบคำที่ตรงกับเงื่อนไข</div>`);
      bindSpeak($app.querySelector("#list"));
    };
    draw();
    $app.querySelectorAll("[data-lib]").forEach((b) => b.addEventListener("click", () => { libLevel = b.dataset.lib; renderLibrary(); }));
    $app.querySelector("#q").addEventListener("input", (e) => { libQuery = e.target.value; draw(); });
    $app.querySelector("#f").addEventListener("change", (e) => { libFilter = e.target.value; draw(); });
  }

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (themePref() === "system") applyTheme("system"); });

  // ---------------- boot ----------------
  updateAccountButton();
  renderHUD();
  const hookCloud = () => window.WUCloud.onAuth(onAuthChange);
  if (window.WUCloud) hookCloud(); else window.addEventListener("wu-cloud-ready", hookCloud, { once: true });
  renderPage();
})();
