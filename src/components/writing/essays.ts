/**
 * Essays, shared by the writing index and the essay pages.
 * Drafts never appear. Newest first, then by title.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Essay = CollectionEntry<'writing'>;

export async function publishedEssays(): Promise<Essay[]> {
  const all = await getCollection('writing', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.year - a.data.year || a.data.title.localeCompare(b.data.title));
}

/** Where a piece was published, as a reader would say it. */
export const venue = (e: Essay) => e.data.publication ?? 'This site';
