import { defineField, defineType } from 'sanity';
import { photoField, orderField } from './image.js';

export default defineType({
  name: 'galleryPhoto',
  title: 'Gallery photo',
  type: 'document',
  fields: [
    photoField('image', 'Photo', { validation: (r) => r.required() }),
    defineField({ name: 'wide', title: 'Wide photo (landscape banner)', type: 'boolean', initialValue: false }),
    orderField
  ],
  orderings: [{ title: 'Position', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'image.alt', media: 'image', order: 'order' },
    prepare: ({ title, media, order }) => ({ title: title || 'Photo', subtitle: `Position ${order ?? '—'}`, media }) }
});
