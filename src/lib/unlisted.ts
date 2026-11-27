/**
 * Unlisted pages.
 *
 * An unlisted page is reachable only by a link Andrew gives out. It is not in the
 * navigation or the sitemap, and it is marked noindex. Its content is not in this
 * repository. At build time it comes from one of two places:
 *
 *   1. the environment variable UNLISTED_PAGES_B64 (base64 of a JSON array),
 *      set in the host's project settings
 *   2. the file private/unlisted.json, which git ignores
 *
 * With neither, no unlisted page is built and the rest of the site is unaffected.
 * The page template is src/pages/for/[slug].astro.
 */
import fs from 'node:fs';
import path from 'node:path';

export type Evidence = { label: string; href: string; requires?: string };
export type Level = 'shown' | 'partly' | 'not-yet';

export type Row = {
  /** The line being answered, quoted as written. */
  ask: string;
  level: Level;
  answer: string;
  /** For a "partly" row: the part that is not there, in one clause. */
  missing?: string;
  /** A plain note printed under the answer, such as why there is no link. */
  note?: string;
  /** Short separate proofs, each with its own link, when one answer would run long. */
  points?: { text: string; link?: Evidence }[];
  evidence: Evidence[];
};

export type LeadItem = { ask: string; proof: string; note?: string; link?: Evidence };

export type UnlistedPage = {
  slug: string;
  company: string;
  role: string;
  intro: string;
  /** The main gap, named once near the top. */
  gap?: string;
  /** The lines to read first. */
  lead?: LeadItem[];
  sections: { title: string; rows: Row[] }[];
};

export function loadUnlisted(): UnlistedPage[] {
  let raw: string | undefined;
  const fromEnv = process.env.UNLISTED_PAGES_B64;
  if (fromEnv) {
    raw = Buffer.from(fromEnv, 'base64').toString('utf8');
  } else {
    const file = path.resolve(process.cwd(), 'private/unlisted.json');
    if (fs.existsSync(file)) raw = fs.readFileSync(file, 'utf8');
  }
  if (!raw) return [];
  const pages: unknown = JSON.parse(raw);
  if (!Array.isArray(pages)) throw new Error('Unlisted pages must be a JSON array.');
  return pages as UnlistedPage[];
}
