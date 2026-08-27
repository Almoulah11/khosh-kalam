#!/usr/bin/env node
/*
 * Bundles the app into one self-contained HTML file at dist/khosh-kalam.html.
 * Used for hosts that take a single file (Claude Artifacts) and for keeping
 * an offline copy you can email yourself or open straight off disk.
 *
 *   node build.js
 *
 * The multi-file version in the repo root stays the source of truth — always
 * edit there and rebuild, never edit dist/ by hand.
 */
const fs = require("fs");
const path = require("path");

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const SCRIPTS = [
  "js/fsrs.js",
  "js/seed-manual.js",
  "js/seed-packs.js",
  "js/seed-verify.js",
  "js/seed-responses.js",
  "js/app.js",
];

// The artifact host supplies <!doctype>/<html>/<head>/<body>, so emit page
// content only — and set the Arabic RTL root attributes from script.
const html = read("index.html");
const bodyInner = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>"))
  .replace(/\n?\s*<script src="[^"]*"><\/script>/g, "")
  .trim();

const css = read("css/styles.css");
const js = SCRIPTS.map((f) => {
  const src = read(f);
  // the service worker has no path in a single-file build
  return f.endsWith("app.js")
    ? src.replace(/\n\s*if \("serviceWorker".*?\.catch\(\(\) => \{\}\);\n/s, "\n")
    : src;
});

const out = `<title>خوش كلام</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet" />
<style>
${css}</style>
<script>
  document.documentElement.setAttribute("dir", "rtl");
  document.documentElement.setAttribute("lang", "ar");
</script>
${bodyInner}
${js.map((s) => `<script>\n${s}</script>`).join("\n")}
`;

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/khosh-kalam.html"), out);
console.log(
  `dist/khosh-kalam.html — ${(Buffer.byteLength(out) / 1024).toFixed(0)} KB, ${SCRIPTS.length} scripts inlined`
);
