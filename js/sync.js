/*
 * SYNC — one account, every device.
 *
 * The whole app state is one JSON document per user in Supabase (kk_state),
 * protected by row-level security so a token can only ever reach its own row.
 * Auth is an emailed 6-digit code: no password to manage, no redirect to
 * handle inside a PWA.
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
      headers: { apikey: SUPA.key, "Content-Type": "application/json", ...(opts.headers || {}) },
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

  async function sendCode(email) {
    const r = await api("/auth/v1/otp", {
      method: "POST",
      body: JSON.stringify({ email, create_user: true }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).msg || "send failed");
  }

  async function verifyCode(email, token) {
    const r = await api("/auth/v1/verify", {
      method: "POST",
      body: JSON.stringify({ email, token, type: "email" }),
    });
    const j = await r.json();
    if (!r.ok || !j.access_token) throw new Error(j.msg || j.error_description || "bad code");
    saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, email, user_id: j.user.id, at: Date.now() });
    return session;
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

    out.settings = { ...rg.settings, ...remote.settings, ...local.settings };
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

  return {
    probe,
    sendCode, verifyCode, syncNow, mergeState,
    signOut: () => saveSession(null),
    session: () => session,
    email: () => session?.email || null,
  };
}
