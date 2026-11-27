import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({ label: z.string(), href: z.string() });

/**
 * Case studies. One MDX file per piece of work in src/content/work/.
 * The file name is the URL slug: src/content/work/claude-dojo.mdx -> /work/claude-dojo
 */
const work = defineCollection({
  loader: glob({ base: './src/content/work', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    /** One sentence that states the result before anything else. Shown on cards, in search, and by the MCP server. */
    outcome: z.string(),
    /** One or two sentences of context for the index page. */
    summary: z.string(),
    /** Where the work happened, as it should be credited: "Claude Dojo", "Salesforce", "Splunk", "Personal project". */
    org: z.string(),
    role: z.string(),
    /** Human-readable dates: "2026", "Jul 2026 to present". */
    period: z.string(),
    /** Used only for sorting and the timeline. */
    year: z.number().int(),
    /** Which of the three areas of work this belongs to. */
    area: z.enum(['teach', 'measure', 'build']),
    /** Lower numbers come first on the work index. */
    order: z.number().default(100),
    featured: z.boolean().default(false),
    /** Headline numbers. Every value must be backed by a fact in /facts. */
    metrics: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
    stack: z.array(z.string()).default([]),
    links: z.array(link).default([]),
    /** What someone can do after the lab, talk, or tool that they could not do before. */
    learnerOutcome: z.string().optional(),
    /**
     * The heading set beside learnerOutcome. Defaults to "What a learner can do now". A case
     * study with no record of what learners went on to do states its aim instead, such as
     * "What the two days aimed for", and writes learnerOutcome as a goal.
     */
    learnerHeading: z.string().optional(),
    /**
     * The figure shown beside the title: the name of a component in src/components/figures/
     * without its extension ("EvalChart", "DojoClip"). The case study page looks it up.
     */
    heroFigure: z.string().optional(),
    /** Where a reader can check the work: repositories, live pages, source files. Shown as a Verify row. */
    verify: z.array(link).default([]),
    /** One plain line for the Verify row when part of the work cannot be shown, saying why. */
    verifyNote: z.string().optional(),
    /**
     * Internal work with nothing public to open. The facts strip says so once, under Period
     * ("Internal, no public artifact"), and the page carries no Verify row. Leave verify and
     * verifyNote empty when this is set.
     */
    internal: z.boolean().default(false),
    /** Optional cover image in src/assets/work/, relative path. */
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Lessons: short explainers that teach one idea about AI agents, each built around an interactive figure.
 * src/content/lessons/agent-loop.mdx -> /teaching/agent-loop
 */
const lessons = defineCollection({
  loader: glob({ base: './src/content/lessons', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    /** The single idea, in one sentence. */
    idea: z.string(),
    /** Minutes to read and play. */
    minutes: z.number().int(),
    order: z.number().default(100),
    /** Name of the interactive figure component this lesson is built around. */
    figure: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

/** Essays and long-form writing. src/content/writing/<slug>.mdx -> /work/<slug> is NOT used; these render under /writing. */
const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    period: z.string(),
    year: z.number().int(),
    /** If the piece lives elsewhere, link out instead of rendering a body. */
    externalUrl: z.string().optional(),
    publication: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work, lessons, writing };
