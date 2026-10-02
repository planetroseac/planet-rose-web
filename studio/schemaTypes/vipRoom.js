import { defineField, defineType } from 'sanity';
import { photoField } from './image.js';

export default defineType({
  name: 'vipRoom',
  title: 'VIP Room',
  type: 'document',
  fields: [
    defineField({ name: 'intro', title: 'Intro text', type: 'text', rows: 3 }),
    photoField('mainImage', 'Main photo'),
    defineField({ name: 'caption', title: 'Label on the main photo', type: 'string', description: 'e.g. VIP Room · up to 20 guests' }),
    defineField({
      name: 'thumbs', title: 'Small photos under the main one', type: 'array',
      of: [{ type: 'image', options: { hotspot: true },
        fields: [{ name: 'alt', title: 'Photo description', type: 'string' }] }],
      validation: (r) => r.max(4)
    }),
    defineField({
      name: 'specs', title: 'Details grid', type: 'array',
      description: 'Each box: label + optional yellow price + text. e.g. Rate · $10 · / person / hr',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'label', title: 'Label', type: 'string' }),
          defineField({ name: 'price', title: 'Yellow price (optional)', type: 'string' }),
          defineField({ name: 'value', title: 'Text', type: 'string' })
        ],
        preview: { select: { title: 'label', price: 'price', value: 'value' },
          prepare: ({ title, price, value }) => ({ title, subtitle: [price, value].filter(Boolean).join(' ') }) }
      }]
    }),
    defineField({ name: 'finePrint', title: 'Small print under the buttons', type: 'text', rows: 2 })
  ],
  preview: { prepare: () => ({ title: 'VIP Room' }) }
});
