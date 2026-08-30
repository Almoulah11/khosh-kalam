/*
 * ARENA — التمرين. The game mode you enter and play, separate from the
 * daily spaced-repetition session.
 *
 * What is borrowed from Duolingo, and why:
 *   hearts        — stakes. A round can be lost, so attention is real.
 *   XP + ranks    — a long arc of progress that survives any single bad day.
 *   daily XP goal — a target that is finishable in five minutes.
 *   streak freeze — earned, not bought; protects a real streak from one bad day.
 *   combo         — rewards sustained accuracy inside a round.
 *   end-of-round  — every miss is shown WITH its explanation.
 * Deliberately NOT borrowed: leagues (there is nobody to compete with) and
 * a gem shop (nothing worth buying). Both would be theatre here.
 *
 * Arena never writes to the FSRS scheduler — recognising a word among four
 * options is not the same evidence as recalling it cold, so it must not move
 * a due date. Misses are recorded instead, and the daily session puts those
 * words first among the cards already due.
 */
function createArena(ctx) {
  const { esc, t, ti, ts, S, bilingual, save, allWords, isStudyable } = ctx;
  const store = () => ctx.store();

  const RANKS = [
    { xp: 0, key: "rankNovice" },
    { xp: 300, key: "rankListener" },
    { xp: 900, key: "rankTalker" },
    { xp: 2000, key: "rankDebater" },
    { xp: 4000, key: "rankEloquent" },
    { xp: 7500, key: "rankMaster" },
  ];
  const HEARTS = 5;
  const ROUND_LEN = 10;

  const game = () => {
    const s = store();
    s.game ||= {};
    const g = s.game;
    g.xp ??= 0; g.best ??= {}; g.rounds ??= 0; g.misses ??= {};
    g.freezes ??= 0; g.dailyGoal ??= 30; g.xpLog ??= {}; g.frozen ??= [];
    return g;
  };

  function rankOf(xp) {
    let i = 0;
    for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].xp) i = k;
    return { index: i, ...RANKS[i], next: RANKS[i + 1] || null };
  }

  // ── question builders ────────────────────────────────────────────────
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const sample = (arr, n) => shuffle([...arr]).slice(0, n);

  /** Blank the target word out of its own example sentence. */
  function blankOut(word) {
    if (!word.ex || word.ex === "—") return null;
    const head = word.ar.replace(/^ال/, "").split(/[\s/]+/)[0];
    if (head.length < 3) return null;
    const toks = word.ex.split(" ");
    let best = -1, bestLen = 2;
    toks.forEach((tk, i) => {
      const l = lcs(tk.replace(/[،.؟!:—«»"()]/g, ""), head);
      if (l > bestLen) { bestLen = l; best = i; }
    });
    if (best < 0) return null;
    return toks.map((tk, i) => (i === best ? "＿＿＿" : tk)).join(" ");
  }
  function lcs(a, b) {
    let m = 0;
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
      let k = 0; while (a[i + k] && a[i + k] === b[j + k]) k++;
      if (k > m) m = k;
    }
    return m;
  }

  function deck() { return allWords().filter(isStudyable); }

  const MODES = {
    // كمّل الجملة — works in both language modes, so it is the default
    cloze: {
      key: "cloze", labelKey: "modeClozeGame", icon: "◧",
      available: () => deck().filter(blankOut).length >= 8,
      build() {
        const pool = deck().filter(blankOut);
        return sample(pool, ROUND_LEN).map((w) => {
          const wrong = sample(pool.filter((x) => x.id !== w.id && x.reg === w.reg), 3);
          const filler = sample(pool.filter((x) => x.id !== w.id), 3);
          const opts = shuffle([w, ...(wrong.length === 3 ? wrong : filler)].slice(0, 4));
          return {
            id: w.id, prompt: blankOut(w), promptClass: "q-ar",
            options: opts.map((o) => o.ar), answer: opts.findIndex((o) => o.id === w.id),
            why: w.en, ref: w.ar,
          };
        });
      },
    },
    // شنو معناها — needs the English gloss, so bilingual only
    meaning: {
      key: "meaning", labelKey: "modeMeaningGame", icon: "◑",
      available: () => bilingual() && deck().length >= 8,
      build() {
        const pool = deck().filter((w) => w.en);
        return sample(pool, ROUND_LEN).map((w) => {
          const opts = shuffle([w, ...sample(pool.filter((x) => x.id !== w.id), 3)]);
          return {
            id: w.id, prompt: w.en, promptClass: "q-en",
            options: opts.map((o) => o.ar), answer: opts.findIndex((o) => o.id === w.id),
            why: w.ex && w.ex !== "—" ? w.ex : w.en, ref: w.ar,
          };
        });
      },
    },
    gender: {
      key: "gender", labelKey: "modeGenderGame", icon: "⚥",
      available: () => true,
      build() {
        return sample(SEED_GENDER, ROUND_LEN).map((d) => {
          // the source data always lists the correct form first, so the
          // options MUST be shuffled or the round is won by tapping option 1
          const order = shuffle(d.options.map((_, i) => i));
          return {
            id: d.id, prompt: d.prompt, promptClass: "q-ar",
            options: order.map((i) => d.options[i]), answer: order.indexOf(d.answer),
            why: bilingual() ? `${d.rule}\n${d.en}` : d.rule, ref: d.options[d.answer],
          };
        });
      },
    },
    upgrade: {
      key: "upgrade", labelKey: "modeUpgradeGame", icon: "▲",
      available: () => true,
      build() {
        return sample(SEED_UPGRADE, Math.min(ROUND_LEN, SEED_UPGRADE.length)).map((d) => {
          const idx = shuffle(d.options.map((_, i) => i));
          return {
            id: d.id, prompt: d.situation, sub: d.weak, promptClass: "q-ar",
            options: idx.map((i) => d.options[i]), answer: idx.indexOf(d.answer),
            why: d.why, ref: d.options[d.answer], long: true,
          };
        });
      },
    },
    reply: {
      key: "reply", labelKey: "modeReplyGame", icon: "⇄",
      available: () => true,
      build() {
        return sample(SEED_RESPONSES, ROUND_LEN).map((r) => {
          const opts = shuffle([r, ...sample(SEED_RESPONSES.filter((x) => x.id !== r.id), 3)]);
          return {
            id: r.id, prompt: r.call, promptClass: "q-ar",
            options: opts.map((o) => o.resp), answer: opts.findIndex((o) => o.id === r.id),
            why: bilingual() ? `${r.en}` : r.note || r.call, ref: r.resp, long: true,
          };
        });
      },
    },
    // اقرأ الموقف — situational judgement. The distractors are all sayable;
    // they are wrong for who is being addressed, not for grammar.
    situation: {
      key: "situation", labelKey: "modeSituation", icon: "☰",
      available: () => true,
      build() {
        return sample(SEED_DCT, ROUND_LEN).map((d) => {
          const order = shuffle(d.options.map((_, i) => i));
          return {
            id: d.id, prompt: d.sit, sub: d.who, subClass: "q-context", promptClass: "q-ar",
            options: order.map((i) => d.options[i]), answer: order.indexOf(d.answer),
            why: d.why, ref: d.options[d.answer], long: true,
          };
        });
      },
    },
    // سلّم السجل — same intent, three audiences; pick the right rung
    ladder: {
      key: "ladder", labelKey: "modeLadder", icon: "≡",
      available: () => true,
      build() {
        const items = [];
        for (const l of shuffle([...SEED_LADDER])) {
          for (const target of shuffle([0, 1, 2]).slice(0, 1)) {
            const order = shuffle([0, 1, 2]);
            items.push({
              id: l.id + target, prompt: l.intent, sub: `→ ${l.rungs[target].who}`, subClass: "q-context", promptClass: "q-ar",
              options: order.map((i) => l.rungs[i].ar), answer: order.indexOf(target),
              why: l.rungs.map((r) => `${r.who}: ${r.ar}`).join("\n"),
              ref: l.rungs[target].ar, long: true,
            });
          }
          if (items.length >= ROUND_LEN) break;
        }
        return items.slice(0, ROUND_LEN);
      },
    },
    proverb: {
      key: "proverb", labelKey: "modeProverbGame", icon: "❝",
      available: () => proverbPool().length >= 6,
      build() {
        const pool = proverbPool();
        return sample(pool, Math.min(ROUND_LEN, pool.length)).map((w) => {
          const opts = shuffle([w, ...sample(pool.filter((x) => x.id !== w.id), 3)]);
          const situation = (w.ex || "").split("—")[0].trim() || w.note || w.en;
          return {
            id: w.id, prompt: situation, promptClass: "q-ar",
            options: opts.map((o) => o.ar), answer: opts.findIndex((o) => o.id === w.id),
            why: w.note || w.en, ref: w.ar, long: true,
          };
        });
      },
    },
  };
  const proverbPool = () => deck().filter((w) => w.topic === "أمثال");

  // ── round state ──────────────────────────────────────────────────────
  let round = null; // {mode, qs, i, score, hearts, combo, answered, correct, misses[]}

  function start(modeKey) {
    const qs = MODES[modeKey].build();
    round = { mode: modeKey, qs, i: 0, score: 0, hearts: HEARTS, combo: 0, best: 0, answered: null, correct: 0, misses: [], t0: Date.now() };
    ctx.rerender();
  }

  function answer(choice) {
    if (round.answered !== null) return;
    const q = round.qs[round.i];
    const right = choice === q.answer;
    const secs = (Date.now() - round.t0) / 1000;
    let gained = 0;
    if (right) {
      round.combo += 1;
      round.best = Math.max(round.best, round.combo);
      const speed = Math.round(Math.max(0, 50 - Math.max(0, secs - 3) * 5));
      const mult = Math.min(2, 1 + round.combo * 0.1);
      gained = Math.round((100 + speed) * mult);
      round.score += gained;
      round.correct += 1;
    } else {
      round.combo = 0;
      round.hearts -= 1;
      round.misses.push(q);
      const g = game();
      g.misses[q.id] = (g.misses[q.id] || 0) + 1;
    }
    round.answered = { choice, right, gained };
    save();
    ctx.rerender();
  }

  function next() {
    if (round.hearts <= 0 || round.i >= round.qs.length - 1) return finish();
    round.i += 1;
    round.answered = null;
    round.t0 = Date.now();
    ctx.rerender();
  }

  function finish() {
    const g = game();
    const perfect = round.hearts === HEARTS && round.correct === round.qs.length;
    const xp = round.correct * 10 + (perfect ? 20 : 0);
    g.xp += xp;
    g.rounds += 1;
    g.best[round.mode] = Math.max(g.best[round.mode] || 0, round.score);
    const day = ctx.todayKey();
    g.xpLog[day] = (g.xpLog[day] || 0) + xp;
    // a streak freeze is earned every 7th day of an unbroken streak, capped at 2
    if (ctx.streak() > 0 && ctx.streak() % 7 === 0 && g.freezes < 2 && g.lastFreezeDay !== day) {
      g.freezes += 1; g.lastFreezeDay = day;
    }
    round = { ...round, done: true, xp, perfect };
    save();
    ctx.rerender();
  }

  const quit = () => { round = null; ctx.rerender(); };

  /** Consume a freeze to cover yesterday if it was missed. Called on load. */
  function applyFreeze() {
    const g = game();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yk = ctx.todayKey(y);
    const s = store();
    const activeY = (s.log[yk]?.reviews || 0) > 0 || (g.xpLog[yk] || 0) > 0 || g.frozen.includes(yk);
    if (activeY) return;
    const d2 = new Date(); d2.setDate(d2.getDate() - 2);
    const k2 = ctx.todayKey(d2);
    const hadStreak = (s.log[k2]?.reviews || 0) > 0 || (g.xpLog[k2] || 0) > 0 || g.frozen.includes(k2);
    if (hadStreak && g.freezes > 0) { g.freezes -= 1; g.frozen.push(yk); save(); }
  }

  // ── rendering ────────────────────────────────────────────────────────
  function render() {
    if (round && round.done) return renderResult();
    if (round) return renderQuestion();
    return renderHome();
  }

  function renderHome() {
    const g = game();
    const r = rankOf(g.xp);
    const span = r.next ? r.next.xp - r.xp : 1;
    const into = r.next ? g.xp - r.xp : 1;
    const pct = r.next ? Math.min(100, Math.round((into / span) * 100)) : 100;
    const todayXp = g.xpLog[ctx.todayKey()] || 0;
    const goalPct = Math.min(100, Math.round((todayXp / g.dailyGoal) * 100));

    const modes = Object.values(MODES).map((m) => {
      const ok = m.available();
      const best = g.best[m.key] || 0;
      return `<button class="mode-card ${ok ? "" : "locked"}" ${ok ? `data-mode="${m.key}"` : "disabled"}>
        <span class="mode-ico">${m.icon}</span>
        <span class="mode-name">${t(m.labelKey)}</span>
        <span class="mode-best">${ok ? (best ? `${ti("bestScore")} ${best}` : ti("notPlayed")) : ti("modeLocked")}</span>
      </button>`;
    }).join("");

    return `
      <div class="panel">
        <div class="h-row" style="margin:0">
          <div><div class="rank-name">${t(r.key)}</div><div class="microlabel">${g.xp} XP</div></div>
          <div class="freeze" title="${esc(ts("freezeTitle"))}">❄ ${g.freezes}</div>
        </div>
        <div class="xpbar"><div style="width:${pct}%"></div></div>
        <div class="microlabel">${r.next ? ti("toNextRank", r.next.xp - g.xp) : ti("maxRank")}</div>
      </div>

      <div class="panel">
        <div class="h-row" style="margin:0"><span class="microlabel">${t("dailyGoal")}</span>
          <span class="goal-num">${todayXp} / ${g.dailyGoal} XP</span></div>
        <div class="xpbar goal"><div style="width:${goalPct}%"></div></div>
        ${goalPct >= 100 ? `<div class="goal-done">${t("goalMet")}</div>` : ""}
        <label class="f" style="margin-top:0.7rem">${t("goalSize")}
          <select id="goalSel">${[20, 30, 50, 80].map((v) => `<option value="${v}" ${g.dailyGoal === v ? "selected" : ""}>${v} XP</option>`).join("")}</select>
        </label>
      </div>

      <div class="h-row"><h2>${t("chooseMode")}</h2></div>
      <div class="mode-grid">${modes}</div>

      <div class="panel note-info">
        <div class="microlabel" style="margin-bottom:0.4rem">${t("arenaHowTitle")}</div>
        ${t("arenaHow")}
      </div>`;
  }

  function renderQuestion() {
    const q = round.qs[round.i];
    const a = round.answered;
    const hearts = "♥".repeat(round.hearts) + "♡".repeat(HEARTS - round.hearts);
    const pct = Math.round((round.i / round.qs.length) * 100);

    const opts = q.options.map((o, i) => {
      let cls = "opt";
      if (a) {
        if (i === q.answer) cls += " right";
        else if (i === a.choice) cls += " wrong";
        else cls += " dim";
      }
      return `<button class="${cls} ${q.long ? "opt-long" : ""}" data-opt="${i}" ${a ? "disabled" : ""}>${esc(o)}</button>`;
    }).join("");

    return `
      <div class="arena-top">
        <button class="btn btn-ghost btn-sm" id="quitBtn">✕</button>
        <div class="progressbar" style="flex:1; margin:0"><div style="width:${pct}%"></div></div>
        <div class="hearts">${hearts}</div>
      </div>
      <div class="panel">
        <div class="h-row" style="margin:0">
          <span class="microlabel" dir="ltr">${round.i + 1} / ${round.qs.length}</span>
          <span class="microlabel">${round.score} ${round.combo > 1 ? `<span class="combo">×${(Math.min(2, 1 + round.combo * 0.1)).toFixed(1)}</span>` : ""}</span>
        </div>
        <div class="q-face">
          <div class="${q.promptClass}">${esc(q.prompt)}</div>
          ${q.sub ? `<div class="${q.subClass || "q-weak"}">${esc(q.sub)}</div>` : ""}
        </div>
        <div class="opts">${opts}</div>
        ${a ? `<div class="verdict-box ${a.right ? "ok" : "no"}">
            <div class="verdict-head">${a.right ? `${ti("correct")} +${a.gained}` : ti("incorrect")}</div>
            ${!a.right ? `<div class="verdict-ref">${esc(q.ref)}</div>` : ""}
            <div class="verdict-why">${esc(q.why).replace(/\n/g, "<br>")}</div>
            <button class="btn btn-primary" id="nextBtn" style="width:100%; margin-top:0.7rem">${round.hearts <= 0 ? t("roundOver") : round.i >= round.qs.length - 1 ? t("finishRound") : t("nextQ")}</button>
          </div>` : ""}
      </div>`;
  }

  function renderResult() {
    const acc = Math.round((round.correct / round.qs.length) * 100);
    const g = game();
    return `
      <div class="panel" style="text-align:center">
        <div class="result-title">${round.perfect ? t("perfectRound") : round.hearts <= 0 ? t("outOfHearts") : t("roundDone")}</div>
        <div class="result-score">${round.score}</div>
        <div class="microlabel">${ti("finalScore")}</div>
        <div class="day-summary" style="margin-top:1rem">
          <div class="cell"><b>+${round.xp}</b><span>XP</span></div>
          <div class="cell"><b>${acc}٪</b><span>${ti("accuracy")}</span></div>
          <div class="cell"><b>×${round.best}</b><span>${ti("bestCombo")}</span></div>
        </div>
        ${round.score >= (g.best[round.mode] || 0) && round.score > 0 ? `<div class="goal-done" style="margin-top:0.8rem">${t("newBest")}</div>` : ""}
      </div>
      ${round.misses.length ? `<div class="panel">
        <div class="microlabel">${t("reviewMisses")}</div>
        ${round.misses.map((m) => `<div class="miss">
            <div class="miss-ref">${esc(m.ref)}</div>
            <div class="miss-why">${esc(m.why).replace(/\n/g, "<br>")}</div>
          </div>`).join("")}
      </div>` : `<div class="panel note-info">${t("noMisses")}</div>`}
      <div class="v-actions">
        <button class="btn btn-primary" id="againBtn">${t("playAgain")}</button>
        <button class="btn" id="homeBtn">${t("backToModes")}</button>
      </div>`;
  }

  function wire(stage) {
    stage.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => start(b.dataset.mode)));
    stage.querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => answer(+b.dataset.opt)));
    stage.querySelector("#nextBtn")?.addEventListener("click", next);
    stage.querySelector("#quitBtn")?.addEventListener("click", quit);
    stage.querySelector("#againBtn")?.addEventListener("click", () => start(round.mode));
    stage.querySelector("#homeBtn")?.addEventListener("click", quit);
    stage.querySelector("#goalSel")?.addEventListener("change", (e) => { game().dailyGoal = +e.target.value; save(); ctx.rerender(); });
  }

  return { render, wire, game, rankOf, applyFreeze, RANKS,
    inRound: () => !!round,
    /** Tapping the arena tab mid-round returns to the mode list. */
    leave: () => { round = null; } };
}
