/**
 * The agent-loop diagram: the whole machine, drawn from the first step. Four nodes:
 * the person who asks, "Your code", "The model", and the tool hanging off "Your code".
 * Six lanes join them, each one stroke with one direction.
 *
 * Nothing appears or disappears as the run goes on. A part the run has not reached yet
 * is ghosted: a faint dashed outline, its words still legible in teal. A part the run
 * has used is drawn solid. The lanes the current step moves along print in pink, drawn
 * on in the direction of travel, and a token travels them in order. With reduced motion
 * there is no token and nothing draws on: the pink strokes alone mark the step.
 *
 * Two drawings with the same parts: a wide one across the full stage, and a narrow one
 * where the nodes stack at full width. Which one shows is decided by the width of the
 * stage itself (a container query in agent-loop.css), so labels never print smaller
 * than 13px on screen and nothing jumps after hydration.
 */
import { motion } from 'motion/react';
import useStill from './useStill';
import type { Lane, Part, Step } from './trace';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
type LaneGeo = { pts: Pt[]; label: string; lx: number; ly: number; anchor: 'start' | 'middle' | 'end' };
type Geo = {
  name: 'wide' | 'narrow';
  w: number;
  h: number;
  title: number;
  person: Box;
  code: Box & { sub: string[] };
  model: Box & { sub: string[] };
  tool: Box;
  lanes: Record<Lane, LaneGeo>;
};

const WIDE: Geo = {
  name: 'wide',
  w: 600,
  h: 250,
  title: 22,
  person: { x: 0, y: 24, w: 92, h: 86 },
  code: { x: 156, y: 24, w: 184, h: 86, sub: ['keeps the list', 'runs your tools'] },
  model: { x: 470, y: 24, w: 130, h: 86, sub: ['only replies'] },
  tool: { x: 156, y: 182, w: 184, h: 64 },
  lanes: {
    ask: { pts: [[92, 52], [156, 52]], label: 'asks', lx: 124, ly: 44, anchor: 'middle' },
    answer: { pts: [[156, 84], [92, 84]], label: 'answer', lx: 124, ly: 103, anchor: 'middle' },
    send: { pts: [[340, 52], [470, 52]], label: 'sends the list', lx: 405, ly: 44, anchor: 'middle' },
    reply: { pts: [[470, 84], [340, 84]], label: 'replies', lx: 405, ly: 103, anchor: 'middle' },
    run: { pts: [[210, 110], [210, 182]], label: 'runs it', lx: 202, ly: 151, anchor: 'end' },
    result: { pts: [[286, 182], [286, 110]], label: 'result', lx: 294, ly: 151, anchor: 'start' },
  },
};

const NARROW: Geo = {
  name: 'narrow',
  w: 360,
  h: 330,
  title: 21,
  person: { x: 0, y: 0, w: 360, h: 52 },
  code: { x: 0, y: 110, w: 360, h: 80, sub: ['keeps the list, runs your tools'] },
  model: { x: 0, y: 254, w: 168, h: 74, sub: ['only replies'] },
  tool: { x: 192, y: 254, w: 168, h: 74 },
  lanes: {
    ask: { pts: [[130, 52], [130, 110]], label: 'asks', lx: 122, ly: 86, anchor: 'end' },
    answer: { pts: [[230, 110], [230, 52]], label: 'answer', lx: 238, ly: 86, anchor: 'start' },
    send: { pts: [[56, 190], [56, 254]], label: 'sends', lx: 48, ly: 214, anchor: 'end' },
    reply: { pts: [[120, 254], [120, 190]], label: 'replies', lx: 128, ly: 214, anchor: 'start' },
    run: { pts: [[228, 190], [228, 254]], label: 'runs it', lx: 220, ly: 241, anchor: 'end' },
    result: { pts: [[300, 254], [300, 190]], label: 'result', lx: 308, ly: 214, anchor: 'start' },
  },
};

const HEAD = 9; // arrowhead length
const HALF = 5; // arrowhead half-width

/** The stroke stops at the base of the arrowhead, so the tip is a clean point. */
function lanePath(pts: Pt[]) {
  const [ax, ay] = pts[pts.length - 2];
  const [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const base: Pt = [bx - ux * HEAD, by - uy * HEAD];
  const line = [...pts.slice(0, -1), base].map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const head = [
    [bx, by],
    [base[0] - uy * HALF, base[1] + ux * HALF],
    [base[0] + uy * HALF, base[1] - ux * HALF],
  ]
    .map((p) => p.join(','))
    .join(' ');
  return { line, head };
}

function Frame({ box }: { box: Box }) {
  return <rect className="al-st__box" x={box.x + 0.75} y={box.y + 0.75} width={box.w - 1.5} height={box.h - 1.5} />;
}

function Station({
  box,
  title,
  sub,
  size,
  ghost,
}: {
  box: Box;
  title: string;
  sub: string[];
  size: number;
  ghost: boolean;
}) {
  const cx = box.x + box.w / 2;
  const top = box.y + box.h / 2 - (sub.length * 17) / 2 + size * 0.38;
  return (
    <g className={`al-st${ghost ? ' is-ghost' : ''}`}>
      <Frame box={box} />
      <text className="al-st__title" x={cx} y={top} fontSize={size} textAnchor="middle">
        {title}
      </text>
      {sub.map((s, i) => (
        <text key={s} className="al-st__sub" x={cx} y={top + 22 + i * 17} textAnchor="middle">
          {s}
        </text>
      ))}
    </g>
  );
}

/** The person: a drawn node with a head-and-shoulders mark, never a loose word. */
function Person({ geo }: { geo: Geo }) {
  const b = geo.person;
  if (geo.name === 'wide') {
    const cx = b.x + b.w / 2;
    return (
      <g className="al-st al-person">
        <Frame box={b} />
        <circle className="al-person__mark" cx={cx} cy={b.y + 24} r={7.5} />
        <path className="al-person__mark" d={`M${cx - 14} ${b.y + 48} a14 12 0 0 1 28 0`} />
        <text className="al-st__title" x={cx} y={b.y + 70} fontSize={geo.title - 3} textAnchor="middle">
          Person
        </text>
      </g>
    );
  }
  const cy = b.y + b.h / 2;
  return (
    <g className="al-st al-person">
      <Frame box={b} />
      <circle className="al-person__mark" cx={b.x + 28} cy={cy - 7} r={6.5} />
      <path className="al-person__mark" d={`M${b.x + 16} ${cy + 14} a12 10 0 0 1 24 0`} />
      <text className="al-st__title" x={b.x + b.w / 2} y={cy + 7} fontSize={geo.title} textAnchor="middle">
        Person
      </text>
    </g>
  );
}

function Drawing({ geo, step, index, still }: { geo: Geo; step: Step; index: number; still: boolean }) {
  const has = (p: Part) => step.parts.includes(p);
  const active = new Set(step.path);
  const draw = !still;
  const lanes = Object.keys(geo.lanes) as Lane[];
  const tool = geo.tool;
  const toolOn = has('tool');
  const toolLine = toolOn
    ? (step.toolName ?? '')
    : step.kind === 'answer' && !step.usesTools
      ? 'not called'
      : 'not called yet';

  // The token's route: every point of every lane this step moves along, in order.
  // Where one lane ends far from where the next begins (a reply arriving on one side
  // of "Your code" and the answer leaving from the other), the token lifts off and
  // sets down again, so it never slides across a node's name.
  type Fr = { x: number; y: number; o: number; d: number };
  const frames: Fr[] = [];
  let dist = 0;
  step.path.forEach((l) => {
    geo.lanes[l].pts.forEach(([x, y], i) => {
      const prev = frames[frames.length - 1];
      if (!prev) return void frames.push({ x, y, o: 1, d: 0 });
      const gap = Math.hypot(x - prev.x, y - prev.y);
      if (i === 0 && gap < 0.5) return;
      if (i === 0 && gap > 100) {
        frames.push({ ...prev, o: 0, d: (dist += 14) });
        frames.push({ x, y, o: 0, d: (dist += 20) });
        frames.push({ x, y, o: 1, d: (dist += 14) });
        return;
      }
      frames.push({ x, y, o: 1, d: (dist += gap) });
    });
  });
  const total = dist || 1;
  const times = frames.map((f) => f.d / total);
  const duration = 0.5 + step.path.length * 0.45;
  const laneTime = duration / Math.max(1, step.path.length);

  return (
    <svg
      className={`al-dia al-dia--${geo.name}`}
      viewBox={`0 0 ${geo.w} ${geo.h}`}
      aria-hidden="true"
      focusable="false"
    >
      <Person geo={geo} />
      <Station box={geo.code} title="Your code" sub={geo.code.sub} size={geo.title} ghost={false} />
      <Station box={geo.model} title="The model" sub={geo.model.sub} size={geo.title} ghost={!has('model')} />

      <g className={`al-st al-tool${toolOn ? '' : ' is-ghost'}`}>
        <Frame box={tool} />
        <text className="al-tool__kind" x={tool.x + tool.w / 2} y={tool.y + tool.h / 2 - 5} textAnchor="middle">
          tool you define
        </text>
        <text
          className={`al-tool__name${toolOn ? '' : ' is-empty'}`}
          x={tool.x + tool.w / 2}
          y={tool.y + tool.h / 2 + 15}
          textAnchor="middle"
        >
          {toolLine}
        </text>
      </g>

      {lanes.map((l) => {
        const g = geo.lanes[l];
        const { line, head } = lanePath(g.pts);
        const on = active.has(l);
        const order = step.path.indexOf(l);
        return (
          <g key={l} className={`al-lane${on ? ' is-on' : ''}${has(l) ? '' : ' is-ghost'}`}>
            <path className="al-lane__line" d={line} />
            <polygon className="al-lane__head" points={head} />
            {on && (
              <>
                <motion.path
                  key={`ink-${index}`}
                  className="al-lane__ink"
                  d={line}
                  initial={draw ? { pathLength: 0 } : false}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: laneTime, delay: draw ? order * laneTime : 0, ease: [0.5, 0, 0.2, 1] }}
                />
                <motion.polygon
                  key={`inkhead-${index}`}
                  className="al-lane__inkhead"
                  points={head}
                  initial={draw ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ delay: draw ? (order + 0.85) * laneTime : 0, duration: 0.12 }}
                />
              </>
            )}
            <text className="al-lane__label" x={g.lx} y={g.ly} textAnchor={g.anchor}>
              {g.label}
            </text>
          </g>
        );
      })}

      {!still && frames.length > 1 && (
        <motion.circle
          key={`token-${index}`}
          className="al-token"
          r={6}
          initial={{ cx: frames[0].x, cy: frames[0].y, opacity: 0 }}
          animate={{
            cx: frames.map((f) => f.x),
            cy: frames.map((f) => f.y),
            opacity: frames.map((f) => f.o),
          }}
          transition={{ duration, times, ease: 'easeInOut' }}
        />
      )}
    </svg>
  );
}

export default function Diagram({ step, index }: { step: Step; index: number }) {
  const still = useStill();
  return (
    <div className="al-dias">
      <Drawing geo={WIDE} step={step} index={index} still={still} />
      <Drawing geo={NARROW} step={step} index={index} still={still} />
    </div>
  );
}
