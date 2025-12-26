import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)} style={{padding: '4rem 0', textAlign: 'center'}}>
      <div className="container">
        <h1 className="hero__title">
          Technical Leader synthesizing Language, Technology, and GenAI.
        </h1>
        <p className="hero__subtitle" style={{maxWidth: '800px', margin: '0 auto', fontSize: '1.25rem', lineHeight: '1.6'}}>
          I architect the systems that make AI safe, scalable, and semantically precise. 
          With over a decade of technical leadership at Cisco, Splunk, and Workday, 
          I specialize in RAG Architecture, Governance Frameworks, and Developer Experience 
          at enterprise scale.
        </p>
        <div className={styles.buttons} style={{marginTop: '2rem'}}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/case-studies/sage">
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
      title={`Hello from ${siteConfig.title}`}
      description="Technical Leader synthesizing Language, Technology, and GenAI">
      <HomepageHeader />
      <main>
        {/* SAGE FEATURE SECTION */}
        <section style={{padding: '4rem 0', backgroundColor: '#f5f6f7', color: 'black'}}> 
        {/* Added color: black to ensure text is visible on light background if your theme is dark mode */}
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
                    to="/docs/case-studies/project-sage"> 
                    View Case Study
                  </Link>
                </div>
              </div>
              <div className="col col--6">
                {/* Ensure you have an image at static/img/sage-screen.png or this will show broken */}
                <img 
                  src="/img/sage-hero.png" 
                  alt="Sage Interface" 
                  style={{borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                />
              </div>
            </div>
          </div>
        </section>

        <HomepageFeatures /> 
      </main>
    </Layout>
  );
}