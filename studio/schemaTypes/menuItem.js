import { defineField, defineType } from 'sanity';
import { photoField, orderField } from './image.js';

export default defineType({
  name: 'menuItem',
  title: 'Drinks menu card',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'description', title: 'Short line', type: 'string' }),
    defineField({ name: 'price', title: 'Price', type: 'string', description: 'e.g. $15 or $8–$9' }),
    defineField({ name: 'priceIsNote', title: 'Show the price as small text (not yellow)', type: 'boolean', initialValue: false,
      description: 'For things like "At the bar"' }),
    photoField('image', 'Photo', { validation: (r) => r.required() }),
    orderField
  ],
  orderings: [{ title: 'Position', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'price', media: 'image' } }
});
