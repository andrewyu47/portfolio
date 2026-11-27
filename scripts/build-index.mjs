#!/usr/bin/env node
// Builds one machine-readable index of the whole portfolio from the same files the pages render from.
//
//   node scripts/build-index.mjs
//
// Reads   src/content/{work,lessons,writing}/*.mdx  and  src/data/{profile,timeline}.json
// Writes  src/data/generated/portfolio-index.json   (imported by the MCP endpoint)
//         public/llms.txt                           (short map of the site for language models)
//         public/llms-full.txt                      (every page as plain text)
//
// Runs before `astro build` and `astro dev` (see package.json), so the MCP server,
// llms.txt, and the pages can never disagree about a fact.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://andrewyu.app';

const readJson = (rel, fallback) => {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

/** Split an MDX file into frontmatter data and body. */
function splitFrontmatter(source, file) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!m) throw new Error(`${file}: missing frontmatter`);
  return { data: parseYaml(m[1]) ?? {}, body: source.slice(m[0].length) };
}

/** Turn MDX into plain readable text: keep prose, headings, and list items; drop imports, JSX, and markup. */
export function mdxToText(body) {
  let out = body;
  // Fenced code blocks: keep the code, drop the fences.
  out = out.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code) => code.trimEnd() + '\n');
  out = out
    .split('\n')
    .filter((line) => !/^\s*(import|export)\s/.test(line))
    .join('\n');
  // JSX comments and self-closing components.
  out = out.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  out = out.replace(/<[A-Z][\w.]*\b[^>]*\/>/g, '');
  // Paired components and HTML tags: keep the children.
  out = out.replace(/<\/?[A-Za-z][\w.:-]*\b[^>]*>/g, '');
  // Markdown images, then links (keep the label).
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // Emphasis and inline code markers.
  out = out
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/\*(?=\S)(.*?)(?<=\S)\*/g, '$1')
    // An underscore is emphasis only at the edges of a word. Inside one it is part of a
    // name, such as search_portfolio or stop_reason, and has to survive.
    .replace(/(?<![A-Za-z0-9_])_(?=\S)(.*?)(?<=\S)_(?![A-Za-z0-9_])/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
  // Headings keep their text on their own line.
  out = out.replace(/^#{1,6}\s+/gm, '');
  // Leftover JSX expressions.
  out = out.replace(/\{[^{}\n]*\}/g, '');
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function readCollection(name, urlFor) {
  const dir = path.join(root, 'src/content', name);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, '');
      const { data, body } = splitFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'), `${name}/${f}`);
      return { slug, url: SITE + urlFor(slug, data), ...data, text: mdxToText(body) };
    })
    .filter((entry) => !entry.draft)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || String(a.title).localeCompare(String(b.title)));
}

const profile = readJson('src/data/profile.json', {});
const timeline = readJson('src/data/timeline.json', []);
const work = readCollection('work', (slug) => `/work/${slug}`);
const lessons = readCollection('lessons', (slug) => `/teaching/${slug}`);
const writing = readCollection('writing', (slug, d) => d.externalUrl ? '' : `/writing/${slug}`).map((w) => ({
  ...w,
  url: w.externalUrl || `${SITE}/writing/${w.slug}`,
}));

const index = { site: SITE, profile, work, lessons, writing, timeline };

const outDir = path.join(root, 'src/data/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'portfolio-index.json'), JSON.stringify(index, null, 2) + '\n');

// ---- llms.txt ---------------------------------------------------------------

const line = (title, url, note) => `- [${title}](${url})${note ? `: ${note}` : ''}`;
const llms = [
  `# ${profile.name ?? 'Andrew Yu'}`,
  '',
  `> ${profile.oneLine ?? ''}`.trimEnd(),
  '',
  profile.about ?? '',
  '',
  '## Work',
  ...work.map((w) => line(w.title, w.url, w.outcome)),
  '',
  '## Lessons',
  ...lessons.map((l) => line(l.title, l.url, l.idea)),
  '',
  '## Writing',
  ...writing.map((w) => line(w.title, w.url, w.summary)),
  '',
  '## More',
  line('Path', `${SITE}/path`, 'education, roles, and what was shipped when'),
  line('Teaching', `${SITE}/teaching`, 'Claude Dojo, live training, and the lessons above'),
  line('Resume', `${SITE}/resume`),
  line('MCP server', `${SITE}/mcp`, 'this portfolio as read-only tools for any MCP client'),
  line('Full text', `${SITE}/llms-full.txt`, 'every page as plain text'),
  '',
].join('\n');

const section = (heading, entries, render) =>
  entries.length ? [`# ${heading}`, '', ...entries.flatMap(render)] : [];

const full = [
  `# ${profile.name ?? 'Andrew Yu'}`,
  '',
  profile.oneLine ?? '',
  '',
  profile.about ?? '',
  '',
  ...section('Work', work, (w) => [
    `## ${w.title}`,
    `URL: ${w.url}`,
    `Where: ${w.org}. Role: ${w.role}. When: ${w.period}.`,
    `Outcome: ${w.outcome}`,
    ...(w.metrics?.length ? [`Numbers: ${w.metrics.map((m) => `${m.value} ${m.label}`).join('; ')}`] : []),
    '',
    w.text,
    '',
  ]),
  ...section('Lessons', lessons, (l) => [`## ${l.title}`, `URL: ${l.url}`, `Idea: ${l.idea}`, '', l.text, '']),
  ...section('Writing', writing, (w) => [`## ${w.title}`, `URL: ${w.url}`, w.summary, '', w.text, '']),
  ...section('Timeline', timeline, (t) => [`- ${t.when}: ${t.title}${t.detail ? `. ${t.detail}` : ''}`]),
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'public/llms.txt'), llms.replace(/\n{3,}/g, '\n\n'));
fs.writeFileSync(path.join(root, 'public/llms-full.txt'), full.replace(/\n{3,}/g, '\n\n'));

console.log(
  `portfolio index: ${work.length} work, ${lessons.length} lessons, ${writing.length} writing, ${timeline.length} timeline entries`,
);
