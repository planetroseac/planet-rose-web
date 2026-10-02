import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'siteSettings',
  title: 'Business info, prices & hours',
  type: 'document',
  groups: [
    { name: 'contact', title: 'Contact', default: true },
    { name: 'social', title: 'Social & links' },
    { name: 'prices', title: 'Prices' },
    { name: 'hours', title: 'Hours' },
    { name: 'address', title: 'Address' }
  ],
  fields: [
    defineField({ name: 'phone', title: 'Phone (for the call button)', type: 'string', group: 'contact',
      description: 'With country code, no spaces: +16408009030' }),
    defineField({ name: 'phoneDisplay', title: 'Phone (as shown on the site)', type: 'string', group: 'contact',
      description: '(640) 800-9030' }),
    defineField({ name: 'email', title: 'Email', type: 'string', group: 'contact' }),

    defineField({ name: 'instagramUrl', title: 'Instagram link', type: 'url', group: 'social' }),
    defineField({ name: 'instagramHandle', title: 'Instagram @name', type: 'string', group: 'social' }),
    defineField({ name: 'facebookUrl', title: 'Facebook link', type: 'url', group: 'social' }),
    defineField({ name: 'tiktokUrl', title: 'TikTok link', type: 'url', group: 'social', description: 'Leave empty to hide' }),
    defineField({ name: 'googleReviewUrl', title: 'Google review link', type: 'url', group: 'social',
      description: 'From Google Business Profile → "Ask for reviews". Shows a "Leave us a Google review" link. Leave empty to hide.' }),
    defineField({ name: 'calendlyUrl', title: 'VIP availability (Calendly) link', type: 'url', group: 'social' }),
    defineField({ name: 'mapsUrl', title: 'Google Maps directions link', type: 'url', group: 'social' }),

    defineField({ name: 'songPrice', title: 'Price per song', type: 'string', group: 'prices', description: 'e.g. $2' }),
    defineField({ name: 'coverRange', title: 'Cover (big number)', type: 'string', group: 'prices', description: 'e.g. $5–$10' }),
    defineField({ name: 'coverNote', title: 'Cover (small line)', type: 'string', group: 'prices', description: 'e.g. Sun–Thu $5 · Fri–Sat $10' }),
    defineField({
      name: 'merchCard', title: 'Merch card in the drinks menu', type: 'object', group: 'prices',
      fields: [
        defineField({ name: 'description', title: 'Line', type: 'string' }),
        defineField({ name: 'price', title: 'Price', type: 'string' })
      ]
    }),

    defineField({
      name: 'hours', title: 'Opening hours', type: 'array', group: 'hours',
      description: 'Write days like "Mon – Wed" or "Sunday" and times like "9PM – 2AM". Google reads these too.',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'days', title: 'Days', type: 'string' }),
          defineField({ name: 'time', title: 'Time', type: 'string' }),
          defineField({ name: 'late', title: 'Show "Late" tag', type: 'boolean', initialValue: false })
        ],
        preview: { select: { title: 'days', subtitle: 'time' } }
      }]
    }),
    defineField({ name: 'hoursNote', title: 'Note under the hours', type: 'text', rows: 2, group: 'hours' }),

    defineField({ name: 'addressVenue', title: 'Venue line', type: 'string', group: 'address', description: 'Inside Tropicana Atlantic City' }),
    defineField({ name: 'addressStreet', title: 'Street', type: 'string', group: 'address' }),
    defineField({ name: 'addressCity', title: 'City', type: 'string', group: 'address' }),
    defineField({ name: 'addressRegion', title: 'State', type: 'string', group: 'address' }),
    defineField({ name: 'addressZip', title: 'ZIP', type: 'string', group: 'address' })
  ],
  preview: { prepare: () => ({ title: 'Business info, prices & hours' }) }
});
