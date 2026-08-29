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

## After deploying — one required Supabase step

The sign-in code is emailed by Supabase, and the default email template
sends a *link* rather than the 6-digit code the app asks for. Fix it once:

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

### Email sending limits

Supabase's built-in SMTP is rate-limited (a handful of messages per hour)
and is intended for testing. Since you sign in rarely, this is usually
fine. If you hit the limit, add your own SMTP under **Project Settings →
Authentication → SMTP** (Resend and Postmark both have free tiers).

## What the app talks to

- Project `khosh-kalam` (`feutbrnpcjsjfllptziq`, ap-south-1)
- Table `public.kk_state` — one JSON document per user, row-level security
  restricts every row to its owner
- The publishable key is embedded in the page on purpose; it grants nothing
  on its own, because RLS is the actual boundary.
