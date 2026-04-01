import { defineField, defineType } from 'sanity';

export const artista = defineType({
  name: 'artista',
  title: 'Artista',
  type: 'document',
  fields: [
    defineField({ name: 'nom', title: 'Nom', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'nom' }, validation: r => r.required() }),
    defineField({ name: 'bioBreu', title: 'Bio breu', type: 'text', rows: 2 }),
    defineField({ name: 'bio', title: 'Biografia completa', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true } }),
  ],
  preview: { select: { title: 'nom', media: 'foto' } },
});
