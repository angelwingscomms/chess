import { generateState, generateCodeVerifier, google_client } from '$lib/server/oauth';
import type { RequestEvent } from '@sveltejs/kit';

export function GET(event: RequestEvent): Response {
  console.log('[LOGIN_INIT] origin:', event.url.origin);
  console.log('[LOGIN_INIT] host:', event.request.headers.get('host'));
  console.log('[LOGIN_INIT] x-forwarded-proto:', event.request.headers.get('x-forwarded-proto'));
  const state = generateState();
  const verifier = generateCodeVerifier();
  const redirect_uri = google_client(event.url.origin).createAuthorizationURL(state, verifier, ['openid', 'profile', 'email']).toString();
  console.log('[LOGIN_INIT] redirect_uri:', redirect_uri);
  console.log('[LOGIN_INIT] cookies set - state:', state.substring(0, 10) + '...', 'verifier:', verifier.substring(0, 10) + '...');
  event.cookies.set('oauth_state', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
  event.cookies.set('oauth_verifier', verifier, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirect_uri
    }
  });
}
