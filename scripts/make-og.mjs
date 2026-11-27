// Renders the social card, public/og.png (1200 x 630).
//
//   node scripts/make-og.mjs
//
// The card is a small HTML page set in the site's own fonts and inks: the thesis
// printed in two plates, then Andrew's name and his two titles. Fonts are read from
// node_modules/@fontsource-variable/ and inlined, so the render needs no server.
// Text comes from src/data/profile.json, so the card cannot drift from the site.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(fs.readFileSync(path.join(root, 'src/data/profile.json'), 'utf8'));

const font = (pkg, file) =>
  `data:font/woff2;base64,${fs.readFileSync(path.join(root, 'node_modules/@fontsource-variable', pkg, 'files', file)).toString('base64')}`;
const png = (file) => `data:image/png;base64,${fs.readFileSync(path.join(root, 'public/img', file)).toString('base64')}`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const thesis = esc(profile.thesis);
const roles = profile.roles.map((r) => `<span>${esc(r.title)}, ${esc(r.org)}</span>`).join('');
const host = new URL(profile.site).host;

// Same values as src/styles/tokens.css (light paper).
const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Anybody'; src: url(${font('anybody', 'anybody-latin-wdth-normal.woff2')}) format('woff2'); font-weight: 100 900; font-stretch: 50% 150%; }
@font-face { font-family: 'Literata'; src: url(${font('literata', 'literata-latin-opsz-normal.woff2')}) format('woff2'); font-weight: 200 900; }
@font-face { font-family: 'Spline Sans Mono'; src: url(${font('spline-sans-mono', 'spline-sans-mono-latin-wght-normal.woff2')}) format('woff2'); font-weight: 300 700; }
:root { --stock:#edefea; --ink:#0b5f69; --pink:#ff4fa3; --text:#0b1d43; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; }
body {
  background: var(--stock); color: var(--text); position: relative; overflow: hidden;
  padding: 56px 72px 0; font-family: 'Literata', Georgia, serif;
}
body::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: url(${png('paper-grain.png')}) 0 0 / 256px 256px; opacity: .34; mix-blend-mode: multiply;
}
.head {
  border-top: 4px solid var(--ink); border-bottom: 1.5px solid var(--ink);
  padding: 12px 0; display: flex; justify-content: space-between;
  font: 500 17px/1.4 'Spline Sans Mono', monospace; letter-spacing: .05em; text-transform: uppercase; color: var(--ink);
}
h1 {
  position: relative; isolation: isolate; margin-top: 44px;
  font: 800 118px/0.92 'Anybody', sans-serif; font-stretch: 72%; letter-spacing: .004em; color: var(--ink);
  max-width: 1056px;
}
h1 .ink { position: relative; z-index: 1; mix-blend-mode: multiply; }
h1 .pink { position: absolute; inset: 0; z-index: 0; color: var(--pink); translate: 3px 2.5px; }
.who {
  position: absolute; left: 72px; right: 72px; bottom: 56px;
  display: flex; align-items: center; gap: 26px; padding-top: 22px; border-top: 1.5px solid var(--ink);
}
.disc {
  width: 64px; height: 64px; border-radius: 50%; background: var(--pink); mix-blend-mode: multiply; flex: none;
  -webkit-mask-image: url(${png('ink-mask.png')}); -webkit-mask-size: 512px 512px;
}
.name { font: 800 44px/1 'Anybody', sans-serif; font-stretch: 92%; }
.roles { display: flex; gap: 28px; margin-top: 8px; font-size: 22px; line-height: 1.3; }
.roles span + span { padding-left: 28px; border-left: 1px dashed var(--ink); }
</style></head>
<body>
  <div class="head"><span>${host}</span><span>${esc(profile.location)}</span></div>
  <h1><span class="pink" aria-hidden="true">${thesis}</span><span class="ink">${thesis}</span></h1>
  <div class="who">
    <span class="disc"></span>
    <div><p class="name">${esc(profile.name)}</p><p class="roles">${roles}</p></div>
  </div>
</body></html>`;

const out = path.join(root, 'public/og.png');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, type: 'png' });
  console.log(`wrote ${path.relative(root, out)}`);
} finally {
  await browser.close();
}
