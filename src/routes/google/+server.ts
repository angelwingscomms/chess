import { google_client } from '$lib/server/oauth';
import { encode_session, SESSION_COOKIE } from '$lib/server/session';
import { find_or_create_user } from '$lib/server/user';
import type { RequestEvent } from '@sveltejs/kit';

// google sends the player back here; an account nobody has said yes for goes to the grown-up question first
export async function GET({ url, cookies, platform }: RequestEvent): Promise<Response> {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const want = cookies.get('oauth_state');
	const verifier = cookies.get('oauth_verifier');
	const next = cookies.get('oauth_next') || '/i';
	for (const k of ['oauth_state', 'oauth_verifier', 'oauth_next']) cookies.delete(k, { path: '/' });
	if (!code || !state || !verifier || state !== want) return new Response(null, { status: 302, headers: { Location: '/login?e=1' } });
	try {
		const tokens = await google_client(url.origin).validateAuthorizationCode(code, verifier);
		const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokens.accessToken()}` } });
		if (!r.ok) throw Error(`userinfo ${r.status}`);
		const g = await r.json();
		const u = await find_or_create_user(platform!.env.DB, g.name || g.email.split('@')[0], g.picture, g.email);
		cookies.set('session', await encode_session({ id: u.i, name: u.n, picture: u.p ?? undefined, email: u.e, a: !!u.a }), SESSION_COOKIE);
		return new Response(null, { status: 302, headers: { Location: u.a ? next : `/welcome?next=${encodeURIComponent(next)}` } });
	} catch (e) {
		console.error('[google] login failed', e instanceof Error ? e.message : 'unknown');
		return new Response(null, { status: 302, headers: { Location: '/login?e=1' } });
	}
}
