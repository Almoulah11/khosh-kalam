#!/usr/bin/env node
/*
 * Builds two single-file outputs from the source in js/ and css/:
 *
 *   dist/app.html        a complete standalone page for any static host
 *                        (Netlify, Vercel, Pages) — this is the real webapp
 *   dist/khosh-kalam.html  body-only, for hosts that supply their own
 *                        <html>/<head> wrapper (Claude Artifacts)
 *
 * Both strip the service-worker registration: sw.js only exists beside the
 * multi-file version, and registering it from a single-file deploy 404s.
 *
 *   node build.js
 *
 * The multi-file version in the repo root is the source of truth. Always edit
 * there and rebuild; never hand-edit dist/.
 */
const fs = require("fs");
const path = require("path");

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const html = read("index.html");
const css = read("css/styles.css");

// Script order comes from index.html itself, so the two can never drift.
const SCRIPTS = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);

const bodyInner = html
  .slice(html.indexOf("<body>") + 6, html.indexOf("</body>"))
  .replace(/\n?\s*<script src="[^"]*"><\/script>/g, "")
  .trim();

const SW_CALL = /\n\s*if \("serviceWorker".*?\.catch\(\(\) => \{\}\);\n/s;
const scripts = SCRIPTS.map((f) => {
  const src = read(f);
  return `<script>\n${f.endsWith("app.js") ? src.replace(SW_CALL, "\n") : src}</script>`;
}).join("\n");

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet" />`;

const MANIFEST = {
  name: "خوش كلام — تدريب اللهجة الكويتية",
  short_name: "خوش كلام",
  lang: "ar", dir: "rtl", display: "standalone",
  background_color: "#0d1117", theme_color: "#0d1117",
};

// The icon and manifest are built at runtime as blobs, because a single-file
// deploy has no sibling files to point at.
const RUNTIME_ASSETS = `<script>
  (() => {
    const icon = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#0d1117"/><rect x="72" y="128" width="368" height="72" rx="24" fill="#2fbf71"/><rect x="72" y="228" width="368" height="72" rx="24" fill="#e9edf3"/><rect x="72" y="328" width="240" height="72" rx="24" fill="#e5545e"/><circle cx="392" cy="364" r="36" fill="#e3b45c"/></svg>')));
    const m = ${JSON.stringify(MANIFEST)};
    m.icons = [{ src: icon, sizes: '512x512', type: 'image/svg+xml', purpose: 'any' }];
    m.start_url = location.pathname;
    const link = document.getElementById('manifestLink');
    if (link) link.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
    const f = document.createElement('link');
    f.rel = 'icon'; f.type = 'image/svg+xml'; f.href = icon;
    document.head.appendChild(f);
  })();
</script>`;

fs.mkdirSync(path.join(root, "dist"), { recursive: true });

// ── the real webapp ──
const standalone = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>خوش كلام — تدريب اللهجة الكويتية</title>
<meta name="description" content="مدرّب اللهجة الكويتية — تكرار متباعد، تمارين نطق، وبراغماتية" />
<meta name="theme-color" content="#0d1117" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="خوش كلام" />
<link rel="manifest" id="manifestLink" />
${FONTS}
<style>
${css}</style>
</head>
<body>
${bodyInner}
${scripts}
${RUNTIME_ASSETS}
</body>
</html>
`;
fs.writeFileSync(path.join(root, "dist/app.html"), standalone);

// ── body-only, for a host that wraps it ──
const wrapped = `<title>خوش كلام</title>
${FONTS}
<style>
${css}</style>
<script>
  document.documentElement.setAttribute("dir", "rtl");
  document.documentElement.setAttribute("lang", "ar");
</script>
${bodyInner}
${scripts}
`;
fs.writeFileSync(path.join(root, "dist/khosh-kalam.html"), wrapped);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0);
console.log(`dist/app.html          ${kb(standalone)} KB  (standalone webapp)`);
console.log(`dist/khosh-kalam.html  ${kb(wrapped)} KB  (body only)`);
console.log(`${SCRIPTS.length} scripts inlined, service worker stripped from both`);
