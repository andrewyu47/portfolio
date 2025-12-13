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
  tagline: 'Technical Documentation Manager & AI Architect',
  favicon: 'img/favicon.ico',
  
  // --- GITHUB PAGES DEPLOY SETTINGS (Your updates look good here!) ---
  url: 'https://andrewyu47.github.io',
  baseUrl: '/portfolio/', // Matches projectName below
  organizationName: 'andrewyu47', 
  projectName: 'portfolio', // Matches baseUrl above
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // --- MERMAID CONFIGURATION (MUST BE INSIDE THE BRACKETS) ---
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
          {to: '/case-studies', label: 'Case Studies', position: 'left'},
          {href: 'https://github.com/andrewyu47/portfolio', label: 'GitHub', position: 'right'},
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
}; // <--- THIS CLOSING BRACKET MUST BE AT THE VERY END

module.exports = config;