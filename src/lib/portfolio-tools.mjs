// The portfolio as tools.
//
// One definition of the three read-only tools, used in two places:
//   - the MCP endpoint at /mcp, so any MCP client can ask this site questions
//   - scripts/record-traces.mjs, which runs a real agent loop against the same
//     tools and records it for the "How an agent actually works" lesson
//
// Plain JavaScript with no dependencies, so both a serverless function and a
// Node script can import it. Tools read from the index built by
// scripts/build-index.mjs (src/data/generated/portfolio-index.json).
//
// The descriptions are written for a model, because a model is who reads them.
// Each says what the tool returns and when to reach for it.

/** Tool definitions in the shape the Claude Messages API expects (`input_schema`). */
export const TOOLS = [
  {
    name: 'search_portfolio',
    description:
      "Search everything on Andrew Yu's portfolio (case studies, lessons, writing, and his career timeline) and return the most relevant passages with the page each came from. Use this first for any question about Andrew's experience, teaching, or projects. Returns up to 5 results, each with a title, a URL, and a short excerpt.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What to look for, in plain words. For example: "live Claude Code teaching" or "eval results".',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_case_study',
    description:
      'Return the full text of one case study, with its outcome, dates, role, and headline numbers. Use this after search_portfolio or list_work when a question needs more detail than an excerpt gives. Takes the slug of the case study, for example "claude-dojo".',
    input_schema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The case study slug, as returned by list_work or found in a result URL after /work/.',
        },
      },
      required: ['slug'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_work',
    description:
      "List every case study on Andrew Yu's portfolio with its slug, title, where the work happened, and a one-sentence outcome. Use this for an overview of his work, or to find the slug to pass to get_case_study.",
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

const STOP = new Set(
  'a an and are as at be been but by can did do does for from had has have he her his how i if in into is it its of on or that the their them then there these they this to was were what when where which who why will with you your about andrew yu andrews'.split(
    ' ',
  ),
);

const words = (s) =>
  String(s ?? '')
    .toLowerCase()
    .split(/[^a-z0-9%]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

/** Break text into passages of roughly paragraph size, for excerpts. */
function passages(text) {
  return String(text ?? '')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 40);
}

const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n)) + ' ...');

/** Everything searchable, flattened to { kind, title, url, lead, text }. */
function documents(index) {
  const docs = [];
  if (index.profile?.about) {
    docs.push({ kind: 'profile', title: `About ${index.profile.name}`, url: index.site, lead: index.profile.oneLine ?? '', text: index.profile.about });
  }
  for (const w of index.work ?? []) {
    const numbers = (w.metrics ?? []).map((m) => `${m.value} ${m.label}`).join('. ');
    docs.push({
      kind: 'case study',
      title: w.title,
      url: w.url,
      lead: `${w.outcome} ${w.summary ?? ''} ${w.org ?? ''} ${w.role ?? ''} ${numbers}`,
      text: w.text,
    });
  }
  for (const l of index.lessons ?? []) {
    docs.push({ kind: 'lesson', title: l.title, url: l.url, lead: l.idea ?? '', text: l.text });
  }
  for (const w of index.writing ?? []) {
    docs.push({ kind: 'writing', title: w.title, url: w.url, lead: w.summary ?? '', text: w.text });
  }
  if (index.timeline?.length) {
    docs.push({
      kind: 'timeline',
      title: 'Career and education timeline',
      url: `${index.site}/path`,
      lead: '',
      text: index.timeline.map((t) => `${t.when}: ${t.title}. ${t.detail ?? ''}`).join('\n\n'),
    });
  }
  return docs;
}

/**
 * Build the three tool functions over an index. Each returns a plain object;
 * callers serialize it (the MCP endpoint and the trace recorder both use JSON).
 */
export function createTools(index) {
  const docs = documents(index);

  return {
    search_portfolio({ query }) {
      const q = [...new Set(words(query))];
      if (q.length === 0) return { query, results: [], note: 'The query had no searchable words. Try naming a topic, project, or skill.' };

      const scored = [];
      for (const doc of docs) {
        const title = words(doc.title);
        const lead = words(doc.lead);
        let best = { score: 0, text: '' };
        const candidates = [doc.lead, ...passages(doc.text)].filter(Boolean);
        for (const p of candidates) {
          const pw = words(p);
          let s = 0;
          for (const term of q) {
            const hits = pw.filter((w) => w === term || (term.length > 4 && w.startsWith(term.slice(0, -1)))).length;
            if (hits) s += 1 + Math.min(hits - 1, 2) * 0.25;
          }
          if (s > best.score) best = { score: s, text: p };
        }
        let score = best.score;
        for (const term of q) {
          if (title.includes(term)) score += 2;
          if (lead.includes(term)) score += 1;
        }
        if (score > 0) scored.push({ score, doc, excerpt: best.text || doc.lead });
      }

      scored.sort((a, b) => b.score - a.score);
      const results = scored.slice(0, 5).map(({ doc, excerpt }) => ({
        title: doc.title,
        kind: doc.kind,
        url: doc.url,
        excerpt: clip(excerpt, 420),
      }));
      return results.length
        ? { query, results }
        : { query, results: [], note: 'Nothing on the portfolio matched. Try list_work for an overview of what is there.' };
    },

    get_case_study({ slug }) {
      const wanted = String(slug ?? '').trim().toLowerCase();
      const w = (index.work ?? []).find((x) => x.slug === wanted);
      if (!w) {
        return {
          error: `No case study has the slug "${slug}".`,
          available: (index.work ?? []).map((x) => x.slug),
        };
      }
      return {
        slug: w.slug,
        title: w.title,
        url: w.url,
        where: w.org,
        role: w.role,
        when: w.period,
        outcome: w.outcome,
        numbers: (w.metrics ?? []).map((m) => `${m.value} ${m.label}`),
        links: w.links ?? [],
        text: w.text,
      };
    },

    list_work() {
      return {
        count: (index.work ?? []).length,
        work: (index.work ?? []).map((w) => ({
          slug: w.slug,
          title: w.title,
          where: w.org,
          when: w.period,
          outcome: w.outcome,
          url: w.url,
        })),
      };
    },
  };
}

/** Run one tool call by name. Unknown names and bad input come back as an error object, never a throw. */
export function runTool(tools, name, input) {
  const fn = tools[name];
  if (!fn) return { error: `Unknown tool "${name}". Available tools: ${TOOLS.map((t) => t.name).join(', ')}.` };
  try {
    return fn(input ?? {});
  } catch (err) {
    return { error: `The tool failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
