/**
 * Loads the site content at build time.
 *
 * - SANITY_PROJECT_ID set → reads everything from the Sanity panel.
 * - Not set (or Sanity unreachable) → uses src/content/fallback.js.
 *
 * Anything missing in Sanity falls back to the built-in value, so a half-filled
 * panel never breaks the page.
 */
import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import fallback from '../content/fallback.js';

// Planet Rose's Sanity project (not a secret). Set SANITY_PROJECT_ID="" to force the built-in content.
const projectId = import.meta.env.SANITY_PROJECT_ID ?? process.env.SANITY_PROJECT_ID ?? 'rbi9h8dn';
const dataset = import.meta.env.SANITY_DATASET || process.env.SANITY_DATASET || 'production';

const IMAGE = `{ alt, asset->{ url, metadata { dimensions { width, height } } } }`;

const QUERY = `{
  "settings": *[_type == "siteSettings"][0],
  "menu": *[_type == "menuItem"] | order(order asc) { title, description, price, priceIsNote, "image": image ${IMAGE} },
  "merchCard": *[_type == "siteSettings"][0].merchCard,
  "products": *[_type == "product" && available != false] | order(order asc) {
    "id": slug.current, name, shortName, price, description, sizes, "image": image ${IMAGE}
  },
  "vip": *[_type == "vipRoom"][0] {
    intro, caption, finePrint, specs,
    "mainImage": mainImage ${IMAGE},
    "thumbs": thumbs[] ${IMAGE}
  },
  "gallery": *[_type == "galleryPhoto"] | order(order asc) { wide, "image": image ${IMAGE} }
}`;

export async function getContent() {
  if (!projectId) return fallback;

  try {
    const client = createClient({ projectId, dataset, apiVersion: '2025-01-01', useCdn: false });
    const builder = createImageUrlBuilder({ projectId, dataset });
    const raw = await client.fetch(QUERY);

    // Sanity image → { src, alt, width, height } (resized + modern format by Sanity's CDN)
    const img = (i, maxWidth = 1600) => {
      if (!i || !i.asset) return null;
      const d = (i.asset.metadata && i.asset.metadata.dimensions) || { width: 1200, height: 900 };
      const w = Math.min(maxWidth, d.width);
      return {
        src: builder.image(i.asset.url).width(w).auto('format').quality(82).url(),
        alt: i.alt || '',
        width: w,
        height: Math.round((w / d.width) * d.height)
      };
    };
    const list = (arr, map) => (Array.isArray(arr) && arr.length ? arr.map(map).filter(Boolean) : null);

    const s = raw.settings || {};
    const v = raw.vip || {};

    return {
      settings: {
        ...fallback.settings,
        ...Object.fromEntries(Object.entries(s).filter(([k, val]) => !k.startsWith('_') && val !== null && val !== '')),
        hours: list(s.hours, (h) => ({ days: h.days, time: h.time, late: !!h.late })) || fallback.settings.hours
      },
      menu: list(raw.menu, (m) => ({ ...m, image: img(m.image, 1100) })) || fallback.menu,
      merchCard: { ...fallback.merchCard, ...(raw.merchCard || {}) },
      products: list(raw.products, (p) => ({ ...p, sizes: p.sizes && p.sizes.length ? p.sizes : ['One size'], image: img(p.image, 1200) })) || fallback.products,
      vip: {
        ...fallback.vip,
        intro: v.intro || fallback.vip.intro,
        caption: v.caption || fallback.vip.caption,
        finePrint: v.finePrint || fallback.vip.finePrint,
        specs: list(v.specs, (x) => ({ label: x.label, value: x.value || '', price: x.price || '' })) || fallback.vip.specs,
        mainImage: img(v.mainImage, 2000) || fallback.vip.mainImage,
        thumbs: list(v.thumbs, (t) => img(t, 1600)) || fallback.vip.thumbs
      },
      gallery: list(raw.gallery, (g) => (g.image ? { image: img(g.image, 1100), wide: !!g.wide } : null)) || fallback.gallery
    };
  } catch (err) {
    console.warn('[content] Sanity unavailable, using built-in content:', err.message);
    return fallback;
  }
}
