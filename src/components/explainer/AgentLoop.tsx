/**
 * AgentLoop: one agent run, stepped through, from a trace file.
 *
 *   <AgentLoop client:visible traces={[oneTool]} />
 *   <AgentLoop client:visible traces={[oneTool, twoTools, noTool]} />   (adds a switcher)
 *
 * Renders from the trace and nothing else: the number of steps comes from its trips,
 * every row is its wire data, and "Show the raw JSON" prints the trace's own object for
 * the step. A sample trace (recorded: false) shows its note beside the figure; a
 * recorded one shows when it was recorded and on which model.
 *
 * The diagram draws the whole machine from step 1 and the list shows a place for every
 * message the run will produce, so nothing grows into an empty panel as the steps advance.
 *
 * Order on a phone: diagram, caption, controls, then the list, with older rows folded
 * to one line so the newest message stays on screen.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import useStill from './useStill';
import Diagram from './Diagram';
import MessageList from './MessageList';
import { alongside, buildSteps, describeRun, type Step, type Trace } from './trace';
import './agent-loop.css';

const RAW_WHAT: Record<Step['kind'], string> = {
  ask: 'The first message, as it will be sent',
  send: 'The request your code sent',
  reply: 'The response the model sent back',
  tool: 'The tool your code ran, and what it returned',
  answer: 'The response the model sent back',
};

function provenance(t: Trace) {
  if (!t.recorded) return null;
  const when = t.recorded_at
    ? new Date(t.recorded_at).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  return { when, model: t.model };
}

function Count({ value, label }: { value: number; label: string }) {
  const reduced = useStill();
  return (
    <div className="al-count">
      <span className="al-count__n numeral" aria-hidden="true">
        <motion.span
          key={value}
          initial={reduced ? false : { y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {value}
        </motion.span>
      </span>
      <span className="al-count__l label">{label}</span>
      <span className="visually-hidden">
        {label}: {value}
      </span>
    </div>
  );
}

export default function AgentLoop({ traces, label }: { traces: Trace[]; label?: string }) {
  const [which, setWhich] = useState(0);
  const [at, setAt] = useState(0);
  const [raw, setRaw] = useState(false);
  const [said, setSaid] = useState('');
  const touched = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const inView = useRef(false);
  const id = useId();

  const trace = traces[which];
  const steps = useMemo(() => buildSteps(trace), [trace]);
  const along = useMemo(() => alongside(trace), [trace]);
  const step = steps[at];
  const n = steps.length;
  const prov = provenance(trace);

  const go = (i: number) => {
    const next = Math.max(0, Math.min(n - 1, i));
    if (next === at) return;
    touched.current = true;
    setAt(next);
  };

  // Announce each step change politely, but not on first render.
  useEffect(() => {
    if (!touched.current) return;
    setSaid(`Step ${at + 1} of ${n}. ${step.headline} ${step.support}`);
  }, [at, which]); // eslint-disable-line react-hooks/exhaustive-deps

  // Left and right arrows step through while the figure is in view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (inView.current = e.isIntersecting && e.intersectionRatio > 0.3), {
      threshold: [0, 0.3, 0.6],
    });
    io.observe(el);
    const onKey = (e: KeyboardEvent) => {
      if (!inView.current || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(at + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(at - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      io.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  });

  // When the figure is stacked (phone, narrow tablet), keep the newest message on screen.
  useEffect(() => {
    if (!touched.current || !root.current) return;
    if (!matchMedia('(max-width: 900px)').matches) return;
    const t = window.setTimeout(() => {
      const rows = root.current?.querySelectorAll<HTMLElement>('.al-row');
      const last = rows?.[rows.length - 1];
      if (!last) return;
      const r = last.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 8 || r.top < 0) {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        last.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [at, which]);

  const pick = (i: number) => {
    if (i === which) return;
    touched.current = true;
    setWhich(i);
    setAt(0);
  };

  const summaryId = `${id}-sum`;

  return (
    <MotionConfig reducedMotion="user">
    <figure className="al" ref={root} aria-labelledby={`${id}-name`} aria-describedby={summaryId}>
      <div className="al-head">
        <p className="al-head__name label" id={`${id}-name`}>
          {label ?? 'One agent run'}
          {traces.length === 1 && <>: {trace.title.toLowerCase()}</>}
        </p>
        {prov ? (
          <p className="al-prov">
            Recorded from the Claude API{prov.when && <> on {prov.when} (UTC)</>}
            {prov.model && (
              <>
                , model <code>{prov.model}</code>
              </>
            )}
            .
          </p>
        ) : (
          <p className="al-prov al-prov--sample">
            <span className="al-prov__flag label">Sample, not a recording</span> {trace.note}
          </p>
        )}
      </div>

      {traces.length > 1 && (
        <div className="al-pick" role="group" aria-label="Choose a run">
          {traces.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className="al-pick__b"
              aria-pressed={i === which}
              onClick={() => pick(i)}
            >
              <span className="al-pick__t">{t.title}</span>
              <span className="al-pick__q">{t.question}</span>
            </button>
          ))}
        </div>
      )}

      <p className="visually-hidden" id={summaryId}>
        A diagram of four parts: the person who asks, your code, the model, and a tool you define, which hangs off your
        code. Beside it is the list of messages your code keeps, with a numbered place for every message the run will
        produce. The question: {trace.question} {describeRun(trace, steps)}
      </p>

      <div className="al-body">
        <div className="al-stage">
          <div className="al-counts">
            <Count value={step.trips} label={step.trips === 1 ? 'Trip to the model' : 'Trips to the model'} />
            <Count value={step.messages} label={step.messages === 1 ? 'Message in the list' : 'Messages in the list'} />
          </div>

          <Diagram step={step} index={at + which * 100} />

          <div className="al-caps">
            {steps.map((s, i) => (
              <div key={i} className={`al-cap${i === at ? ' is-on' : ''}`} aria-hidden={i !== at}>
                <p className="al-cap__n label">
                  Step {i + 1} of {n}
                </p>
                <p className="al-cap__h">{s.headline}</p>
                <p className="al-cap__s">{s.support}</p>
              </div>
            ))}
          </div>

          <div className="al-ctrl">
            <button type="button" className="btn al-ctrl__back" onClick={() => go(at - 1)} disabled={at === 0}>
              Back
            </button>
            <ol className="al-track" aria-label="Steps">
              {steps.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className={`al-track__b${i < at ? ' is-done' : ''}`}
                    aria-current={i === at ? 'step' : undefined}
                    aria-label={`Step ${i + 1}: ${s.headline}`}
                    onClick={() => go(i)}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn btn--primary al-ctrl__next"
              data-next
              onClick={() => go(at + 1)}
              disabled={at === n - 1}
            >
              Next
            </button>
          </div>

          <div className="al-under">
            <button
              type="button"
              className="al-rawbtn"
              aria-expanded={raw}
              aria-controls={`${id}-raw`}
              onClick={() => setRaw(!raw)}
            >
              {raw ? 'Hide the raw JSON' : 'Show the raw JSON'}
            </button>
            <p className="al-keys needs-keyboard label">
              Or use <kbd>←</kbd> <kbd>→</kbd>
            </p>
          </div>

          <div className="al-raw" id={`${id}-raw`} hidden={!raw}>
            {raw && (
              <>
                <p className="al-raw__what">
                  {RAW_WHAT[step.kind]}. <code>{step.raw.path}</code>
                </p>
                <pre className="al-raw__pre" tabIndex={0} aria-label={`Raw JSON: ${step.raw.path}`}>
                  {JSON.stringify(step.raw.value, null, 2)}
                </pre>
              </>
            )}
          </div>
        </div>

        <MessageList step={step} along={along} />
      </div>

      <p className="visually-hidden" aria-live="polite">
        {said}
      </p>
    </figure>
    </MotionConfig>
  );
}
