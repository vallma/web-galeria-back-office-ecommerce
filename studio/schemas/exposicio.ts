import { defineField, defineType } from 'sanity';

export const exposicio = defineType({
  name: 'exposicio',
  title: 'Exposició',
  type: 'document',
  fields: [
    defineField({ name: 'titol', title: 'Títol', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'titol' }, validation: r => r.required() }),
    defineField({ name: 'dataInici', title: "Data d'inici", type: 'date', validation: r => r.required() }),
    defineField({ name: 'dataFi', title: 'Data de fi', type: 'date' }),
    defineField({ name: 'descripcioBreve', title: 'Descripció breu', type: 'text', rows: 2 }),
    defineField({ name: 'descripcio', title: 'Descripció completa', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'imatgePrincipal', title: 'Imatge principal', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'imatges', title: "Galeria d'imatges", type: 'array', of: [{ type: 'image', options: { hotspot: true } }] }),
    defineField({ name: 'artistes', title: 'Artistes', type: 'array', of: [{ type: 'reference', to: [{ type: 'artista' }] }] }),
  ],
  preview: { select: { title: 'titol', subtitle: 'dataInici', media: 'imatgePrincipal' } },
  orderings: [{ title: "Data d'inici (més recent)", name: 'dataIniciDesc', by: [{ field: 'dataInici', direction: 'desc' }] }],
});
