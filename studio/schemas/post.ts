import { defineField, defineType } from 'sanity';

export const post = defineType({
  name: 'post',
  title: 'Post del Blog',
  type: 'document',
  fields: [
    defineField({ name: 'titol', title: 'Títol', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'titol' }, validation: r => r.required() }),
    defineField({ name: 'dataPublicacio', title: 'Data de publicació', type: 'datetime', initialValue: () => new Date().toISOString() }),
    defineField({ name: 'extracte', title: 'Extracte', type: 'text', rows: 3 }),
    defineField({ name: 'imatgePrincipal', title: 'Imatge principal', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'cos',
      title: 'Contingut',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
  ],
  preview: { select: { title: 'titol', subtitle: 'dataPublicacio', media: 'imatgePrincipal' } },
  orderings: [{ title: 'Data publicació (més recent)', name: 'dataPublicacioDesc', by: [{ field: 'dataPublicacio', direction: 'desc' }] }],
});
