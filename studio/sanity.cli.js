import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'rbi9h8dn',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production'
  },
  // The panel will live at https://planetrose.sanity.studio
  studioHost: 'planetrose'
});
