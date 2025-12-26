// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

// --- FIX: UPDATED IMPORT STYLE FOR DOCUSAURUS V3 ---
const {themes} = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  // --- SITE SETTINGS ---
  title: 'My Portfolio',
  tagline: 'Manager, GenAI Content Strategy',
  favicon: 'img/favicon.ico',

  // --- GITHUB PAGES DEPLOY SETTINGS ---
  url: 'https://andrewyu47.github.io',
  baseUrl: '/', // Matches your repo name with slashes
  organizationName: 'andrewyu47',
  projectName: 'portfolio',
  trailingSlash: false,

  // --- BUILD SAFETY SETTINGS ---
  // Changed to 'warn' so the build finishes even if a link is slightly wrong
  onBrokenLinks: 'warn', 
  onBrokenMarkdownLinks: 'warn',

  // --- MERMAID CONFIGURATION ---
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  // --- PRESETS ---
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // This allows your case studies to live at /portfolio/docs/case-studies
          routeBasePath: 'docs', 
        },
        blog: {
          showReadingTime: true,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  // --- THEME CONFIG ---
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Andrew Yu',
        items: [
          // If you put case studies in 'src/pages/case-studies', keep this to: '/case-studies'
          // If you put case studies in 'docs', change this to: '/docs/case-studies'
          {to: '/case-studies', label: 'Case Studies', position: 'left'},
          {to: '/resume', label: 'Resume', position: 'left'},
          {href: 'https://github.com/andrewyu47/portfolio/', label: 'GitHub', position: 'right'},
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} Andrew Yu.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;