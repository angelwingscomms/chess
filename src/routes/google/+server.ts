import { google_client } from '$lib/server/oauth';
import { encode_session, SESSION_COOKIE } from '$lib/server/session';
import { save_user } from '$lib/server/user';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent): Promise<Response> {
  console.log('[LOGIN_CALLBACK] hit - origin:', event.url.origin);
  console.log('[LOGIN_CALLBACK] url:', event.url.toString());
  console.log('[LOGIN_CALLBACK] host:', event.request.headers.get('host'));
  console.log('[LOGIN_CALLBACK] cookie header:', event.request.headers.get('cookie'));

  const code = event.url.searchParams.get('code');
  const state = event.url.searchParams.get('state');
  const stored_state = event.cookies.get('oauth_state') ?? null;
  const stored_verifier = event.cookies.get('oauth_verifier') ?? null;

  console.log('[LOGIN_CALLBACK] code present:', !!code);
  console.log('[LOGIN_CALLBACK] state from google:', state);
  console.log('[LOGIN_CALLBACK] stored_state:', stored_state ? stored_state.substring(0, 10) + '...' : null);
  console.log('[LOGIN_CALLBACK] stored_verifier present:', !!stored_verifier);
  console.log('[LOGIN_CALLBACK] state match:', state === stored_state);

  if (!code || !state || !stored_state || !stored_verifier || state !== stored_state) {
    console.log('[LOGIN_CALLBACK] FAIL - param check failed');
    return new Response(null, { status: 400 });
  }
  let tokens: any;
  try {
    console.log('[LOGIN_CALLBACK] exchanging code for tokens...');
    tokens = await google_client(event.url.origin).validateAuthorizationCode(code, stored_verifier);
    console.log('[LOGIN_CALLBACK] token exchange success, access token present:', !!tokens.accessToken());
  } catch (e) {
    console.log('[LOGIN_CALLBACK] FAIL - token exchange error:', String(e));
    return new Response(null, { status: 400 });
  }
  console.log('[LOGIN_CALLBACK] fetching google userinfo...');
  const ures = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.accessToken()}` }
  });
  console.log('[LOGIN_CALLBACK] userinfo status:', ures.status);
  if (!ures.ok) {
    console.log('[LOGIN_CALLBACK] FAIL - userinfo fetch failed:', ures.status, await ures.text());
    return new Response(null, { status: 400 });
  }
  const guser = await ures.json();
  console.log('[LOGIN_CALLBACK] google user:', JSON.stringify({ sub: guser.sub, name: guser.name, email: guser.email, picture: !!guser.picture }));
  console.log('[LOGIN_CALLBACK] saving user to qdrant...');
  try {
    await save_user(event, guser.sub, guser.name, guser.picture, guser.email);
    console.log('[LOGIN_CALLBACK] save_user completed');
  } catch (e) {
    console.log('[LOGIN_CALLBACK] save_user error:', String(e));
    return new Response(null, { status: 500 });
  }
  console.log('[LOGIN_CALLBACK] encoding session...');
  const session = await encode_session({ id: guser.sub, name: guser.name, picture: guser.picture, email: guser.email });
  console.log('[LOGIN_CALLBACK] session encoded:', session.substring(0, 30) + '...');
  event.cookies.set('session', session, SESSION_COOKIE);
  console.log('[LOGIN_CALLBACK] session cookie set, deleting oauth cookies...');
  event.cookies.delete('oauth_state', { path: '/' });
  event.cookies.delete('oauth_verifier', { path: '/' });
  console.log('[LOGIN_CALLBACK] redirecting to /i');
  return new Response(null, { status: 302, headers: { Location: '/i' } });
}
