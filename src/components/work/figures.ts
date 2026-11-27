/**
 * Looks up a case study's figure by name. Figures live in src/components/figures/,
 * one component per file, and a case study names one in frontmatter (heroFigure: "EvalChart").
 * The glob is eager. A production build always sees every figure. The dev server may
 * need this file saved again (or a restart) before a newly added figure shows up.
 * An unknown or missing name returns undefined, and the page draws no figure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FigureComponent = (props: Record<string, any>) => any;

const modules = import.meta.glob<{ default: FigureComponent }>('/src/components/figures/*.astro', { eager: true });

const byName = new Map(
  Object.entries(modules).map(([path, mod]) => [path.split('/').pop()!.replace(/\.astro$/, ''), mod.default]),
);

export function figureFor(name?: string): FigureComponent | undefined {
  return name ? byName.get(name) : undefined;
}
