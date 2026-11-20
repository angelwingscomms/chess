import { generateState, generateCodeVerifier, google_client } from '$lib/server/oauth';
import type { RequestEvent } from '@sveltejs/kit';

const tmp = { path: '/', httpOnly: true, secure: true, maxAge: 600, sameSite: 'lax' } as const;

// ?next= is where to land after google, kept only when it is a path on this site
export function GET({ url, cookies }: RequestEvent): Response {
	const state = generateState();
	const verifier = generateCodeVerifier();
	const next = url.searchParams.get('next') ?? '';
	cookies.set('oauth_state', state, tmp);
	cookies.set('oauth_verifier', verifier, tmp);
	if (/^\/(?!\/)/.test(next)) cookies.set('oauth_next', next, tmp);
	return new Response(null, { status: 302, headers: { Location: google_client(url.origin).createAuthorizationURL(state, verifier, ['openid', 'profile', 'email']).toString() } });
}
