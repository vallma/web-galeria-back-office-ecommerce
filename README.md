# Espai Barri Vell — Web oficial

Reconstrucció completa de [espaibarrivell.com](https://espaibarrivell.com) en codi real i escalable. Galeria d'art contemporani al casc antic de Girona.

## Arquitectura general

```
┌─────────────────┐     GROQ queries      ┌──────────────────┐
│  Astro (SSG)    │ ◄──────────────────── │  Sanity Studio   │
│  HTML estàtic   │                        │  Back office CMS │
└────────┬────────┘                        └──────────────────┘
         │ Stripe Checkout (hosted)
         ▼
┌─────────────────┐   checkout.session.completed   ┌──────────────────┐
│  Stripe         │ ──────────────────────────────► │  Webhook Vercel  │
│  Pagaments      │                                 │  Marca obra venuda│
└─────────────────┘                                 └──────────────────┘
```

**Per què aquest stack?**
El hosting del client és compartit (sense Node.js/SSR). La solució: Astro en mode estàtic + Stripe Checkout hosted (sense backend propi) + una única funció serverless a Vercel per al webhook.

---

## Estructura del projecte

```
/
├── src/                    # Frontend Astro
│   ├── components/         # Components reutilitzables
│   ├── layouts/            # Layout base (HTML, CSS global, scripts)
│   ├── lib/
│   │   ├── sanity.ts       # Client Sanity + queries GROQ
│   │   └── stripe.ts       # Client Stripe
│   └── pages/              # Pàgines (file-based routing)
│       ├── index.astro
│       ├── espai.astro
│       ├── contacte.astro
│       ├── artistes/
│       ├── exposicions/
│       ├── blog/
│       └── botiga/
│
├── studio/                 # Sanity Studio (back office CMS)
│   └── schemas/            # Esquemes de contingut
│       ├── artista.ts
│       ├── exposicio.ts
│       ├── obra.ts         # Artwork — inclou camp `sold` i `stripeProductId`
│       ├── post.ts
│       └── paginaEspai.ts
│
├── webhook/                # Funció serverless (deploy a Vercel)
│   └── api/
│       └── stripe-webhook.ts   # Escolta Stripe → marca obra.sold = true
│
└── env.example             # Variables d'entorn necessàries
```

---

## Fases del projecte

### Fase 1 — Frontend (Astro SSG) ✅
Construcció de totes les pàgines en mode estàtic. Cap Node.js al servidor.

**Pàgines:**
| Ruta | Descripció |
|------|-----------|
| `/` | Home — hero, exposicions recents, blog, newsletter |
| `/espai` | About de la galeria |
| `/artistes` | Llistat d'artistes |
| `/artistes/[slug]` | Perfil d'artista + exposicions associades |
| `/exposicions` | Llistat d'exposicions |
| `/exposicions/[slug]` | Detall d'exposició + galeria d'imatges |
| `/blog` | Llistat de posts |
| `/blog/[slug]` | Article de blog amb Portable Text |
| `/botiga` | Catàleg d'obres (exclou les venudes) |
| `/botiga/[slug]` | Detall d'obra + botó de compra |
| `/contacte` | Informació de contacte + formulari |

**Design system** (definit a `Layout.astro`):
- Tipografia: Cormorant Garamond (serif) + system-sans
- Colors: negre, blanc, grisos + paleta de marca del logo (teal, blau, taronja, vermell, groc)
- Animacions: reveal per scroll (IntersectionObserver), transicions de pàgina, magnetic buttons, card tilt

---

### Fase 2 — CMS / Back office (Sanity Studio) ✅
El client gestiona tot el contingut des de Sanity Studio sense tocar codi.

**Schemas:**

| Schema | Camps principals |
|--------|-----------------|
| `artista` | nom, bio, foto, slug |
| `exposicio` | titol, descripcio, dates, artistes[], imatges[], slug |
| `post` | titol, cos (Portable Text), data, imatgePrincipal, slug |
| `obra` | titol, artista (ref), preu, dimensions, tecnica, any, imatges[], **sold**, **stripeProductId**, slug |
| `paginaEspai` | titol, cos, imatges[] — singleton |

El Sanity Studio es desplega gratuïtament a `sanity.studio`.

---

### Fase 3 — Botiga i pagaments (Stripe) ✅
Obres originals amb stock = 1. Quan es ven, desapareix del catàleg.

**Flux de compra:**
1. L'usuari fa clic a "Adquirir obra" a `/botiga/[slug]`
2. El formulari fa POST a `/api/checkout`
3. Es crea una sessió de Stripe Checkout hosted
4. Stripe redirigeix l'usuari a la pàgina de pagament (hosted per Stripe, sense PCI)
5. Quan es completa el pagament, Stripe crida el webhook

---

### Fase 4 — Webhook (Vercel Serverless) ✅
Una sola funció a Vercel free tier. No requereix cap altre backend.

**Flux del webhook:**
1. Stripe envia `checkout.session.completed` al endpoint `/api/stripe-webhook`
2. El webhook verifica la signatura (`STRIPE_WEBHOOK_SECRET`)
3. Llegeix `session.metadata.obraId`
4. Fa `sanity.patch(obraId).set({ sold: true }).commit()`
5. Opcionalment dispara un redeploy d'Astro via `DEPLOY_HOOK_URL`

---

## Configuració local

### Requisits
- Node.js 18+
- Compte a [Sanity](https://sanity.io) (free tier)
- Compte a [Stripe](https://stripe.com)
- Compte a [Vercel](https://vercel.com) (per al webhook)

### Variables d'entorn

Copia `env.example` a `.env` i omple els valors:

```env
PUBLIC_SANITY_PROJECT_ID=   # ID del projecte Sanity
PUBLIC_SANITY_DATASET=production
STRIPE_SECRET_KEY=          # sk_live_... o sk_test_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=  # pk_live_... o pk_test_...
STRIPE_WEBHOOK_SECRET=      # whsec_... (des del dashboard de Stripe)
SANITY_API_TOKEN=           # Token amb permisos d'escriptura (per al webhook)
```

### Instal·lació i dev

```bash
# Frontend
npm install
npm run dev          # http://localhost:4321

# Sanity Studio
cd studio
npm install
npm run dev          # http://localhost:3333

# Webhook (dev local amb Stripe CLI)
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

### Build i deploy

```bash
# Frontend → HTML estàtic
npm run build        # genera /dist → pujar al hosting compartit

# Sanity Studio → sanity deploy (o sanity.studio)

# Webhook → git push a Vercel (detecta /webhook/vercel.json automàticament)
```

---

## Deploy

| Part | On | Com |
|------|-----|-----|
| Frontend | Hosting compartit del client | Pujar `/dist` per FTP o el mètode del hosting |
| Sanity Studio | sanity.studio (gratis) | `cd studio && npx sanity deploy` |
| Webhook | Vercel free tier | Connectar el repo, arrel = `/webhook` |

---

## Tecnologies

- [Astro](https://astro.build) — SSG, zero JS per defecte
- [Sanity](https://sanity.io) — CMS headless + Studio
- [Stripe](https://stripe.com) — Pagaments hosted (sense backend propi)
- [Vercel](https://vercel.com) — Serverless function per al webhook
- TypeScript
