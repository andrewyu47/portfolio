import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

// ---------- DATA ----------
const SELECTED_WORK = [
  {
    title: 'Project SAGE',
    to: '/docs/case-studies/project-sage',
    meta: '2024 · Hackathon',
    desc:
      'Selection Agent with Guided Explanations — a RAG-based support agent that synthesizes live DOM signals with static documentation to resolve tickets instantly. Top hackathon winner.',
    tags: ['ai agent', 'rag', 'ux research'],
  },
  {
    title: 'DocOps Governance Workbench',
    to: '/docs/case-studies/docops-governance-workbench',
    meta: '2025',
    desc:
      'A LangChain + MCP workbench for documentation governance — surfacing drift, policy violations, and freshness signals across large doc estates.',
    tags: ['python', 'langchain', 'mcp', 'rag'],
  },
  {
    title: 'YouTube Content Pipeline',
    to: '/docs/case-studies/youtube-content-pipeline',
    meta: 'System',
    desc:
      'An end-to-end content pipeline — Modal + PyTorch + ffmpeg + Claude — that converts long-form video into structured, searchable artifacts.',
    tags: ['python', 'modal', 'pytorch'],
  },
  {
    title: 'Splunk IX AI Council',
    to: '/docs/case-studies/ix-ai-council',
    meta: 'Splunk',
    desc:
      "Founded a cross-functional governance body to operationalize Generative AI strategy across Splunk's information experience org.",
    tags: ['leadership', 'ai governance'],
  },
  {
    title: 'QuickRamp',
    to: '/docs/case-studies/quickramp',
    meta: 'Healthcare',
    desc:
      'A RAG-powered onboarding companion for healthcare clinicians, built on Next.js, Claude, and Pinecone with HIPAA-aware retrieval boundaries.',
    tags: ['next.js', 'claude-api', 'pinecone'],
  },
  {
    title: 'Fold',
    to: '/docs/case-studies/fold',
    meta: 'Ministry',
    desc:
      'A student-ministry tooling experiment — Next.js, Claude API, Drizzle, and a strong opinion that not every product needs an enterprise SaaS shape.',
    tags: ['next.js', 'claude api', 'ai'],
  },
];

const WRITING = [
  {
    title: 'LeCun, Lewis, and the Limits of Language',
    to: '/docs/case-studies/writing-lecun-lewis',
    meta: 'Essay',
    desc:
      'An essay on hallucination, knowledge graphs, and what Yann LeCun gets right (and what C.S. Lewis still has to say) about the ceiling of language models.',
    tags: ['essay', 'language', 'knowledge graphs'],
  },
  {
    title: 'Pinecone Search Documentation',
    to: '/docs/case-studies/writing-pinecone-docs',
    meta: 'Writing',
    desc:
      'Owned the SDK, API, and retrieval narrative for Pinecone Search — the documentation surface developers hit first when evaluating vector retrieval at scale.',
    tags: ['technical writing', 'sdk', 'rag'],
  },
];

const SECTIONS = [
  {id: 'about', label: 'About'},
  {id: 'writing', label: 'Writing'},
  {id: 'work', label: 'Selected Work'},
];

// ---------- ICONS ----------
function GitHubIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.27-1.7-1.27-1.7-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.45.11-3.03 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.74.11 3.03.73.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.8.55 4.57-1.52 7.85-5.83 7.85-10.91C23.5 5.66 18.35.5 12 .5z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 0h-14C2.24 0 0 2.24 0 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5zM8 19H5V8h3v11zM6.5 6.73A1.77 1.77 0 1 1 6.5 3.2a1.77 1.77 0 0 1 0 3.53zM20 19h-3v-5.6c0-3.37-4-3.11-4 0V19h-3V8h3v1.77c1.4-2.59 7-2.78 7 2.48V19z" />
    </svg>
  );
}

// ---------- HOOKS ----------
function useSpotlight() {
  useEffect(() => {
    const onMove = (e) => {
      document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
      document.documentElement.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      {rootMargin: '-40% 0px -55% 0px'}
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

// ---------- COMPONENTS ----------
function ProjectItem({item}) {
  return (
    <Link to={item.to} className={styles.project}>
      <div className={styles.projectMeta}>{item.meta}</div>
      <div className={styles.projectBody}>
        <h3 className={styles.projectTitle}>
          {item.title} <span className={styles.arrow}>↗</span>
        </h3>
        <p className={styles.projectDesc}>{item.desc}</p>
        <div className={styles.tags}>
          {item.tags.map((t) => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function LeftPane({active}) {
  return (
    <aside className={styles.left}>
      <img
        src="/img/headshot.png"
        alt="Andrew Yu"
        className={styles.avatar}
        width={88}
        height={88}
      />
      <h1 className={styles.name}>Andrew Yu</h1>
      <p className={styles.role}>AI Strategist &amp; Senior Technical Writer</p>
      <p className={styles.tagline}>
        I apply first principles to AI &amp; language — shipping RAG pipelines
        and content systems from lab to production.
      </p>

      <nav className={styles.toc} aria-label="Section navigation">
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={active === s.id ? styles.tocActive : ''}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.socials}>
        <a
          href="https://github.com/andrewyu47"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub">
          <GitHubIcon />
        </a>
        <a
          href="https://www.linkedin.com/in/andrewyu47"
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn">
          <LinkedInIcon />
        </a>
      </div>
    </aside>
  );
}

function RightPane() {
  return (
    <main className={styles.right}>
      {/* ABOUT */}
      <section id="about" className={styles.section}>
        <div className={styles.eyebrow}>About</div>
        <div className={styles.aboutBody}>
          <p>
            I&rsquo;m a technical leader who builds{' '}
            <span className={styles.serif}>language systems</span> that ship —
            from RAG pipelines and AI agents to the documentation and governance
            scaffolding that makes them safe in production.
          </p>
          <p>
            Currently focused on <strong>GenAI content strategy</strong> after a
            decade across <strong>Pinecone, Splunk, and Workday</strong>. I move
            fast on prototypes, slow on the parts that matter, and care about
            the gap between a demo and a deployed system.
          </p>
          <p>
            Outside of work I write essays on the limits of language models and
            build small tools for student ministry contexts.
          </p>
        </div>
      </section>

      {/* WRITING */}
      <section id="writing" className={styles.section}>
        <div className={styles.eyebrow}>Writing</div>
        <div className={styles.projects}>
          {WRITING.map((item) => (
            <ProjectItem key={item.to} item={item} />
          ))}
        </div>
      </section>

      {/* SELECTED WORK */}
      <section id="work" className={styles.section}>
        <div className={styles.eyebrow}>Selected Work</div>
        <div className={styles.projects}>
          {SELECTED_WORK.map((item) => (
            <ProjectItem key={item.to} item={item} />
          ))}
        </div>
        <Link to="/case-studies" className={styles.more}>
          View the full archive
        </Link>
      </section>
    </main>
  );
}

export default function Home() {
  useSpotlight();
  const active = useActiveSection(SECTIONS.map((s) => s.id));
  return (
    <Layout
      title="Home"
      description="Andrew Yu — AI Strategist & Senior Technical Writer. Shipping language systems from lab to production.">
      <div className={styles.spotlight} aria-hidden="true" />
      <div className={styles.page}>
        <div className={styles.layout}>
          <LeftPane active={active} />
          <RightPane />
        </div>
      </div>
    </Layout>
  );
}
