import { defineField, defineType } from 'sanity';

export const paginaEspai = defineType({
  name: 'paginaEspai',
  title: "Pàgina L'Espai",
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({ name: 'titol', title: 'Títol', type: 'string', initialValue: "L'Espai" }),
    defineField({ name: 'cos', title: 'Text', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'imatges', title: 'Imatges', type: 'array', of: [{ type: 'image', options: { hotspot: true } }] }),
  ],
  preview: { prepare: () => ({ title: "Pàgina L'Espai" }) },
});
