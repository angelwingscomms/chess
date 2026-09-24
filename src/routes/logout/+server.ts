import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { session_cookie_delete } from '$lib/server/session';

export function POST(event: RequestEvent): Response {
  event.cookies.delete('session', session_cookie_delete(event.url.hostname));
  return redirect(302, '/');
}
