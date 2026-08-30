/*
 * SYNC — one account, every device.
 *
 * The whole app state is one JSON document per user in Supabase (kk_state),
 * protected by row-level security so a token can only ever reach its own row.
 * Auth has two doors, both landing on the same account:
 *   1. an emailed 6-digit code — nothing to remember, but it depends on the
 *      project's mail being able to actually send
 *   2. an email + password — no mail round-trip at all, which is what you
 *      want when SMTP is down, rate-limited, or not set up yet
 *
 * IMPORTANT — where this works:
 *   ✅ a real host (GitHub Pages, Netlify, Vercel, localhost)
 *   ❌ inside the Claude artifact viewer, whose CSP blocks network calls to
 *      any host. There the app runs perfectly but stays local-only, and the
 *      UI says so rather than failing silently.
 *
 * Conflict handling is a real merge, not last-write-wins: two devices that
 * both studied offline keep both sets of work (see mergeState).
 */
const SUPA = {
  url: "https://feutbrnpcjsjfllptziq.supabase.co",
  // Publishable key — safe to ship. RLS is the actual boundary.
  key: "sb_publishable_0EI5Efo5zO0DgvNqsc2WMg_Tkqvs2qR",
};

function createSync(ctx) {
  const SESSION_KEY = "khosh-kalam-session";
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch {}

  const saveSession = (s) => {
    session = s;
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch {}
  };

  const api = (path, opts = {}) =>
    fetch(SUPA.url + path, {
      ...opts,
      // Both headers, as the official client sends them. An authed call
      // passes its own Authorization through opts and wins the spread.
      headers: {
        apikey: SUPA.key,
        Authorization: `Bearer ${SUPA.key}`,
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
    });

  const authed = (path, opts = {}) =>
    api(path, { ...opts, headers: { Authorization: `Bearer ${session.access_token}`, ...(opts.headers || {}) } });

  /** Network reachable at all? Artifact CSP makes this false. */
  let reachable = null;
  async function probe() {
    if (reachable !== null) return reachable;
    try {
      await fetch(SUPA.url + "/auth/v1/health", { headers: { apikey: SUPA.key } });
      reachable = true;
    } catch { reachable = false; }
    return reachable;
  }

  /*
   * Turn a failed auth response into an error the screen can actually use.
   * The server's own words are the only thing that separates "wait an hour"
   * from "try again" — swallowing them (as this once did) leaves a
   * rate-limited user retrying straight back into the limit.
   */
  async function authError(r, fallback = "syncFail") {
    const j = await r.json().catch(() => ({}));
    const msg = j.msg || j.error_description || j.message || j.error || "";
    const err = new Error(msg || `HTTP ${r.status}`);
    err.status = r.status;
    err.serverMsg = msg;
    const code = j.error_code || j.code || "";
    err.key =
      r.status === 429 || /rate limit|too many/i.test(msg) ? "syncRate"
      : r.status >= 500 || /deadline exceeded|smtp|sending (the )?email|error sending/i.test(msg) ? "syncMail"
      : /invalid_credentials|invalid login credentials/i.test(code + msg) ? "pwBad"
      : /email_not_confirmed|email not confirmed/i.test(code + msg) ? "pwUnconfirmed"
      : /user_already_exists|already registered/i.test(code + msg) ? "pwExists"
      : /weak_password|password should be|at least \d+ characters/i.test(code + msg) ? "pwShort"
      : fallback;
    return err;
  }

  const netError = () => Object.assign(new Error("network"), { key: "syncNet" });

  async function sendCode(email) {
    let r;
    try {
      r = await api("/auth/v1/otp", {
        method: "POST",
        body: JSON.stringify({ email, create_user: true }),
      });
    } catch { throw netError(); }
    if (!r.ok) throw await authError(r);
  }

  async function verifyCode(email, token) {
    let r;
    try {
      r = await api("/auth/v1/verify", {
        method: "POST",
        body: JSON.stringify({ email, token, type: "email" }),
      });
    } catch { throw netError(); }
    if (!r.ok) throw await authError(r, "codeBad");
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) throw Object.assign(new Error("bad code"), { key: "codeBad" });
    saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, email, user_id: j.user.id, at: Date.now() });
    return session;
  }

  /*
   * The password door. It touches the mail server only once — on the very
   * first signUp, and only if the project still has "confirm email" on — so
   * it keeps working when the code route can't.
   */
  async function signIn(email, password) {
    let r;
    try {
      r = await api("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    } catch { throw netError(); }
    if (!r.ok) throw await authError(r, "pwBad");
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) throw Object.assign(new Error("no token"), { key: "pwBad" });
    saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, email, user_id: j.user.id, at: Date.now() });
    return session;
  }

  /**
   * Create the account, then sign straight in. A project with email
   * confirmation still on returns a user with no session — that's the one
   * case where a new account has to wait on an email, and the caller is told
   * so by key rather than left staring at a dead screen.
   */
  async function signUp(email, password) {
    let r;
    try {
      r = await api("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password }) });
    } catch { throw netError(); }
    if (!r.ok) throw await authError(r, "syncFail");
    const j = await r.json().catch(() => ({}));
    if (j.access_token) {
      saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, email, user_id: j.user.id, at: Date.now() });
      return session;
    }
    // No session back: the row exists but is unconfirmed.
    throw Object.assign(new Error("confirm required"), { key: "pwUnconfirmed" });
  }

  /** Change the signed-in account's password. */
  async function setPassword(password) {
    // Without this, authed() dereferences a null session and the failure
    // surfaces as "check your connection" — the wrong thing to tell someone.
    if (!session) throw Object.assign(new Error("signed out"), { key: "syncFail" });
    let r;
    try {
      r = await authed("/auth/v1/user", { method: "PUT", body: JSON.stringify({ password }) });
    } catch { throw netError(); }
    if (!r.ok) throw await authError(r, "syncFail");
    return true;
  }

  async function refresh() {
    if (!session?.refresh_token) return false;
    const r = await api("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) { saveSession(null); return false; }
    saveSession({ ...session, access_token: j.access_token, refresh_token: j.refresh_token, at: Date.now() });
    return true;
  }

  /** Run fn, refreshing the token once if the server says it expired. */
  async function withAuth(fn) {
    let r = await fn();
    if (r.status === 401) { if (await refresh()) r = await fn(); }
    return r;
  }

  async function pull() {
    const r = await withAuth(() => authed(`/rest/v1/kk_state?select=state,revision&user_id=eq.${session.user_id}`));
    if (!r.ok) throw new Error("pull failed");
    const rows = await r.json();
    return rows[0] || null;
  }

  async function push(state, revision) {
    const body = JSON.stringify({ user_id: session.user_id, state, revision, device: navigator.userAgent.slice(0, 60) });
    const r = await withAuth(() =>
      authed("/rest/v1/kk_state", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body,
      }));
    if (!r.ok) throw new Error("push failed");
  }

  /*
   * Merge two states so that studying on two devices never loses work.
   * The rule per field is chosen from what the field means:
   *   progress   — per card, the review that happened LATER wins
   *   logs       — per day, the larger count wins (both devices may have studied)
   *   sets       — union (packs added, words archived, words captured)
   *   settings   — this device wins; it is the one being used right now
   */
  function mergeState(local, remote) {
    const out = { ...remote, ...local };

    out.progress = { ...remote.progress };
    for (const [id, c] of Object.entries(local.progress || {})) {
      const r = remote.progress?.[id];
      out.progress[id] = !r || (c.last || 0) >= (r.last || 0) ? c : r;
    }

    out.log = { ...remote.log };
    for (const [d, l] of Object.entries(local.log || {})) {
      const r = remote.log?.[d] || {};
      out.log[d] = {
        reviews: Math.max(l.reviews || 0, r.reviews || 0),
        correct: Math.max(l.correct || 0, r.correct || 0),
        intro: Math.max(l.intro || 0, r.intro || 0),
      };
    }

    const union = (a = [], b = []) => [...new Set([...a, ...b])];
    out.packs = union(local.packs, remote.packs);
    out.removed = union(local.removed, remote.removed);
    out.verify = { ...remote.verify, ...local.verify };
    out.overrides = { ...remote.overrides, ...local.overrides };

    const byId = new Map();
    for (const w of [...(remote.custom || []), ...(local.custom || [])]) byId.set(w.id, w);
    out.custom = [...byId.values()];

    out.challenges = { ...remote.challenges };
    for (const [d, c] of Object.entries(local.challenges || {})) {
      const r = remote.challenges?.[d];
      out.challenges[d] = r ? { ids: c.ids, done: union(c.done, r.done) } : c;
    }

    const lg = local.game || {}, rg = remote.game || {};
    out.game = {
      ...rg, ...lg,
      xp: Math.max(lg.xp || 0, rg.xp || 0),
      rounds: Math.max(lg.rounds || 0, rg.rounds || 0),
      freezes: Math.max(lg.freezes || 0, rg.freezes || 0),
      frozen: union(lg.frozen, rg.frozen),
      best: Object.fromEntries(
        union(Object.keys(lg.best || {}), Object.keys(rg.best || {}))
          .map((k) => [k, Math.max(lg.best?.[k] || 0, rg.best?.[k] || 0)])),
      xpLog: Object.fromEntries(
        union(Object.keys(lg.xpLog || {}), Object.keys(rg.xpLog || {}))
          .map((k) => [k, Math.max(lg.xpLog?.[k] || 0, rg.xpLog?.[k] || 0)])),
      misses: Object.fromEntries(
        union(Object.keys(lg.misses || {}), Object.keys(rg.misses || {}))
          .map((k) => [k, Math.max(lg.misses?.[k] || 0, rg.misses?.[k] || 0)])),
    };

    /*
     * The practice modes' data. Without this block `{...remote, ...local}`
     * hands the whole object to whichever device wrote last, so a laptop that
     * has been offline for a week silently destroys everything captured on the
     * phone since. Each collection merges by what it means:
     *   lexicon/monologues/msgs — keyed records: union by id, richer row wins
     *   sessions/circum         — append-only history: union, never dropped
     */
    const lp = local.practice || {}, rp = remote.practice || {};
    const byKey = (a = [], b = [], pick) => {
      const m = new Map();
      for (const row of [...b, ...a]) {
        const prev = m.get(row.id);
        m.set(row.id, prev ? pick(row, prev) : row);
      }
      return [...m.values()];
    };
    // an entry that has been given a gloss, or reviewed more recently, is the
    // one worth keeping
    const richerLex = (x, y) =>
      (x.en ? 1 : 0) !== (y.en ? 1 : 0) ? (x.en ? x : y)
        : (x.sm2?.last || 0) >= (y.sm2?.last || 0) ? x : y;
    const richerMono = (x, y) => (x.rating ? x : y.rating ? y : x);
    const richerMsg = (x, y) => ((x.reps || 0) >= (y.reps || 0) ? x : y);
    // history rows carry an id from now on; older rows fall back to their shape
    const histKey = (r) => r.id || JSON.stringify(r);
    const unionHist = (a = [], b = []) => {
      const m = new Map();
      for (const row of [...b, ...a]) m.set(histKey(row), row);
      return [...m.values()];
    };

    out.practice = {
      ...rp, ...lp,
      lexicon: byKey(lp.lexicon, rp.lexicon, richerLex),
      monologues: byKey(lp.monologues, rp.monologues, richerMono),
      msgs: byKey(lp.msgs, rp.msgs, richerMsg),
      sessions: unionHist(lp.sessions, rp.sessions),
      circum: unionHist(lp.circum, rp.circum),
      recent: byKey(lp.recent, rp.recent, (x) => x),
    };

    out.settings = { ...remote.settings, ...local.settings };
    return out;
  }

  /** Pull, merge, push. Returns a short status key for the UI. */
  async function syncNow() {
    if (!session) return "signedOut";
    const local = ctx.exportState();
    const row = await pull();
    if (!row) {
      await push(local, 1);
      ctx.setRevision(1);
      return "pushed";
    }
    const merged = mergeState(local, row.state || {});
    const rev = (row.revision || 0) + 1;
    await push(merged, rev);
    ctx.importState(merged);
    ctx.setRevision(rev);
    return "merged";
  }

  /*
   * If the emailed link was clicked instead of the code being typed, the
   * browser lands here with the tokens in the URL fragment. Adopt them and
   * scrub the fragment so a refresh does not replay it.
   */
  function adoptLinkSession() {
    if (!location.hash.includes("access_token")) return false;
    const h = new URLSearchParams(location.hash.slice(1));
    const at = h.get("access_token"), rt = h.get("refresh_token");
    if (!at) return false;
    let email = null;
    try { email = JSON.parse(atob(at.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email; } catch {}
    let uid = null;
    try { uid = JSON.parse(atob(at.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub; } catch {}
    if (!uid) return false;
    saveSession({ access_token: at, refresh_token: rt, email, user_id: uid, at: Date.now() });
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  }

  /*
   * Auto-sync. The contract is simple: any local change schedules a push,
   * and every return to the app pulls first so another device's work is
   * merged in before anything is written back.
   */
  let dirty = false, timer = null, running = false, onStatus = () => {};
  const DEBOUNCE = 2500;

  function setStatus(s) { onStatus(s); }

  function markDirty() {
    if (!session) return;
    dirty = true;
    setStatus("pending");
    clearTimeout(timer);
    timer = setTimeout(() => run("push"), DEBOUNCE);
  }

  async function run(reason) {
    if (!session || running) return;
    if (!navigator.onLine) { setStatus("offline"); return; }
    running = true;
    setStatus("syncing");
    try {
      await syncNow();
      dirty = false;
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      // leave dirty set; the next focus, reconnect or edit retries
    } finally {
      running = false;
    }
  }

  function start(statusCb) {
    onStatus = statusCb || (() => {});
    if (!session) return;
    run("load");
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") run("focus");
    });
    window.addEventListener("online", () => run("online"));
    window.addEventListener("offline", () => setStatus("offline"));
    // a slow heartbeat catches a device that is left open all day
    setInterval(() => { if (document.visibilityState === "visible") run("tick"); }, 5 * 60 * 1000);
    // never lose the last few seconds of work on close
    window.addEventListener("pagehide", () => {
      if (!dirty || !session) return;
      try {
        const body = JSON.stringify({ user_id: session.user_id, state: ctx.exportState(), revision: (ctx.revision() || 0) + 1 });
        navigator.sendBeacon?.(
          `${SUPA.url}/rest/v1/kk_state?apikey=${SUPA.key}`,
          new Blob([body], { type: "application/json" }));
      } catch {}
    });
  }

  return {
    probe, adoptLinkSession,
    sendCode, verifyCode, signIn, signUp, setPassword, syncNow, mergeState,
    start, markDirty, flush: () => run("manual"),
    signOut: () => { saveSession(null); dirty = false; },
    session: () => session,
    email: () => session?.email || null,
  };
}
