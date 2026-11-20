import { PUBLIC_DOMAIN } from '$env/static/public';
import { decode_session, SESSION_COOKIE_DELETE } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

// every page and api answer says it may not be framed or sniffed, and what it may ask the device for
const SAFE = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'microphone=(self), display-capture=(self), camera=(), geolocation=()'
};

const HOME = new URL(PUBLIC_DOMAIN).host;

// the home page in markdown, only for clients that ask for markdown; link-preview bots send */* and get the html page
const MD = `# e4

e4 is a free chess coach. play a friendly computer, then ask why any move works, by typing or out loud. no account is needed, even to talk.

- [play](${PUBLIC_DOMAIN}/i)
- [agent summary](${PUBLIC_DOMAIN}/llms.txt)
- [public api](${PUBLIC_DOMAIN}/openapi.json)
`;

export const handle: Handle = async ({ event, resolve }) => {
	const { url, request } = event;
	// one address, so a guest's games are always on the same site
	if (url.hostname.endsWith('.apexlinks.org') && url.host !== HOME) return new Response(null, { status: 301, headers: { Location: `${PUBLIC_DOMAIN}${url.pathname}${url.search}` } });
	if (url.pathname === '/' && /text\/markdown/.test(request.headers.get('accept') ?? '')) return new Response(MD, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept' } });
	event.locals.user = null;
	const c = event.cookies.get('session');
	if (c) {
		event.locals.user = await decode_session(c);
		if (!event.locals.user) event.cookies.delete('session', SESSION_COOKIE_DELETE);
	}
	const res = await resolve(event);
	for (const [k, v] of Object.entries(SAFE)) res.headers.set(k, v);
	return res;
};
