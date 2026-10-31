import { PUBLIC_DOMAIN } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';
import { info } from '$lib/info';

export const GET: RequestHandler = () => {
  const b = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${PUBLIC_DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${PUBLIC_DOMAIN}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>${Object.keys(info).map((k) => `
  <url>
    <loc>${PUBLIC_DOMAIN}/${k}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`).join('')}
</urlset>`;
  return new Response(b, { headers: { 'Content-Type': 'application/xml' } });
};
