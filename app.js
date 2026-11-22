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
    { id: "flash", icon: "🃏", title: "แฟลชการ์ด", desc: "ดูคำศัพท์ พลิกดูความหมาย แล้วบอกว่าจำได้ไหม" },
    { id: "en2th", icon: "🇹🇭", title: "เลือกความหมาย", desc: "เห็นคำอังกฤษ เลือกความหมายภาษาไทยที่ถูก" },
    { id: "th2en", icon: "🔤", title: "เลือกคำศัพท์", desc: "เห็นความหมายไทย เลือกคำภาษาอังกฤษที่ถูก" },
    { id: "spell", icon: "⌨️", title: "พิมพ์สะกดคำ", desc: "เห็นความหมายไทย พิมพ์คำภาษาอังกฤษให้ถูก" },
    { id: "listen", icon: "🎧", title: "ฟังแล้วตอบ", desc: "ฟังเสียงคำศัพท์ แล้วเลือกความหมายที่ถูก" },
    { id: "blank", icon: "✏️", title: "เติมคำในประโยค", desc: "เลือกคำที่เหมาะกับช่องว่างในประโยค" },
  ];

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
    { words: {}, best: {}, streak: { last: null, count: 0 }, settings: { level: "A1", count: 10 }, totalAnswered: 0 },
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

  function setNav(view) {
    document.querySelectorAll(".navlink").forEach((n) => n.classList.toggle("active", n.dataset.go === view));
  }
  function go(view) {
    keyHandler = null;
    if (canSpeak) speechSynthesis.cancel();
    if (view === "library") { location.hash = "library"; renderLibrary(); }
    else { history.replaceState(null, "", location.pathname + location.search); renderHome(); }
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", () => { if (location.hash === "#library") renderLibrary(); });

  // ---------------- home ----------------
  function renderHome() {
    setNav("home");
    const level = data.settings.level;
    const pool = poolFor(level);
    const mastered = ALL_WORDS.filter((w) => status(w.word) === "mastered").length;

    $app.innerHTML = `
      <section class="hero">
        <h1>ฝึกศัพท์อังกฤษ วันละนิด</h1>
        <p>เลือกระดับและโหมดที่อยากฝึก ระบบจะสุ่มคำที่คุณยังไม่แม่นมาให้ก่อน</p>
      </section>

      <section class="stats">
        <div class="stat"><div class="stat-value">${currentStreak()} 🔥</div><div class="stat-label">วันติดต่อกัน</div></div>
        <div class="stat"><div class="stat-value">${mastered}<span style="font-size:14px;color:var(--muted);font-weight:500"> / ${ALL_WORDS.length}</span></div><div class="stat-label">คำที่จำได้แล้ว</div></div>
        <div class="stat"><div class="stat-value">${data.totalAnswered || 0}</div><div class="stat-label">ข้อที่ทำไปแล้ว</div></div>
      </section>

      <section class="section">
        <h2 class="section-title">ระดับ (CEFR)</h2>
        <div class="chips" id="levels">
          ${LEVELS.map((l) => `<button class="chip ${l.id === level ? "active" : ""}" data-level="${l.id}">${l.name}${l.desc ? ` <small>${l.desc}</small>` : ""}</button>`).join("")}
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">จำนวนข้อต่อรอบ</h2>
        <div class="chips" id="counts">
          ${COUNTS.map((c) => `<button class="chip ${c === data.settings.count ? "active" : ""}" data-count="${c}">${c} ข้อ</button>`).join("")}
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">โหมดฝึก · ${pool.length} คำในระดับนี้</h2>
        <div class="modes">
          ${MODES.map((m) => {
            const best = data.best[level + ":" + m.id];
            return `<button class="mode" data-mode="${m.id}">
              <span class="mode-icon">${m.icon}</span>
              <span class="mode-title">${m.title}</span>
              <span class="mode-desc">${m.desc}</span>
              ${best != null ? `<span class="mode-best">คะแนนดีที่สุด ${best}%</span>` : ""}
            </button>`;
          }).join("")}
        </div>
      </section>
    `;

    $app.querySelectorAll("[data-level]").forEach((b) => b.addEventListener("click", () => { data.settings.level = b.dataset.level; persist(); renderHome(); }));
    $app.querySelectorAll("[data-count]").forEach((b) => b.addEventListener("click", () => { data.settings.count = +b.dataset.count; persist(); renderHome(); }));
    $app.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => startSession(b.dataset.mode)));
  }

  // ---------------- session ----------------
  let S = null;

  function startSession(mode) {
    const level = data.settings.level;
    const words = pickWords(level, data.settings.count);
    S = { mode, level, words, i: 0, correct: 0, wrong: [], answered: false };
    renderQuestion();
    window.scrollTo(0, 0);
  }

  function sessionHead() {
    const pct = (S.i / S.words.length) * 100;
    return `<div class="session-head">
      <button class="back" id="quit" aria-label="ออก">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="counter">${S.i + 1} / ${S.words.length}</div>
    </div>`;
  }

  function bindQuit() {
    $app.querySelector("#quit").addEventListener("click", () => go("home"));
  }

  function renderQuestion() {
    S.answered = false;
    const w = S.words[S.i];
    switch (S.mode) {
      case "flash": return renderFlash(w);
      case "en2th": return renderChoice(w, {
        label: "คำนี้แปลว่าอะไร?",
        prompt: `<p class="prompt-word">${esc(w.word)}</p><span class="pos">${esc(w.pos)}</span>${speakBtn(w.word)}`,
        field: "th",
      });
      case "th2en": return renderChoice(w, {
        label: "คำภาษาอังกฤษของคำนี้คือ?",
        prompt: `<p class="prompt-thai">${esc(w.th)}</p><span class="pos">${esc(w.pos)}</span>`,
        field: "word",
      });
      case "listen": return renderChoice(w, {
        label: "ฟังแล้วเลือกความหมายที่ถูกต้อง",
        prompt: `<button class="speak-big" id="bigSpeak" aria-label="ฟังอีกครั้ง">🔊</button><div class="hint">${canSpeak ? "กดเพื่อฟังอีกครั้ง" : "เบราว์เซอร์นี้ไม่รองรับเสียง"}</div>`,
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
    return canSpeak ? `<div><button class="speak" data-speak="${esc(text)}">🔊 ฟังเสียง</button></div>` : "";
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
    return `<div class="fb-detail"><b>${esc(w.word)}</b> <span style="color:var(--muted)">${esc(w.pos)}</span> — ${esc(w.th)}<br><i>${esc(w.ex)}</i></div>`;
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
        ${opts.map((o, idx) => `<button class="option" data-idx="${idx}"><span class="key">${idx + 1}</span><span>${esc(o[cfg.field])}</span></button>`).join("")}
      </div>
      <div class="feedback" id="fb"></div>
      <div class="next-row" id="nextRow"></div>
      <div class="kbd-hint">กด 1–4 เพื่อเลือก · Enter เพื่อไปข้อถัดไป</div>
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
        <div class="hint" style="letter-spacing:.15em;font-family:ui-monospace,monospace">${esc(hint)}</div>
      </div>
      <form class="answer-row" id="spellForm" autocomplete="off">
        <input class="text-input" id="spellInput" placeholder="พิมพ์คำตอบ…" autocapitalize="off" autocorrect="off" spellcheck="false" />
        <button class="btn" type="submit">ตรวจคำตอบ</button>
      </form>
      <div class="feedback" id="fb"></div>
      <div class="next-row" id="nextRow"></div>
      <div class="kbd-hint">กด Enter เพื่อตรวจ · Enter อีกครั้งเพื่อไปข้อถัดไป</div>
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
        <button class="btn ghost" id="fNo">😕 ยังจำไม่ได้</button>
        <button class="btn" id="fYes">👍 จำได้แล้ว</button>
      </div>
      <div class="kbd-hint">Space พลิกการ์ด · 1 ยังจำไม่ได้ · 2 จำได้แล้ว</div>
    `;
    bindQuit(); bindSpeak();
    const card = $app.querySelector("#flash");
    const flip = () => card.classList.toggle("flipped");
    card.addEventListener("click", flip);
    const mark = (ok) => {
      if (S.answered) return;
      S.answered = true;
      record(w.word, ok);
      if (ok) S.correct++; else S.wrong.push(w);
      next();
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
  function answer(w, ok) {
    record(w.word, ok);
    if (ok) S.correct++; else S.wrong.push(w);
    const fb = $app.querySelector("#fb");
    fb.className = "feedback show " + (ok ? "good" : "bad");
    fb.innerHTML = (ok ? "✓ ถูกต้อง!" : "✗ ยังไม่ถูก คำตอบคือ") + feedbackDetail(w);
    const last = S.i === S.words.length - 1;
    $app.querySelector("#nextRow").innerHTML = `<button class="btn" id="nextBtn">${last ? "ดูผลลัพธ์" : "ข้อถัดไป →"}</button>`;
    const nb = $app.querySelector("#nextBtn");
    nb.addEventListener("click", next);
    if (S.mode !== "spell") nb.focus({ preventScroll: true });
    if (S.mode === "en2th" || S.mode === "listen" || !ok) speak(w.word);
  }

  function next() {
    S.i++;
    if (S.i >= S.words.length) return renderResult();
    renderQuestion();
  }

  // ---------------- result ----------------
  function renderResult() {
    keyHandler = null;
    bumpStreak();
    const total = S.words.length;
    const pct = Math.round((S.correct / total) * 100);
    const key = S.level + ":" + S.mode;
    const prevBest = data.best[key];
    const isBest = prevBest == null || pct > prevBest;
    if (isBest) { data.best[key] = pct; persist(); }
    const r = 60, c = 2 * Math.PI * r;
    const msg = pct === 100 ? "เพอร์เฟกต์! 🎉" : pct >= 80 ? "เก่งมาก!" : pct >= 50 ? "ดีขึ้นเรื่อยๆ" : "ฝึกต่ออีกนิด สู้ๆ";
    const modeTitle = MODES.find((m) => m.id === S.mode).title;
    const levelName = LEVELS.find((l) => l.id === S.level).name;

    $app.innerHTML = `
      <div class="result">
        <div class="score-ring">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/>
          </svg>
          <div class="num">${pct}%</div>
        </div>
        <h2>${msg}</h2>
        <p>${modeTitle} · ${levelName} — ถูก ${S.correct} จาก ${total} ข้อ${isBest && prevBest != null ? " · สถิติใหม่!" : ""}</p>
        <div class="result-actions">
          <button class="btn" id="again">เล่นอีกรอบ</button>
          ${S.wrong.length ? `<button class="btn ghost" id="retryWrong">ฝึกเฉพาะคำที่ผิด (${S.wrong.length})</button>` : ""}
          <button class="btn ghost" id="home">กลับหน้าแรก</button>
        </div>
        ${S.wrong.length ? `
          <div class="review">
            <h3 class="section-title">คำที่ควรทบทวน</h3>
            <div class="word-list">
              ${S.wrong.map((w) => `<div class="review-item" style="padding:12px 16px;background:var(--surface)"><b>${esc(w.word)} <small style="color:var(--muted);font-weight:400">${esc(w.pos)}</small></b><span>${esc(w.th)}</span></div>`).join("")}
            </div>
          </div>` : ""}
      </div>
    `;
    $app.querySelector("#again").addEventListener("click", () => startSession(S.mode));
    $app.querySelector("#home").addEventListener("click", () => go("home"));
    const rw = $app.querySelector("#retryWrong");
    if (rw) rw.addEventListener("click", () => {
      S = { mode: S.mode, level: S.level, words: shuffle(S.wrong), i: 0, correct: 0, wrong: [], answered: false };
      renderQuestion();
    });
    window.scrollTo(0, 0);
  }

  // ---------------- library ----------------
  let libLevel = null, libQuery = "";
  function renderLibrary() {
    setNav("library");
    keyHandler = null;
    if (!libLevel) libLevel = data.settings.level;
    $app.innerHTML = `
      <section class="hero">
        <h1>คลังคำศัพท์</h1>
        <p>ดูคำทั้งหมดในแต่ละระดับ และความคืบหน้าของคุณ</p>
      </section>
      <div class="chips" style="margin-bottom:16px">
        ${LEVELS.map((l) => `<button class="chip ${l.id === libLevel ? "active" : ""}" data-lib="${l.id}">${l.name}</button>`).join("")}
      </div>
      <div class="lib-toolbar">
        <input class="search" id="q" placeholder="ค้นหาคำศัพท์หรือความหมาย…" value="${esc(libQuery)}" />
      </div>
      <div class="legend">
        <span><i class="dot"></i> ยังไม่เคยฝึก</span>
        <span><i class="dot learning"></i> กำลังเรียนรู้</span>
        <span><i class="dot mastered"></i> จำได้แล้ว</span>
        <button class="link-btn" id="reset" style="margin-left:auto">ล้างความคืบหน้าทั้งหมด</button>
      </div>
      <div class="word-list" id="list"></div>
    `;
    const draw = () => {
      const q = libQuery.trim().toLowerCase();
      const list = poolFor(libLevel).filter((w) => !q || w.word.toLowerCase().includes(q) || w.th.includes(q));
      $app.querySelector("#list").innerHTML = list.length
        ? list.map((w) => `<div class="word-row">
            <i class="dot ${status(w.word)}"></i>
            <div><div class="w">${esc(w.word)}<small>${esc(w.pos)}${libLevel === "ALL" ? " · " + w.level : ""}</small></div><div class="t">${esc(w.th)}</div></div>
            ${canSpeak ? `<button class="mini-speak" data-speak="${esc(w.word)}" aria-label="ฟังเสียง">🔊</button>` : "<span></span>"}
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
  if (location.hash === "#library") renderLibrary(); else renderHome();
})();
