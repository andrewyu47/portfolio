#!/usr/bin/env node
// Checks every built page against the site's writing rules and for leftover scaffolding.
//
//   npm run build && node scripts/check-copy.mjs
//
// Reads the built HTML in dist/, looks only at text a visitor can read (and at alt text,
// titles, and descriptions), and fails if it finds:
//   - an em dash or en dash
//   - a banned word
//   - placeholder text (TODO, TBD, lorem ipsum, "[N]", "coming soon")
//   - a link that goes nowhere (href="#" or an empty href)
//
// Exit code 1 when anything is found, with the page and the offending passage.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// With an on-demand route in the site, Astro puts the static pages in dist/client.
const dist = fs.existsSync(path.join(root, 'dist/client')) ? path.join(root, 'dist/client') : path.join(root, 'dist');

const BANNED = [
  'leverage', 'leveraging', 'leveraged', 'seamless', 'seamlessly', 'unlock', 'unlocks', 'unlocking', 'elevate',
  'elevates', 'elevating', 'delve', 'delves', 'delving', 'empower', 'empowers', 'empowering', 'cutting-edge',
  'passionate', 'journey', 'supercharge', 'supercharged', 'robust', 'holistic', 'synergy', 'game-changing',
  'transformative', 'deep dive',
];
const PLACEHOLDERS = [/\bTODO\b/, /\bTBD\b/, /lorem ipsum/i, /\[N\]/, /coming soon/i, /placeholder/i];

function pages(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...pages(p));
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const decode = (s) =>
  s
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#8212;|&#x2014;/gi, '—')
    .replace(/&#8211;|&#x2013;/gi, '–')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

/** The text a visitor reads, plus alt text and the head's title and descriptions. */
function readable(html) {
  const attrs = [];
  for (const m of html.matchAll(/\b(?:alt|aria-label|title|content)="([^"]*)"/g)) attrs.push(m[1]);
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '';
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ') // code samples and raw API payloads are quoted, not written
    .replace(/<(p|blockquote|q|span)\b[^>]*\sdata-quoted[^>]*>[\s\S]*?<\/\1>/gi, ' ') // someone else's words, quoted as written
    .replace(/<code[\s\S]*?<\/code>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decode([title, ...attrs, body].join('\n')).replace(/[ \t]+/g, ' ');
}

const around = (text, index, len) =>
  text
    .slice(Math.max(0, index - 50), index + len + 50)
    .replace(/\s+/g, ' ')
    .trim();

if (!fs.existsSync(dist)) {
  console.error('No dist/ folder. Run "npm run build" first.');
  process.exit(2);
}

const problems = [];
const files = pages(dist);

for (const file of files) {
  const rel = '/' + path.relative(dist, file).replace(/index\.html$/, '').replace(/\.html$/, '');
  const html = fs.readFileSync(file, 'utf8');
  const text = readable(html);

  for (const m of text.matchAll(/[—–]/g)) {
    problems.push({ page: rel, rule: m[0] === '—' ? 'em dash' : 'en dash', where: around(text, m.index, 1) });
  }
  for (const word of BANNED) {
    const re = new RegExp(`(?<![a-z-])${word.replace(/[-]/g, '[- ]')}(?![a-z-])`, 'gi');
    for (const m of text.matchAll(re)) problems.push({ page: rel, rule: `banned word "${word}"`, where: around(text, m.index, m[0].length) });
  }
  for (const re of PLACEHOLDERS) {
    const m = re.exec(text);
    if (m) problems.push({ page: rel, rule: 'placeholder text', where: around(text, m.index, m[0].length) });
  }
  for (const m of html.matchAll(/<a\b[^>]*\bhref="(#?)"[^>]*>([\s\S]*?)<\/a>/g)) {
    problems.push({ page: rel, rule: 'link that goes nowhere', where: m[2].replace(/<[^>]+>/g, '').trim().slice(0, 80) });
  }
}

if (problems.length === 0) {
  console.log(`copy check: ${files.length} pages, no problems`);
  process.exit(0);
}

console.log(`copy check: ${problems.length} problem(s) in ${new Set(problems.map((p) => p.page)).size} page(s)\n`);
for (const p of problems) console.log(`${p.page}\n  ${p.rule}: ...${p.where}...\n`);
process.exit(1);
