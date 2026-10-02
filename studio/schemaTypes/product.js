import { defineField, defineType } from 'sanity';
import { photoField, orderField } from './image.js';

export default defineType({
  name: 'product',
  title: 'Merch product',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Full name', type: 'string', description: 'e.g. Planet Rose Skull Tee', validation: (r) => r.required() }),
    defineField({ name: 'shortName', title: 'Short name (on the card)', type: 'string', description: 'e.g. Skull Tee' }),
    defineField({ name: 'slug', title: 'ID', type: 'slug', options: { source: 'name' }, description: 'Click "Generate"', validation: (r) => r.required() }),
    defineField({ name: 'price', title: 'Price', type: 'string', description: 'e.g. $30', validation: (r) => r.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
    defineField({
      name: 'sizes', title: 'Sizes', type: 'array', of: [{ type: 'string' }],
      options: { list: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'One size'] },
      description: 'Tick the sizes available'
    }),
    photoField('image', 'Photo', { validation: (r) => r.required() }),
    defineField({ name: 'available', title: 'Show on the website', type: 'boolean', initialValue: true }),
    orderField
  ],
  orderings: [{ title: 'Position', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'price', media: 'image' } }
});
