import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)} style={{padding: '4rem 0', textAlign: 'center'}}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div style={{marginTop: '2rem'}}>
          <Link
            className="button button--secondary button--lg"
            to="/resume">
            View My Resume
          </Link>
          <span style={{margin: '0 10px'}}></span>
          <Link
            className="button button--secondary button--lg"
            to="/docs/case-studies/splunk-ai">
            See Case Studies
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
      title={`Hello from ${siteConfig.title}`}
      description="My Portfolio">
      <HomepageHeader />
      <main>
        <div className="container" style={{padding: '2rem', textAlign: 'center'}}>
          <h2>About Me</h2>
          <p>
            I am a Technical Documentation Manager and AI Strategist with over 10 years of experience 
            at Splunk, Cisco, and Workday. I specialize in Docs-as-Code, AI Governance, and 
            Instructional Design.
          </p>
        </div>
      </main>
    </Layout>
  );
}