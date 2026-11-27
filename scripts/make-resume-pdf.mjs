// Prints the web resume to a one-page PDF.
//
//   node scripts/make-resume-pdf.mjs [url]
//
// Needs the site running (default http://localhost:4321). Uses the page's own print
// stylesheet, so what prints is what /resume looks like on paper: black on white, letter size.
// Writes public/resume/andrew-yu-resume.pdf and fails loudly if the result is not one page.

import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2] ?? 'http://localhost:4321/resume';
const out = resolve(root, 'public/resume/andrew-yu-resume.pdf');

await mkdir(dirname(out), { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  // Print from the light paper, whatever the machine prefers.
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  const res = await page.goto(url, { waitUntil: 'networkidle' });
  if (!res || !res.ok()) throw new Error(`Could not load ${url} (status ${res?.status()})`);
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print', colorScheme: 'light', reducedMotion: 'reduce' });

  await page.pdf({
    path: out,
    format: 'Letter',
    printBackground: false,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });
} finally {
  await browser.close();
}

// Count pages: one /Type /Page object per page in an uncompressed page tree.
const pdf = await readFile(out, 'latin1');
const pages = (pdf.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
console.log(`Wrote ${out} (${pages} page${pages === 1 ? '' : 's'})`);
if (pages !== 1) {
  console.error('The resume should print on one page. Tighten the print styles in src/pages/resume.astro.');
  process.exitCode = 1;
}
