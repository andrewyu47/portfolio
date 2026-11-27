/**
 * The list your code keeps, row by row, exactly as it goes over the wire.
 *
 * Each row leads with a plain sentence, then the real wire text under it. Long
 * strings are shortened here, for display only, and say how long they really are;
 * the raw JSON for the step is one click away in the figure. Thinking blocks, when a
 * recorded reply has them, sit on their row as a small closed detail, because your
 * code passes them back unchanged. The system prompt and the tools are shown beside
 * the list, because in these requests they travel in their own fields, not as messages.
 *
 * Every message the run will produce has its place from step 1: the ones not sent yet
 * wait as one-line numbered dashed slots, and grow into full rows as the steps advance.
 *
 * On a phone every row folds to one line (index, role, plain sentence), so the list
 * sits right under the diagram and every tap shows in view. The newest row is marked.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import useStill from './useStill';
import type { Block, Row, Step } from './trace';

const nf = new Intl.NumberFormat('en-US');

function shorten(s: string, n: number) {
  if (s.length <= n) return { text: s, cut: false, length: s.length };
  return { text: s.slice(0, n).trimEnd() + '…', cut: true, length: s.length };
}

function Str({ value, n = 150 }: { value: string; n?: number }) {
  const s = shorten(value, n);
  return (
    <>
      <span className="al-w__str">{JSON.stringify(s.text)}</span>
      {s.cut && <span className="al-w__len"> {nf.format(s.length)} characters in full</span>}
    </>
  );
}

function WireBlock({ b }: { b: Block }) {
  switch (b.type) {
    case 'text':
      return (
        <p className="al-w">
          <span className="al-w__type">text</span> <Str value={String(b.text ?? '')} n={220} />
        </p>
      );
    case 'tool_use':
      return (
        <p className="al-w">
          <span className="al-w__type">tool_use</span> <span className="al-w__name">{String(b.name)}</span>{' '}
          <span className="al-w__str">{JSON.stringify(b.input)}</span>
          <span className="al-w__id"> id {String(b.id)}</span>
        </p>
      );
    case 'tool_result': {
      const c = b.content;
      return (
        <p className="al-w">
          <span className="al-w__type">tool_result</span>{' '}
          <span className="al-w__id">for {String(b.tool_use_id)}</span>{' '}
          {typeof c === 'string' ? <Str value={c} n={96} /> : <Str value={JSON.stringify(c)} n={96} />}
        </p>
      );
    }
    case 'thinking':
    case 'redacted_thinking':
      return null; // shown as a detail, below
    default:
      return (
        <p className="al-w">
          <span className="al-w__type">{b.type}</span>
        </p>
      );
  }
}

function Thinking({ blocks, sentBack }: { blocks: Block[]; sentBack: boolean }) {
  const thoughts = blocks.filter((b) => b.type === 'thinking' || b.type === 'redacted_thinking');
  if (!thoughts.length) return null;
  return (
    <details className="al-think">
      <summary>
        <span className="al-w__type">thinking</span> The model reasoned first. This block holds a summary of that
        reasoning, because the request asked for display "summarized"; the reasoning itself is never returned.
        {sentBack && ' Your code sends this block back unchanged.'}
      </summary>
      {thoughts.map((b, i) =>
        b.type === 'thinking' ? (
          <p key={i} className="al-think__text">
            {shorten(String(b.thinking ?? ''), 600).text || 'Empty summary.'}
          </p>
        ) : (
          <p key={i} className="al-think__text">
            Redacted: the reasoning is encrypted, and your code still passes it back as is.
          </p>
        ),
      )}
    </details>
  );
}

function Meta({ row }: { row: Row }) {
  const u = row.usage;
  const bits: string[] = [];
  if (u && typeof u.input_tokens === 'number') bits.push(`input_tokens ${nf.format(u.input_tokens)}`);
  if (u && typeof u.output_tokens === 'number') bits.push(`output_tokens ${nf.format(u.output_tokens)}`);
  if (typeof row.durationMs === 'number') bits.push(`${(row.durationMs / 1000).toFixed(1)} s`);
  if (!bits.length) return null;
  return <p className="al-row__usage">{bits.join(' · ')}</p>;
}

function RowBody({ row, fresh, next }: { row: Row; fresh: boolean; next: number }) {
  const isAnswer = row.index === null;
  const blocks = row.blocks;
  return (
    <>
      <p className="al-row__meta">
        <span className={`al-row__idx${fresh ? ' chip' : ''}`}>{isAnswer ? 'the answer' : `messages[${row.index}]`}</span>
        <span className="al-row__role">role "{row.role}"</span>
        <span className="al-row__who" aria-hidden="true">
          {row.role}
        </span>
        {row.role === 'assistant' && row.stopReason && (
          <span className="al-row__stop">stop_reason "{row.stopReason}"</span>
        )}
      </p>
      {typeof blocks === 'string' && (
        <p className="al-row__said" aria-hidden="true">
          {JSON.stringify(blocks)}
        </p>
      )}
      <p className="al-row__plain">
        {row.plain}
        {isAnswer && (
          <span className="al-row__aside">
            {' '}
            Handed to the person. If they ask a follow-up, your code adds this reply to the list first, as messages[
            {next}].
          </span>
        )}
      </p>
      <div className="al-row__wire">
        {typeof blocks === 'string' ? (
          <p className="al-w">
            <span className="al-w__type">content</span> <Str value={blocks} n={220} />
          </p>
        ) : (
          blocks.map((b, i) => <WireBlock key={i} b={b} />)
        )}
      </div>
      {typeof blocks !== 'string' && <Thinking blocks={blocks} sentBack={!isAnswer} />}
      <Meta row={row} />
    </>
  );
}

/**
 * `enter` is false while the figure is first drawn, so the rows already on the page
 * (the server's HTML, and the first frame for someone who asked for no motion) are
 * simply there. Only rows added by a later step drop in.
 */
function RowView({
  row,
  fresh,
  newest,
  next,
  enter,
}: {
  row: Row;
  fresh: boolean;
  newest: boolean;
  next: number;
  enter: boolean;
}) {
  const reduced = useStill();
  const isAnswer = row.index === null;
  return (
    <motion.li
      className={`al-row${fresh ? ' is-fresh' : ''}${newest ? ' is-newest' : ''}${isAnswer ? ' is-answer' : ''}`}
      data-role={row.role}
      initial={fresh && enter && !reduced ? { opacity: 0, y: -14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1], delay: fresh ? 0.35 : 0 }}
    >
      <RowBody row={row} fresh={fresh} next={next} />
    </motion.li>
  );
}

/**
 * A message the run has not produced yet: a one-line numbered dashed slot that says
 * where the message will go and who will send it. It grows into the row when its
 * step arrives. The controls sit in the other column, so nothing they do moves them.
 */
function Slot({ row }: { row: Row }) {
  const isAnswer = row.index === null;
  return (
    <div className="al-slot">
      <p className="al-slot__n">{isAnswer ? 'the answer' : `messages[${row.index}]`}</p>
      <p className="al-slot__w">
        role "{row.role}", {isAnswer ? 'not back yet' : 'not sent yet'}
      </p>
    </div>
  );
}

export default function MessageList({
  step,
  along,
  head,
}: {
  step: Step;
  along: { system: string | null; tools: string[] };
  /** Printed at the top of the list column: the figure's two counters. */
  head?: ReactNode;
}) {
  const sending = step.kind === 'send';
  const listRows = step.rows.filter((r) => r.index !== null);
  const answer = step.rows.find((r) => r.index === null);
  const lastKey = step.rows.at(-1)?.key;
  const shown = new Set(step.rows.map((r) => r.key));
  const waiting = step.all.filter((r) => r.index !== null && !shown.has(r.key));
  const finalAnswer = step.all.find((r) => r.index === null);
  const next = step.all.length - 1;
  // Rows drop in only after the figure's first frame has been drawn.
  const [enter, setEnter] = useState(false);
  useEffect(() => setEnter(true), []);

  return (
    <div className={`al-list${sending ? ' is-sending' : ''}`}>
      {head}
      <div className="al-along">
        <p className="al-list__cap label">Sent beside the list on every trip</p>
        <p className="al-along__items">
          {along.system && (
            <code className="token" title={along.system}>
              system
            </code>
          )}
          {along.tools.map((t) => (
            <code className="token" key={t}>
              {t}
            </code>
          ))}
        </p>
      </div>

      <p className="al-list__cap label">
        {sending ? (
          <>
            Trip {step.trips} sends the whole list: {step.messages} {step.messages === 1 ? 'message' : 'messages'}
          </>
        ) : (
          <>The list your code keeps</>
        )}
      </p>
      <ol className="al-rows" aria-label="Messages in the list">
        {listRows.map((r) => (
          <RowView key={r.key} row={r} fresh={step.fresh.includes(r.key)} newest={r.key === lastKey} next={next} enter={enter} />
        ))}
      </ol>
      {waiting.length > 0 && (
        <div className="al-slots" aria-hidden="true">
          {waiting.map((r) => (
            <Slot key={r.key} row={r} />
          ))}
        </div>
      )}
      <div className="al-answer">
        {answer ? (
          <ol className="al-rows al-rows--answer" aria-label="The answer">
            <RowView row={answer} fresh={step.fresh.includes(answer.key)} newest={answer.key === lastKey} next={next} enter={enter} />
          </ol>
        ) : (
          finalAnswer && (
            <div className="al-slots" aria-hidden="true">
              <Slot row={finalAnswer} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
