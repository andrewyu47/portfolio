// Every page, on a desktop and on a phone:
//   - loads without console errors or failed requests
//   - has a title, a description, and exactly one h1
//   - does not scroll sideways
//   - has no serious accessibility violations (axe), on light and on dark paper
//   - stays complete and still with reduced motion
//
// The list of pages comes from the content folders, so a new case study or lesson
// is covered without touching this file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slugs = (dir) =>
  fs.existsSync(path.join(root, dir))
    ? fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''))
    : [];
const isDraft = (dir, slug) => /^draft:\s*true\s*$/m.test(fs.readFileSync(path.join(root, dir, `${slug}.mdx`), 'utf8'));
const exists = (rel) => fs.existsSync(path.join(root, rel));

// Unlisted pages are built from private data (see src/lib/unlisted.ts). When that data
// is on this machine, the pages it makes get the same checks as every other page.
const unlisted = exists('private/unlisted.json')
  ? JSON.parse(fs.readFileSync(path.join(root, 'private/unlisted.json'), 'utf8')).map((p) => `/for/${p.slug}`)
  : [];

const pages = [
  '/',
  '/work',
  ...slugs('src/content/work').filter((s) => !isDraft('src/content/work', s)).map((s) => `/work/${s}`),
  '/teaching',
  ...slugs('src/content/lessons').filter((s) => !isDraft('src/content/lessons', s)).map((s) => `/teaching/${s}`),
  '/writing',
  ...slugs('src/content/writing')
    .filter((s) => !isDraft('src/content/writing', s))
    .map((s) => `/writing/${s}`),
  '/path',
  '/resume',
  '/colophon',
  ...unlisted,
];

for (const url of pages) {
  test.describe(url, () => {
    test('loads clean and is well formed', async ({ page }) => {
      const errors = [];
      const failed = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e.message)));
      // A browser cancels the range request for audio or video it decides not to buffer yet.
      // That shows up as a failed request and is not an error.
      page.on('requestfailed', (r) => !/\.(mp3|mp4|webm|m4a)(\?|$)/.test(r.url()) && failed.push(r.url()));

      const res = await page.goto(url, { waitUntil: 'load' });
      expect(res?.status(), 'HTTP status').toBe(200);
      await page.waitForTimeout(1600); // let the plates settle

      expect(errors, 'console errors').toEqual([]);
      expect(failed, 'failed requests').toEqual([]);
      await expect(page).toHaveTitle(/.+/);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0, 'meta description length').toBeGreaterThan(40);
      await expect(page.locator('h1'), 'exactly one h1').toHaveCount(1);

      // Compare against the device width: on a phone the layout viewport grows with
      // overflowing content, so window.innerWidth would hide the problem.
      const deviceWidth = page.viewportSize()?.width ?? 0;
      const sideways = await page.evaluate((w) => document.documentElement.scrollWidth > w + 1, deviceWidth);
      expect(sideways, 'page scrolls sideways').toBe(false);
    });

    for (const scheme of ['light', 'dark']) {
      test(`no serious accessibility violations on ${scheme} paper`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const serious = results.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target?.join(' ')})`);
        expect(serious).toEqual([]);
      });
    }

    test('is complete and still with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(url, { waitUntil: 'load' });
      // The page must never sit out of register for someone who asked for no motion.
      await expect(page.locator('html')).not.toHaveClass(/misreg/);
      const moving = await page.evaluate(() =>
        document.getAnimations().filter((a) => a.playState === 'running' && (a.effect?.getTiming().duration ?? 0) > 50).length,
      );
      expect(moving, 'animations still running').toBe(0);
    });

    test('figures print when they are scrolled to', async ({ page }) => {
      await page.goto(url, { waitUntil: 'load' });
      const figures = await page.locator('[data-print]').count();
      test.skip(figures === 0, 'no print-on-arrival figures on this page');
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 400) {
        await page.evaluate((to) => window.scrollTo(0, to), y);
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(400);
      // A figure that is never told to print stays invisible, so this must be zero.
      const waiting = await page.locator('[data-print]:not([data-printed])').count();
      expect(waiting, 'figures still waiting to print').toBe(0);
    });
  });
}

test('unlisted pages stay unlisted', async ({ page, request }) => {
  test.skip(unlisted.length === 0, 'no unlisted page in this build');
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  for (const url of unlisted) {
    await page.goto(url);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect(sitemap.includes(url), `${url} is in the sitemap`).toBe(false);
    for (const from of ['/', '/work', '/teaching', '/path', '/resume', '/colophon']) {
      const html = await (await request.get(from)).text();
      expect(html.includes(`href="${url}"`), `${from} links to ${url}`).toBe(false);
    }
  }
});
