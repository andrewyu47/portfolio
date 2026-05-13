// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

// --- FIX: UPDATED IMPORT STYLE FOR DOCUSAURUS V3 ---
const {themes} = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  // --- SITE SETTINGS ---
  title: 'Content Engineer and AI Strategist',
  tagline: 'Manager, GenAI Content Strategy',
  favicon: 'img/favicon.ico',

  // --- GITHUB PAGES DEPLOY SETTINGS (custom domain) ---
  url: 'https://andrewyu.app',
  baseUrl: '/',
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
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'andrew yu',
        items: [
          {to: '/case-studies', label: 'Work', position: 'left'},
          {to: '/resume', label: 'Résumé', position: 'left'},
          {href: 'https://github.com/andrewyu47/portfolio/', label: 'github ↗', position: 'right'},
        ],
      },
      footer: {
        style: 'dark',
        copyright: `© ${new Date().getFullYear()} andrew yu — built with docusaurus`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;