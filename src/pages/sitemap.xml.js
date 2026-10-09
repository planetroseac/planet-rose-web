// Sitemap for Google Search Console. Add new pages here as the site grows.
const PAGES = ['/', '/reserve/vip/'];

export function GET({ site }) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map((p) => `  <url><loc>${new URL(p, site).href}</loc><lastmod>${today}</lastmod></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
