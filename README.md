# Planet Rose: sitio web

Mismo diseño aprobado, organizado para que el contenido se edite desde un panel sin tocar código.

## Qué hay en cada carpeta

| Carpeta | Qué es |
|---|---|
| `src/pages/index.astro` | La página (el mismo HTML aprobado, con las partes editables conectadas a los datos) |
| `public/` | Diseño y fotos: `css/`, `js/`, `assets/` (idénticos a la versión aprobada) |
| `src/content/fallback.js` | El contenido actual. Se usa mientras el panel no esté conectado |
| `src/lib/content.js` | Lee el contenido del panel (Sanity) cuando está conectado |
| `studio/` | El **panel de edición** (Sanity Studio) |
| `studio/seed/seed.mjs` | Carga todo el contenido actual al panel con un comando |

## Qué se edita desde el panel

- **Business info, prices & hours:** teléfono, email, Instagram, Facebook, TikTok, link de reseñas de Google, Calendly, dirección, precio por canción, cover, horarios y la tarjeta de merch.
- **VIP Room:** fotos, texto, cuadro de detalles y letra chica.
- **Shop · Merch:** productos (foto, nombre, precio, talles, mostrar/ocultar, orden).
- **Drinks menu:** tarjetas del menú.
- **Gallery photos:** fotos de la galería y su orden.

El resto (titulares, textos de las secciones, colores, diseño) se cambia en el código.

---

## Ver el sitio en tu computadora

```bash
npm install
npm run dev
```
Abrí http://localhost:4321

## Conectar el panel (una sola vez, ~15 min)

1. Creá una cuenta en **sanity.io** con planetrose.reservation@gmail.com (plan gratis).
2. En **sanity.io/manage** → **Create new project** → nombre "Planet Rose", dataset `production`.
   Anotá el **Project ID** (8 letras/números).
3. En ese proyecto: **API → Tokens → Add API token** → nombre "seed", permisos **Editor**. Copiá el token.
4. En la terminal, dentro de `studio/`:
   ```bash
   npm install
   SANITY_STUDIO_PROJECT_ID=TU_PROJECT_ID SANITY_WRITE_TOKEN=TU_TOKEN npm run seed
   ```
   Esto sube todas las fotos y textos actuales al panel.
5. Publicá el panel en internet:
   ```bash
   npx sanity login
   SANITY_STUDIO_PROJECT_ID=TU_PROJECT_ID npm run deploy
   ```
   Queda en **https://planetrose.sanity.studio**. Invitá a tu equipo desde sanity.io/manage → Members.
6. Después de cargar el contenido, podés borrar el token "seed" (ya no hace falta).

## Publicar en Netlify

1. Subí esta carpeta a un repositorio **privado** de GitHub.
2. En Netlify: **Add new site → Import from Git** → elegí el repositorio. La configuración ya está en `netlify.toml`.
3. **Site configuration → Environment variables:**
   - `SANITY_PROJECT_ID` = tu Project ID
   - `SANITY_DATASET` = `production`
   - `SITE_URL` = tu dominio, ej. `https://planetroseac.com`
4. **Publicar solo al editar:** en Netlify → **Build & deploy → Build hooks → Add build hook** (nombre "Sanity"), copiá la URL.
   En sanity.io/manage → **API → Webhooks → Create** → pegá esa URL, dataset `production`, disparar en Create/Update/Delete.
   Desde ahí, cada vez que tocás **Publish** en el panel, la web se actualiza sola en ~1 minuto.

## Formularios

"Plan Your Night" y "Request to Order" envían a la Google Sheet de Planet Rose y mandan un email
(ver `../google-sheets/LEEME.md`). La URL está en `public/js/forms.js` → `GOOGLE_SHEET_URL`.
