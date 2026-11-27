/**
 * How case studies are ordered, shared by the work index and the case study pages.
 *
 * - The index groups by area (Teach, Measure, Build), featured first, then by `order`.
 * - A case study's previous and next links follow `order` across the whole collection.
 * Drafts never appear in either.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Work = CollectionEntry<'work'>;
export type Area = Work['data']['area'];

export const AREAS: { id: Area; name: string }[] = [
  { id: 'teach', name: 'Teach' },
  { id: 'measure', name: 'Measure' },
  { id: 'build', name: 'Build' },
];

const areaRank = (a: Area) => AREAS.findIndex((x) => x.id === a);

/** Every published case study, in `order`. Ties fall back to area, then newest first, then title. */
export async function publishedWork(): Promise<Work[]> {
  const all = await getCollection('work', ({ data }) => !data.draft);
  return all.sort(
    (a, b) =>
      a.data.order - b.data.order ||
      areaRank(a.data.area) - areaRank(b.data.area) ||
      b.data.year - a.data.year ||
      a.data.title.localeCompare(b.data.title),
  );
}

/** The index groups, in area order, featured first within each. Empty areas are left out. */
export function groupByArea(entries: Work[]) {
  return AREAS.map((area) => ({
    ...area,
    entries: entries
      .filter((e) => e.data.area === area.id)
      .sort((a, b) => Number(b.data.featured) - Number(a.data.featured) || a.data.order - b.data.order),
  })).filter((g) => g.entries.length > 0);
}

export const areaName = (a: Area) => AREAS.find((x) => x.id === a)?.name ?? a;
