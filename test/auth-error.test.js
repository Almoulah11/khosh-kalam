/*
 * Auth errors have to reach the screen, and the password door has to work.
 *
 * The original sendCode swallowed the server's message and the UI showed a
 * generic "sync failed", so a user hitting Supabase's email rate limit was
 * told to "try again" — which burned more of the quota. This drives the real
 * sendCode/verifyCode/signIn/signUp against faked GoTrue responses and
 * asserts the i18n key each one lands on, plus that a successful sign-in
 * actually persists a session.
 *
 *   node test/auth-error.test.js     (from the repo root)
 */
const fs = require("fs");
let stored = {};
global.localStorage = {
  getItem: (k) => stored[k] ?? null,
  setItem: (k, v) => { stored[k] = String(v); },
  removeItem: (k) => { delete stored[k]; },
};
global.navigator = { userAgent: "test", onLine: true };
global.window = { addEventListener() {} };
global.document = { addEventListener() {}, hidden: false };

const src = fs.readFileSync("js/sync.js", "utf8");
const I18N = new Function(fs.readFileSync("js/i18n.js", "utf8") + "; return UI;")();
new Function(src + "\n;globalThis.createSync = createSync;")();

const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
let next, lastReq;
global.fetch = async (url, opts) => {
  lastReq = { url, opts };
  if (next instanceof Error) throw next;
  return next;
};

const sync = createSync({ getState: () => ({}), setState() {}, onStatus() {} });
const call = {
  send: () => sync.sendCode("a@b.com"),
  verify: () => sync.verifyCode("a@b.com", "123456"),
  signIn: () => sync.signIn("a@b.com", "hunter2hunter2"),
  signUp: () => sync.signUp("a@b.com", "hunter2hunter2"),
  setPw: () => sync.setPassword("hunter2hunter2"),
};

const SESSION_OK = {
  access_token: "at", refresh_token: "rt", user: { id: "00000000-0000-0000-0000-0000000000ab" },
};

(async () => {
  let bad = 0;
  const fail = (m) => { bad++; console.log(`✗ ${m}`); };

  // setPassword needs a session to be testing the server's answer rather
  // than its own signed-out guard, so establish one up front.
  next = res(200, SESSION_OK);
  await call.signIn();

  console.log("── failures land on the right message ──");
  const cases = [
    ["send", res(429, { msg: "email rate limit exceeded" }), "syncRate"],
    ["send", res(429, { error_code: "over_email_send_rate_limit", msg: "For security purposes, you can only request this after 51 seconds." }), "syncRate"],
    ["send", res(500, { msg: "Error sending confirmation email" }), "syncMail"],
    ["send", res(504, { msg: "context deadline exceeded" }), "syncMail"],
    ["send", res(400, { msg: "Unable to validate email address: invalid format" }), "syncFail"],
    ["send", new Error("Failed to fetch"), "syncNet"],
    ["verify", res(403, { msg: "Token has expired or is invalid" }), "codeBad"],
    ["verify", res(429, { msg: "email rate limit exceeded" }), "syncRate"],
    ["verify", res(200, {}), "codeBad"],
    ["verify", new Error("Failed to fetch"), "syncNet"],
    ["signIn", res(400, { error_code: "invalid_credentials", msg: "Invalid login credentials" }), "pwBad"],
    ["signIn", res(400, { error_code: "email_not_confirmed", msg: "Email not confirmed" }), "pwUnconfirmed"],
    ["signIn", res(200, {}), "pwBad"],
    ["signIn", new Error("Failed to fetch"), "syncNet"],
    ["signUp", res(422, { error_code: "user_already_exists", msg: "User already registered" }), "pwExists"],
    ["signUp", res(422, { msg: "Password should be at least 6 characters" }), "pwShort"],
    ["signUp", res(500, { msg: "Error sending confirmation email" }), "syncMail"],
    // confirmation still on: a user row but no session comes back
    ["signUp", res(200, { id: "x", user: { id: "x" } }), "pwUnconfirmed"],
    ["setPw", res(401, { msg: "invalid claim: missing sub claim" }), "syncFail"],
  ];

  for (const [op, response, want] of cases) {
    next = response;
    let got = "(no throw)", raw = "";
    try { await call[op](); } catch (e) { got = e.key || "(untagged)"; raw = e.serverMsg || ""; }
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${ok ? "✓" : "✗"} ${op.padEnd(7)} ${String(response.status || "network").padEnd(8)} → ${got}${ok ? "" : "  want " + want}`);
    if (ok && I18N[got]) console.log(`      shows: ${I18N[got].en}${raw && got === "syncFail" ? "  +raw: " + raw : ""}`);
  }

  console.log("\n── the happy paths ──");
  for (const op of ["signIn", "signUp", "verify"]) {
    stored = {};
    next = res(200, SESSION_OK);
    try {
      await call[op]();
      const s = sync.session();
      if (s?.access_token !== "at" || s.email !== "a@b.com") fail(`${op} did not keep the session`);
      else if (!stored["khosh-kalam-session"]) fail(`${op} did not persist the session`);
      else console.log(`✓ ${op.padEnd(7)} signs in and persists the session`);
    } catch (e) { fail(`${op} threw on a good response: ${e.key || e.message}`); }
  }

  next = res(200, {});
  try {
    await call.setPw();
    console.log("✓ setPw   sends PUT /auth/v1/user with the new password");
    if (lastReq.opts.method !== "PUT") fail("setPassword used the wrong method");
    if (!/\/auth\/v1\/user$/.test(lastReq.url)) fail("setPassword hit the wrong path");
    if (lastReq.opts.headers.Authorization === `Bearer ${lastReq.opts.headers.apikey}`)
      fail("setPassword sent the anon key instead of the user's token");
  } catch (e) { fail(`setPassword threw: ${e.key || e.message}`); }

  console.log("\n── headers ──");
  next = res(200, SESSION_OK);
  await call.signIn();
  const h = lastReq.opts.headers;
  if (!h.apikey) fail("no apikey header");
  else if (!h.Authorization?.startsWith("Bearer ")) fail("no Authorization header");
  else console.log("✓ unauthenticated calls send both apikey and Authorization");

  sync.signOut();
  let signedOutKey = "(no throw)";
  try { await call.setPw(); } catch (e) { signedOutKey = e.key; }
  if (signedOutKey !== "syncFail") fail(`setPassword while signed out → ${signedOutKey}, want syncFail`);
  else console.log("✓ setPassword while signed out fails as a sync error, not a network one");

  for (const k of ["syncRate", "syncMail", "syncNet", "pwBad", "pwShort", "pwExists", "pwUnconfirmed", "pwChanged", "wayPw", "wayCode"]) {
    if (!I18N[k]?.ar || !I18N[k]?.en) fail(`i18n missing ${k}`);
  }

  console.log(bad ? `\n${bad} FAILED` : "\nall good");
  process.exit(bad ? 1 : 0);
})();
