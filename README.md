# andrewyu.app

Source for [andrewyu.app](https://andrewyu.app), Andrew Yu's portfolio.

The site is built like a lab manual. The home page opens with a one-question lab, and the featured lesson steps through a real agent run recorded from the Claude API. The site is also an MCP server: add `https://andrewyu.app/mcp` to an MCP client and ask it about the work.

## What is here

| Path | What it is |
| --- | --- |
| `src/pages/` | Pages. `mcp.ts` is the MCP endpoint. |
| `src/content/` | Case studies, lessons, and writing, as MDX. |
| `src/components/explainer/` | The agent-loop figure. |
| `src/lib/portfolio-tools.mjs` | The three read-only tools, shared by the MCP endpoint and the trace recorder. |
| `src/data/traces/` | Recorded Claude API requests and responses that the agent lesson renders. |
| `scripts/` | Generators (index, portrait, textures, traces, resume PDF, social card) and checks (copy rules, links). |
| `tests/` | Browser checks for every page, and tests for the MCP endpoint. |

`FORPortfolio.md` explains how it all fits together and why. `AGENTS.md` holds the design, writing, and fact rules for anyone working on it.

## Run it

Requires Node 22.23 or later.

```sh
npm install
npm run dev          # http://localhost:4321
npm run build
npm run check:copy   # writing rules, after a build
npm run check:links  # links, after a build
npm test             # browser checks, against the running dev server
npm run test:mcp     # MCP endpoint tests, against the running dev server
```

To record the agent traces again (about six API requests):

```sh
node --env-file=<file with ANTHROPIC_API_KEY> scripts/record-traces.mjs
```

## How it was built

With Claude Code. Four design directions were prototyped and judged from screenshots, the winner was built by agents working in parallel under one written brief, and every factual claim was checked against a source file before it was published. The colophon on the site has the details.
