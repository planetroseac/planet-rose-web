import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes/index.js';

// One-of-a-kind documents: they appear as a single page, not a list
const SINGLETONS = ['siteSettings', 'vipRoom'];

export default defineConfig({
  name: 'planet-rose',
  title: 'Planet Rose',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'rbi9h8dn',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Planet Rose')
          .items([
            S.listItem().title('Business info, prices & hours').id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.listItem().title('VIP Room').id('vipRoom')
              .child(S.document().schemaType('vipRoom').documentId('vipRoom')),
            S.divider(),
            S.documentTypeListItem('product').title('Shop · Merch'),
            S.documentTypeListItem('menuItem').title('Drinks menu'),
            S.documentTypeListItem('galleryPhoto').title('Gallery photos')
          ])
    })
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETONS.includes(schemaType))
  },

  document: {
    // Singletons can be edited and published, never duplicated or deleted
    actions: (actions, { schemaType }) =>
      SINGLETONS.includes(schemaType)
        ? actions.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : actions
  }
});
