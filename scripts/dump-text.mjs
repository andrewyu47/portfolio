#!/usr/bin/env node
// Writes every built page as plain text, one file per page, for review.
//
//   npm run build && node scripts/dump-text.mjs [outDir]
//
// A reviewer checking facts or wording should read what a visitor reads, not the
// source spread across components and data files. Each file starts with the page's
// URL, title, and description, then the visible text in reading order with headings
// marked. Default output: .shots/text/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = fs.existsSync(path.join(root, 'dist/client')) ? path.join(root, 'dist/client') : path.join(root, 'dist');
const outDir = path.resolve(process.argv[2] ?? path.join(root, '.shots/text'));

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
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

function toText(html) {
  const main = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? html;
  let t = main
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<template[\s\S]*?<\/template>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<[^>]*aria-hidden="true"[^>]*>[^<]*<\/[a-z0-9]+>/gi, '');
  t = t.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, inner) => `\n\n${'#'.repeat(Number(n))} ${inner.replace(/<[^>]+>/g, ' ')}\n\n`);
  t = t.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => `${inner.replace(/<[^>]+>/g, ' ')} [link: ${href}]`);
  t = t.replace(/<(?:img)\b[^>]*alt="([^"]*)"[^>]*>/gi, (_, alt) => (alt ? ` [image: ${alt}] ` : ' '));
  t = t.replace(/<li[^>]*>/gi, '\n- ').replace(/<\/(p|div|section|article|li|tr|ul|ol|table|figure|figcaption|dl|dt|dd|header|footer|blockquote|pre)>/gi, '\n');
  t = t.replace(/<(br|hr)[^>]*>/gi, '\n').replace(/<\/t[dh]>/gi, ' | ').replace(/<[^>]+>/g, ' ');
  return decode(t)
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

let count = 0;
for (const file of pages(dist)) {
  const url = '/' + path.relative(dist, file).replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
  const html = fs.readFileSync(file, 'utf8');
  const title = decode(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '');
  const description = decode(/<meta name="description" content="([^"]*)"/i.exec(html)?.[1] ?? '');
  const name = (url === '/' ? 'home' : url.slice(1).replace(/\//g, '__')) + '.txt';
  fs.writeFileSync(path.join(outDir, name), `URL: ${url}\nTITLE: ${title}\nDESCRIPTION: ${description}\n\n${toText(html)}\n`);
  count++;
}
console.log(`${count} pages written to ${path.relative(root, outDir)}`);
