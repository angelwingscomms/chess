import { decode_session, session_cookie_delete } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

// every page and api answer says it may not be framed or sniffed, and what it may ask the device for
const SAFE = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'microphone=(self), display-capture=(self), camera=(), geolocation=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	const id = event.cookies.get('session');
	event.locals.user = null;
	if (id) {
		const s = await decode_session(id);
		if (s) event.locals.user = s.user;
		else event.cookies.delete('session', session_cookie_delete(event.url.hostname));
	}
	const res = await resolve(event);
	for (const [k, v] of Object.entries(SAFE)) res.headers.set(k, v);
	return res;
};
