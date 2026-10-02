import { defineField } from 'sanity';

// Every photo carries a short description: Google reads it and so do screen readers.
export const photoField = (name, title, options = {}) =>
  defineField({
    name,
    title,
    type: 'image',
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Photo description',
        type: 'string',
        description: 'One short sentence describing the photo, e.g. "Two friends singing on stage". Helps Google and blind visitors.',
        validation: (r) => r.required().warning('Add a short description')
      })
    ],
    ...options
  });

export const orderField = defineField({
  name: 'order',
  title: 'Position',
  type: 'number',
  description: '1 = shows first. Use 10, 20, 30… so you can slot new items in between later.',
  initialValue: 100
});
