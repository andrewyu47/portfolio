/**
 * Looks up a case study's figure by name. Figures live in src/components/figures/,
 * one component per file, and a case study names one in frontmatter (heroFigure: "EvalChart").
 * The glob is eager and re-evaluated by the dev server when a figure file appears,
 * so a figure added later shows up without touching the pages that use it.
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
