#!/usr/bin/env node
// Checks every link and asset reference in the built site.
//
//   npm run build && node scripts/check-links.mjs [--external]
//
// Internal links must point at a page, asset, or redirect that exists in the build.
// In-page anchors must point at an id on the target page.
// With --external, every outbound link is requested too (LinkedIn answers robots with
// a block page, so it is reported as "unchecked", not as broken).
//
// Exit code 1 when anything internal is broken, or when an external link fails.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// With an on-demand route in the site, Astro puts the static pages in dist/client.
const dist = fs.existsSync(path.join(root, 'dist/client')) ? path.join(root, 'dist/client') : path.join(root, 'dist');
const checkExternal = process.argv.includes('--external');
const SITE = 'https://andrewyu.app';
const UNCHECKABLE = [/linkedin\.com/];

if (!fs.existsSync(dist)) {
  console.error('No dist/ folder. Run "npm run build" first.');
  process.exit(2);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(dist);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

// Routes that exist without a file in dist: redirects and on-demand endpoints.
const routes = new Set(['/mcp']);
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, '.vercel/output/config.json'), 'utf8'));
  for (const r of cfg.routes ?? []) {
    if (typeof r.src === 'string' && (r.status === 301 || r.status === 308 || r.headers?.Location)) {
      const literal = r.src.replace(/^\^/, '').replace(/\$$/, '').replace(/\(\?:\\\/\)\?$/, '').replace(/\\\//g, '/').replace(/\/\?$/, '');
      if (!/[()[\]*+?|\\]/.test(literal)) routes.add(literal || '/');
    }
  }
} catch {
  /* no adapter output: only files are checked */
}

/** Find the built file a site path resolves to. */
function resolve(sitePath) {
  const clean = decodeURIComponent(sitePath.split('?')[0]).replace(/\/$/, '') || '/';
  if (routes.has(clean)) return 'route';
  const candidates = [
    path.join(dist, clean),
    path.join(dist, clean, 'index.html'),
    path.join(dist, clean + '.html'),
  ];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

const idsCache = new Map();
function idsOf(file) {
  if (!idsCache.has(file)) {
    const html = fs.readFileSync(file, 'utf8');
    idsCache.set(file, new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsCache.get(file);
}

const broken = [];
const external = new Map();

for (const file of htmlFiles) {
  const page = '/' + path.relative(dist, file).replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
  const html = fs.readFileSync(file, 'utf8');
  const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));

  for (const ref of new Set(refs)) {
    if (/^(mailto:|tel:|data:|javascript:)/.test(ref)) continue;
    let target = ref;
    if (target.startsWith(SITE)) target = target.slice(SITE.length) || '/';
    if (/^https?:\/\//.test(target)) {
      if (!external.has(target)) external.set(target, new Set());
      external.get(target).add(page || '/');
      continue;
    }
    const [rawPath, hash] = target.split('#');
    const sitePath = rawPath === '' ? page || '/' : rawPath.startsWith('/') ? rawPath : path.posix.join(page || '/', '..', rawPath);
    const found = resolve(sitePath);
    if (!found) {
      broken.push({ page: page || '/', ref, why: 'no such page or file' });
      continue;
    }
    if (hash && found !== 'route' && found.endsWith('.html') && !idsOf(found).has(decodeURIComponent(hash))) {
      broken.push({ page: page || '/', ref, why: `no element with id "${hash}" on the target page` });
    }
  }
}

let failedExternal = 0;
if (checkExternal) {
  const urls = [...external.keys()];
  const results = await Promise.all(
    urls.map(async (url) => {
      if (UNCHECKABLE.some((re) => re.test(url))) return { url, status: 'unchecked' };
      try {
        const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'link-check' } });
        return { url, status: res.status };
      } catch (err) {
        return { url, status: `failed (${err.name})` };
      }
    }),
  );
  for (const r of results) {
    const ok = r.status === 200 || r.status === 'unchecked';
    if (!ok) failedExternal++;
    console.log(`${ok ? 'ok  ' : 'BAD '} ${r.status}  ${r.url}${ok ? '' : '   linked from ' + [...external.get(r.url)].join(', ')}`);
  }
  console.log('');
}

console.log(`link check: ${htmlFiles.length} pages, ${external.size} external links${checkExternal ? '' : ' (not requested, pass --external)'}`);
if (broken.length) {
  console.log(`\n${broken.length} broken internal reference(s):`);
  for (const b of broken) console.log(`  ${b.page}  ->  ${b.ref}   (${b.why})`);
}
process.exit(broken.length || failedExternal ? 1 : 0);
