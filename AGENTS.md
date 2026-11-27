# andrewyu.app: build rules

Andrew Yu's portfolio. The reader who matters most is someone who owns demos, hands-on labs, and technical curriculum for developers. In ten seconds the site has to show that Andrew can teach AI to a live room and build the labs himself. After that it has to let them check every claim.

The site is designed as a **two-ink risograph lab manual**, because writing labs is the job. Pages that teach are lab sheets. Pages that report are written up the way a lab report is.

Read this whole file before changing anything. The home page (`src/pages/index.astro`, `src/components/home/Lab01.astro`, `src/components/home/WorkRows.astro`) is the reference implementation: match its level of finish.

## Design system

Tokens are in `src/styles/tokens.css`. Shared classes are in `src/styles/global.css`, with a vocabulary list at the top. Use them. Do not add colors, fonts, shadows, gradients, or radii.

**Two inks, one stock.**

- `--stock` is the paper. `--ink` (teal) is the working plate: rules, labels, diagram strokes, controls. `--pink` is the second plate: emphasis, data highlights, stamps, marks made by hand.
- `--text` (navy) is what the two inks make together. All reading text and headlines are set in it. Teal is never used for a paragraph.
- Pink is never used for small text. Text set on a pink ground uses `--over`.
- Solid pink areas take the class `plate`, which lays them down with `mix-blend-mode` and a slightly uneven ink mask. Tiny pink shapes (dots under 12px) switch the mask off.
- Dark mode is real: the stock goes dark, the inks go light, and plates blend with `screen`. Never hard-code a color. Check your work with `--dark`.

**Type: three voices.**

- Display: Anybody Variable, at two widths only. `--w-shout` (condensed) for headlines and big numerals. `--w-title` for names of things. Do not introduce a third width.
- Body: Literata Variable. Mono: Spline Sans Mono Variable.
- `.label` (small mono caps) is for lab apparatus (running heads, field names like Objective and Checkpoint) and for data captions. It is not an eyebrow to put above every block. If a label does not tell the reader something they need, delete it.

**Structure.**

- The page grid is a narrow label column and a content column (`--cols`). Keep to it so left edges line up down the whole page.
- Every page opens with a flat teal band, the running head. Lab pages get it from `Sheet.astro` (only interactive labs are set as sheets). Every other page starts with `RunHead.astro`: `left` says what the page is, `right` carries one fact (a date, a place, a count). Reading sections under it use `SectionHead.astro` and no frame.
- Each page's first screen carries one flat field of pink on the thing that matters most there: the disc in a `Photo`, a stamp, or a block with the class `spot` (navy type on pink). One per screen. Small pink marks (a tick, an underline, one highlighted point in a chart) are fine beside it.
- Photographs are prints. `Photo.astro` prints a frame from the session recording as a teal halftone with a pink disc under the instructor (`print="room-capstone"` is the wide frame, `print="room-capstone-tight"` is the closer crop). `Clip.astro` shows the same print with a play button that swaps in the real captioned recording. On dark paper `Photo` and `Portrait` keep their own light stock. Do not put a photo in an `<img>` or change these components.
- Proof before prose. A case study's first screen shows one figure beside the H1: a photo, a chart, or a drawing. The H1 is the claim. The deck under it gives the constraint and the method, and never restates the H1. Metrics are facts the deck does not already contain.
- A row that opens a page has to look like a link at rest: a `.more` link, or a mono "Read" with an arrow at the right edge. Hover alone is not enough.
- Figures are drawn in the two inks: teal strokes and labels, pink for the single point that matters. Labels are 13px or larger. Numbers use tabular figures, and columns of numbers are set flush right.
- No cards. No boxes around sections. No nested borders. Rules do the separating: solid for structure, dashed only between rows of a table-like list.
- A figure has to encode something true (a count, a comparison, a sequence). If it only decorates, cut it. No halftone or texture behind text.
- Numbered markers only where order matters (steps of a lab, messages in a list).
- `Stamp.astro` is only for something that was actually checked.
- Every claim has a named link next to it that goes to the proof (`.more`).

**Motion.**

- One orchestrated moment per page: the pink plate settles into register on load. `Base.astro` already does it.
- Figures print on arrival. Put the attribute `data-print` on a figure's root element and `Base.astro` adds `data-printed` when it scrolls into view. `Photo` already does this: its teal plate wipes across and the pink disc lands after it. A drawn figure can hang its own drawing on the same pair, for example strokes that draw while `.js [data-print]:not([data-printed])` holds them back, with the one pink mark landing last. Keep it under 1.6 seconds, and make sure the figure is complete with no script and with reduced motion (the final state is the default state).
- Any other motion has to explain something: a stroke that draws the path data takes, a message that drops into a list, a stamp that lands when a checkpoint is passed. No scroll-triggered fades, no parallax, no hover lifts.
- With `prefers-reduced-motion`, the page is still and complete. Test with `--reduced`.

**Things that make a page look machine-made. Do not ship them.** Gradients, glows, drop shadows, rounded cards, a left accent bar on a card, pill buttons, icon-plus-caption rows, the same section template repeated down the page, a colored square as a logo, fake terminal windows, fake latency numbers, emoji, an aphorism as a subhead, a list that restates what the page already showed, keyboard hints shown on a phone (wrap them in `.needs-keyboard`).

## Writing rules

These are Andrew's standing rules. They are not negotiable.

- **No em dashes or en dashes anywhere.** Use commas, periods, or "to" for ranges.
- No rule-of-three cadences, no stacks of parallel bullets, no filler, no aphorisms.
- Banned words: leverage, seamless, unlock, elevate, delve, empower, cutting-edge, passionate, journey, supercharge, robust, holistic, synergy, game-changing, transformative, deep dive.
- First person, plain verbs, sentence case. Specific over clever. Say what happened, with the number, then stop.
- Write for someone who has ten seconds. The outcome comes first. Method comes second.
- Do not explain the design or the metaphor to the reader. Never write "lab manual", "risograph", or "two-ink" in page copy (the colophon is the one exception).

## Facts

Everything on this site is published under a real person's name. A wrong number is worse than a missing one.

- Every number, date, title and name on a page has to trace to a source: one of Andrew's own files, a recording, or something he has said. The fact base that records those sources, and the list of settled wordings, are kept outside this repository. If you are working here without them, change no factual claim.
- If you cannot support a claim, leave it out and list it in your report under "needs Andrew". Never invent a metric, a quote, a testimonial, a talk title, a logo, or a customer.
- Name no one but Andrew: no instructors, attendees, coworkers, or executives. No budgets, internal plans, or internal analytics.
- A number that belongs to a model, a date, or a condition always carries it: "the small model went from 11% to 89%".
- Each number is published once, on the page whose source supports it. Two pages that disagree cost more than a missing number.
- Plans are not records. What a schedule or a run sheet said would happen is written as the plan. Only what a recording shows is written as what happened.
- Do not move work between employers, and do not describe an employer's internal work beyond what its case study already says.
- Andrew is a writer and teacher who builds with AI coding tools, Claude Code every day. Never present him as a career software engineer. Say "built with Claude Code" where it is true.
- The clip at `/media/dojo-capstone-kickoff.mp4` is 55 seconds of Andrew opening the capstone at the Claude Dojo intensive on July 11, 2026, with captions. He is the only person in frame. It is the proof that he teaches live rooms: show it, do not describe it.

## Structure

```
src/pages/index.astro            home
src/pages/work/                  case study index and pages   (content: src/content/work/*.mdx)
src/pages/teaching/              teaching page and lessons    (content: src/content/lessons/*.mdx)
src/pages/writing/               essays                       (content: src/content/writing/*.mdx)
src/pages/path.astro             education, roles, what shipped when
src/pages/resume.astro           web resume
src/pages/for/[slug].astro       unlisted pages: built from private data (src/lib/unlisted.ts), not in nav or sitemap, noindex
src/pages/mcp.ts                 MCP endpoint (this site as read-only tools)
src/lib/portfolio-tools.mjs      the tools, shared by the MCP endpoint and the trace recorder
src/data/                        profile.json, record.json, timeline.json, traces/
scripts/build-index.mjs          builds the machine-readable index, llms.txt, llms-full.txt
```

Content schemas are in `src/content.config.ts`. Shared components: `Overprint`, `Sheet`, `RunHead`, `SectionHead`, `Stamp`, `Portrait`, `Photo`, `Clip`, `Nav`, `Footer`, and the layout `Base`. Read their header comments. Figures that more than one page uses live in `src/components/figures/`.

## Working here

Several agents work in this repository at the same time. To stay out of each other's way:

- **Only create or edit the files your brief assigns to you.** Treat everything else as read-only, including `src/styles/`, `src/layouts/Base.astro`, the shared components, `src/content.config.ts`, `package.json`, and this file. If you need a change to a shared file, describe it in your report instead of making it.
- **Do not install packages, run `npm run build`, or run git commands** unless your brief says so. A dev server is usually running at `http://localhost:4321` and picks up your changes. If it is down, say so in your report.
- **Use absolute paths. Do not chain commands with `cd`. Edit files with the Edit and Write tools, never with shell redirection, `sed -i`, or inline Python.** These habits trigger permission prompts for the user.
- Screenshot your work and look at it, on a desktop and a phone, on light and dark paper, and with reduced motion. Your brief names the screenshot helper to use. A page passes only with no console errors and no sideways scroll.
- Quality floor, without announcing it: works at 390px wide, visible keyboard focus, real contrast, reduced motion honored, dark paper checked.
- Critique your own screenshots the way a hard art director would, fix what you find, and capture again. At least two rounds.

## Astro

Astro 7, React 19 for interactive islands, MDX for content. Documentation: https://docs.astro.build

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Framework components](https://docs.astro.build/en/guides/framework-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling](https://docs.astro.build/en/guides/styling/)
