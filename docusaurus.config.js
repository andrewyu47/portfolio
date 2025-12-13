// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

// --- FIX: UPDATED IMPORT STYLE FOR DOCUSAURUS V3 ---
const {themes} = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  // --- SITE SETTINGS ---
  title: 'My Portfolio', // Change this to your actual name
  tagline: 'Technical Documentation Manager & Architect',
  url: 'https://andrewyu47.github.io', // Your production URL
  baseUrl: '/', 
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

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
        title: 'My Portfolio',
        items: [
          // This links to your new Case Studies folder
          {to: '/case-studies', label: 'Case Studies', position: 'left'},
          {href: 'https://github.com/andrewyu47/portfolio/tree/main/docs/case-studies', label: 'GitHub', position: 'right'},
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} My Portfolio.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;