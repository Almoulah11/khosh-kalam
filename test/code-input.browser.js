/*
 * The emailed code field, in a real browser.
 *
 * GoTrue's email OTP is 6 digits by default but a project may set any length
 * up to 10. The field used to cap at maxlength=6 and auto-submit the instant
 * it saw 6 characters, so a longer code was silently truncated and then
 * reported as wrong. These cases pin the behaviour that replaced it.
 *
 * Needs playwright-core and the Chromium at /opt/pw-browsers:
 *   SP=<dir with node_modules> APP=$PWD/dist/app.html node test/code-input.browser.js
 */
const { chromium } = require(process.env.SP + "/node_modules/playwright-core");

(async () => {
  const exe = require("fs").readdirSync("/opt/pw-browsers").find((d) => d.startsWith("chromium-"));
  const browser = await chromium.launch({ executablePath: `/opt/pw-browsers/${exe}/chrome-linux/chrome`, args: ["--no-sandbox"] });
  let bad = 0;
  const fail = (m) => { bad++; console.log("✗ " + m); };
  const ok = (m) => console.log("✓ " + m);

  const open = async (width) => {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const posts = [];
    // stand in for GoTrue: record every request, accept only the full code
    await page.route("**/auth/v1/**", async (route) => {
      const req = route.request();
      const body = req.postData() ? JSON.parse(req.postData()) : {};
      posts.push({ url: req.url(), body });
      if (req.url().includes("/otp")) return route.fulfill({ status: 200, body: "{}" });
      if (req.url().includes("/verify")) {
        return body.token === "1234567890"
          ? route.fulfill({ status: 200, contentType: "application/json",
              body: JSON.stringify({ access_token: "at", refresh_token: "rt", user: { id: "u1" } }) })
          : route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ msg: "Token has expired or is invalid" }) });
      }
      return route.fulfill({ status: 200, body: "{}" });
    });
    await page.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.goto("file://" + process.env.APP);
    await page.waitForSelector(".auth-card");
    await page.click('.authways button[data-way="code"]');
    await page.fill("#authEmail", "test@example.com");
    await page.click("#sendCodeBtn");
    await page.waitForSelector("#authCode");
    return { page, posts };
  };

  // ── a 10-digit code survives the field ──
  let { page, posts } = await open(390);
  await page.fill("#authCode", "1234567890");
  const kept = await page.$eval("#authCode", (e) => e.value);
  if (kept !== "1234567890") fail(`10-digit code truncated to "${kept}"`);
  else ok("a 10-digit code is not truncated");

  // it must not have fired at 6 digits
  await page.waitForTimeout(1600);
  const verifies = posts.filter((p) => p.url.includes("/verify"));
  if (verifies.length !== 1) fail(`expected 1 verify, got ${verifies.length}: ${verifies.map((v) => v.body.token).join(", ")}`);
  else if (verifies[0].body.token !== "1234567890") fail(`sent "${verifies[0].body.token}" instead of the full code`);
  else ok("submits once, with all 10 digits");

  await page.waitForSelector(".tabs:not([hidden])", { timeout: 5000 })
    .then(() => ok("a correct code signs in"))
    .catch(() => fail("did not sign in after a correct code"));
  await page.close();

  // ── typing digit by digit must not spend an attempt on the prefix ──
  ({ page, posts } = await open(390));
  for (const d of "1234567890") { await page.type("#authCode", d, { delay: 90 }); }
  await page.waitForTimeout(1600);
  const typed = posts.filter((p) => p.url.includes("/verify"));
  if (typed.length !== 1) fail(`typing fired ${typed.length} verifies: ${typed.map((v) => v.body.token).join(", ")}`);
  else if (typed[0].body.token !== "1234567890") fail(`typing sent a prefix: "${typed[0].body.token}"`);
  else ok("typing 10 digits spends exactly one attempt, on the whole code");
  await page.close();

  // ── junk around a pasted code is cleaned, Enter submits at once ──
  ({ page, posts } = await open(390));
  await page.fill("#authCode", "code: 123 456");
  const cleaned = await page.$eval("#authCode", (e) => e.value);
  if (cleaned !== "123456") fail(`paste not cleaned: "${cleaned}"`);
  else ok('a pasted "code: 123 456" becomes 123456');
  await page.press("#authCode", "Enter");
  await page.waitForTimeout(400);
  if (!posts.filter((p) => p.url.includes("/verify")).length) fail("Enter did not submit");
  else ok("Enter submits immediately");
  const msg = await page.$eval(".auth-msg", (e) => e.textContent.trim()).catch(() => "");
  if (!/مو صحيح|wrong or expired/.test(msg)) fail(`a rejected code said: ${JSON.stringify(msg.slice(0, 80))}`);
  else ok("a rejected code says so");

  // ── the field fits at 10 digits on a phone ──
  await page.fill("#authCode", "1234567890");
  const fits = await page.$eval("#authCode", (e) => e.scrollWidth <= e.clientWidth + 1);
  if (!fits) fail("10 digits overflow the input on a 390px screen");
  else ok("10 digits fit the input at 390px");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) fail(`page scrolls horizontally by ${overflow}px`);
  else ok("no horizontal overflow");
  await page.close();

  await browser.close();
  console.log(bad ? `\n${bad} FAILED` : "\nall good");
  process.exit(bad ? 1 : 0);
})();
