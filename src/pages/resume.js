import React from 'react';
import Layout from '@theme/Layout';

export default function Resume() {
  return (
    <Layout title="Resume" description="Professional Resume">
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            
            <div style={{textAlign: 'center', marginBottom: '2rem'}}>
              <h1>Your Name</h1>
              <p><strong>Learning Design Manager & AI Strategist</strong></p>
              <p>City, State | Phone | Email | LinkedIn | GitHub</p>
            </div>
            
            <hr />

            <h2>EXPERIENCE</h2>
            
            <h3>Splunk / Cisco – Technical Documentation Manager</h3>
            <p><em>May 2024 – Current</em></p>
            <ul>
                <li><strong>Founded</strong> the cross-functional IX AI Council, integrating AI workflows to measurably increase content velocity by <strong>25%</strong>.</li>
                <li><strong>Architected</strong> AI prompt library and training assessments, enabling <strong>60+</strong> staff to adopt new doc tools safely and efficiently.</li>
                <li><strong>Led</strong> a high-performing team of 6 writers/designers across <strong>12+</strong> major releases, maintaining a <strong>100%</strong> retention rate.</li>
                <li><strong>Reduced</strong> global translation/localization costs by <strong>20%</strong> by implementing reuse strategies and scalable authoring standards.</li>
                <li><strong>Directed</strong> a comprehensive content migration, retiring <strong>5,000+</strong> obsolete pages to improve search relevance by <strong>20%</strong>.</li>
            </ul>

            <h3>Splunk – Senior Staff Technical Writer</h3>
            <p><em>Sep 2020 – May 2024</em></p>
            <ul>
                <li><strong>Spearheaded</strong> enablement and content strategy using instructional design principles to accelerate proficiency by <strong>20%</strong>.</li>
                <li><strong>Authored</strong> <strong>500+</strong> pages of complex data management documentation, driving a <strong>12%</strong> increase in key product adoption metrics.</li>
                <li><strong>Partnered</strong> with Product Management to produce targeted enablement assets, reducing data onboarding time by <strong>2</strong> weeks.</li>
                <li><strong>Mentored</strong> <strong>3</strong> junior writers on scalable Docs-as-Code workflows, increasing overall team output and deployment speed by <strong>30%</strong>.</li>
                <li><strong>Revamped</strong> developer-facing API docs and SDK guides, reducing integration tickets by <strong>20%</strong> and improving developer morale.</li>
            </ul>

             <h3>Workday – Technical Writer</h3>
            <p><em>Apr 2015 – Sep 2020</em></p>
            <ul>
                <li><strong>Refactored</strong> <strong>300+</strong> legacy in-app messages/assets, improving content clarity and reducing user errors by <strong>15%</strong>.</li>
                <li><strong>Orchestrated</strong> detailed weekly release notes for 4 domains, ensuring consistent <strong>100%</strong> on-time Agile delivery cycles.</li>
                <li><strong>Generated</strong> interactive job aids for <strong>10,000+</strong> global users, significantly reducing support channel dependency and ticket volume.</li>
            </ul>

            <hr />

            <h2>RELEVANT PROJECTS</h2>
            <ul>
                <li><strong>Style Guide Compliance App:</strong> Built with Codex, automating simple style reviews to effectively cut audit time by <strong>40%</strong>.</li>
                <li><strong>Top AI Hackathon Winner:</strong> Engineered a selection agent with guided explanations to reduce incoming ticket volume by <strong>20%</strong>.</li>
                <li><strong>Docs-as-Code:</strong> Directed content migration to Markdown/Git, improving content release frequency by <strong>30%</strong>.</li>
            </ul>

            <hr />

            <h2>LEADERSHIP AND PROFESSIONAL DEVELOPMENT</h2>
            <ul>
                <li><strong>Delivered</strong> “Optimize Decision-Making” masterclass on mental model frameworks to <strong>200+</strong> attendees.</li>
                <li><strong>Designed</strong> weekly seminars to synthesize abstract philosophical concepts into logical arguments for <strong>20+</strong> students.</li>
                <li><strong>Structured</strong> tiered learning curricula using <strong>Bloom’s Taxonomy</strong>, ensuring measurable concept mastery for <strong>50+</strong> participants.</li>
            </ul>

             <hr />
             
             <h2>SKILLS</h2>
             <p><strong>Languages & Formats:</strong> Python, HTML/CSS, XML, JSON, YAML, Markdown, SPL (Splunk), JavaScript</p>
             <p><strong>Dev Tools & AI:</strong> Git/GitHub, VS Code, Figma, Make, Postman, Codex, Xcode, Claude Code, Gemini, Prompting Essentials</p>

            <div style={{marginTop: '3rem', textAlign: 'center'}}>
                <a className="button button--primary button--lg" href="#">Download PDF Resume</a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}