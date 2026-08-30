# Deploying خوش كلام

The app is a static site. `dist/app.html` is the entire thing in one file —
no build step, no server, no dependencies.

```bash
node build.js          # regenerates dist/ from the source files in js/ and css/
```

## Fastest: Netlify Drop (60 seconds, no account needed to try)

1. Rename `dist/app.html` to `index.html` and put it in an empty folder.
2. Open <https://app.netlify.com/drop> and drag the folder in.
3. You get a live URL immediately. Claim it to a free account to keep it.

## GitHub Pages (free, but the repository must be public)

Settings → Pages → Source: `main`, folder `/docs`, then:

```bash
mkdir -p docs && cp dist/app.html docs/index.html
git add docs && git commit -m "Publish to Pages" && git push
```

Private repositories need a paid GitHub plan for Pages.

## Vercel / Cloudflare Pages

Point either at this repository with **no build command** and an output
directory containing `index.html`. Both have free tiers that work with
private repositories.

## After deploying — signing in

The app has two doors to the same account, and they need different things
from Supabase.

### The password door (needs no email at all)

This is the default, and the one to use if mail isn't set up. **Create
account**, then sign in with the same email and password on every device.

One dashboard setting decides whether it works out of the box:
**Authentication → Sign In / Providers → Email → Confirm email**.

- **Off** — signing up returns a session immediately. Nothing is emailed,
  nothing can rate-limit, and the account is usable the moment it's made.
  For a single-user personal app this is the right setting.
- **On** (the default) — signing up still tries to email a confirmation, so
  it fails exactly the way the code route does. The app says so rather than
  hanging. Either turn it off, or confirm the row once from the dashboard
  (**Authentication → Users →** the user **→ Confirm email**).

Password changes live in the app: **الكلمات → الحساب → كلمة سر جديدة**.

### The emailed-code door (needs working mail)

The default email template sends a *link* rather than the 6-digit code the
app asks for. Fix it once:

**Dashboard → Authentication → Emails → Magic Link**, and make the body:

```html
<h2>خوش كلام</h2>
<p>رمز الدخول:</p>
<p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
<p>ينتهي خلال ساعة.</p>
```

The app also accepts the emailed link as a fallback, but for that to work
you must add your deployed URL under **Authentication → URL Configuration →
Redirect URLs**. The code is the simpler path.

### Why the code door needs your own SMTP

Supabase's built-in mail service is a *testing* facility, not a mail
provider. It is shared, slow, capped at a couple of messages an hour, and
under load it simply times out — the project's auth log showed exactly that
on the first real sign-in attempt:

```
16:24:09  POST /otp   context deadline exceeded      ← built-in SMTP timed out
16:24:20  POST /otp   context deadline exceeded
16:24:21  POST /otp   429: email rate limit exceeded ← the retries ate the quota
   …      (six more 429s)
```

Nothing was wrong with the app, the key, or the host. The mail never left.

Fix it once, and sign-in stops being fragile:

1. Create a free account at <https://resend.com> and verify a domain (or use
   their sandbox sender while testing).
2. Make an API key.
3. **Supabase → Project Settings → Authentication → SMTP Settings → Enable
   custom SMTP**, then:
   - Host `smtp.resend.com`, port `465`
   - Username `resend`
   - Password: the API key
   - Sender email: an address on the verified domain
   - Sender name: `خوش كلام`
4. **Authentication → Rate Limits** — raise "Emails per hour" (the built-in
   cap is deliberately tiny; with your own SMTP it no longer needs to be).

Until custom SMTP is on, a failed send is worth waiting out rather than
retrying: each retry spends quota without sending anything. The app now says
so — a 429 shows "wait it out, then try once" with the server's own wording,
instead of a generic failure.

## What the app talks to

- Project `khosh-kalam` (`feutbrnpcjsjfllptziq`, ap-south-1)
- Table `public.kk_state` — one JSON document per user, row-level security
  restricts every row to its owner
- The publishable key is embedded in the page on purpose; it grants nothing
  on its own, because RLS is the actual boundary.
