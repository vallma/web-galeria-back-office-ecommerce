import { defineField, defineType } from 'sanity';

export const obra = defineType({
  name: 'obra',
  title: 'Obra',
  type: 'document',
  fields: [
    defineField({ name: 'titol', title: 'Títol', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'titol' }, validation: r => r.required() }),
    defineField({ name: 'artista', title: 'Artista', type: 'reference', to: [{ type: 'artista' }] }),
    defineField({ name: 'any', title: 'Any', type: 'number' }),
    defineField({ name: 'tecnica', title: 'Tècnica', type: 'string' }),
    defineField({ name: 'dimensions', title: 'Dimensions', type: 'string', description: 'ex: 80 × 60 cm' }),
    defineField({ name: 'preu', title: 'Preu (€)', type: 'number', validation: r => r.required().positive() }),
    defineField({ name: 'imatges', title: 'Imatges', type: 'array', of: [{ type: 'image', options: { hotspot: true } }], validation: r => r.required().min(1) }),
    defineField({ name: 'sold', title: 'Venuda', type: 'boolean', initialValue: false }),
    defineField({ name: 'stripeProductId', title: 'Stripe Price ID', type: 'string', description: 'price_xxx de Stripe (afegir un cop creada a Stripe)' }),
  ],
  preview: {
    select: { title: 'titol', subtitle: 'artista.nom', media: 'imatges.0', sold: 'sold' },
    prepare({ title, subtitle, media, sold }) {
      return { title: sold ? `[VENUDA] ${title}` : title, subtitle, media };
    },
  },
});
