import { PUBLIC_DOMAIN } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = () => {
  const b = `User-agent: *
Allow: /
Disallow: /test/
Disallow: /api/

Sitemap: ${PUBLIC_DOMAIN}/sitemap.xml`;
  return new Response(b, { headers: { 'Content-Type': 'text/plain' } });
};
