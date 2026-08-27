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
    settings: { newPerDay: 8 },
    log: {}, // "YYYY-MM-DD" -> {reviews, correct, intro}
    challenges: {}, // date -> {ids: [], done: []}
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
  };

  const todayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const log = () => (store.log[todayKey()] ||= { reviews: 0, correct: 0, intro: 0 });

  // ── word assembly ─────────────────────────────────────────────────────
  function allWords() {
    const words = [...SEED_MANUAL];
    // call-and-response pairs join the same deck as their own card type
    words.push(...SEED_RESPONSES.map((r) => ({
      id: r.id, ar: r.call, tr: r.callTr, en: r.en, reg: "pair", topic: r.topic,
      ex: `«${r.call}» — «${r.resp}»`, note: r.note, resp: r.resp, respTr: r.respTr,
    })));
    for (const pack of SEED_PACKS)
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
      .sort((a, b) => store.progress[a.id].due - store.progress[b.id].due);

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
  function streak() {
    let n = 0;
    const d = new Date();
    if (!store.log[todayKey(d)]?.reviews) d.setDate(d.getDate() - 1); // today not yet done
    while (store.log[todayKey(d)]?.reviews) { n += 1; d.setDate(d.getDate() - 1); }
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
  const REG_LABEL = { kw: "كويتي", msa: "فصحى بالحچي", phrase: "عبارة", pair: "نداء ورد", tip: "ملاحظة", idiom: "مثل" };
  const regTag = (reg) => `<span class="tag tag-${esc(reg)}">${REG_LABEL[reg] || esc(reg)}</span>`;

  function render() {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
    document.getElementById("streakCount").textContent = streak();
    const pending = SEED_VERIFY.filter((v) => !store.verify[v.id]).length;
    document.getElementById("verifyPill").textContent = pending || "";
    ({ today: renderToday, words: renderWords, verify: renderVerify, packs: renderPacks, stats: renderStats }[view])();
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
      ${finished ? `<div class="panel" style="border-color: rgb(47 191 113 / 0.5)"><b>ما قصرت! 🎉</b><div class="note-info">خلصت جلسة اليوم — ${l.reviews} مراجعة. العقل يثبت المعلومة وقت الراحة، فالباقي على باچر.</div></div>` : ""}
      <div class="panel">
        <div class="day-summary">
          <div class="cell"><b>${dueCount}</b><span>مستحقة اليوم</span></div>
          <div class="cell"><b>${newCount}</b><span>كلمات يديدة</span></div>
          <div class="cell"><b>${l.reviews}</b><span>راجعتها اليوم</span></div>
        </div>
        ${dueCount + newCount > 0
          ? `<div style="margin-top:1rem; text-align:center"><button class="btn btn-primary" id="startBtn" style="width:100%; padding:0.9rem">ابدأ الجلسة (${dueCount + newCount})</button></div>`
          : `<div class="empty" style="padding:1.2rem 0 0.4rem">✅ ماكو شي مستحق الحين — رجعلنا باچر، التباعد هو السر.</div>`}
      </div>

      <div class="panel challenge">
        <div class="microlabel">تحدي اليوم — استخدمها بمحادثة حقيقية</div>
        ${chWords.length ? `<ul style="margin-top:0.5rem">${chWords.map((w) => `
          <li class="${ch.done.includes(w.id) ? "done" : ""}">
            <input type="checkbox" data-ch="${esc(w.id)}" ${ch.done.includes(w.id) ? "checked" : ""} />
            <div><span class="w-ar">${esc(w.ar)}</span> <span class="note-info">${esc(w.en)}</span></div>
          </li>`).join("")}</ul>
          <div class="note-info" style="margin-top:0.5rem">الاسترجاع بمحادثة صجية أقوى تثبيت للذاكرة — علّم على اللي استخدمتها.</div>`
        : `<div class="note-info" style="margin-top:0.5rem">راجع كم كلمة أول، وبنطلع لك تحدي يومي منها.</div>`}
      </div>

      <div class="panel">
        <div class="microlabel">صيد اليوم — سمعت كلمة يديدة؟</div>
        <div class="note-info" style="margin:0.4rem 0 0.6rem">نفس عادتك اللي بنيت فيها القائمة: أي كلمة تصيدها من مجلس أو اجتماع، سجلها على طول قبل لا تنطير.</div>
        <button class="btn" id="captureBtn" style="width:100%">＋ سجل كلمة صدتها</button>
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

    const MODES = { learn: "كلمة يديدة — تعرّف عليها", recall: "شنو معناها؟", produce: "شلون تقولها بالعربي؟", cloze: "كمّل الفراغ", respond: "شنو الرد؟" };
    if (w.reg === "pair" && mode === "learn") MODES.learn = "نداء ورد — تعرّف عليهم";

    let front = "";
    if (w.reg === "pair" && (mode === "learn" || session.flipped)) {
      front = `
        <div class="card-ar" style="font-size:1.5rem; color:var(--ink-dim)">${esc(w.ar)}</div>
        <div class="microlabel">↓ الرد</div>
        <div class="card-ar">${esc(w.resp)}</div>
        ${w.respTr ? `<div class="card-tr">${esc(w.respTr)}</div>` : ""}
        <div class="card-en" style="font-size:0.95rem">${esc(w.en)}</div>
        ${w.note ? `<div class="card-note">${esc(w.note)}</div>` : ""}`;
    } else if (mode === "respond") {
      front = `<div class="card-ar">${esc(w.ar)}</div><div class="microlabel" style="margin-top:0.4rem">قالوها لك — رد عليهم بصوتك قبل لا تقلب</div>`;
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
      front = `<div class="card-en" style="font-size:1.4rem">${esc(w.en)}</div><div class="microlabel" style="margin-top:0.4rem">${esc(w.topic)} · قلها بصوتك قبل لا تقلب</div>`;
    } else if (mode === "cloze") {
      front = `<div class="card-ar cloze">${esc(cloze.blanked).replace("＿＿＿", '<span class="blank">＿＿＿</span>')}</div><div class="card-en">${esc(w.en)}</div>`;
    }

    const graded = mode === "learn" || session.flipped;
    stage.innerHTML = `
      <div class="progressbar"><div style="width:${pct}%"></div></div>
      <div class="panel">
        <div class="h-row" style="margin:0"><span class="card-mode">${MODES[mode]}</span>${regTag(w.reg)}</div>
        <div class="card-face">${front}</div>
        ${graded
          ? `<div class="grade-row">
              <button class="btn g1" data-g="1">نسيت<span class="grade-sub">أشوفها بعد شوي</span></button>
              <button class="btn g2" data-g="2">صعبة<span class="grade-sub">طلعت بجهد</span></button>
              <button class="btn g3" data-g="3">زين<span class="grade-sub">تذكرتها</span></button>
              <button class="btn g4" data-g="4">سهلة<span class="grade-sub">من عيوني</span></button>
            </div>`
          : `<button class="btn" id="flipBtn" style="width:100%; padding:0.85rem">اقلب البطاقة</button>
             <div class="flip-hint">جاوب بصوتك أو براسك قبل لا تقلب — الاسترجاع هو التمرين</div>`}
      </div>
      <button class="btn btn-ghost btn-sm" id="endBtn">إنهاء الجلسة</button>`;

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
      <div class="h-row"><h2>الكلمات (${words.length})</h2>
        <button class="btn btn-sm ${showAddForm ? "" : "btn-primary"}" id="addToggle">${showAddForm ? "إغلاق" : "＋ كلمة يديدة"}</button></div>
      ${showAddForm ? addFormHTML() : ""}
      <div class="toolbar">
        <input type="search" id="q" placeholder="دور بالعربي أو الإنجليزي…" value="${esc(wordsFilter.q)}" />
        <select id="fReg"><option value="">كل السجلات</option>
          ${Object.entries(REG_LABEL).map(([k, v]) => `<option value="${k}" ${wordsFilter.reg === k ? "selected" : ""}>${v}</option>`).join("")}</select>
        <select id="fTopic"><option value="">كل المواضيع</option>
          ${topics.map((t) => `<option ${wordsFilter.topic === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
      </div>
      <div class="panel" style="padding:0.3rem 1.1rem">
        ${list.length ? list.map(wordRowHTML).join("") : `<div class="empty">ماكو نتائج</div>`}
      </div>
      <div class="panel">
        <div class="microlabel">النسخ الاحتياطي</div>
        <div class="note-info" style="margin:0.4rem 0 0.6rem">تقدمك محفوظ بهالجهاز فقط — خذ نسخة بين فترة وفترة، أو انقل فيها تقدمك لجهاز ثاني.</div>
        <div class="v-actions">
          <button class="btn btn-sm" id="exportBtn">نسخة احتياطية</button>
          <button class="btn btn-sm" id="importBtn">استعادة</button>
          <label class="f" style="margin-inline-start:auto; display:flex; align-items:center; gap:0.4rem">يديدة باليوم
            <input type="number" id="newPerDay" min="0" max="50" value="${store.settings.newPerDay}" style="width:4.2rem" /></label>
        </div>
        ${backupPanel === "export" ? `
          <div class="word-detail" style="margin-top:0.7rem">
            <div class="note-info">انسخ النص كله واحفظه بأي مكان أمين — أو نزّله كملف إذا جهازك يسمح.</div>
            <textarea id="expText" rows="4" readonly style="margin-top:0.5rem; font-size:0.7rem" dir="ltr">${esc(JSON.stringify({ ...store, exportedAt: new Date().toISOString() }))}</textarea>
            <div class="v-actions">
              <button class="btn btn-sm btn-primary" id="copyBtn">نسخ</button>
              ${canDownload ? `<button class="btn btn-sm" id="dlBtn">تنزيل ملف</button>` : ""}
              <button class="btn btn-sm btn-ghost" id="closeBackup">إغلاق</button>
            </div>
          </div>` : ""}
        ${backupPanel === "import" ? `
          <div class="word-detail" style="margin-top:0.7rem">
            <div class="note-info">الصق نص النسخة الاحتياطية هني، أو اختر الملف. ⚠ الاستعادة تستبدل تقدمك الحالي كله.</div>
            <textarea id="impText" rows="4" placeholder="الصق النص هني…" style="margin-top:0.5rem; font-size:0.7rem" dir="ltr"></textarea>
            <div class="v-actions">
              <button class="btn btn-sm btn-primary" id="impPaste">استعادة من النص</button>
              ${canDownload ? `<button class="btn btn-sm" id="importBtnFile">اختر ملف</button>
              <input type="file" id="importFile" accept=".json,application/json" style="display:none" />` : ""}
              <button class="btn btn-sm btn-ghost" id="closeBackup">إغلاق</button>
            </div>
          </div>` : ""}
      </div>`;

    document.getElementById("addToggle").addEventListener("click", () => { showAddForm = !showAddForm; render(); });
    document.getElementById("q").addEventListener("input", (e) => { wordsFilter.q = e.target.value; render(); document.getElementById("q").focus(); const el = document.getElementById("q"); el.setSelectionRange(el.value.length, el.value.length); });
    document.getElementById("fReg").addEventListener("change", (e) => { wordsFilter.reg = e.target.value; render(); });
    document.getElementById("fTopic").addEventListener("change", (e) => { wordsFilter.topic = e.target.value; render(); });
    document.getElementById("newPerDay").addEventListener("change", (e) => { store.settings.newPerDay = Math.max(0, +e.target.value || 0); save(); });
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
      if (confirm("تبي تأرشف هالكلمة؟ (تختفي من التدريب، وتقدر ترجعها من ملف التصدير)")) {
        store.removed.push(b.dataset.del); save(); openWordId = null; render();
      }
    }));
    if (showAddForm) wireAddForm();
  }

  function wordRowHTML(w) {
    const c = store.progress[w.id];
    const state = !c ? "يديدة" : c.stability >= 21 ? "راسخة" : c.stability >= 7 ? "قاعدة تثبت" : "طرية";
    const open = openWordId === w.id;
    return `
      <div class="word-row" data-open="${esc(w.id)}" style="cursor:pointer">
        <div class="w-main">
          <span class="w-ar">${esc(w.ar)}</span>
          <div class="w-meta">${regTag(w.reg)} · ${esc(w.topic)} · ${state}${c ? ` · التالية ${new Date(c.due).toLocaleDateString("ar-KW", { day: "numeric", month: "short" })}` : ""}</div>
          ${open ? `<div class="word-detail" onclick="event.stopPropagation()">
              ${w.tr ? `<div class="card-tr">${esc(w.tr)}</div>` : ""}
              ${w.ex && w.ex !== "—" ? `<div class="card-ex">${esc(w.ex)}</div>` : ""}
              ${w.note ? `<div class="card-note">${esc(w.note)}</div>` : ""}
              <div class="v-actions"><button class="btn btn-sm btn-danger" data-del="${esc(w.id)}">أرشفة</button></div>
            </div>` : ""}
        </div>
        <div class="w-en">${esc(w.en)}</div>
      </div>`;
  }

  function addFormHTML() {
    return `
      <div class="panel form-grid" id="addForm">
        <label class="f">الكلمة أو العبارة (عربي) <input id="aAr" required /></label>
        <label class="f">المعنى (English) <input id="aEn" dir="ltr" /></label>
        <label class="f">النطق (translit) <input id="aTr" dir="ltr" placeholder="optional" /></label>
        <div style="display:flex; gap:0.6rem">
          <label class="f" style="flex:1">السجل
            <select id="aReg"><option value="kw">كويتي</option><option value="msa">فصحى بالحچي</option><option value="phrase">عبارة</option></select></label>
          <label class="f" style="flex:1">الموضوع <input id="aTopic" value="يومي" /></label>
        </div>
        <label class="f">جملة مثال (كويتي) — وين سمعتها؟ <textarea id="aEx" rows="2"></textarea></label>
        <label class="f">ملاحظة <input id="aNote" placeholder="optional" /></label>
        <button class="btn btn-primary" id="aSave">حفظ الكلمة</button>
      </div>`;
  }

  function wireAddForm() {
    document.getElementById("aSave").addEventListener("click", () => {
      const ar = document.getElementById("aAr").value.trim();
      if (!ar) return alert("اكتب الكلمة أول");
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
    const done = () => { const b = document.getElementById("copyBtn"); b.textContent = "تم النسخ ✓"; setTimeout(() => (b.textContent = "نسخ"), 1800); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(ta.value).then(done, () => { try { document.execCommand("copy"); done(); } catch { alert("اختر النص وانسخه يدويًا"); } });
    else { try { document.execCommand("copy"); done(); } catch { alert("اختر النص وانسخه يدويًا"); } }
  }

  function downloadJSON() {
    try {
      const blob = new Blob([JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `khosh-kalam-${todayKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { alert("التنزيل مو متاح هني — انسخ النص بدالها"); }
  }

  function applyBackup(text) {
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== "object" || !data.progress) throw new Error("bad");
      store = Object.assign(defaults(), data);
      backupPanel = null;
      save(); render();
      alert("تمت الاستعادة ✅");
    } catch { alert("النص مو صالح — تأكد إنك ناسخ النسخة كاملة"); }
  }

  function importJSON(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => applyBackup(reader.result);
    reader.readAsText(f);
  }

  // ── verify ──
  function renderVerify() {
    const pending = SEED_VERIFY.filter((v) => !store.verify[v.id]);
    const doneCount = SEED_VERIFY.length - pending.length;
    const V_LABEL = {
      "ok-msa": ["سليمة — فصحى", "tag-msa"], "ok-kw": ["سليمة — كويتية", "tag-kw"],
      "wrong-gloss": ["المعنى غلط", "tag-bad"], misspelled: ["إملاء غلط", "tag-bad"],
      "not-kuwaiti": ["مو كويتية", "tag-bad"], fabricated: ["مختلقة", "tag-bad"],
      doubtful: ["مشكوك فيها", "tag-phrase"],
    };
    stage.innerHTML = `
      <div class="h-row"><h2>التحقق من قوائم الذكاء الاصطناعي</h2></div>
      <div class="note-info" style="margin-bottom:0.8rem">راجعت كل القوائم اللي جمعتها من قبل، كلمة كلمة. الحكم مكتوب على كل وحدة — اللي تعتمدها تدخل التدريب بمعناها المصحح، واللي ترفضها تنحفظ بالأرشيف. (${doneCount}/${SEED_VERIFY.length} خلصت)</div>
      ${pending.length ? pending.map((v) => {
        const [label, cls] = V_LABEL[v.verdict] || [v.verdict, ""];
        const approvable = !!v.en;
        return `<div class="panel">
          <div class="h-row" style="margin:0">
            <span class="w-ar" style="font-family:var(--font-ar); font-size:1.3rem">${esc(v.ar)}</span>
            <span class="tag ${cls}">${label}</span>
          </div>
          ${v.aiGloss && v.aiGloss !== "—" ? `<div class="note-info">ترجمة القائمة القديمة: "${esc(v.aiGloss)}"</div>` : ""}
          <div class="verdict">${esc(v.fix)}</div>
          <div class="v-actions">
            ${approvable ? `<button class="btn btn-sm btn-primary" data-approve="${esc(v.id)}">✓ ضيفها للتدريب${v.verdict.startsWith("ok") ? "" : " (بالمعنى المصحح)"}</button>` : ""}
            <button class="btn btn-sm" data-reject="${esc(v.id)}">أرشفها</button>
          </div>
        </div>`;
      }).join("") : `<div class="empty"><span class="big">🧹</span>خلصت التحقق كله — القائمة صارت نظيفة.</div>`}`;
    stage.querySelectorAll("[data-approve]").forEach((b) => b.addEventListener("click", () => { store.verify[b.dataset.approve] = "approved"; save(); render(); }));
    stage.querySelectorAll("[data-reject]").forEach((b) => b.addEventListener("click", () => { store.verify[b.dataset.reject] = "rejected"; save(); render(); }));
  }

  // ── packs ──
  function renderPacks() {
    stage.innerHTML = `
      <div class="h-row"><h2>حزم التوسع</h2></div>
      <div class="note-info" style="margin-bottom:0.8rem">عشان التطبيق يكبر وياك: كل حزمة مجموعة مدروسة تنضاف للتدريب لما تقرر إنك جاهز لها — مو كلها مرة وحدة.</div>
      ${SEED_PACKS.map((p) => {
        const added = store.packs.includes(p.key);
        return `<div class="panel">
          <div class="h-row" style="margin:0"><h2>${esc(p.name)}</h2><span class="tag">${p.words.length} بطاقة</span></div>
          <div class="note-info" style="margin:0.4rem 0 0.6rem">${esc(p.desc)}</div>
          <div class="card-ex" style="border:none; padding:0; font-size:1rem">${p.words.slice(0, 3).map((w) => esc(w.ar)).join(" · ")} …</div>
          <div class="v-actions">
            ${added
              ? `<span class="tag tag-kw">مضافة ✓</span>`
              : `<button class="btn btn-sm btn-primary" data-pack="${esc(p.key)}">أضف الحزمة</button>`}
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
      days.push({ label: i === 0 ? "اليوم" : start.toLocaleDateString("ar-KW", { weekday: "short" }), n });
    }
    const max = Math.max(1, ...days.map((x) => x.n));

    stage.innerHTML = `
      <div class="h-row"><h2>إحصائياتك</h2></div>
      <div class="stat-grid">
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${active.length}</b><div class="microlabel">كلمة داخل التدريب (من ${words.length})</div></div>
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${mature.length}</b><div class="microlabel">راسخة (ثبات ٣ أسابيع+)</div></div>
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${retention === null ? "—" : retention + "٪"}</b><div class="microlabel">نسبة التذكر (٣٠ يوم)</div></div>
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${streak()}</b><div class="microlabel">أيام متتالية 🔥</div></div>
      </div>
      <div class="panel" style="margin-top:0.9rem">
        <div class="microlabel">المستحق خلال الأسبوع الياي</div>
        <div class="forecast" style="margin-bottom:1.4rem">
          ${days.map((x) => `<div class="bar" style="height:${(x.n / max) * 100}%"><span>${x.n || ""}</span><em>${esc(x.label)}</em></div>`).join("")}
        </div>
      </div>
      <div class="panel">
        <div class="microlabel">التوزيع</div>
        <div class="note-info" style="margin-top:0.4rem">
          ${kw} كويتي صرف · ${words.filter((w) => w.reg === "msa").length} فصحى بالحچي · ${words.filter((w) => w.reg === "phrase").length} عبارات · ${words.filter((w) => w.reg === "pair").length} نداء ورد
          ${retention !== null && retention < 80 ? "<br>💡 نسبة التذكر تحت ٨٠٪ — قلل الكلمات اليديدة باليوم شوي، والجودة قبل الكمية." : ""}
          ${retention !== null && retention > 95 && active.length > 30 ? "<br>💡 نسبة تذكرك عالية وايد — تقدر تزيد الكلمات اليديدة باليوم." : ""}
        </div>
      </div>
      <div class="panel note-info">
        <div class="microlabel" style="margin-bottom:0.4rem">ليش التطبيق مبني چذي؟</div>
        الجدولة على خوارزمية FSRS للتكرار المتباعد — تراجع الكلمة قبل ما تنساها بشوي، وهذا أكفأ وقت للتثبيت.
        كل مراجعة استرجاع نشط (تجاوب قبل ما تقلب) لأن الاختبار يثبت أقوى من إعادة القراءة،
        والبطاقة تتدرج من التعرف إلى الإنتاج إلى إكمال الجملة لأن الصعوبة المدروسة تبني ذاكرة أمتن.
        وتحدي الاستخدام اليومي ينقل الكلمة من التطبيق إلى لسانك.
      </div>`;
  }

  // ── boot ──
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => { view = t.dataset.view; session = null; render(); }));
  render();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http"))
    navigator.serviceWorker.register("sw.js").catch(() => {});
})();
