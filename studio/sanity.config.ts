import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemas } from './schemas';

export default defineConfig({
  name: 'espai-barri-vell',
  title: 'Espai Barri Vell',
  projectId: 'eg9ie07c',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Contingut')
          .items([
            S.documentTypeListItem('exposicio').title('Exposicions'),
            S.documentTypeListItem('artista').title('Artistes'),
            S.documentTypeListItem('obra').title('Obres (Botiga)'),
            S.documentTypeListItem('post').title('Blog'),
            S.divider(),
            S.listItem()
              .title("Pàgina L'Espai")
              .child(S.document().schemaType('paginaEspai').documentId('paginaEspai')),
          ]),
    }),
    visionTool(),
  ],
  schema: { types: schemas },
});
