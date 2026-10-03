import { defineConfig } from 'astro/config';

// Official address of the site (used by Google, the sitemap and share previews).
export default defineConfig({
  site: process.env.SITE_URL || 'https://planetroseac.com',
  output: 'static',
  build: { inlineStylesheets: 'never' }
});
