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
    window.WORDS[level].forEach(([word, pos, th, ex]) => {
      ALL_WORDS.push({ word, pos, th, ex, level });
    });
  });

  // ---------------- storage ----------------
  const KEY = "wu-progress-v1";
  const store = {
    load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    },
    save(d) {
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    },
  };
  const data = Object.assign(
    { words: {}, best: {}, streak: { last: null, count: 0 }, settings: { level: "A1", count: 10 }, totalAnswered: 0, xp: 0, daily: null, badges: [], sound: true, bestCombo: 0 },
    store.load()
  );
  const persist = () => store.save(data);

  function wordStat(w) { return data.words[w] || { r: 0, x: 0 }; }
  function status(w) {
    const s = data.words[w];
    if (!s) return "new";
    if (s.r >= 3 && s.r >= s.x * 2) return "mastered";
    return "learning";
  }
  function record(w, ok) {
    const s = data.words[w] || { r: 0, x: 0 };
    ok ? s.r++ : s.x++;
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
      const s = wordStat(w.word);
      return { w, score: s.r - s.x * 2 + Math.random() * 3 };
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
  function speak(text, rate = 0.9) {
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
  const PAGES = ["home", "practice", "library", "progress"];
  function currentPage() {
    const h = location.hash.replace("#", "");
    return PAGES.includes(h) ? h : "home";
  }
  function stopSession() {
    keyHandler = null;
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
    ({ home: renderHome, practice: renderPractice, library: renderLibrary, progress: renderProgress })[page]();
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
  const levelName = (id) => LEVELS.find((l) => l.id === id).name;
  const modeTitle = (id) => (id === "speed" ? "ท้าทาย 60 วินาที" : (MODES.find((m) => m.id === id) || MODES[1]).title);
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
        <div class="today-item"><b>${mastered} <small>/ ${ALL_WORDS.length}</small></b><span>คำที่จำได้แล้ว</span></div>
      </section>`;
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
      <p class="page-sub">${first ? "ฝึกคำศัพท์อังกฤษระดับ A1 ถึง C1 วันละนิด เริ่มได้เลยจากปุ่มด้านล่าง" : "ทำให้ครบเป้าวันละ " + DAILY_GOAL + " ข้อ เพื่อรักษาสถิติฝึกต่อเนื่อง"}</p>

      ${todayPanel()}

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
      <p class="page-sub">กดเริ่มฝึกเพื่อเลือกระดับ วิธีฝึก และจำนวนข้อ หรือกดที่โหมดด้านล่างเพื่อเริ่มจากโหมดนั้น</p>

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
    $app.querySelector("#startBtn").addEventListener("click", () => openSetup());
    $app.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => openSetup({ mode: b.dataset.mode })));
  }

  // ---------------- setup sheet (choose level, mode, count) ----------------
  const ALL_MODES = () => [{ id: "speed", title: "ท้าทาย 60 วินาที", desc: "แข่งกับเวลา" }].concat(MODES);
  function openSetup(preset = {}) {
    const draft = {
      level: data.settings.level,
      mode: preset.mode || data.settings.lastMode || "en2th",
      count: data.settings.count,
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
      const n = poolFor(draft.level).length;
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
                ${ALL_MODES().map((m) => `<button type="button" class="opt mode-opt ${draft.mode === m.id ? "on" : ""} ${m.id === "speed" ? "is-speed" : ""}" data-pm="${m.id}" aria-pressed="${draft.mode === m.id}">
                  <span class="glyph g-${m.id}">${m.id === "speed" ? CLOCK.replace(/36/g, "22") : ICONS[m.id]}</span><b>${m.title}</b>
                </button>`).join("")}
              </div>
            </fieldset>
            <fieldset class="pick">
              <legend><span class="step-no">3</span>จำนวนข้อ</legend>
              ${speed
                ? `<p class="pick-note">โหมดนี้ไม่จำกัดจำนวนข้อ ตอบได้เรื่อยๆ จนครบ 60 วินาที</p>`
                : `<div class="seg big" role="group" aria-label="จำนวนข้อ">${COUNTS.map((c) => `<button type="button" class="${draft.count === c ? "active" : ""}" data-pc="${c}">${c} ข้อ</button>`).join("")}</div>
                   ${draft.count > n ? `<p class="pick-note">ระดับนี้มี ${n} คำ จะได้เล่น ${n} ข้อ</p>` : ""}`}
            </fieldset>
          </div>
          <div class="sheet-foot">
            <p class="summary">${modeTitle(draft.mode)}<br><span>ระดับ ${levelName(draft.level)}, ${speed ? "60 วินาที" : Math.min(draft.count, n) + " ข้อ"}</span></p>
            <button class="btn big-start" id="goStart">${PLAY.replace(/34/g, "18")} เริ่มฝึก</button>
          </div>
        </div>`;
      dlg.querySelector(".sheet-body").scrollTop = keepScroll;
      dlg.querySelector("#closeSetup").addEventListener("click", () => dlg.close());
      dlg.querySelectorAll("[data-pl]").forEach((b) => b.addEventListener("click", () => { draft.level = b.dataset.pl; draw(); dlg.querySelector(`[data-pl="${draft.level}"]`).focus({ preventScroll: true }); }));
      dlg.querySelectorAll("[data-pm]").forEach((b) => b.addEventListener("click", () => { draft.mode = b.dataset.pm; draw(); dlg.querySelector(`[data-pm="${draft.mode}"]`).focus({ preventScroll: true }); }));
      dlg.querySelectorAll("[data-pc]").forEach((b) => b.addEventListener("click", () => { draft.count = +b.dataset.pc; draw(); dlg.querySelector(`[data-pc="${draft.count}"]`).focus({ preventScroll: true }); }));
      dlg.querySelector("#goStart").addEventListener("click", () => {
        data.settings.level = draft.level;
        data.settings.count = draft.count;
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
          <div><b>${data.totalAnswered || 0}</b><span>ข้อที่ทำทั้งหมด</span></div>
          <div><b>×${data.bestCombo || 0}</b><span>คอมโบสูงสุด</span></div>
          <div><b>${have.length} / ${BADGES.length}</b><span>เหรียญรางวัล</span></div>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>ความคืบหน้าแต่ละระดับ</h2><p>จำได้แล้ว กำลังเรียนรู้ และยังไม่เคยฝึก</p></div></div>
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
          <div class="legend"><span><i class="dot mastered"></i> จำได้แล้ว</span><span><i class="dot learning"></i> กำลังเรียนรู้</span><span><i class="dot"></i> ยังไม่เคยฝึก</span></div>
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
    if (mode !== "speed") { data.settings.lastMode = mode; persist(); }
    const level = data.settings.level;
    const speed = mode === "speed";
    const words = speed ? shuffle(poolFor(level)) : pickWords(level, data.settings.count);
    S = { mode, level, words, i: 0, correct: 0, wrong: [], answered: false, combo: 0, maxCombo: 0, xp: 0, levelUp: 0, answeredN: 0 };
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
    return `<div class="fb-detail"><span class="w">${esc(w.word)}</span> <span class="pos-i" style="font:italic 14px var(--serif);color:var(--muted)">${esc(w.pos)}</span>&nbsp; ${esc(w.th)}<span class="ex">${highlight(w.ex, w.word)}</span></div>`;
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
    if (big) big.addEventListener("click", () => speak(w.word, 0.85));
    if (cfg.autoSpeak) setTimeout(() => speak(w.word, 0.85), 250);

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
            <div class="flash-example">${esc(w.ex)}</div>
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
    if (S.mode !== "spell") nb.focus({ preventScroll: true });
    if (S.mode === "en2th" || S.mode === "listen" || !ok) speak(w.word);
  }

  function next() {
    S.i++;
    if (S.mode === "speed") {
      if (S.i >= S.words.length) { S.words = shuffle(S.words); S.i = 0; }
      return renderQuestion();
    }
    if (S.i >= S.words.length) return renderResult();
    renderQuestion();
  }

  // ---------------- result ----------------
  function renderResult() {
    keyHandler = null;
    document.body.classList.remove("in-session");
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    bumpStreak();
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

  // ---------------- library ----------------
  let libLevel = null, libQuery = "";
  function renderLibrary() {
    setNav("library");
    keyHandler = null;
    if (!libLevel) libLevel = data.settings.level;
    $app.innerHTML = `
      <h1 class="page-title">คลังคำศัพท์</h1>
      <p class="page-sub">ดูคำทั้งหมดในแต่ละระดับ พร้อมสถานะว่าคำไหนจำได้แล้ว</p>
      <div class="seg" style="margin-bottom:14px;flex-wrap:wrap">
        ${LEVELS.map((l) => `<button class="${l.id === libLevel ? "active" : ""}" data-lib="${l.id}">${l.name}</button>`).join("")}
      </div>
      <div class="lib-toolbar">
        <input class="search" id="q" placeholder="ค้นหาคำศัพท์หรือความหมาย…" value="${esc(libQuery)}" />
      </div>
      <div class="legend">
        <span><i class="dot"></i> ยังไม่เคยฝึก</span>
        <span><i class="dot learning"></i> กำลังเรียนรู้</span>
        <span><i class="dot mastered"></i> จำได้แล้ว</span>
        <button class="link-btn" id="reset">ล้างความคืบหน้าทั้งหมด</button>
      </div>
      <div class="word-list" id="list"></div>
    `;
    const draw = () => {
      const q = libQuery.trim().toLowerCase();
      const list = poolFor(libLevel).filter((w) => !q || w.word.toLowerCase().includes(q) || w.th.includes(q));
      $app.querySelector("#list").innerHTML = list.length
        ? list.map((w) => `<div class="word-row">
            <i class="dot ${status(w.word)}"></i>
            <div><div class="w">${esc(w.word)}<small>${esc(w.pos)}${libLevel === "ALL" ? ", " + w.level : ""}</small></div><div class="t">${esc(w.th)}</div></div>
            ${canSpeak ? `<button class="mini-speak" data-speak="${esc(w.word)}" aria-label="ฟังเสียง">${SPK}</button>` : "<span></span>"}
          </div>`).join("")
        : `<div class="empty">ไม่พบคำที่ค้นหา</div>`;
      bindSpeak($app.querySelector("#list"));
    };
    draw();
    $app.querySelectorAll("[data-lib]").forEach((b) => b.addEventListener("click", () => { libLevel = b.dataset.lib; renderLibrary(); }));
    $app.querySelector("#q").addEventListener("input", (e) => { libQuery = e.target.value; draw(); });
    const resetBtn = $app.querySelector("#reset");
    resetBtn.addEventListener("click", () => {
      if (resetBtn.dataset.armed) {
        data.words = {}; data.best = {}; data.streak = { last: null, count: 0 }; data.totalAnswered = 0;
        persist(); renderLibrary();
      } else {
        resetBtn.dataset.armed = "1";
        resetBtn.textContent = "กดอีกครั้งเพื่อยืนยัน (ย้อนกลับไม่ได้)";
        resetBtn.style.color = "var(--bad)";
        setTimeout(() => { if (resetBtn.isConnected) { delete resetBtn.dataset.armed; resetBtn.textContent = "ล้างความคืบหน้าทั้งหมด"; resetBtn.style.color = ""; } }, 4000);
      }
    });
  }

  // ---------------- boot ----------------
  renderHUD();
  renderPage();
})();
