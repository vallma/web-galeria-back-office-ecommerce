import { createClient } from '@sanity/client';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';
const isSanityConfigured = projectId && projectId !== 'placeholder';

export const sanityClient = createClient({
  projectId: projectId ?? 'placeholder',
  dataset,
  useCdn: true,
  apiVersion: '2024-01-01',
});

async function safeFetch<T>(query: string, params?: Record<string, unknown>, fallback: T = [] as unknown as T): Promise<T> {
  if (!isSanityConfigured) return fallback;
  try {
    return await sanityClient.fetch<T>(query, params);
  } catch {
    return fallback;
  }
}

// Helper para URLs de imágenes de Sanity
export function imageUrl(ref: string, projectId: string, dataset: string): string {
  const [, id, dimensions, format] = ref.split('-');
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`;
}

// Queries GROQ
export async function getExposicions() {
  return safeFetch(`
    *[_type == "exposicio"] | order(dataInici desc) {
      _id, titol, "slug": slug.current, dataInici, dataFi, descripcioBreve,
      artistes[]->{ nom },
      "imatgePrincipal": imatgePrincipal.asset->url
    }
  `);
}

export async function getExposicioBySlug(slug: string) {
  return safeFetch(`
    *[_type == "exposicio" && slug.current == $slug][0] {
      _id, titol, "slug": slug.current, dataInici, dataFi, descripcio,
      "imatgePrincipal": imatgePrincipal.asset->url,
      "imatges": imatges[].asset->url,
      artistes[]->{ nom, "slug": slug.current, "foto": foto.asset->url }
    }
  `, { slug }, null);
}

export async function getArtistes() {
  return safeFetch(`
    *[_type == "artista"] | order(nom asc) {
      _id, nom, "slug": slug.current, bioBreu,
      "foto": foto.asset->url
    }
  `);
}

export async function getArtistaBySlug(slug: string) {
  return safeFetch(`
    *[_type == "artista" && slug.current == $slug][0] {
      _id, nom, "slug": slug.current, bio, "foto": foto.asset->url,
      "exposicions": *[_type == "exposicio" && references(^._id)] {
        titol, "slug": slug.current, dataInici, dataFi,
        "imatgePrincipal": imatgePrincipal.asset->url
      },
      "obres": *[_type == "obra" && references(^._id)] | order(_createdAt desc) {
        titol, "slug": slug.current, sold,
        "img": imatges[0].asset->url
      }
    }
  `, { slug }, null);
}

export async function getObres() {
  return safeFetch(`
    *[_type == "obra" && sold != true] | order(_createdAt desc) {
      _id, titol, "slug": slug.current, preu, dimensions, tecnica, any, sold, categoria,
      "imatgePrincipal": imatges[0].asset->url,
      artista->{ nom, "slug": slug.current }
    }
  `);
}

export async function getObraBySlug(slug: string) {
  return safeFetch(`
    *[_type == "obra" && slug.current == $slug][0] {
      _id, titol, "slug": slug.current, preu, dimensions, tecnica, any, sold, categoria,
      "imatges": imatges[].asset->url,
      artista->{ nom, "slug": slug.current, "foto": foto.asset->url }
    }
  `, { slug }, null);
}

export async function getPosts() {
  return safeFetch(`
    *[_type == "post"] | order(dataPublicacio desc) {
      _id, titol, "slug": slug.current, dataPublicacio, extracte, categoria,
      "imatgePrincipal": imatgePrincipal.asset->url
    }
  `);
}

export async function getPostBySlug(slug: string) {
  return safeFetch(`
    *[_type == "post" && slug.current == $slug][0] {
      _id, titol, "slug": slug.current, dataPublicacio, cos,
      "imatgePrincipal": imatgePrincipal.asset->url
    }
  `, { slug }, null);
}

export async function getPaginaEspai() {
  return safeFetch(`*[_type == "paginaEspai"][0] {
    titol, cos, "imatges": imatges[].asset->url,
    equip[]{ nom, carrec, "foto": foto.asset->url }
  }`, {}, null);
}

// Exposició per al hero de la home: la que està en curs avui;
// si no n'hi ha cap, la propera; i si tampoc, la més recent.
export async function getExposicioHero() {
  const res = await safeFetch<{ actual: unknown; propera: unknown; ultima: unknown } | null>(`{
    "actual": *[_type == "exposicio" && dataInici <= now() && (!defined(dataFi) || dataFi >= now())] | order(dataInici desc)[0]{
      _id, titol, "slug": slug.current, dataInici, dataFi,
      artistes[]->{ nom },
      "portada": coalesce(portada.asset->url, imatgePrincipal.asset->url)
    },
    "propera": *[_type == "exposicio" && dataInici > now()] | order(dataInici asc)[0]{
      _id, titol, "slug": slug.current, dataInici, dataFi,
      artistes[]->{ nom },
      "portada": coalesce(portada.asset->url, imatgePrincipal.asset->url)
    },
    "ultima": *[_type == "exposicio"] | order(dataInici desc)[0]{
      _id, titol, "slug": slug.current, dataInici, dataFi,
      artistes[]->{ nom },
      "portada": coalesce(portada.asset->url, imatgePrincipal.asset->url)
    }
  }`, undefined, null);
  return res?.actual ?? res?.propera ?? res?.ultima ?? null;
}
