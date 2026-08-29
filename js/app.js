/*
 * خوش كلام — app logic.
 * Everything lives in localStorage under one key; export/import moves it
 * between devices. Learning design: FSRS spacing + retrieval practice with
 * escalating difficulty (recognition → production → cloze) + a daily
 * real-world usage challenge (generation & transfer).
 */
(() => {
  const LS_KEY = "khosh-kalam-v1";
  const DAY = FSRS.DAY;

  // ── store ─────────────────────────────────────────────────────────────
  const defaults = () => ({
    version: 1,
    progress: {}, // id -> FSRS card
    overrides: {}, // id -> partial word fields
    custom: [], // user-added words
    removed: [], // archived word ids
    verify: {}, // verify id -> "approved" | "rejected"
    packs: [], // added pack keys
    settings: { newPerDay: 8, lang: "bi" }, // lang: "bi" bilingual | "ar" Arabic only
    log: {}, // "YYYY-MM-DD" -> {reviews, correct, intro}
    challenges: {}, // date -> {ids: [], done: []}
    game: {}, // arena: xp, ranks, best scores, daily goal, freezes (see arena.js)
    revision: 0, // sync revision last agreed with the server
    localOnly: false, // chose to run without an account
  });

  let store = defaults();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) store = Object.assign(defaults(), JSON.parse(raw));
  } catch (e) {
    /* corrupted or unavailable storage — start fresh in memory */
  }
  const save = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store));
    } catch (e) {
      /* storage full/blocked — session continues in memory */
    }
    sync?.markDirty(); // debounced background push; a no-op when signed out
  };

  const todayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const log = () => (store.log[todayKey()] ||= { reviews: 0, correct: 0, intro: 0 });

  /** Every pack the app offers, from all pack files. */
  const ALL_PACKS = [...SEED_PACKS, ...SEED_DOMAINS, ...SEED_COLLOQUIAL];

  // ── word assembly ─────────────────────────────────────────────────────
  function allWords() {
    const words = [...SEED_MANUAL];
    // call-and-response pairs join the same deck as their own card type
    words.push(...SEED_RESPONSES.map((r) => ({
      id: r.id, ar: r.call, tr: r.callTr, en: r.en, reg: "pair", topic: r.topic,
      ex: `«${r.call}» — «${r.resp}»`, note: r.note, resp: r.resp, respTr: r.respTr,
    })));
    for (const pack of ALL_PACKS)
      if (store.packs.includes(pack.key)) words.push(...pack.words);
    for (const v of SEED_VERIFY)
      if (store.verify[v.id] === "approved" && v.en)
        words.push({
          id: v.id, ar: v.ar, tr: v.tr === "—" ? "" : v.tr, en: v.en,
          reg: v.reg || "msa", topic: v.topic || "يومي", ex: "", note: v.fix,
        });
    words.push(...store.custom);
    return words
      .filter((w) => !store.removed.includes(w.id))
      .map((w) => (store.overrides[w.id] ? { ...w, ...store.overrides[w.id] } : w));
  }

  const isStudyable = (w) => w.reg !== "tip" && w.ex !== "—";
  const cardOf = (w) => store.progress[w.id] || FSRS.emptyCard();

  // ── session ───────────────────────────────────────────────────────────
  let session = null; // {queue: [wordId,...], total, done, current, flipped}

  function buildSession() {
    const words = allWords().filter(isStudyable);
    const byId = Object.fromEntries(words.map((w) => [w.id, w]));
    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const due = words
      .filter((w) => {
        const c = store.progress[w.id];
        return c && c.reps > 0 && c.due <= endOfDay.getTime();
      })
      // words fumbled in the arena come first among what is already due
      .sort((a, b) => {
        const ma = store.game?.misses?.[a.id] || 0, mb = store.game?.misses?.[b.id] || 0;
        if (ma !== mb) return mb - ma;
        return store.progress[a.id].due - store.progress[b.id].due;
      });

    const newBudget = Math.max(0, store.settings.newPerDay - log().intro);
    // thread new cards from both pools so pairs surface early instead of
    // waiting behind the whole vocabulary list: every 4th new card is a pair
    const freshAll = words.filter((w) => !store.progress[w.id]);
    const freshPairs = freshAll.filter((w) => w.reg === "pair");
    const freshRest = freshAll.filter((w) => w.reg !== "pair");
    const fresh = [];
    for (let pi = 0, ri = 0, k = 0; fresh.length < newBudget && (pi < freshPairs.length || ri < freshRest.length); k++) {
      if ((k % 4 === 3 && pi < freshPairs.length) || ri >= freshRest.length) fresh.push(freshPairs[pi++]);
      else fresh.push(freshRest[ri++]);
    }

    // interleave: shuffle due reviews, then thread new cards in evenly
    const queue = shuffle(due.map((w) => w.id));
    if (fresh.length) {
      const step = Math.max(1, Math.floor(queue.length / (fresh.length + 1)));
      fresh.forEach((w, i) => queue.splice(Math.min(queue.length, (i + 1) * step + i), 0, w.id));
    }
    session = { queue, byId, total: queue.length, done: 0, flipped: false };
  }

  /* Exercise for a card:
     - first sighting → "learn" (word + everything shown, then self-grade)
     - young (stability < 7d) → "recall": AR shown, retrieve meaning
     - mature → alternate "produce" (EN → AR) and "cloze" (fill the blank) */
  function exerciseFor(word, card) {
    if (word.reg === "pair") return !card || card.reps === 0 ? "learn" : "respond";
    if (!card || card.reps === 0) return "learn";
    if (card.stability < 7) return "recall";
    const cloze = makeCloze(word);
    if (card.reps % 2 === 0 && cloze) return "cloze";
    // "produce" prompts with the English gloss, which Arabic-only mode hides
    if (!bilingual()) return cloze ? "cloze" : "recall";
    return "produce";
  }

  function makeCloze(word) {
    if (!word.ex || word.ex === "—") return null;
    const head = word.ar.replace(/^ال/, "").split(/[\s/]+/)[0];
    if (head.length < 3) return null;
    const tokens = word.ex.split(" ");
    let best = -1, bestLen = 2;
    tokens.forEach((t, i) => {
      const len = lcsLen(clean(t), clean(head));
      if (len > bestLen) { bestLen = len; best = i; }
    });
    if (best < 0) return null;
    const blanked = tokens.map((t, i) => (i === best ? "＿＿＿" : t)).join(" ");
    return { blanked, answer: tokens[best] };
  }
  const clean = (s) => s.replace(/[،.؟!:—«»"()]/g, "");
  function lcsLen(a, b) {
    let max = 0;
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b.length; j++) {
        let k = 0;
        while (a[i + k] && a[i + k] === b[j + k]) k++;
        if (k > max) max = k;
      }
    return max;
  }

  function gradeCurrent(g) {
    const id = session.queue[0];
    const word = session.byId[id];
    const wasNew = !store.progress[id];
    store.progress[id] = FSRS.grade(cardOf(word), g);
    const l = log();
    l.reviews += 1;
    if (g > 1) l.correct += 1;
    if (wasNew) l.intro += 1;
    session.queue.shift();
    session.done += 1;
    if (g === 1) {
      // relearn later in the same session
      session.queue.splice(Math.min(3, session.queue.length), 0, id);
      session.total += 1;
    }
    session.flipped = false;
    save();
    render();
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── streak & challenge ────────────────────────────────────────────────
  /** A day counts if you reviewed, earned arena XP, or spent a streak freeze. */
  function dayActive(k) {
    return (store.log[k]?.reviews || 0) > 0
      || (store.game?.xpLog?.[k] || 0) > 0
      || (store.game?.frozen || []).includes(k);
  }
  function streak() {
    let n = 0;
    const d = new Date();
    if (!dayActive(todayKey(d))) d.setDate(d.getDate() - 1); // today not yet done
    while (dayActive(todayKey(d))) { n += 1; d.setDate(d.getDate() - 1); }
    return n;
  }

  function challenge() {
    const key = todayKey();
    // a challenge cached empty (before any reviews existed) may regenerate
    if (store.challenges[key] && !store.challenges[key].ids.length) delete store.challenges[key];
    if (!store.challenges[key]) {
      // pick 3 recently-studied words worth activating in real conversation
      const cands = allWords()
        .filter((w) => isStudyable(w) && store.progress[w.id]?.reps > 0)
        .sort((a, b) => (store.progress[b.id].last || 0) - (store.progress[a.id].last || 0))
        .slice(0, 12);
      store.challenges[key] = { ids: shuffle(cands).slice(0, 3).map((w) => w.id), done: [] };
      // keep only the last 30 challenge days
      const keys = Object.keys(store.challenges).sort();
      keys.slice(0, -30).forEach((k) => delete store.challenges[k]);
      save();
    }
    return store.challenges[key];
  }

  // ── rendering ─────────────────────────────────────────────────────────
  const stage = document.getElementById("stage");
  let view = "today";
  let wordsFilter = { q: "", reg: "", topic: "" };
  let openWordId = null;
  let showAddForm = false;
  let backupPanel = null; // null | "export" | "import"
  /* Embedded viewers block file downloads and file pickers, so offer them
     only when the app owns its own window; copy/paste is the path that
     always works. */
  const canDownload = (() => { try { return window.self === window.top; } catch { return false; } })();

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ── language ──
     bilingual() drives every label: Arabic leads, English sits under it.
     In Arabic-only mode the English simply isn't rendered. */
  const bilingual = () => (store.settings.lang || "bi") === "bi";
  const dateLocale = () => (bilingual() ? "en-GB" : "ar-KW");
  function S(k, ...a) {
    const s = UI[k] || { ar: k, en: k };
    return {
      ar: typeof s.ar === "function" ? s.ar(...a) : s.ar,
      en: typeof s.en === "function" ? s.en(...a) : s.en,
    };
  }
  /** Label as HTML: Arabic, with the English stacked beneath when bilingual. */
  function t(k, ...a) {
    const s = S(k, ...a);
    return bilingual()
      ? `<span class="bi"><span class="bi-ar">${esc(s.ar)}</span><span class="bi-en">${esc(s.en)}</span></span>`
      : esc(s.ar);
  }
  /** Same, but inline on one line — for tags and meta rows. */
  function ti(k, ...a) {
    const s = S(k, ...a);
    return bilingual() ? `${esc(s.ar)} <span class="bi-inline">${esc(s.en)}</span>` : esc(s.ar);
  }
  /** Plain text, for alerts, titles and placeholders. */
  function ts(k, ...a) {
    const s = S(k, ...a);
    return bilingual() ? `${s.ar}\n${s.en}` : s.ar;
  }
  const REG_KEY = { kw: "regKw", msa: "regMsa", phrase: "regPhrase", pair: "regPair", tip: "regTip", idiom: "regIdiom" };
  const regTag = (reg) => `<span class="tag tag-${esc(reg)}">${REG_KEY[reg] ? ti(REG_KEY[reg]) : esc(reg)}</span>`;
  const topicLabel = (tp) =>
    bilingual() && TOPIC_EN[tp] ? `${esc(tp)} <span class="bi-inline">${esc(TOPIC_EN[tp])}</span>` : esc(tp);

  function render() {
    document.body.classList.toggle("ar-only", !bilingual());
    if (!sync.session() && !store.localOnly) return renderAuth();
    document.body.classList.remove("auth-mode");
    document.getElementById("tabs").hidden = false;
    document.querySelectorAll(".tab").forEach((el) => {
      el.classList.toggle("active", el.dataset.view === view);
      el.querySelector(".tab-label").innerHTML = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-lang]").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === (store.settings.lang || "bi"));
      b.title = ts(b.dataset.lang === "ar" ? "langArTitle" : "langBiTitle");
    });
    document.querySelector(".brand-sub").innerHTML = t("brandSub");
    const dot = document.getElementById("syncDot");
    if (dot) { dot.className = `syncdot ${syncState}`; dot.title = ts(SYNC_TITLE[syncState] || "syncIdle"); }
    document.getElementById("streakBadge").title = ts("streakTitle");
    document.getElementById("streakCount").textContent = streak();
    const pending = SEED_VERIFY.filter((v) => !store.verify[v.id]).length;
    document.getElementById("verifyPill").textContent = pending || "";
    ({ today: renderToday, arena: renderArena, words: renderWords, verify: renderVerify, packs: renderPacks, stats: renderStats }[view])();
  }

  // ── today ──
  function renderToday() {
    if (session && session.queue.length) return renderCard();

    const words = allWords().filter(isStudyable);
    const now = Date.now();
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const dueCount = words.filter((w) => { const c = store.progress[w.id]; return c && c.reps > 0 && c.due <= endOfDay.getTime(); }).length;
    const newCount = Math.min(words.filter((w) => !store.progress[w.id]).length, Math.max(0, store.settings.newPerDay - log().intro));
    const l = log();
    const ch = challenge();
    const chWords = ch.ids.map((id) => words.find((w) => w.id === id)).filter(Boolean);

    const finished = session && !session.queue.length;
    session = null;

    stage.innerHTML = `
      ${finished ? `<div class="panel" style="border-color: rgb(47 191 113 / 0.5)"><b>${t("doneTitle")}</b><div class="note-info">${t("doneBody", l.reviews)}</div></div>` : ""}
      <div class="panel">
        <div class="day-summary">
          <div class="cell"><b>${dueCount}</b><span>${t("cellDue")}</span></div>
          <div class="cell"><b>${newCount}</b><span>${t("cellNew")}</span></div>
          <div class="cell"><b>${l.reviews}</b><span>${t("cellReviewed")}</span></div>
        </div>
        ${dueCount + newCount > 0
          ? `<div style="margin-top:1rem; text-align:center"><button class="btn btn-primary" id="startBtn" style="width:100%; padding:0.9rem">${t("startSession", dueCount + newCount)}</button></div>`
          : `<div class="empty" style="padding:1.2rem 0 0.4rem">${t("nothingDue")}</div>`}
      </div>

      <div class="panel challenge">
        <div class="microlabel">${t("challengeTitle")}</div>
        ${chWords.length ? `<ul style="margin-top:0.5rem">${chWords.map((w) => `
          <li class="${ch.done.includes(w.id) ? "done" : ""}">
            <input type="checkbox" data-ch="${esc(w.id)}" ${ch.done.includes(w.id) ? "checked" : ""} />
            <div><span class="w-ar">${esc(w.ar)}</span> <span class="note-info en-only">${esc(w.en)}</span></div>
          </li>`).join("")}</ul>
          <div class="note-info" style="margin-top:0.5rem">${t("challengeNote")}</div>`
        : `<div class="note-info" style="margin-top:0.5rem">${t("challengeEmpty")}</div>`}
      </div>

      <div class="panel">
        <div class="microlabel">${t("captureTitle")}</div>
        <div class="note-info" style="margin:0.4rem 0 0.6rem">${t("captureNote")}</div>
        <button class="btn" id="captureBtn" style="width:100%">${t("captureBtn")}</button>
      </div>`;

    document.getElementById("startBtn")?.addEventListener("click", () => { buildSession(); render(); });
    document.getElementById("captureBtn").addEventListener("click", () => { view = "words"; showAddForm = true; render(); });
    stage.querySelectorAll("[data-ch]").forEach((cb) =>
      cb.addEventListener("change", () => {
        const c = challenge();
        c.done = cb.checked ? [...new Set([...c.done, cb.dataset.ch])] : c.done.filter((x) => x !== cb.dataset.ch);
        save(); render();
      }));
  }

  function renderCard() {
    const id = session.queue[0];
    const w = session.byId[id];
    const card = store.progress[id];
    const mode = exerciseFor(w, card);
    const cloze = mode === "cloze" ? makeCloze(w) : null;
    const pct = Math.round((session.done / session.total) * 100);

    const MODES = { learn: "modeLearn", recall: "modeRecall", produce: "modeProduce", cloze: "modeCloze", respond: "modeRespond" };
    const modeKey = w.reg === "pair" && mode === "learn" ? "modeLearnPair" : MODES[mode];

    let front = "";
    if (w.reg === "pair" && (mode === "learn" || session.flipped)) {
      front = `
        <div class="card-ar" style="font-size:1.5rem; color:var(--ink-dim)">${esc(w.ar)}</div>
        <div class="microlabel">${t("replyLabel")}</div>
        <div class="card-ar">${esc(w.resp)}</div>
        ${w.respTr ? `<div class="card-tr">${esc(w.respTr)}</div>` : ""}
        <div class="card-en" style="font-size:0.95rem">${esc(w.en)}</div>
        ${w.note ? `<div class="card-note">${esc(w.note)}</div>` : ""}`;
    } else if (mode === "respond") {
      front = `<div class="card-ar">${esc(w.ar)}</div><div class="microlabel" style="margin-top:0.4rem">${t("respondHint")}</div>`;
    } else if (mode === "learn" || session.flipped) {
      front = `
        <div class="card-ar">${esc(w.ar)}</div>
        ${w.tr ? `<div class="card-tr">${esc(w.tr)}</div>` : ""}
        <div class="card-en">${esc(w.en)}</div>
        ${w.ex && w.ex !== "—" ? `<div class="card-ex">${esc(w.ex)}</div>` : ""}
        ${w.note ? `<div class="card-note">${esc(w.note)}</div>` : ""}`;
    } else if (mode === "recall") {
      front = `<div class="card-ar">${esc(w.ar)}</div>`;
    } else if (mode === "produce") {
      front = `<div class="card-en" style="font-size:1.4rem">${esc(w.en)}</div><div class="microlabel" style="margin-top:0.4rem">${topicLabel(w.topic)} · ${t("produceHint")}</div>`;
    } else if (mode === "cloze") {
      front = `<div class="card-ar cloze">${esc(cloze.blanked).replace("＿＿＿", '<span class="blank">＿＿＿</span>')}</div><div class="card-en">${esc(w.en)}</div>`;
    }

    const graded = mode === "learn" || session.flipped;
    stage.innerHTML = `
      <div class="progressbar"><div style="width:${pct}%"></div></div>
      <div class="panel">
        <div class="h-row" style="margin:0"><span class="card-mode">${t(modeKey)}</span>${regTag(w.reg)}</div>
        <div class="card-face">${front}</div>
        ${graded
          ? `<div class="grade-row">
              <button class="btn g1" data-g="1">${t("g1")}<span class="grade-sub">${t("g1sub")}</span></button>
              <button class="btn g2" data-g="2">${t("g2")}<span class="grade-sub">${t("g2sub")}</span></button>
              <button class="btn g3" data-g="3">${t("g3")}<span class="grade-sub">${t("g3sub")}</span></button>
              <button class="btn g4" data-g="4">${t("g4")}<span class="grade-sub">${t("g4sub")}</span></button>
            </div>`
          : `<button class="btn" id="flipBtn" style="width:100%; padding:0.85rem">${t("flip")}</button>
             <div class="flip-hint">${t("flipHint")}</div>`}
      </div>
      <button class="btn btn-ghost btn-sm" id="endBtn">${t("endSession")}</button>`;

    document.getElementById("flipBtn")?.addEventListener("click", () => { session.flipped = true; render(); });
    document.getElementById("endBtn").addEventListener("click", () => { session = null; render(); });
    stage.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => gradeCurrent(+b.dataset.g)));
  }

  // keyboard: space to flip, 1-4 to grade
  document.addEventListener("keydown", (e) => {
    if (view !== "today" || !session || !session.queue.length) return;
    if (e.key === " ") { e.preventDefault(); if (!session.flipped) { session.flipped = true; render(); } }
    if (["1", "2", "3", "4"].includes(e.key)) {
      const id = session.queue[0];
      const mode = exerciseFor(session.byId[id], store.progress[id]);
      if (mode === "learn" || session.flipped) gradeCurrent(+e.key);
    }
  });

  // ── auth gate ──
  function renderAuth() {
    document.body.classList.add("auth-mode");
    document.getElementById("tabs").hidden = true;
    stage.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card">
          <div class="auth-brand">خوش كلام</div>
          <div class="auth-sub">${t("brandSub")}</div>
          <div class="note-info" style="margin:1rem 0 1.2rem">${t("authIntro")}</div>
          ${authStep === "email"
            ? `<label class="f">${t("emailLabel")}
                 <input type="email" id="authEmail" dir="ltr" autocomplete="email" inputmode="email"
                        value="${esc(authEmail)}" placeholder="you@example.com" /></label>
               <button class="btn btn-primary" id="sendCodeBtn" style="width:100%; margin-top:0.8rem">${t("sendCode")}</button>`
            : `<label class="f">${t("codeLabel")}
                 <input type="text" id="authCode" dir="ltr" inputmode="numeric" autocomplete="one-time-code"
                        maxlength="6" placeholder="123456" class="code-input" /></label>
               <button class="btn btn-primary" id="verifyBtn" style="width:100%; margin-top:0.8rem">${t("verifyCode")}</button>
               <button class="btn btn-ghost btn-sm" id="backEmailBtn" style="width:100%; margin-top:0.4rem">${t("changeEmail")}</button>`}
          ${syncMsg ? `<div class="auth-msg">${esc(syncMsg)}</div>` : ""}
          <button class="btn btn-ghost btn-sm" id="localOnlyBtn" style="width:100%; margin-top:1.2rem">${t("useLocalOnly")}</button>
        </div>
      </div>`;
    wireAuth();
  }

  function wireAuth() {
    const send = async () => {
      authEmail = (document.getElementById("authEmail")?.value || authEmail).trim();
      if (!authEmail) return;
      syncMsg = ts("syncing"); render();
      try { await sync.sendCode(authEmail); authStep = "code"; syncMsg = ts("codeSent"); }
      catch { syncMsg = ts("syncFail"); }
      render();
    };
    const verify = async () => {
      const code = (document.getElementById("authCode")?.value || "").trim();
      if (code.length < 6) return;
      syncMsg = ts("syncing"); render();
      try {
        await sync.verifyCode(authEmail, code);
        syncMsg = null; authStep = "email";
        startSync();
        render();
      } catch { syncMsg = ts("codeBad"); render(); }
    };
    document.getElementById("sendCodeBtn")?.addEventListener("click", send);
    document.getElementById("authEmail")?.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    document.getElementById("verifyBtn")?.addEventListener("click", verify);
    const codeEl = document.getElementById("authCode");
    codeEl?.focus();
    // six digits in and it goes straight through — no extra tap
    codeEl?.addEventListener("input", (e) => { if (e.target.value.trim().length === 6) verify(); });
    document.getElementById("backEmailBtn")?.addEventListener("click", () => { authStep = "email"; syncMsg = null; render(); });
    document.getElementById("localOnlyBtn")?.addEventListener("click", () => {
      store.localOnly = true; save(); render();
    });
  }

  // ── arena ──
  function renderArena() {
    stage.innerHTML = arena.render();
    arena.wire(stage);
  }

  // ── words ──
  function renderWords() {
    const words = allWords();
    const topics = [...new Set(words.map((w) => w.topic))];
    const q = wordsFilter.q.trim();
    const list = words.filter((w) =>
      (!q || w.ar.includes(q) || (w.en || "").toLowerCase().includes(q.toLowerCase()) || (w.tr || "").toLowerCase().includes(q.toLowerCase())) &&
      (!wordsFilter.reg || w.reg === wordsFilter.reg) &&
      (!wordsFilter.topic || w.topic === wordsFilter.topic));

    stage.innerHTML = `
      <div class="h-row"><h2>${t("wordsTitle", words.length)}</h2>
        <button class="btn btn-sm ${showAddForm ? "" : "btn-primary"}" id="addToggle">${showAddForm ? t("close") : t("addNew")}</button></div>
      ${showAddForm ? addFormHTML() : ""}
      <div class="toolbar">
        <input type="search" id="q" placeholder="${esc(S("searchPlaceholder").ar)}" value="${esc(wordsFilter.q)}" />
        <select id="fReg"><option value="">${esc(S("allRegisters").ar)}</option>
          ${Object.entries(REG_KEY).map(([k, key]) => `<option value="${k}" ${wordsFilter.reg === k ? "selected" : ""}>${esc(S(key).ar)}${bilingual() ? " · " + esc(S(key).en) : ""}</option>`).join("")}</select>
        <select id="fTopic"><option value="">${esc(S("allTopics").ar)}</option>
          ${topics.map((tp) => `<option value="${esc(tp)}" ${wordsFilter.topic === tp ? "selected" : ""}>${esc(tp)}${bilingual() && TOPIC_EN[tp] ? " · " + esc(TOPIC_EN[tp]) : ""}</option>`).join("")}</select>
      </div>
      <div class="panel" style="padding:0.3rem 1.1rem">
        ${list.length ? list.map(wordRowHTML).join("") : `<div class="empty">${t("noResults")}</div>`}
      </div>
      ${accountPanelHTML()}
      <div class="panel">
        <div class="microlabel">${t("backupTitle")}</div>
        <div class="note-info" style="margin:0.4rem 0 0.6rem">${t("backupNote")}</div>
        <div class="v-actions">
          <button class="btn btn-sm" id="exportBtn">${t("backupBtn")}</button>
          <button class="btn btn-sm" id="importBtn">${t("restoreBtn")}</button>
          <label class="f" style="margin-inline-start:auto; display:flex; align-items:center; gap:0.4rem">${t("newPerDay")}
            <input type="number" id="newPerDay" min="0" max="50" value="${store.settings.newPerDay}" style="width:4.2rem" /></label>
        </div>
        ${backupPanel === "export" ? `
          <div class="word-detail" style="margin-top:0.7rem">
            <div class="note-info">${t("exportNote")}</div>
            <textarea id="expText" rows="4" readonly style="margin-top:0.5rem; font-size:0.7rem" dir="ltr">${esc(JSON.stringify({ ...store, exportedAt: new Date().toISOString() }))}</textarea>
            <div class="v-actions">
              <button class="btn btn-sm btn-primary" id="copyBtn">${t("copyBtn")}</button>
              ${canDownload ? `<button class="btn btn-sm" id="dlBtn">${t("dlBtn")}</button>` : ""}
              <button class="btn btn-sm btn-ghost" id="closeBackup">${t("close")}</button>
            </div>
          </div>` : ""}
        ${backupPanel === "import" ? `
          <div class="word-detail" style="margin-top:0.7rem">
            <div class="note-info">${t("importNote")}</div>
            <textarea id="impText" rows="4" placeholder="${esc(S("impPlaceholder").ar)}" style="margin-top:0.5rem; font-size:0.7rem" dir="ltr"></textarea>
            <div class="v-actions">
              <button class="btn btn-sm btn-primary" id="impPaste">${t("impPaste")}</button>
              ${canDownload ? `<button class="btn btn-sm" id="importBtnFile">${t("pickFile")}</button>
              <input type="file" id="importFile" accept=".json,application/json" style="display:none" />` : ""}
              <button class="btn btn-sm btn-ghost" id="closeBackup">${t("close")}</button>
            </div>
          </div>` : ""}
      </div>`;

    document.getElementById("addToggle").addEventListener("click", () => { showAddForm = !showAddForm; render(); });
    document.getElementById("q").addEventListener("input", (e) => { wordsFilter.q = e.target.value; render(); document.getElementById("q").focus(); const el = document.getElementById("q"); el.setSelectionRange(el.value.length, el.value.length); });
    document.getElementById("fReg").addEventListener("change", (e) => { wordsFilter.reg = e.target.value; render(); });
    document.getElementById("fTopic").addEventListener("change", (e) => { wordsFilter.topic = e.target.value; render(); });
    document.getElementById("newPerDay").addEventListener("change", (e) => { store.settings.newPerDay = Math.max(0, +e.target.value || 0); save(); });
    wireAccountPanel();
    document.getElementById("exportBtn").addEventListener("click", () => { backupPanel = backupPanel === "export" ? null : "export"; render(); });
    document.getElementById("importBtn").addEventListener("click", () => { backupPanel = backupPanel === "import" ? null : "import"; render(); });
    stage.querySelectorAll("#closeBackup").forEach((b) => b.addEventListener("click", () => { backupPanel = null; render(); }));
    document.getElementById("copyBtn")?.addEventListener("click", copyBackup);
    document.getElementById("dlBtn")?.addEventListener("click", downloadJSON);
    document.getElementById("impPaste")?.addEventListener("click", () => applyBackup(document.getElementById("impText").value));
    document.getElementById("importBtnFile")?.addEventListener("click", () => document.getElementById("importFile").click());
    document.getElementById("importFile")?.addEventListener("change", importJSON);
    document.getElementById("expText")?.addEventListener("focus", (e) => e.target.select());
    stage.querySelectorAll("[data-open]").forEach((r) => r.addEventListener("click", () => { openWordId = openWordId === r.dataset.open ? null : r.dataset.open; render(); }));
    stage.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(ts("confirmArchive"))) {
        store.removed.push(b.dataset.del); save(); openWordId = null; render();
      }
    }));
    if (showAddForm) wireAddForm();
  }

  function wordRowHTML(w) {
    const c = store.progress[w.id];
    const stateKey = !c ? "stateNew" : c.stability >= 21 ? "stateMature" : c.stability >= 7 ? "stateSettling" : "stateYoung";
    const open = openWordId === w.id;
    return `
      <div class="word-row" data-open="${esc(w.id)}" style="cursor:pointer">
        <div class="w-main">
          <span class="w-ar">${esc(w.ar)}</span>
          <div class="w-meta">${regTag(w.reg)} · ${topicLabel(w.topic)} · ${ti(stateKey)}${c ? ` · ${esc(S("nextDue").ar)} ${new Date(c.due).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" })}` : ""}</div>
          ${open ? `<div class="word-detail" onclick="event.stopPropagation()">
              ${w.tr ? `<div class="card-tr">${esc(w.tr)}</div>` : ""}
              ${w.ex && w.ex !== "—" ? `<div class="card-ex">${esc(w.ex)}</div>` : ""}
              ${w.note ? `<div class="card-note">${esc(w.note)}</div>` : ""}
              <div class="v-actions"><button class="btn btn-sm btn-danger" data-del="${esc(w.id)}">${t("archive")}</button></div>
            </div>` : ""}
        </div>
        <div class="w-en">${esc(w.en)}</div>
      </div>`;
  }

  function addFormHTML() {
    return `
      <div class="panel form-grid" id="addForm">
        <label class="f">${t("fWord")} <input id="aAr" required /></label>
        <label class="f">${t("fMeaning")} <input id="aEn" dir="ltr" /></label>
        <label class="f">${t("fTranslit")} <input id="aTr" dir="ltr" placeholder="${esc(S("fOptional").ar)}" /></label>
        <div style="display:flex; gap:0.6rem">
          <label class="f" style="flex:1">${t("fRegister")}
            <select id="aReg">${["kw", "msa", "phrase"].map((k) => `<option value="${k}">${esc(S(REG_KEY[k]).ar)}</option>`).join("")}</select></label>
          <label class="f" style="flex:1">${t("fTopic")} <input id="aTopic" value="يومي" /></label>
        </div>
        <label class="f">${t("fExample")} <textarea id="aEx" rows="2"></textarea></label>
        <label class="f">${t("fNote")} <input id="aNote" placeholder="${esc(S("fOptional").ar)}" /></label>
        <button class="btn btn-primary" id="aSave">${t("fSave")}</button>
      </div>`;
  }

  function wireAddForm() {
    document.getElementById("aSave").addEventListener("click", () => {
      const ar = document.getElementById("aAr").value.trim();
      if (!ar) return alert(ts("needWord"));
      store.custom.push({
        id: "c" + Date.now(),
        ar, tr: document.getElementById("aTr").value.trim(),
        en: document.getElementById("aEn").value.trim(),
        reg: document.getElementById("aReg").value,
        topic: document.getElementById("aTopic").value.trim() || "يومي",
        ex: document.getElementById("aEx").value.trim(),
        note: document.getElementById("aNote").value.trim(),
      });
      save(); showAddForm = false; render();
    });
  }

  /* Backups travel as text first: a file download is blocked in some
     embedded viewers, but copy/paste works everywhere. */
  function copyBackup() {
    const ta = document.getElementById("expText");
    ta.focus(); ta.select();
    const done = () => { const b = document.getElementById("copyBtn"); b.innerHTML = t("copied"); setTimeout(() => (b.innerHTML = t("copyBtn")), 1800); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(ta.value).then(done, () => { try { document.execCommand("copy"); done(); } catch { alert(ts("copyManual")); } });
    else { try { document.execCommand("copy"); done(); } catch { alert(ts("copyManual")); } }
  }

  function downloadJSON() {
    try {
      const blob = new Blob([JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `khosh-kalam-${todayKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { alert(ts("dlUnavailable")); }
  }

  function applyBackup(text) {
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== "object" || !data.progress) throw new Error("bad");
      store = Object.assign(defaults(), data);
      backupPanel = null;
      save(); render();
      alert(ts("restored"));
    } catch { alert(ts("badBackup")); }
  }

  function importJSON(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => applyBackup(reader.result);
    reader.readAsText(f);
  }


  // ── account & sync ────────────────────────────────────────────────────
  let authStep = "email"; // email | code
  let authEmail = "";
  let syncMsg = null;
  let netOK = null; // null = unknown, false = blocked (no network reachable)
  let syncState = "idle"; // idle | pending | syncing | ok | error | offline
  const SYNC_TITLE = { idle: "syncIdle", pending: "syncPending", syncing: "syncing", ok: "syncDone", error: "syncFail", offline: "syncOffline" };

  /** Begin background sync and reflect its state in the top bar. */
  function startSync() {
    sync.start((st) => { syncState = st; const d = document.getElementById("syncDot"); if (d) { d.className = `syncdot ${st}`; d.title = ts(SYNC_TITLE[st] || "syncIdle"); } });
  }

  function accountPanelHTML() {
    const signedIn = sync.session();
    return `
      <div class="panel">
        <div class="microlabel">${t("accountTitle")}</div>
        ${netOK === false
          ? `<div class="note-info" style="margin-top:0.5rem">${t("syncBlocked")}</div>`
          : signedIn
            ? `<div class="note-info" style="margin:0.4rem 0 0.6rem">${ti("signedInAs")} <b dir="ltr">${esc(sync.email())}</b></div>
               <div class="v-actions">
                 <button class="btn btn-sm btn-primary" id="syncBtn">${t("syncNow")}</button>
                 <button class="btn btn-sm btn-ghost" id="signOutBtn">${t("signOut")}</button>
               </div>`
            : `<div class="note-info" style="margin:0.4rem 0 0.6rem">${t("accountNote")}</div>
               ${authStep === "email"
                 ? `<label class="f">${t("emailLabel")}
                      <input type="email" id="authEmail" dir="ltr" value="${esc(authEmail)}" placeholder="you@example.com" /></label>
                    <div class="v-actions"><button class="btn btn-sm btn-primary" id="sendCodeBtn">${t("sendCode")}</button></div>`
                 : `<label class="f">${t("codeLabel")}
                      <input type="text" id="authCode" dir="ltr" inputmode="numeric" maxlength="8" placeholder="123456" /></label>
                    <div class="v-actions">
                      <button class="btn btn-sm btn-primary" id="verifyBtn">${t("verifyCode")}</button>
                      <button class="btn btn-sm btn-ghost" id="backEmailBtn">${t("close")}</button>
                    </div>`}`}
        ${syncMsg ? `<div class="note-info" style="margin-top:0.6rem">${esc(syncMsg)}</div>` : ""}
      </div>`;
  }

  function wireAccountPanel() {
    const setMsg = (k) => { syncMsg = ts(k); render(); };
    document.getElementById("sendCodeBtn")?.addEventListener("click", async () => {
      const el = document.getElementById("authEmail");
      authEmail = el.value.trim();
      if (!authEmail) return;
      syncMsg = ts("syncing"); render();
      try { await sync.sendCode(authEmail); authStep = "code"; setMsg("codeSent"); }
      catch { setMsg("syncFail"); }
    });
    document.getElementById("verifyBtn")?.addEventListener("click", async () => {
      const code = document.getElementById("authCode").value.trim();
      syncMsg = ts("syncing"); render();
      try {
        await sync.verifyCode(authEmail, code);
        authStep = "email";
        await doSync();
      } catch { setMsg("codeBad"); }
    });
    document.getElementById("backEmailBtn")?.addEventListener("click", () => { authStep = "email"; syncMsg = null; render(); });
    document.getElementById("syncBtn")?.addEventListener("click", doSync);
    document.getElementById("signOutBtn")?.addEventListener("click", () => {
      if (!confirm(ts("confirmSignOut"))) return;
      sync.signOut(); store.localOnly = false; syncMsg = null; view = "today"; render();
    });
    document.getElementById("authEmail")?.addEventListener("input", (e) => { authEmail = e.target.value; });
  }

  async function doSync() {
    syncMsg = ts("syncing"); render();
    try { await sync.syncNow(); syncMsg = ts("syncDone"); }
    catch { syncMsg = ts("syncFail"); }
    render();
  }

  // ── verify ──
  function renderVerify() {
    const pending = SEED_VERIFY.filter((v) => !store.verify[v.id]);
    const doneCount = SEED_VERIFY.length - pending.length;
    const V_LABEL = {
      "ok-msa": ["vOkMsa", "tag-msa"], "ok-kw": ["vOkKw", "tag-kw"],
      "wrong-gloss": ["vWrongGloss", "tag-bad"], misspelled: ["vMisspelled", "tag-bad"],
      "not-kuwaiti": ["vNotKuwaiti", "tag-bad"], fabricated: ["vFabricated", "tag-bad"],
      doubtful: ["vDoubtful", "tag-phrase"],
    };
    stage.innerHTML = `
      <div class="h-row"><h2>${t("verifyTitle")}</h2></div>
      <div class="note-info" style="margin-bottom:0.8rem">${t("verifyNote", doneCount, SEED_VERIFY.length)}</div>
      ${pending.length ? pending.map((v) => {
        const [labelKey, cls] = V_LABEL[v.verdict] || [null, ""];
        const approvable = !!v.en;
        return `<div class="panel">
          <div class="h-row" style="margin:0">
            <span class="w-ar" style="font-family:var(--font-ar); font-size:1.3rem">${esc(v.ar)}</span>
            <span class="tag ${cls}">${labelKey ? ti(labelKey) : esc(v.verdict)}</span>
          </div>
          ${v.aiGloss && v.aiGloss !== "—" ? `<div class="note-info en-only">${esc(S("oldGloss").en)}: "${esc(v.aiGloss)}"</div>` : ""}
          <div class="verdict">${esc(v.fix)}</div>
          <div class="v-actions">
            ${approvable ? `<button class="btn btn-sm btn-primary" data-approve="${esc(v.id)}">${t("approve")}${v.verdict.startsWith("ok") ? "" : t("approveCorrected")}</button>` : ""}
            <button class="btn btn-sm" data-reject="${esc(v.id)}">${t("rejectBtn")}</button>
          </div>
        </div>`;
      }).join("") : `<div class="empty"><span class="big">🧹</span>${t("verifyDone")}</div>`}`;
    stage.querySelectorAll("[data-approve]").forEach((b) => b.addEventListener("click", () => { store.verify[b.dataset.approve] = "approved"; save(); render(); }));
    stage.querySelectorAll("[data-reject]").forEach((b) => b.addEventListener("click", () => { store.verify[b.dataset.reject] = "rejected"; save(); render(); }));
  }

  // ── packs ──
  function renderPacks() {
    stage.innerHTML = `
      <div class="h-row"><h2>${t("packsTitle")}</h2></div>
      <div class="note-info" style="margin-bottom:0.8rem">${t("packsNote")}</div>
      ${ALL_PACKS.map((p) => {
        const added = store.packs.includes(p.key);
        return `<div class="panel">
          <div class="h-row" style="margin:0">
            <h2>${esc(p.name)}${bilingual() && p.nameEn ? `<span class="bi-en">${esc(p.nameEn)}</span>` : ""}</h2>
            <span class="tag">${ti("packCards", p.words.length)}</span>
          </div>
          <div class="note-info" style="margin:0.4rem 0 0.6rem">${esc(p.desc)}${bilingual() && p.descEn ? `<span class="bi-en">${esc(p.descEn)}</span>` : ""}</div>
          <div class="card-ex" style="border:none; padding:0; font-size:1rem">${p.words.slice(0, 3).map((w) => esc(w.ar)).join(" · ")} …</div>
          <div class="v-actions">
            ${added
              ? `<span class="tag tag-kw">${ti("added")}</span>`
              : `<button class="btn btn-sm btn-primary" data-pack="${esc(p.key)}">${t("addPack")}</button>`}
          </div>
        </div>`;
      }).join("")}`;
    stage.querySelectorAll("[data-pack]").forEach((b) => b.addEventListener("click", () => { store.packs.push(b.dataset.pack); save(); render(); }));
  }

  // ── stats ──
  function renderStats() {
    const words = allWords().filter(isStudyable);
    const active = words.filter((w) => store.progress[w.id]?.reps > 0);
    const mature = active.filter((w) => store.progress[w.id].stability >= 21);
    const kw = words.filter((w) => w.reg === "kw").length;

    let r30 = { reviews: 0, correct: 0 };
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const l = store.log[todayKey(d)];
      if (l) { r30.reviews += l.reviews; r30.correct += l.correct; }
      d.setDate(d.getDate() - 1);
    }
    const retention = r30.reviews ? Math.round((r30.correct / r30.reviews) * 100) : null;

    // 7-day due forecast
    const days = [];
    for (let i = 0; i < 7; i++) {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() + i);
      const end = new Date(start); end.setHours(23, 59, 59, 999);
      const n = active.filter((w) => {
        const due = store.progress[w.id].due;
        return i === 0 ? due <= end.getTime() : due >= start.getTime() && due <= end.getTime();
      }).length;
      days.push({ label: i === 0 ? S("forecastToday").ar : start.toLocaleDateString(dateLocale(), { weekday: "short" }), n });
    }
    const max = Math.max(1, ...days.map((x) => x.n));

    stage.innerHTML = `
      <div class="h-row"><h2>${t("statsTitle")}</h2></div>
      <div class="stat-grid">
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${active.length}</b><div class="microlabel">${t("statActive", words.length)}</div></div>
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${mature.length}</b><div class="microlabel">${t("statMature")}</div></div>
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${retention === null ? "—" : retention + "٪"}</b><div class="microlabel">${t("statRetention")}</div></div>
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${streak()}</b><div class="microlabel">${t("statStreak")}</div></div>
      </div>
      <div class="panel" style="margin-top:0.9rem">
        <div class="microlabel">${t("forecastTitle")}</div>
        <div class="forecast" style="margin-bottom:1.4rem">
          ${days.map((x) => `<div class="bar" style="height:${(x.n / max) * 100}%"><span>${x.n || ""}</span><em>${esc(x.label)}</em></div>`).join("")}
        </div>
      </div>
      <div class="panel">
        <div class="microlabel">${t("distTitle")}</div>
        <div class="note-info" style="margin-top:0.4rem">
          ${t("distLine", kw, words.filter((w) => w.reg === "msa").length, words.filter((w) => w.reg === "phrase").length, words.filter((w) => w.reg === "pair").length)}
          ${retention !== null && retention < 80 ? `<div style="margin-top:0.5rem">${t("tipLow")}</div>` : ""}
          ${retention !== null && retention > 95 && active.length > 30 ? `<div style="margin-top:0.5rem">${t("tipHigh")}</div>` : ""}
        </div>
      </div>
      <div class="panel note-info">
        <div class="microlabel" style="margin-bottom:0.4rem">${t("whyTitle")}</div>
        ${t("whyBody")}
      </div>`;
  }

  // ── boot ──
  const arena = createArena({
    store: () => store,
    todayKey, streak, save, esc, t, ti, ts, S, bilingual,
    allWords, isStudyable,
    rerender: () => render(),
  });
  const sync = createSync({
    revision: () => store.revision,
    exportState: () => JSON.parse(JSON.stringify(store)),
    importState: (next) => { store = Object.assign(defaults(), next); save(); },
    setRevision: (r) => { store.revision = r; save(); },
  });
  arena.applyFreeze();
  // an emailed link, if that is what was clicked, signs you in on arrival
  if (sync.adoptLinkSession()) store.localOnly = false;
  if (sync.session()) startSync();
  // A blocked network (the artifact viewer's CSP) is a supported state, not
  // an error — the account panel says so instead of offering a dead form.
  sync.probe().then((ok) => { netOK = ok; if (view === "words") render(); });

  document.querySelectorAll(".tab").forEach((el) =>
    el.addEventListener("click", () => { view = el.dataset.view; session = null; render(); }));
  document.querySelectorAll("[data-lang]").forEach((b) =>
    b.addEventListener("click", () => { store.settings.lang = b.dataset.lang; save(); render(); }));
  render();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http"))
    navigator.serviceWorker.register("sw.js").catch(() => {});
})();
