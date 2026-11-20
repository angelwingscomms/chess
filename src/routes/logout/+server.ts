import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { SESSION_COOKIE_DELETE } from '$lib/server/session';

export function POST({ cookies }: RequestEvent): Response {
	cookies.delete('session', SESSION_COOKIE_DELETE);
	return redirect(302, '/');
}
