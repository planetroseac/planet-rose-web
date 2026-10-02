/**
 * One-time import: copies everything currently on the site (texts, prices,
 * hours, menu, merch, VIP, gallery + all photos) into the Sanity panel,
 * so nobody has to retype it.
 *
 * Run from the studio folder:
 *   SANITY_STUDIO_PROJECT_ID=xxxx SANITY_WRITE_TOKEN=yyyy npm run seed
 *
 * Safe to run again: it overwrites the same documents instead of duplicating.
 */
import { createClient } from '@sanity/client';
import { createReadStream, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import content from '../../src/content/fallback.js';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'rbi9h8dn';
const token = process.env.SANITY_WRITE_TOKEN;
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

if (!projectId || !token) {
  console.error('Missing SANITY_STUDIO_PROJECT_ID or SANITY_WRITE_TOKEN. See README.md → "Connect the panel".');
  process.exit(1);
}

const client = createClient({ projectId, dataset, token, apiVersion: '2025-01-01', useCdn: false });
const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../../public');

// Upload each photo once, even if it's used in several places
const uploaded = new Map();
async function image(photo) {
  if (!photo) return undefined;
  if (!uploaded.has(photo.src)) {
    const file = join(publicDir, photo.src);
    if (!existsSync(file)) throw new Error(`Photo not found: ${file}`);
    process.stdout.write(`  uploading ${basename(file)}… `);
    const asset = await client.assets.upload('image', createReadStream(file), { filename: basename(file) });
    console.log('done');
    uploaded.set(photo.src, asset._id);
  }
  return { _type: 'image', asset: { _type: 'reference', _ref: uploaded.get(photo.src) }, alt: photo.alt };
}

const key = (i) => `k${i}`;

async function run() {
  const st = content.settings;
  const docs = [];

  console.log('Business info…');
  docs.push({
    _id: 'siteSettings', _type: 'siteSettings',
    ...Object.fromEntries(Object.entries(st).filter(([k]) => k !== 'hours')),
    hours: st.hours.map((h, i) => ({ _key: key(i), _type: 'object', ...h })),
    merchCard: content.merchCard
  });

  console.log('VIP Room…');
  const v = content.vip;
  docs.push({
    _id: 'vipRoom', _type: 'vipRoom',
    intro: v.intro, caption: v.caption, finePrint: v.finePrint,
    mainImage: await image(v.mainImage),
    thumbs: await Promise.all(v.thumbs.map(async (t, i) => ({ _key: key(i), ...(await image(t)) }))),
    specs: v.specs.map((s, i) => ({ _key: key(i), _type: 'object', ...s }))
  });

  console.log('Drinks menu…');
  for (const [i, m] of content.menu.entries()) {
    docs.push({
      _id: `menu-${i + 1}`, _type: 'menuItem', order: (i + 1) * 10,
      title: m.title, description: m.description, price: m.price, priceIsNote: m.priceIsNote,
      image: await image(m.image)
    });
  }

  console.log('Merch…');
  for (const [i, p] of content.products.entries()) {
    docs.push({
      _id: `product-${p.id}`, _type: 'product', order: (i + 1) * 10, available: true,
      name: p.name, shortName: p.shortName, slug: { _type: 'slug', current: p.id },
      price: p.price, description: p.description, sizes: p.sizes,
      image: await image(p.image)
    });
  }

  console.log('Gallery…');
  for (const [i, g] of content.gallery.entries()) {
    docs.push({
      _id: `gallery-${String(i + 1).padStart(2, '0')}`, _type: 'galleryPhoto', order: (i + 1) * 10,
      wide: g.wide, image: await image(g.image)
    });
  }

  const tx = client.transaction();
  docs.forEach((d) => tx.createOrReplace(d));
  await tx.commit();
  console.log(`\nDone: ${docs.length} items and ${uploaded.size} photos are now in the panel.`);
}

run().catch((err) => {
  console.error('\nImport failed:', err.message);
  process.exit(1);
});
