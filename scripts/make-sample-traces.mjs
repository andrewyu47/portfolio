#!/usr/bin/env node
// Writes sample traces for the lesson "How an agent actually works", for use until
// real ones are recorded with scripts/record-traces.mjs.
//
//   node scripts/make-sample-traces.mjs
//
// A sample trace has the same shape as a recorded one, with "recorded": false.
// What is real in it: the request bodies, and every tool result (the tools are run
// here, against the site's real index). What is not: the model's replies, which are
// written by hand below in the exact shape the Messages API returns. Fields only a
// real response can have (token usage, timing, message ids) are null.
//
// The lesson shows a plain notice whenever it is rendering a sample. Recording real
// traces overwrites these files, and the notice goes away.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS, createTools, runTool } from '../src/lib/portfolio-tools.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/data/traces');

const MODEL = 'claude-opus-5-5';
const SYSTEM =
  'You answer questions about Andrew Yu using the tools provided. Answer briefly, and only from what the tools return. If a question is not about Andrew, answer it directly without using a tool.';

await import('./build-index.mjs');
const index = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/portfolio-index.json'), 'utf8'));
const tools = createTools(index);

// Each scenario is a question and the replies the model would give, in order.
// A reply is either a request for tools or a final answer.
const SCENARIOS = [
  {
    id: 'one-tool',
    title: 'One tool call',
    question: 'Has Andrew taught Claude Code to a live room?',
    replies: [
      { tools: [{ name: 'search_portfolio', input: { query: 'taught Claude Code live room' } }] },
      {
        text: 'Yes. Through Claude Dojo, a nonprofit where he is Director of AI Enablement, Andrew and his fellow instructors taught 103 people to build with Claude Code. About 70 of them were in the room for one two-day hands-on intensive.',
      },
    ],
  },
  {
    id: 'two-tools',
    title: 'Two tool calls',
    question: 'What did his docs eval find, and on which models? Give me the exact numbers from the full write-up.',
    replies: [
      { tools: [{ name: 'search_portfolio', input: { query: 'docs eval results models' } }] },
      { tools: [{ name: 'get_case_study', input: { slug: 'the-score-that-lied' } }] },
      {
        text: 'The eval ran 15 real developer tasks through coding agents under four documentation conditions, three runs each, on two models. With a curated docs file, the small model went from 11% task success to 89%, and the large model from 84% to 100%. Fetching the live docs did not help in the same way.',
      },
    ],
  },
  {
    id: 'no-tool',
    title: 'No tool call',
    question: 'What is 12 times 12?',
    replies: [{ text: '144.' }],
  },
];

const plain = (value) => JSON.parse(JSON.stringify(value));
const force = process.argv.includes('--force');

for (const scenario of SCENARIOS) {
  // Never replace a real recording with a sample unless asked to.
  const existing = path.join(outDir, `${scenario.id}.json`);
  if (!force && fs.existsSync(existing) && JSON.parse(fs.readFileSync(existing, 'utf8')).recorded === true) {
    console.log(`${scenario.id}: a real recording exists, left alone (pass --force to replace it)`);
    continue;
  }

  const messages = [{ role: 'user', content: scenario.question }];
  const trips = [];
  let toolCount = 0;

  scenario.replies.forEach((reply, i) => {
    const request = {
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: 'low' },
      system: SYSTEM,
      tools: TOOLS,
      messages: plain(messages),
    };

    const content = reply.text
      ? [{ type: 'text', text: reply.text }]
      : reply.tools.map((t) => ({
          type: 'tool_use',
          id: `toolu_sample_${String(++toolCount).padStart(2, '0')}`,
          name: t.name,
          input: t.input,
        }));

    const response = {
      id: null,
      type: 'message',
      role: 'assistant',
      model: MODEL,
      content,
      stop_reason: reply.text ? 'end_turn' : 'tool_use',
      stop_sequence: null,
      usage: null,
    };

    const toolRuns = [];
    trips.push({ trip: i + 1, request, response, duration_ms: null, tool_runs: toolRuns });

    if (!reply.text) {
      messages.push({ role: 'assistant', content });
      const results = [];
      for (const block of content) {
        const result = runTool(tools, block.name, block.input);
        toolRuns.push({ tool_use_id: block.id, name: block.name, input: block.input, result });
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'user', content: results });
    }
  });

  const trace = {
    id: scenario.id,
    title: scenario.title,
    question: scenario.question,
    recorded: false,
    recorded_at: null,
    model: MODEL,
    sdk: null,
    note: "Sample run. The requests and the tool results are real: the tools ran against this site's index. The model's replies were written by hand in the Messages API's exact shape.",
    trips,
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${scenario.id}.json`), JSON.stringify(trace, null, 2) + '\n');
  console.log(`${scenario.id}: sample with ${trips.length} trip(s) written`);
}
