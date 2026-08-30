/*
 * Auth errors have to reach the screen.
 *
 * The original sendCode swallowed the server's message and the UI showed a
 * generic "sync failed", so a user hitting Supabase's email rate limit was
 * told to "try again" — which burned more of the quota. This drives the real
 * sendCode/verifyCode against faked GoTrue responses and asserts the i18n key
 * each one lands on.
 *
 *   node test/auth-error.test.js     (from the repo root)
 */
const fs = require("fs");
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.navigator = { userAgent: "test", onLine: true };
global.window = { addEventListener() {} };
global.document = { addEventListener() {}, hidden: false };

const src = fs.readFileSync("js/sync.js", "utf8");
const I18N = new Function(fs.readFileSync("js/i18n.js", "utf8") + "; return UI;")();
new Function(src + "\n;globalThis.createSync = createSync;")();

const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
let next;
global.fetch = async () => { if (next instanceof Error) throw next; return next; };

const sync = createSync({ getState: () => ({}), setState() {}, onStatus() {} });

(async () => {
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
  ];

  let bad = 0;
  for (const [op, response, want] of cases) {
    next = response;
    let got = "(no throw)", raw = "";
    try {
      if (op === "send") await sync.sendCode("a@b.com"); else await sync.verifyCode("a@b.com", "123456");
    } catch (e) { got = e.key || "(untagged)"; raw = e.serverMsg || ""; }
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${ok ? "✓" : "✗"} ${op.padEnd(6)} ${String(response.status || "network").padEnd(8)} → ${got}${ok ? "" : "  want " + want}`);
    if (ok && I18N[got]) console.log(`      shows: ${I18N[got].en}${raw && got === "syncFail" ? "  +raw: " + raw : ""}`);
  }
  for (const k of ["syncRate", "syncMail", "syncNet"]) {
    if (!I18N[k]?.ar || !I18N[k]?.en) { console.log(`✗ i18n missing ${k}`); bad++; }
  }
  console.log(bad ? `\n${bad} FAILED` : "\nall good");
  process.exit(bad ? 1 : 0);
})();
