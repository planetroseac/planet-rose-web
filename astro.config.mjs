import { defineConfig } from 'astro/config';

// SITE_URL is set in Netlify once the domain is ready (e.g. https://planetroseac.com).
export default defineConfig({
  site: process.env.SITE_URL || 'https://planetrose.netlify.app',
  output: 'static',
  build: { inlineStylesheets: 'never' }
});
