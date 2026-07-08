# Espai Barri Vell — Web oficial

Reconstrucció completa de [espaibarrivell.com](https://espaibarrivell.com) en codi real i escalable. Galeria d'art contemporani al casc antic de Girona.

## Arquitectura general

```
┌─────────────────┐     GROQ queries      ┌──────────────────┐
│  Astro (SSG)    │ ◄──────────────────── │  Sanity Studio   │
│  HTML estàtic   │                        │  Back office CMS │
└────────┬────────┘                        └──────────────────┘
         │ POST /api/redsys-checkout (formulari signat)
         ▼
┌─────────────────┐   notificació online (HMAC)    ┌──────────────────┐
│  Redsys (BBVA)  │ ──────────────────────────────► │  Webhook Vercel  │
│  TPV Virtual    │                                 │  Marca obra venuda│
└─────────────────┘                                 └──────────────────┘
```

**Per què aquest stack?**
El hosting del client és compartit (sense Node.js/SSR). La solució: Astro en mode estàtic + TPV Virtual de BBVA (Redsys, redirecció hosted) + dues funcions serverless a Vercel: `redsys-checkout` (signa i inicia el pagament) i `redsys-notification` (verifica la firma i marca l'obra com a venuda).

**Variables d'entorn Redsys** (al projecte Vercel del webhook): `REDSYS_MERCHANT_CODE`, `REDSYS_TERMINAL`, `REDSYS_SECRET_KEY` (clau SHA-256 de Canales Redsys), `REDSYS_ENVIRONMENT` (`live` o `test`), `SITE_URL`, `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_TOKEN`, `DEPLOY_HOOK_URL`.

---

## Estructura del projecte

```
/
├── src/                    # Frontend Astro
│   ├── components/         # Components reutilitzables
│   ├── layouts/            # Layout base (HTML, CSS global, scripts)
│   ├── lib/
│   │   └── sanity.ts       # Client Sanity + queries GROQ
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
│       ├── obra.ts         # Artwork — inclou camp `sold`
│       ├── post.ts
│       └── paginaEspai.ts
│
├── api/                    # Funcions serverless Redsys (mateix projecte Vercel)
│   ├── _lib/redsys.ts      # Firma HMAC_SHA256_V1 del TPV
│   ├── redsys-checkout.ts  # Signa i inicia el pagament al TPV
│   └── redsys-notification.ts  # Verifica la firma → marca obra.sold = true
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
| `obra` | titol, artista (ref), preu, dimensions, tecnica, any, imatges[], **sold**, slug |
| `paginaEspai` | titol, cos, imatges[] — singleton |

El Sanity Studio es desplega gratuïtament a `sanity.studio`.

---

### Fase 3 — Botiga i pagaments (TPV BBVA / Redsys) ✅
Obres originals amb stock = 1. Quan es ven, desapareix del catàleg.

**Flux de compra:**
1. L'usuari fa clic a "Adquirir obra" a `/botiga/[slug]`
2. El formulari fa POST a `/api/redsys-checkout`
3. La funció busca el preu a Sanity, signa els paràmetres (HMAC_SHA256_V1) i retorna un formulari auto-enviat cap a `sis.redsys.es`
4. Redsys mostra la pàgina de pagament segura (3-D Secure, sense PCI al nostre costat)
5. Si el pagament és correcte, l'usuari torna a `/botiga/gracies`; si falla, a l'obra amb `?pagament=ko`

---

### Fase 4 — Notificació online (Vercel Serverless) ✅
Redsys envia la notificació servidor-a-servidor independentment del navegador de l'usuari.

**Flux de la notificació:**
1. Redsys fa POST a `/api/redsys-notification` amb `Ds_MerchantParameters` i `Ds_Signature`
2. La funció verifica la firma HMAC amb la clau SHA-256 del comerç
3. Si `Ds_Response` està entre 0000 i 0099, llegeix `Ds_MerchantData` (obraId)
4. Fa `sanity.patch(obraId).set({ sold: true }).commit()`
5. Opcionalment dispara un redeploy d'Astro via `DEPLOY_HOOK_URL`

---

## Configuració local

### Requisits
- Node.js 18+
- Compte a [Sanity](https://sanity.io) (free tier)
- TPV Virtual de BBVA (Redsys) — comerç donat d'alta a [Canales Redsys](https://canales.redsys.es)
- Compte a [Vercel](https://vercel.com) (per a les funcions de pagament)

### Variables d'entorn

Copia `env.example` a `.env` i omple els valors:

```env
PUBLIC_SANITY_PROJECT_ID=   # ID del projecte Sanity
PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=           # Token amb permisos d'escriptura (per a la notificació)
REDSYS_MERCHANT_CODE=       # FUC del comerç (p. ex. 368392221)
REDSYS_TERMINAL=1
REDSYS_SECRET_KEY=          # Clau SHA-256 de Canales Redsys
REDSYS_ENVIRONMENT=live     # 'live' o 'test' (sis-t.redsys.es)
SITE_URL=https://espaibarrivell.com
PUBLIC_PAYMENTS_BASE_URL=   # URL del projecte Vercel si la web es serveix en un altre hosting
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

# Funcions de pagame