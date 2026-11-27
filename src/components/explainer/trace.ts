/**
 * Reads a trace file (src/data/traces/*.json) and turns it into the steps of the
 * agent-loop figure. Nothing here edits wire data: every row, count, and raw panel
 * is read from the trace as recorded. Anything shortened for display is shortened
 * in the components, and the raw JSON for each step is the trace's own object.
 *
 * A trace is written by scripts/record-traces.mjs (recorded: true) or by
 * scripts/make-sample-traces.mjs (recorded: false). Both have the same shape:
 *   { id, title, question, recorded, recorded_at, model, sdk, note,
 *     trips: [{ trip, request, response, duration_ms, tool_runs }] }
 * The number of steps comes from the number of trips and tool runs, so one
 * component renders every scenario.
 */

export type Block = { type: string; [key: string]: unknown };
export type Message = { role: 'user' | 'assistant'; content: string | Block[] };
export type ToolRun = { tool_use_id: string; name: string; input: unknown; result: unknown };
export type Usage = { input_tokens?: number; output_tokens?: number; [key: string]: unknown } | null;
export type Trip = {
  trip: number;
  request: { model: string; system?: unknown; tools?: { name: string }[]; messages: Message[]; [key: string]: unknown };
  response: { model?: string; content: Block[]; stop_reason: string | null; usage?: Usage; [key: string]: unknown };
  duration_ms: number | null;
  tool_runs: ToolRun[];
};
export type Trace = {
  id: string;
  title: string;
  question: string;
  recorded: boolean;
  recorded_at: string | null;
  model: string | null;
  sdk: string | null;
  note: string | null;
  trips: Trip[];
};

/** The parts of the diagram. A lane is one stroke with one direction. */
export type Lane = 'ask' | 'send' | 'reply' | 'run' | 'result' | 'answer';
export type Part = 'model' | 'tool' | Lane;

/** One row in the message list, or the final answer under it. */
export type Row = {
  key: string;
  /** Position in the messages array, or null for the answer, which is not sent again in this run. */
  index: number | null;
  role: 'user' | 'assistant';
  plain: string;
  blocks: Block[] | string;
  stopReason?: string | null;
  usage?: Usage;
  durationMs?: number | null;
};

export type StepKind = 'ask' | 'send' | 'reply' | 'tool' | 'answer';

export type Step = {
  kind: StepKind;
  headline: string;
  support: string;
  /** Trips sent to the model so far, and messages in the list your code keeps. */
  trips: number;
  messages: number;
  /** Rows on show, oldest first. The answer row, when present, is last. */
  rows: Row[];
  /** Keys of rows added in this step. */
  fresh: string[];
  /** Parts of the diagram that exist by now, and the lanes this step moves along, in order. */
  parts: Part[];
  path: Lane[];
  /** The tool box shows the tool most recently run. */
  toolName: string | null;
  /** Whether this run calls a tool at all, so the tool box can say "not called" when it never is. */
  usesTools: boolean;
  /** Every row the run will produce, oldest first, the answer last: the list's final shape from step 1. */
  all: Row[];
  raw: { path: string; value: unknown };
};

const q = (s: string) => `"${s}"`;

function count(n: number, one: string, many: string) {
  return n === 1 ? one : `${n} ${many}`;
}

function toolUses(blocks: Block[]) {
  return blocks.filter((b) => b.type === 'tool_use') as (Block & { name: string; id: string })[];
}

function namesOf(blocks: Block[]) {
  const names = toolUses(blocks).map((b) => b.name);
  return names.length > 2 ? `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}` : names.join(' and ');
}

/** A plain sentence for a row: what this message does, before the wire text says how. */
function plainFor(m: Message, index: number): string {
  if (typeof m.content === 'string') return index === 0 ? 'Asks the question.' : 'Says something.';
  const types = m.content.map((b) => b.type);
  if (m.role === 'assistant') {
    const n = types.filter((t) => t === 'tool_use').length;
    if (n) return n === 1 ? 'Asks to call a tool.' : `Asks to call ${n} tools.`;
    return 'Replies in words.';
  }
  const r = types.filter((t) => t === 'tool_result').length;
  if (r) return r === 1 ? "Carries the tool's result back." : `Carries ${r} tool results back.`;
  return 'Says something.';
}

/** Which trip produced the assistant message at this index in the list. */
function tripThatProduced(trace: Trace, index: number) {
  return trace.trips.find((t) => t.request.messages.length === index);
}

function rowFor(trace: Trace, m: Message, index: number): Row {
  const source = m.role === 'assistant' ? tripThatProduced(trace, index) : undefined;
  return {
    key: `m${index}`,
    index,
    role: m.role,
    plain: plainFor(m, index),
    blocks: m.content,
    stopReason: source?.response.stop_reason,
    usage: source?.response.usage ?? null,
    durationMs: source?.duration_ms ?? null,
  };
}

const nf = new Intl.NumberFormat('en-US');

export function buildSteps(trace: Trace): Step[] {
  const trips = trace.trips;
  const last = trips.at(-1)!;
  // The longest list your code ever kept is the one it sent on the last trip.
  const full = last.request.messages;
  const allRows = full.map((m, i) => rowFor(trace, m, i));
  const rowsUpTo = (n: number) => allRows.slice(0, n);
  // The last reply ends the loop and is handed to the person.
  const answerRow: Row = {
    key: 'answer',
    index: null,
    role: 'assistant',
    plain: 'Answers the question.',
    blocks: last.response.content,
    stopReason: last.response.stop_reason,
    usage: last.response.usage ?? null,
    durationMs: last.duration_ms,
  };
  const usesTools = trips.some((t) => t.tool_runs.length > 0);
  const inputTokens = (i: number) => trips[i]?.response.usage?.input_tokens;

  const steps: Omit<Step, 'usesTools' | 'all'>[] = [];
  const parts = new Set<Part>(['ask']);
  const snap = () => [...parts];
  let toolName: string | null = null;
  const file = `${trace.id}.json`;

  steps.push({
    kind: 'ask',
    headline: 'A person asks a question.',
    support: `Your code starts a list with it as messages[0], role ${q('user')}. On a plain Messages API request like this one, that list is the only memory the conversation has.`,
    trips: 0,
    messages: 1,
    rows: rowsUpTo(1),
    fresh: ['m0'],
    parts: snap(),
    path: ['ask'],
    toolName,
    raw: { path: `${file} › trips[0].request.messages[0]`, value: trips[0].request.messages[0] },
  });

  trips.forEach((t, ti) => {
    const sent = t.request.messages.length;
    parts.add('model').add('send');
    const now = inputTokens(ti);
    const base = inputTokens(0);
    const cost =
      typeof now === 'number' && typeof base === 'number'
        ? ` It costs ${nf.format(now)} input tokens, against ${nf.format(base)} on trip 1. Prompt caching can make the repeated part cheaper.`
        : '';
    steps.push({
      kind: 'send',
      headline: ti === 0 ? 'Your code sends the model the list.' : 'Your code sends the whole list again.',
      support:
        ti === 0
          ? 'In these requests the system prompt and the tool definitions go in their own fields, system and tools, beside the list. Neither one is a message.'
          : `The model kept nothing from trip ${ti}, so trip ${t.trip} carries all ${sent} messages.${cost}`,
      trips: ti + 1,
      messages: sent,
      rows: rowsUpTo(sent),
      fresh: [],
      parts: snap(),
      path: ['send'],
      toolName,
      raw: { path: `${file} › trips[${ti}].request`, value: t.request },
    });

    const stop = t.response.stop_reason;
    const uses = toolUses(t.response.content);
    parts.add('reply');

    if (stop === 'tool_use' && uses.length) {
      const idx = sent; // the reply becomes messages[sent]
      const first = !steps.some((s) => s.kind === 'reply');
      steps.push({
        kind: 'reply',
        headline: first ? 'The model replies with a request, not a result.' : 'The model asks for another tool.',
        support: first
          ? `It has run nothing: the reply asks for ${namesOf(t.response.content)} and ends with stop_reason ${q('tool_use')}, and your code adds it to the list as messages[${idx}].`
          : `This reply asks for ${namesOf(t.response.content)} and also ends with stop_reason ${q('tool_use')}, so your code adds it as messages[${idx}].`,
        trips: ti + 1,
        messages: idx + 1,
        rows: rowsUpTo(idx + 1),
        fresh: [`m${idx}`],
        parts: snap(),
        path: ['reply'],
        toolName,
        raw: { path: `${file} › trips[${ti}].response`, value: t.response },
      });

      const resultIdx = idx + 1;
      const runs = t.tool_runs;
      toolName = runs.length > 1 ? `${runs[0].name} +${runs.length - 1}` : (runs[0]?.name ?? uses[0].name);
      parts.add('tool').add('run').add('result');
      steps.push({
        kind: 'tool',
        headline: runs.length > 1 ? `Your code runs ${runs.length} tools.` : `Your code runs ${runs[0]?.name ?? uses[0].name}.`,
        support: `It adds ${count(runs.length, 'the result', 'the results')} as messages[${resultIdx}], a message with role ${q('user')} that carries ${count(runs.length, 'a tool_result block', 'tool_result blocks')} matched to the request by id.`,
        trips: ti + 1,
        messages: resultIdx + 1,
        rows: rowsUpTo(resultIdx + 1),
        fresh: [`m${resultIdx}`],
        parts: snap(),
        path: ['run', 'result'],
        toolName,
        raw: { path: `${file} › trips[${ti}].tool_runs`, value: runs },
      });
      return;
    }

    // Any other stop_reason ends the loop. The recorder only ever saves end_turn here.
    parts.add('answer');
    const answer = answerRow;
    const noTool = trips.length === 1;
    steps.push({
      kind: 'answer',
      headline: `The reply ends with stop_reason ${q(stop ?? 'end_turn')}, so the loop stops.`,
      support: noTool
        ? 'It needed no tool, so your code hands the answer straight to the person after one trip.'
        : 'Your code hands the answer to the person. That is the whole agent: a model in a loop that can ask for tools, and code that keeps the list and runs them.',
      trips: ti + 1,
      messages: sent,
      rows: [...rowsUpTo(sent), answer],
      fresh: ['answer'],
      parts: snap(),
      path: ['reply', 'answer'],
      toolName,
      raw: { path: `${file} › trips[${ti}].response`, value: t.response },
    });
  });

  const all = [...allRows, answerRow];
  return steps.map((s) => ({ ...s, usesTools, all }));
}

/** A sentence-by-sentence account of the whole run, for the figure's text alternative. */
export function describeRun(trace: Trace, steps: Step[]) {
  return steps.map((s, i) => `Step ${i + 1}. ${s.headline} ${s.support}`).join(' ');
}

/** The tool names and the system prompt that travel beside the list on every trip. */
export function alongside(trace: Trace) {
  const req = trace.trips[0].request;
  return {
    system: typeof req.system === 'string' ? req.system : req.system ? JSON.stringify(req.system) : null,
    tools: (req.tools ?? []).map((t) => t.name),
  };
}
