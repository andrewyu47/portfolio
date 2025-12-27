import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">
           {/* The Headline */}
          Technical Leader applying First Principles to AI & Language.
        </h1>
        <p className={clsx('hero__subtitle', styles.heroSubtitle)}>
           {/* The Hybrid Blurb */}
          I deconstruct complex user problems to their root causes, leveraging Systems Theory 
          to treat LLMs as probabilistic engines requiring rigorous governance. 
          With over a decade of leadership at <strong>Cisco, Splunk, and Workday</strong>, 
          I specialize in rapid prototyping, RAG pipelines, and driving roadmaps from lab to production.
        </p>
        <div className={styles.heroButtons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/case-studies/project-sage">
            View Case Studies
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Andrew`}
      description="Technical Leader synthesizing Language, Technology, and GenAI">
      <HomepageHeader />
      <main>
        {/* SAGE FEATURE SECTION */}
        <section className={styles.featureSection}> 
          <div className="container">
            <div className="row">
              <div className="col col--6">
                <h2>Top AI Hackathon Winner: Project SAGE</h2>
                <p>
                  <strong>Selection Agent with Guided Explanations</strong><br/>
                  I led the cross-functional team that built "SAGE," a RAG-based support agent that reduces ticket volume by 20%. 
                  It synthesizes live DOM signals with static documentation to provide instant resolution.
                </p>
                <div className={styles.buttons}>
                  <Link
                    className="button button--primary button--lg"
                    to="/docs/case-studies/project-sage"> {/* This one was already correct */}
                    View Case Study
                  </Link>
                </div>
              </div>
              <div className="col col--6">
                <img 
                  src="/img/sage-hero.png" 
                  alt="Sage Interface" 
                  className={styles.featureImage}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}