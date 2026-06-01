import { generateState, generateCodeVerifier, google } from '$lib/server/oauth';
import type { RequestEvent } from '@sveltejs/kit';

export function GET(event: RequestEvent): Response {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, verifier, ['openid', 'profile']);
  event.cookies.set('oauth_state', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
  event.cookies.set('oauth_verifier', verifier, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}
