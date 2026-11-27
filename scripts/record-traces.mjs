#!/usr/bin/env node
// Records real agent runs against the Claude API, for the lesson "How an agent actually works".
//
//   node --env-file=<file with ANTHROPIC_API_KEY> scripts/record-traces.mjs [scenario ...]
//
// Each scenario asks one question and lets the model use this site's three tools
// (src/lib/portfolio-tools.mjs). Every request and every response is saved exactly as
// sent and received, to src/data/traces/<scenario>.json. The lesson's figure renders
// from those files and nothing else, so what a visitor steps through is what happened.
//
// The loop below was built with Claude Code, with no agent framework, and is written out
// in full on purpose. It is the thing the lesson teaches:
//   send the list -> read the reply -> if it asks for a tool, run it, append the
//   result, and send the whole list again -> stop when the reply ends the turn.
//
// A loop for real use would also handle the other stop reasons: max_tokens (the reply
// was cut off, so a tool_use input may be incomplete), refusal (never run that turn's
// tools) and pause_turn (a server tool paused; send the list again to continue). It
// would opt in to server-side fallbacks for refusals and add retries. They are left
// out so the recorded request is the smallest true example: this recorder stops on any
// stop reason other than tool_use or end_turn.
//
// Cost: three scenarios make about six requests.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { TOOLS, createTools, runTool } from '../src/lib/portfolio-tools.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/data/traces');

const MODEL = 'claude-opus-5-5';
const MAX_TRIPS = 6;
const SYSTEM =
  'You answer questions about Andrew Yu using the tools provided. Answer briefly, and only from what the tools return. If a question is not about Andrew, answer it directly without using a tool.';

const SCENARIOS = [
  {
    id: 'one-tool',
    title: 'One tool call',
    question: 'Has Andrew taught Claude Code to a live room?',
  },
  {
    id: 'two-tools',
    title: 'Two tool calls',
    question: 'What did his docs eval find, and on which models? Give me the exact numbers from the full write-up.',
  },
  {
    id: 'no-tool',
    title: 'No tool call',
    question: 'What is 12 times 12?',
  },
];

// The tools read the same index the site's MCP server reads. Build it fresh first.
await import('./build-index.mjs');
const index = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/portfolio-index.json'), 'utf8'));
const tools = createTools(index);

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const sdkVersion = JSON.parse(
  fs.readFileSync(path.join(root, 'node_modules/@anthropic-ai/sdk/package.json'), 'utf8'),
).version;

const plain = (value) => JSON.parse(JSON.stringify(value));

async function record(scenario) {
  /** @type {Anthropic.MessageParam[]} */
  const messages = [{ role: 'user', content: scenario.question }];
  const trips = [];

  for (let trip = 1; trip <= MAX_TRIPS; trip++) {
    const request = {
      model: MODEL,
      max_tokens: 16000,
      // Ask for a readable summary of the model's reasoning so the lesson can show it.
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: 'low' },
      system: SYSTEM,
      tools: TOOLS,
      messages: plain(messages),
    };

    const started = performance.now();
    const response = await client.messages.create(request);
    const durationMs = Math.round(performance.now() - started);

    const toolRuns = [];
    trips.push({ trip, request, response: plain(response), duration_ms: durationMs, tool_runs: toolRuns });

    if (response.stop_reason === 'end_turn') break;
    if (response.stop_reason !== 'tool_use') {
      throw new Error(`${scenario.id}: unexpected stop_reason "${response.stop_reason}" on trip ${trip}`);
    }

    // The reply asked for tools. Keep the whole reply (thinking blocks included, unchanged),
    // run every tool it asked for, and send all the results back in one user message.
    messages.push({ role: 'assistant', content: response.content });
    const results = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const result = runTool(tools, block.name, block.input);
      toolRuns.push({ tool_use_id: block.id, name: block.name, input: plain(block.input), result });
      // A failed tool (unknown name, bad input, a thrown error) goes back marked is_error,
      // so the model reads it as a failure and not as a result.
      const isError = Boolean(result && typeof result.error === 'string');
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
        ...(isError ? { is_error: true } : {}),
      });
    }
    messages.push({ role: 'user', content: results });

    if (trip === MAX_TRIPS) throw new Error(`${scenario.id}: still asking for tools after ${MAX_TRIPS} trips`);
  }

  const last = trips.at(-1).response;
  const trace = {
    id: scenario.id,
    title: scenario.title,
    question: scenario.question,
    recorded: true,
    recorded_at: new Date().toISOString(),
    model: last.model,
    sdk: `@anthropic-ai/sdk ${sdkVersion}`,
    note: null,
    trips,
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${scenario.id}.json`), JSON.stringify(trace, null, 2) + '\n');

  const shape = trips.map((t) => `${t.response.stop_reason}${t.tool_runs.length ? `(${t.tool_runs.map((r) => r.name).join(',')})` : ''}`);
  const usage = trips.reduce((sum, t) => sum + t.response.usage.input_tokens + t.response.usage.output_tokens, 0);
  console.log(`${scenario.id}: ${trips.length} trip(s) [${shape.join(' -> ')}], ${usage} tokens`);
}

const wanted = process.argv.slice(2);
const run = wanted.length ? SCENARIOS.filter((s) => wanted.includes(s.id)) : SCENARIOS;
if (run.length === 0) {
  console.error(`No such scenario. Choose from: ${SCENARIOS.map((s) => s.id).join(', ')}`);
  process.exit(2);
}
for (const scenario of run) await record(scenario);
