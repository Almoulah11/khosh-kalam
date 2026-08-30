/*
 * PRACTICE — the six production-side exercises, plus the dashboard.
 *
 * Everything except audio lives in the synced JSON state. Audio recordings
 * stay in IndexedDB on the device that made them: they are large, and a
 * one-take monologue is evidence for you, not something to ship to a server.
 * The metadata (prompt, date, unlock date, rating, notes) does sync, so the
 * review queue is correct on every device even where the audio is absent.
 *
 * Chart colours were validated against the dark surface with the dataviz
 * validator: lightness band, chroma, CVD separation, and contrast all pass.
 */
const EX_COLORS = { shadow: "#29a463", read: "#4d93d2", mono: "#b0862f", circum: "#9d80d0" };

/* ── audio store ─────────────────────────────────────────────────────── */
const AudioStore = (() => {
  const DB = "khosh-kalam-audio", STORE = "clips";
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode);
      const rq = fn(t.objectStore(STORE));
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  };
  return {
    put: (id, blob) => tx("readwrite", (s) => s.put(blob, id)),
    get: (id) => tx("readonly", (s) => s.get(id)),
    del: (id) => tx("readwrite", (s) => s.delete(id)),
    keys: () => tx("readonly", (s) => s.getAllKeys()),
  };
})();

/* ── SM-2, as specified ──────────────────────────────────────────────── */
function sm2(card, q) {
  const c = { ef: 2.5, n: 0, int: 0, due: 0, ...card };
  if (q < 3) { c.n = 0; c.int = 1; }
  else {
    c.n += 1;
    c.int = c.n === 1 ? 1 : c.n === 2 ? 6 : Math.round(c.int * c.ef);
  }
  c.ef = Math.max(1.3, c.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  c.due = Date.now() + c.int * 86400000;
  c.last = Date.now();
  return c;
}

function createPractice(ctx) {
  const { esc, t, ti, ts, S, bilingual, save, todayKey } = ctx;
  const store = () => ctx.store();

  const P = () => {
    const s = store();
    s.practice ||= {};
    const p = s.practice;
    p.sessions ??= []; p.lexicon ??= []; p.monologues ??= [];
    p.circum ??= []; p.msgs ??= []; p.recent ??= [];
    return p;
  };

  let mode = null;      // null = hub, else the exercise key
  let ui = {};          // per-exercise transient state
  const DAY = 86400000;

  const logSession = (type, minutes) => {
    if (minutes < 0.5) return;
    P().sessions.push({ id: "s" + Date.now() + Math.random().toString(36).slice(2, 6),
      d: todayKey(), type, min: Math.round(minutes * 10) / 10 });
    save();
  };

  // ── 1. shadowing ────────────────────────────────────────────────────
  let yt = null, ytReady = false, loopTimer = null, shadowTimer = null;

  function loadYT(cb) {
    if (window.YT && window.YT.Player) return cb();
    if (!document.getElementById("ytapi")) {
      const s = document.createElement("script");
      s.id = "ytapi"; s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); ytReady = true; cb(); };
    if (window.YT?.Player) cb();
  }

  function mountPlayer(videoId) {
    ui.videoId = videoId;
    ui.a = null; ui.b = null; ui.elapsed = 0; ui.playing = false;
    ctx.rerender();
    loadYT(() => {
      const host = document.getElementById("ytHost");
      if (!host) return;
      yt = new YT.Player(host, {
        videoId, playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => { e.target.setPlaybackRate(ui.rate || 1); },
          onStateChange: (e) => {
            ui.playing = e.data === YT.PlayerState.PLAYING;
            if (ui.playing) startShadowClock(); else stopShadowClock();
          },
          onError: () => { ui.ytError = true; ctx.rerender(); },
        },
      });
      clearInterval(loopTimer);
      loopTimer = setInterval(() => {
        if (!yt?.getCurrentTime || ui.a == null || ui.b == null) return;
        const tNow = yt.getCurrentTime();
        if (tNow > ui.b || tNow < ui.a - 0.5) yt.seekTo(ui.a, true);
      }, 250);
    });
  }

  function startShadowClock() {
    if (shadowTimer) return;
    ui.t0 = Date.now();
    shadowTimer = setInterval(() => {
      ui.elapsed = (ui.elapsed || 0) + 1;
      const el = document.getElementById("shadowClock");
      if (el) el.textContent = fmtClock(ui.elapsed);
      const bar = document.getElementById("shadowBar");
      if (bar) bar.style.width = Math.min(100, (ui.elapsed / 900) * 100) + "%";
    }, 1000);
  }
  function stopShadowClock() { clearInterval(shadowTimer); shadowTimer = null; }
  function teardownShadow() {
    stopShadowClock(); clearInterval(loopTimer); loopTimer = null;
    if (ui.elapsed > 30) logSession("shadow", ui.elapsed / 60);
    try { yt?.destroy?.(); } catch {}
    yt = null;
  }
  const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  function renderShadow() {
    const p = P();
    if (!ui.videoId) {
      return `
        ${hdr("exShadow")}
        <div class="panel">
          <div class="microlabel">${t("shPaste")}</div>
          <div class="v-actions" style="margin-top:0.5rem">
            <input id="ytUrl" dir="ltr" placeholder="https://youtube.com/watch?v=..." style="flex:1" />
            <button class="btn btn-sm btn-primary" id="ytGo">${t("shOpen")}</button>
          </div>
          ${p.recent.length ? `<div class="microlabel" style="margin-top:0.9rem">${t("shRecent")}</div>
            <div class="chips">${p.recent.slice(0, 6).map((r) => `<button class="chip" data-vid="${esc(r.id)}">${esc(r.title || r.id)}</button>`).join("")}</div>` : ""}
        </div>
        <div class="panel">
          <div class="microlabel">${t("shStarters")}</div>
          ${LIB_SHADOW.starters.map((s) => `<button class="src-row" data-vid="${esc(s.id)}" data-title="${esc(s.title)}">
              <div class="src-title">${esc(s.title)}</div><div class="src-note">${esc(s.note)}</div></button>`).join("")}
        </div>
        <div class="panel">
          <div class="microlabel">${t("shChannels")}</div>
          <div class="note-info" style="margin:0.35rem 0 0.6rem">${t("shChannelsNote")}</div>
          ${LIB_SHADOW.channels.map((c) => `<a class="src-row" href="${esc(c.url)}" target="_blank" rel="noopener">
              <div class="src-title">${esc(c.name)} <span class="tag">${esc(c.level)}</span></div>
              <div class="src-note">${esc(bilingual() ? c.note + " · " + c.noteEn : c.note)}</div></a>`).join("")}
          <div class="chips" style="margin-top:0.7rem">
            ${LIB_SHADOW.searches.map((s) => `<a class="chip" target="_blank" rel="noopener"
                href="https://www.youtube.com/results?search_query=${encodeURIComponent(s.q)}">🔎 ${esc(s.label)}</a>`).join("")}
          </div>
        </div>`;
    }
    const seg = ui.a != null && ui.b != null ? `${ui.a.toFixed(1)}s → ${ui.b.toFixed(1)}s (${(ui.b - ui.a).toFixed(1)}s)` : "—";
    return `
      ${hdr("exShadow", true)}
      <div class="panel">
        ${ui.ytError ? `<div class="note-info" style="color:var(--red)">${t("shDead")}</div>` : ""}
        <div class="yt-wrap"><div id="ytHost"></div></div>
        <div class="h-row" style="margin:0.8rem 0 0.4rem">
          <span class="clock" id="shadowClock">${fmtClock(ui.elapsed || 0)}</span>
          <span class="microlabel">${ti("shTarget")}</span>
        </div>
        <div class="xpbar"><div id="shadowBar" style="width:${Math.min(100, ((ui.elapsed || 0) / 900) * 100)}%"></div></div>
        <div class="ctrl-row">
          <span class="microlabel">${t("shSpeed")}</span>
          ${[0.75, 1].map((r) => `<button class="chip ${(ui.rate || 1) === r ? "on" : ""}" data-rate="${r}">${r}×</button>`).join("")}
        </div>
        <div class="ctrl-row">
          <span class="microlabel">${t("shLoop")}</span>
          <button class="chip" id="setA">A</button>
          <button class="chip" id="setB">B</button>
          <button class="chip" id="clrAB">${t("shClear")}</button>
          <span class="seg" dir="ltr">${esc(seg)}</span>
        </div>
        <div class="note-info" style="margin-top:0.5rem">${t("shHow")}</div>
      </div>`;
  }

  function wireShadow(el) {
    el.querySelector("#ytGo")?.addEventListener("click", () => {
      const v = parseVideoId(document.getElementById("ytUrl").value);
      if (v) { pushRecent(v, null); mountPlayer(v); } else alert(ts("shBadUrl"));
    });
    el.querySelectorAll("[data-vid]").forEach((b) => b.addEventListener("click", () => {
      pushRecent(b.dataset.vid, b.dataset.title); mountPlayer(b.dataset.vid);
    }));
    el.querySelectorAll("[data-rate]").forEach((b) => b.addEventListener("click", () => {
      ui.rate = +b.dataset.rate; yt?.setPlaybackRate?.(ui.rate); ctx.rerender();
    }));
    el.querySelector("#setA")?.addEventListener("click", () => { ui.a = yt?.getCurrentTime?.() ?? 0; ctx.rerender(); });
    el.querySelector("#setB")?.addEventListener("click", () => {
      const b = yt?.getCurrentTime?.() ?? 0;
      if (ui.a == null || b <= ui.a) return alert(ts("shSetAFirst"));
      ui.b = b; ctx.rerender();
    });
    el.querySelector("#clrAB")?.addEventListener("click", () => { ui.a = ui.b = null; ctx.rerender(); });
  }
  function parseVideoId(u) {
    if (!u) return null;
    const m = String(u).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || String(u).trim().match(/^([\w-]{11})$/);
    return m ? m[1] : null;
  }
  function pushRecent(id, title) {
    const p = P();
    p.recent = [{ id, title }, ...p.recent.filter((r) => r.id !== id)].slice(0, 12);
    save();
  }

  // ── 2. read-aloud ───────────────────────────────────────────────────
  let readTimer = null;
  function renderRead() {
    const p = P();
    if (!ui.text) {
      const kinds = { column: "مقال رأي", poetry: "شعر", literary: "نثر أدبي", kuwaiti: "لهجة كويتية" };
      return `${hdr("exRead")}
        <div class="panel"><div class="note-info">${t("rdPick")}</div></div>
        ${LIB_READ.map((r) => `<button class="src-row" data-text="${esc(r.id)}">
            <div class="src-title">${esc(r.title)} <span class="tag">${esc(kinds[r.kind] || r.kind)}</span></div>
            <div class="src-note">${esc(r.source)} · ${esc(r.level)} · ${r.text.split(/\s+/).length} ${ts("rdWords")}</div>
          </button>`).join("")}`;
    }
    const words = ui.text.text.split(/(\s+)/);
    let wi = -1;
    const body = words.map((w) => {
      if (/^\s+$/.test(w)) return w.includes("\n\n") ? "</p><p>" : w;
      wi++;
      const stumbled = ui.stumbled?.has(wi);
      return `<span class="rw ${stumbled ? "stumble" : ""}" data-w="${wi}">${esc(w)}</span>`;
    }).join("");
    return `
      ${hdr("exRead", true)}
      <div class="panel">
        <div class="h-row" style="margin:0">
          <span class="clock" id="readClock">${fmtClock(ui.elapsed || 0)}</span>
          <div class="v-actions" style="margin:0">
            <button class="btn btn-sm ${ui.running ? "" : "btn-primary"}" id="readToggle">${ui.running ? t("rdPause") : t("rdStart")}</button>
            <button class="btn btn-sm" id="readDone">${t("rdFinish")}</button>
          </div>
        </div>
        <div class="microlabel" style="margin-top:0.5rem">${t("rdTapHint")} · ${ui.stumbled?.size || 0} ${ts("rdMarked")}</div>
      </div>
      <div class="panel reader"><p>${body}</p></div>`;
  }
  function wireRead(el) {
    el.querySelectorAll("[data-text]").forEach((b) => b.addEventListener("click", () => {
      ui.text = LIB_READ.find((r) => r.id === b.dataset.text);
      ui.elapsed = 0; ui.stumbled = new Set(); ui.running = false;
      ctx.rerender();
    }));
    el.querySelector("#readToggle")?.addEventListener("click", () => {
      ui.running = !ui.running;
      clearInterval(readTimer);
      if (ui.running) readTimer = setInterval(() => {
        ui.elapsed++; const c = document.getElementById("readClock"); if (c) c.textContent = fmtClock(ui.elapsed);
      }, 1000);
      ctx.rerender();
    });
    el.querySelector("#readDone")?.addEventListener("click", finishRead);
    el.querySelectorAll(".rw").forEach((s) => s.addEventListener("click", () => {
      const i = +s.dataset.w;
      ui.stumbled.has(i) ? ui.stumbled.delete(i) : ui.stumbled.add(i);
      s.classList.toggle("stumble");
      const m = el.querySelector(".microlabel"); if (m) m.innerHTML = `${t("rdTapHint")} · ${ui.stumbled.size} ${ts("rdMarked")}`;
    }));
  }
  function finishRead() {
    clearInterval(readTimer); readTimer = null;
    if (ui.elapsed > 20) logSession("read", ui.elapsed / 60);
    // every stumble becomes a lexicon entry, carrying its neighbours so the
    // phrase rule is satisfied by construction rather than by nagging
    const toks = ui.text.text.split(/\s+/);
    let added = 0;
    for (const i of ui.stumbled || []) {
      const phrase = toks.slice(Math.max(0, i - 1), i + 2).join(" ").replace(/[،.؟!]$/, "");
      if (phrase.split(/\s+/).length < 2) continue;
      P().lexicon.push({
        id: "lx" + Date.now() + "_" + i, ar: phrase, gender: "", plural: "", en: "",
        src: ui.text.title, domain: "abstract", needs: true, sm2: { ef: 2.5, n: 0, int: 0, due: Date.now() },
      });
      added++;
    }
    save();
    alert(added ? ts("rdSaved").replace("{n}", added) : ts("rdNoMarks"));
    ui = {}; ctx.rerender();
  }

  // ── 3. one-take monologue ───────────────────────────────────────────
  let rec = null, recChunks = [], recTimer = null;
  function renderMono() {
    const p = P();
    const ready = p.monologues.filter((m) => !m.rating && m.unlock <= Date.now());
    const locked = p.monologues.filter((m) => !m.rating && m.unlock > Date.now());
    if (ui.review) return renderMonoReview(ui.review);
    if (ui.prompt) {
      return `${hdr("exMono", true)}
        <div class="panel">
          <div class="microlabel">${esc(ui.prompt.domain)}</div>
          <div class="mono-q">${esc(ui.prompt.q)}</div>
          <div class="h-row"><span class="clock">${fmtClock(ui.elapsed || 0)}</span>
            <span class="microlabel">${ui.recording ? t("mnRecording") : t("mnOneTake")}</span></div>
          ${ui.recording
            ? `<button class="btn btn-danger" id="mnStop" style="width:100%">${t("mnStop")}</button>`
            : `<button class="btn btn-primary" id="mnStart" style="width:100%">${t("mnStart")}</button>`}
          <div class="note-info" style="margin-top:0.6rem">${t("mnRule")}</div>
        </div>`;
    }
    return `${hdr("exMono")}
      ${ready.length ? `<div class="panel">
        <div class="microlabel">${t("mnReady")} (${ready.length})</div>
        ${ready.map((m) => `<button class="src-row" data-review="${esc(m.id)}">
            <div class="src-title">${esc(m.q)}</div>
            <div class="src-note">${new Date(m.at).toLocaleDateString(bilingual() ? "en-GB" : "ar-KW")}</div></button>`).join("")}
      </div>` : ""}
      ${locked.length ? `<div class="panel">
        <div class="microlabel">${t("mnLocked")} (${locked.length})</div>
        ${locked.map((m) => `<div class="src-row"><div class="src-title" style="opacity:.6">${esc(m.q)}</div>
            <div class="src-note">🔒 ${ti("mnUnlocksIn", Math.ceil((m.unlock - Date.now()) / DAY))}</div></div>`).join("")}
      </div>` : ""}
      <div class="panel">
        <div class="note-info">${t("mnIntro")}</div>
        <button class="btn btn-primary" id="mnNew" style="width:100%; margin-top:0.7rem">${t("mnDraw")}</button>
      </div>`;
  }
  function renderMonoReview(m) {
    return `${hdr("exMono", true)}
      <div class="panel">
        <div class="mono-q">${esc(m.q)}</div>
        <div class="microlabel">${new Date(m.at).toLocaleDateString(bilingual() ? "en-GB" : "ar-KW")}</div>
        <audio id="mnAudio" controls style="width:100%; margin-top:0.8rem"></audio>
        <div class="microlabel" style="margin-top:0.9rem">${t("mnRate")}</div>
        <div class="grade-row">${[1, 2, 3, 4, 5].map((n) => `<button class="btn" data-rate5="${n}">${n}</button>`).join("")}</div>
        <label class="f" style="margin-top:0.7rem">${t("mnNotes")}<textarea id="mnNotes" rows="3"></textarea></label>
        <button class="btn btn-primary" id="mnSaveReview" style="width:100%; margin-top:0.6rem">${t("mnSaveReview")}</button>
      </div>`;
  }
  function wireMono(el) {
    el.querySelector("#mnNew")?.addEventListener("click", () => {
      const done = new Set(P().monologues.map((m) => m.promptId));
      const pool = LIB_MONO.filter((q) => !done.has(q.id));
      ui.prompt = (pool.length ? pool : LIB_MONO)[Math.floor(Math.random() * (pool.length || LIB_MONO.length))];
      ui.elapsed = 0; ui.recording = false; ctx.rerender();
    });
    el.querySelector("#mnStart")?.addEventListener("click", startRec);
    el.querySelector("#mnStop")?.addEventListener("click", stopRec);
    el.querySelectorAll("[data-review]").forEach((b) => b.addEventListener("click", async () => {
      ui.review = P().monologues.find((m) => m.id === b.dataset.review);
      ui.rating = 0; ctx.rerender();
      const blob = await AudioStore.get(ui.review.id).catch(() => null);
      const a = document.getElementById("mnAudio");
      if (a && blob) a.src = URL.createObjectURL(blob);
      else if (a) { a.replaceWith(Object.assign(document.createElement("div"), { className: "note-info", textContent: ts("mnNoAudio") })); }
    }));
    el.querySelectorAll("[data-rate5]").forEach((b) => b.addEventListener("click", () => {
      ui.rating = +b.dataset.rate5;
      el.querySelectorAll("[data-rate5]").forEach((x) => x.classList.toggle("btn-primary", +x.dataset.rate5 === ui.rating));
    }));
    el.querySelector("#mnSaveReview")?.addEventListener("click", () => {
      if (!ui.rating) return alert(ts("mnPickRating"));
      const m = P().monologues.find((x) => x.id === ui.review.id);
      m.rating = ui.rating; m.notes = document.getElementById("mnNotes").value.trim(); m.reviewedAt = Date.now();
      save(); ui = {}; ctx.rerender();
    });
  }
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && recChunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recChunks, { type: rec.mimeType || "audio/webm" });
        const id = "mo" + Date.now();
        await AudioStore.put(id, blob).catch(() => {});
        P().monologues.push({
          id, promptId: ui.prompt.id, q: ui.prompt.q, domain: ui.prompt.domain,
          at: Date.now(), unlock: Date.now() + 7 * DAY, secs: ui.elapsed,
        });
        logSession("mono", (ui.elapsed || 0) / 60);
        save();
        clearInterval(recTimer); recTimer = null;
        ui = {}; ctx.rerender();
        alert(ts("mnSaved"));
      };
      rec.start();
      ui.recording = true; ui.elapsed = 0;
      recTimer = setInterval(() => { ui.elapsed++; const c = document.querySelector(".clock"); if (c) c.textContent = fmtClock(ui.elapsed); }, 1000);
      ctx.rerender();
    } catch { alert(ts("mnNoMic")); }
  }
  function stopRec() { try { rec?.stop(); } catch {} ui.recording = false; }

  // ── 4. circumlocution ───────────────────────────────────────────────
  let cirTimer = null;
  function renderCircum() {
    const p = P();
    const rate = successRate(p.circum);
    if (!ui.card) {
      return `${hdr("exCircum")}
        <div class="panel">
          <div class="h-row" style="margin:0"><span class="microlabel">${t("crRate")}</span>
            <span class="big-num">${rate === null ? "—" : rate + "٪"}</span></div>
          <div class="microlabel">${ti("crRuns", p.circum.length)}</div>
          <button class="btn btn-primary" id="crGo" style="width:100%; margin-top:0.9rem">${t("crStart")}</button>
          <div class="note-info" style="margin-top:0.7rem">${t("crHow")}</div>
        </div>`;
    }
    const left = ui.left ?? 45;
    return `${hdr("exCircum", true)}
      <div class="panel">
        <div class="countdown ${left <= 10 ? "low" : ""}">${left}</div>
        <div class="concept">${esc(ui.card.concept)}</div>
        <div class="microlabel" style="margin-top:0.9rem">${t("crBanned")}</div>
        <div class="chips banned">${ui.card.banned.map((w) => `<span class="chip no">${esc(w)}</span>`).join("")}</div>
        ${ui.done
          ? `<div class="microlabel" style="margin-top:1rem">${t("crSelfScore")}</div>
             <div class="v-actions">
               <button class="btn btn-primary" data-cr="1" style="flex:1">${t("crPass")}</button>
               <button class="btn btn-danger" data-cr="0" style="flex:1">${t("crFail")}</button>
             </div>`
          : `<button class="btn" id="crStop" style="width:100%; margin-top:1rem">${t("crStop")}</button>`}
      </div>`;
  }
  function wireCircum(el) {
    el.querySelector("#crGo")?.addEventListener("click", () => {
      ui.card = LIB_CIRCUM[Math.floor(Math.random() * LIB_CIRCUM.length)];
      ui.left = 45; ui.done = false; ctx.rerender();
      clearInterval(cirTimer);
      cirTimer = setInterval(() => {
        ui.left--;
        const c = document.querySelector(".countdown");
        if (c) { c.textContent = ui.left; c.classList.toggle("low", ui.left <= 10); }
        if (ui.left <= 0) { clearInterval(cirTimer); ui.done = true; ctx.rerender(); }
      }, 1000);
    });
    el.querySelector("#crStop")?.addEventListener("click", () => { clearInterval(cirTimer); ui.done = true; ctx.rerender(); });
    el.querySelectorAll("[data-cr]").forEach((b) => b.addEventListener("click", () => {
      P().circum.push({ id: "c" + Date.now() + Math.random().toString(36).slice(2, 6),
        d: todayKey(), concept: ui.card.id, ok: b.dataset.cr === "1", sec: 45 - (ui.left || 0) });
      logSession("circum", (45 - (ui.left || 0)) / 60);
      save(); ui = {}; ctx.rerender();
    }));
  }
  const successRate = (arr) => (arr.length ? Math.round((arr.filter((x) => x.ok).length / arr.length) * 100) : null);

  // ── 5. lexicon ──────────────────────────────────────────────────────
  const DOMAINS = [
    { k: "creative", ar: "عمل إبداعي", en: "creative work" },
    { k: "business", ar: "أعمال", en: "business" },
    { k: "politics", ar: "سياسة", en: "politics" },
    { k: "abstract", ar: "مجرد", en: "abstract" },
    { k: "everyday", ar: "يومي", en: "everyday" },
  ];
  /** The phrase rule: never a bare noun. Two words, or a bound demonstrative. */
  function phraseOk(s) {
    const v = (s || "").trim();
    if (!v) return false;
    if (/^(هال|هذا |هذي |هذه |ذاك |ذيچ )/.test(v)) return true;
    return v.split(/\s+/).filter(Boolean).length >= 2;
  }
  function renderLex() {
    const p = P();
    const due = p.lexicon.filter((e) => e.en && (e.sm2?.due || 0) <= Date.now());
    const needs = p.lexicon.filter((e) => !e.en);
    if (ui.lexReview) return renderLexReview();
    return `${hdr("exLex")}
      <div class="panel">
        <div class="day-summary">
          <div class="cell"><b>${p.lexicon.length}</b><span>${ti("lxTotal")}</span></div>
          <div class="cell"><b>${due.length}</b><span>${ti("lxDue")}</span></div>
          <div class="cell"><b>${needs.length}</b><span>${ti("lxIncomplete")}</span></div>
        </div>
        ${due.length ? `<button class="btn btn-primary" id="lxReview" style="width:100%; margin-top:0.9rem">${t("lxStartReview", due.length)}</button>` : ""}
      </div>
      <div class="panel form-grid">
        <div class="microlabel">${t("lxAdd")}</div>
        <label class="f">${t("lxPhrase")} <input id="lxAr" placeholder="مثال: القرار الصعب" /></label>
        <div class="note-info" style="margin-top:-0.3rem">${t("lxPhraseRule")}</div>
        <div style="display:flex; gap:0.6rem">
          <label class="f" style="flex:1">${t("lxGender")}
            <select id="lxGen"><option value="m">مذكر</option><option value="f">مؤنث</option></select></label>
          <label class="f" style="flex:1">${t("lxPlural")} <input id="lxPl" placeholder="القرارات الصعبة" /></label>
        </div>
        <label class="f">${t("lxGloss")} <input id="lxEn" dir="ltr" placeholder="the hard decision" /></label>
        <label class="f">${t("lxSource")} <input id="lxSrc" placeholder="وين سمعتها؟" /></label>
        <label class="f">${t("lxDomain")}
          <select id="lxDom">${DOMAINS.map((d) => `<option value="${d.k}">${d.ar}${bilingual() ? " · " + d.en : ""}</option>`).join("")}</select></label>
        <button class="btn btn-primary" id="lxSave">${t("lxSaveBtn")}</button>
      </div>
      ${needs.length ? `<div class="panel">
        <div class="microlabel">${t("lxNeedsWork")}</div>
        ${needs.slice(0, 20).map((e) => `<div class="word-row"><div class="w-main">
            <span class="w-ar">${esc(e.ar)}</span>
            <div class="w-meta">${esc(e.src || "")} — ${ti("lxAddGloss")}</div></div>
            <button class="btn btn-sm" data-lxfill="${esc(e.id)}">${t("lxComplete")}</button></div>`).join("")}
      </div>` : ""}
      <div class="panel" style="padding:0.3rem 1.1rem">
        ${p.lexicon.filter((e) => e.en).slice(-40).reverse().map((e) => `<div class="word-row"><div class="w-main">
            <span class="w-ar">${esc(e.ar)}</span>
            <div class="w-meta">${esc(domLabel(e.domain))} · ${e.gender === "f" ? "مؤنث" : "مذكر"}${e.plural ? " · " + esc(e.plural) : ""}${e.src ? " · " + esc(e.src) : ""}</div>
          </div><div class="w-en">${esc(e.en)}</div></div>`).join("") || `<div class="empty">${t("lxEmpty")}</div>`}
      </div>`;
  }
  const domLabel = (k) => { const d = DOMAINS.find((x) => x.k === k); return d ? (bilingual() ? d.ar + " · " + d.en : d.ar) : k; };

  function renderLexReview() {
    const e = ui.lexReview;
    return `${hdr("exLex", true)}
      <div class="panel">
        <div class="microlabel">${t("lxProduce")}</div>
        <div class="q-en" style="margin:1.4rem 0; font-size:1.5rem">${esc(e.en)}</div>
        ${ui.lexShown
          ? `<div class="card-ar">${esc(e.ar)}</div>
             <div class="microlabel" style="margin-top:0.5rem">${e.gender === "f" ? "مؤنث" : "مذكر"}${e.plural ? " · " + esc(e.plural) : ""}${e.src ? " · " + esc(e.src) : ""}</div>
             <div class="microlabel" style="margin-top:1rem">${t("lxRate")}</div>
             <div class="grade-row">${[1, 2, 3, 4, 5].map((n) => `<button class="btn" data-sm2="${n}">${n}</button>`).join("")}</div>`
          : `<button class="btn btn-primary" id="lxShow" style="width:100%">${t("lxShow")}</button>
             <div class="flip-hint">${t("lxSayFirst")}</div>`}
      </div>`;
  }
  function wireLex(el) {
    el.querySelector("#lxSave")?.addEventListener("click", () => {
      const ar = document.getElementById("lxAr").value.trim();
      // an empty field is a stray tap (the form re-renders blank after a save),
      // not an attempt to store a bare noun — say nothing rather than scold
      if (!ar) return;
      if (!phraseOk(ar)) return alert(ts("lxRejectBare"));
      const en = document.getElementById("lxEn").value.trim();
      if (!en) return alert(ts("lxNeedGloss"));
      const p = P();
      if (ui.fillId) {
        const e = p.lexicon.find((x) => x.id === ui.fillId);
        Object.assign(e, { ar, en, gender: document.getElementById("lxGen").value,
          plural: document.getElementById("lxPl").value.trim(), src: document.getElementById("lxSrc").value.trim(),
          domain: document.getElementById("lxDom").value, needs: false });
        ui.fillId = null;
      } else {
        p.lexicon.push({ id: "lx" + Date.now(), ar, en,
          gender: document.getElementById("lxGen").value,
          plural: document.getElementById("lxPl").value.trim(),
          src: document.getElementById("lxSrc").value.trim(),
          domain: document.getElementById("lxDom").value,
          sm2: { ef: 2.5, n: 0, int: 0, due: Date.now() } });
      }
      save(); ctx.rerender();
    });
    el.querySelectorAll("[data-lxfill]").forEach((b) => b.addEventListener("click", () => {
      const e = P().lexicon.find((x) => x.id === b.dataset.lxfill);
      ui.fillId = e.id;
      ctx.rerender();
      setTimeout(() => {
        document.getElementById("lxAr").value = e.ar;
        document.getElementById("lxSrc").value = e.src || "";
        document.getElementById("lxEn").focus();
      }, 0);
    }));
    el.querySelector("#lxReview")?.addEventListener("click", () => {
      const due = P().lexicon.filter((e) => e.en && (e.sm2?.due || 0) <= Date.now());
      ui.lexReview = due[0]; ui.lexShown = false; ctx.rerender();
    });
    el.querySelector("#lxShow")?.addEventListener("click", () => { ui.lexShown = true; ctx.rerender(); });
    el.querySelectorAll("[data-sm2]").forEach((b) => b.addEventListener("click", () => {
      const e = P().lexicon.find((x) => x.id === ui.lexReview.id);
      e.sm2 = sm2(e.sm2, +b.dataset.sm2);
      save();
      const due = P().lexicon.filter((x) => x.en && (x.sm2?.due || 0) <= Date.now());
      ui.lexReview = due[0] || null; ui.lexShown = false;
      ctx.rerender();
    }));
  }

  // ── 6. message bank ─────────────────────────────────────────────────
  function renderMsg() {
    const p = P();
    const rows = [...p.msgs].sort((a, b) => (a.last || 0) - (b.last || 0));
    return `${hdr("exMsg")}
      <div class="panel">
        <div class="note-info">${t("mgIntro")}</div>
        <div class="chips" style="margin-top:0.6rem">
          ${LIB_MSG.filter((q) => !p.msgs.some((m) => m.q === q.q)).slice(0, 8)
            .map((q) => `<button class="chip" data-mgadd="${esc(q.q)}">＋ ${esc(q.q)}</button>`).join("")}
        </div>
      </div>
      ${ui.mgEdit !== undefined ? msgForm(ui.mgEdit) : `<button class="btn btn-primary" id="mgNew" style="width:100%">${t("mgAdd")}</button>`}
      ${rows.map((m) => {
        const days = m.last ? Math.floor((Date.now() - m.last) / DAY) : null;
        const stale = days === null || days > 30;
        return `<div class="panel">
          <div class="src-title">${esc(m.q)}</div>
          <div class="msg-answer">${esc(m.a || "")}</div>
          <div class="h-row" style="margin:0.6rem 0 0">
            <span class="microlabel ${stale ? "stale" : ""}">${m.reps || 0} ${ts("mgReps")} · ${days === null ? ts("mgNever") : ti("mgDaysAgo", days)}</span>
            <div class="v-actions" style="margin:0">
              <button class="btn btn-sm btn-primary" data-mgrehearse="${esc(m.id)}">${t("mgRehearsed")}</button>
              <button class="btn btn-sm" data-mgedit="${esc(m.id)}">${t("mgEdit")}</button>
            </div>
          </div>
        </div>`;
      }).join("")}`;
  }
  function msgForm(m) {
    return `<div class="panel form-grid">
      <label class="f">${t("mgQ")} <input id="mgQ" value="${esc(m?.q || "")}" /></label>
      <label class="f">${t("mgA")} <textarea id="mgA" rows="5">${esc(m?.a || "")}</textarea></label>
      <div class="v-actions">
        <button class="btn btn-primary" id="mgSave">${t("mgSave")}</button>
        <button class="btn btn-ghost" id="mgCancel">${t("close")}</button>
      </div>
    </div>`;
  }
  function wireMsg(el) {
    el.querySelector("#mgNew")?.addEventListener("click", () => { ui.mgEdit = null; ctx.rerender(); });
    el.querySelectorAll("[data-mgadd]").forEach((b) => b.addEventListener("click", () => {
      ui.mgEdit = { q: b.dataset.mgadd, a: "" }; ctx.rerender();
    }));
    el.querySelectorAll("[data-mgedit]").forEach((b) => b.addEventListener("click", () => {
      ui.mgEdit = P().msgs.find((m) => m.id === b.dataset.mgedit); ctx.rerender();
    }));
    el.querySelector("#mgSave")?.addEventListener("click", () => {
      const q = document.getElementById("mgQ").value.trim();
      const a = document.getElementById("mgA").value.trim();
      if (!q) return;
      const p = P();
      if (ui.mgEdit?.id) Object.assign(p.msgs.find((m) => m.id === ui.mgEdit.id), { q, a });
      else p.msgs.push({ id: "mg" + Date.now(), q, a, reps: 0, last: null });
      ui.mgEdit = undefined; save(); ctx.rerender();
    });
    el.querySelector("#mgCancel")?.addEventListener("click", () => { ui.mgEdit = undefined; ctx.rerender(); });
    el.querySelectorAll("[data-mgrehearse]").forEach((b) => b.addEventListener("click", () => {
      const m = P().msgs.find((x) => x.id === b.dataset.mgrehearse);
      m.reps = (m.reps || 0) + 1; m.last = Date.now();
      logSession("msg", 1); save(); ctx.rerender();
    }));
  }

  // ── dashboard ───────────────────────────────────────────────────────
  const EX_KEYS = [
    { k: "shadow", labelKey: "exShadow" }, { k: "read", labelKey: "exRead" },
    { k: "mono", labelKey: "exMono" }, { k: "circum", labelKey: "exCircum" },
  ];
  function renderDash() {
    const p = P();
    const since = Date.now() - 30 * DAY;
    const recent = p.sessions.filter((s) => new Date(s.d).getTime() >= since);
    const byType = {};
    for (const s of recent) byType[s.type] = (byType[s.type] || 0) + s.min;
    const maxMin = Math.max(1, ...Object.values(byType));
    const totalMin = Math.round(Object.values(byType).reduce((a, b) => a + b, 0));

    const byDomain = {};
    for (const e of p.lexicon) byDomain[e.domain] = (byDomain[e.domain] || 0) + 1;
    const maxDom = Math.max(1, ...Object.values(byDomain));

    // circumlocution success in weekly buckets, oldest first
    const weeks = [];
    for (let w = 4; w >= 0; w--) {
      const lo = Date.now() - (w + 1) * 7 * DAY, hi = Date.now() - w * 7 * DAY;
      const runs = p.circum.filter((c) => { const t2 = new Date(c.d).getTime(); return t2 >= lo && t2 < hi; });
      weeks.push({ n: runs.length, rate: runs.length ? Math.round((runs.filter((r) => r.ok).length / runs.length) * 100) : null });
    }
    const pending = p.monologues.filter((m) => !m.rating && m.unlock <= Date.now()).length;

    return `
      <div class="h-row"><h2>${t("dashTitle")}</h2></div>
      <div class="stat-grid">
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${ctx.streak()}</b><div class="microlabel">${t("statStreak")}</div></div>
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${totalMin}</b><div class="microlabel">${t("dashMinutes")}</div></div>
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${p.lexicon.length}</b><div class="microlabel">${t("dashLexicon")}</div></div>
        <div class="panel" style="margin:0"><b style="font-size:1.6rem">${pending}</b><div class="microlabel">${t("dashPending")}</div></div>
      </div>

      <div class="panel" style="margin-top:0.9rem">
        <div class="microlabel">${t("dashByType")}</div>
        ${totalMin ? EX_KEYS.map((e) => {
          const v = Math.round(byType[e.k] || 0);
          return `<div class="hbar-row">
            <span class="hbar-label"><i style="background:${EX_COLORS[e.k]}"></i>${t(e.labelKey)}</span>
            <span class="hbar-track"><span class="hbar-fill" style="width:${(v / maxMin) * 100}%; background:${EX_COLORS[e.k]}"></span></span>
            <span class="hbar-val">${v}</span></div>`;
        }).join("") : `<div class="empty">${t("dashNoData")}</div>`}
      </div>

      <div class="panel">
        <div class="microlabel">${t("dashDomains")}</div>
        ${p.lexicon.length ? DOMAINS.map((d) => {
          const v = byDomain[d.k] || 0;
          return `<div class="hbar-row">
            <span class="hbar-label">${esc(bilingual() ? d.ar + " · " + d.en : d.ar)}</span>
            <span class="hbar-track"><span class="hbar-fill" style="width:${(v / maxDom) * 100}%; background:var(--green)"></span></span>
            <span class="hbar-val">${v}</span></div>`;
        }).join("") : `<div class="empty">${t("dashNoLex")}</div>`}
      </div>

      <div class="panel">
        <div class="microlabel">${t("dashCircum")}</div>
        ${p.circum.length ? trendSvg(weeks) : `<div class="empty">${t("dashNoCircum")}</div>`}
      </div>`;
  }

  /** Five weekly points, 2px line, 8px markers, direct label on the last. */
  function trendSvg(weeks) {
    const W = 300, H = 90, pad = 18;
    const pts = weeks.map((w, i) => ({
      x: pad + (i * (W - pad * 2)) / (weeks.length - 1),
      y: w.rate === null ? null : H - pad - ((w.rate / 100) * (H - pad * 2)),
      rate: w.rate, n: w.n,
    }));
    const line = pts.filter((p2) => p2.y !== null);
    const d = line.map((p2, i) => `${i ? "L" : "M"}${p2.x.toFixed(1)},${p2.y.toFixed(1)}`).join(" ");
    const last = line[line.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" class="trend" role="img"
        aria-label="${esc(ts("dashCircum"))}: ${weeks.map((w) => (w.rate === null ? "—" : w.rate + "%")).join(", ")}">
      ${[0, 50, 100].map((g) => { const y = H - pad - (g / 100) * (H - pad * 2);
        return `<line x1="${pad}" x2="${W - pad}" y1="${y}" y2="${y}" stroke="rgb(233 237 243 / 0.10)" stroke-width="1"/>
                <text x="${pad - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="rgb(233 237 243 / 0.4)">${g}</text>`; }).join("")}
      ${line.length > 1 ? `<path d="${d}" fill="none" stroke="${EX_COLORS.circum}" stroke-width="2" stroke-linejoin="round"/>` : ""}
      ${line.map((p2) => `<circle cx="${p2.x.toFixed(1)}" cy="${p2.y.toFixed(1)}" r="4"
          fill="${EX_COLORS.circum}" stroke="var(--bg-card)" stroke-width="2"><title>${p2.rate}٪ · ${p2.n}</title></circle>`).join("")}
      ${last ? `<text x="${last.x}" y="${last.y - 9}" text-anchor="middle" font-size="10" fill="rgb(233 237 243 / 0.64)">${last.rate}٪</text>` : ""}
    </svg>
    <div class="microlabel" style="text-align:center">${t("dashWeeks")}</div>`;
  }

  // ── hub & dispatch ──────────────────────────────────────────────────
  const MODES = [
    { k: "shadow", labelKey: "exShadow", descKey: "exShadowD", icon: "▶" },
    { k: "read", labelKey: "exRead", descKey: "exReadD", icon: "❡" },
    { k: "mono", labelKey: "exMono", descKey: "exMonoD", icon: "●" },
    { k: "circum", labelKey: "exCircum", descKey: "exCircumD", icon: "⟳" },
    { k: "lex", labelKey: "exLex", descKey: "exLexD", icon: "▤" },
    { k: "msg", labelKey: "exMsg", descKey: "exMsgD", icon: "✉" },
  ];
  const hdr = (key, back) => `<div class="h-row">
      ${back ? `<button class="btn btn-ghost btn-sm" id="pBack">◂</button>` : ""}
      <h2 style="flex:1">${t(key)}</h2></div>`;

  const RENDER = { shadow: renderShadow, read: renderRead, mono: renderMono, circum: renderCircum, lex: renderLex, msg: renderMsg };
  const WIRE = { shadow: wireShadow, read: wireRead, mono: wireMono, circum: wireCircum, lex: wireLex, msg: wireMsg };

  function render() {
    if (!mode) {
      const p = P();
      const due = p.lexicon.filter((e) => e.en && (e.sm2?.due || 0) <= Date.now()).length;
      const pending = p.monologues.filter((m) => !m.rating && m.unlock <= Date.now()).length;
      const badge = { lex: due, mono: pending };
      return `<div class="h-row"><h2>${t("tabPractice")}</h2></div>
        <div class="mode-grid">
          ${MODES.map((m) => `<button class="mode-card" data-pmode="${m.k}">
              <span class="mode-ico">${m.icon}</span>
              <span class="mode-name">${t(m.labelKey)}</span>
              <span class="mode-best">${t(m.descKey)}</span>
              ${badge[m.k] ? `<span class="pill-inline">${badge[m.k]}</span>` : ""}
            </button>`).join("")}
        </div>`;
    }
    return RENDER[mode]();
  }

  function wire(el) {
    el.querySelectorAll("[data-pmode]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.pmode; ui = {}; ctx.rerender();
    }));
    el.querySelector("#pBack")?.addEventListener("click", () => {
      if (mode === "shadow" && ui.videoId) teardownShadow();
      if (mode === "read" && ui.text) { clearInterval(readTimer); readTimer = null; }
      if (mode === "mono" && ui.recording) return alert(ts("mnCannotLeave"));
      clearInterval(cirTimer);
      if (Object.keys(ui).length) ui = {}; else mode = null;
      ctx.rerender();
    });
    WIRE[mode]?.(el);
  }

  return { render, wire, renderDash, P, sm2, phraseOk, DOMAINS, successRate,
    leave: () => { if (mode === "shadow") teardownShadow(); clearInterval(readTimer); clearInterval(cirTimer); mode = null; ui = {}; } };
}
