// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// Pages under this prefix are reachable by link but never listed: not in the nav, not in the sitemap.
const UNLISTED_PREFIX = '/for/';

// https://astro.build/config
export default defineConfig({
  site: 'https://andrewyu.app',
  trailingSlash: 'never',
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith(UNLISTED_PREFIX),
    }),
  ],
  adapter: vercel(),
  // Code samples are colored from CSS variables set in src/styles/tokens.css.
  markdown: { shikiConfig: { theme: 'css-variables' } },
  // The previous site was Docusaurus. Keep its public URLs alive.
  redirects: {
    '/case-studies': '/work',
    '/docs/case-studies': '/work',
    '/docs/case-studies/project-sage': '/work/sage',
    '/docs/case-studies/docops-governance-workbench': '/work/docops-governance-workbench',
    '/docs/case-studies/youtube-content-pipeline': '/work/youtube-content-pipeline',
    '/docs/case-studies/ix-ai-council': '/work/ix-ai-council',
    '/docs/case-studies/quickramp': '/work/quickramp',
    '/docs/case-studies/fold': '/work/fold',
    '/docs/case-studies/writing-lecun-lewis': '/writing/lecun-lewis-limits-of-language',
    '/docs/case-studies/writing-pinecone-docs': '/work/pinecone-search-docs',
  },
  devToolbar: { enabled: false },
});
