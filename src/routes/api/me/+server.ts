import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { allow, forget_user, get_user } from '$lib/server/user';
import { encode_session, SESSION_COOKIE, SESSION_COOKIE_DELETE } from '$lib/server/session';

export async function GET({ locals, platform }: RequestEvent): Promise<Response> {
	return json({ user: locals.user && (await get_user(platform!.env.DB, locals.user.id)) });
}

// a grown-up says yes to keeping this account's games and chats
export async function PATCH({ locals, platform, cookies }: RequestEvent): Promise<Response> {
	if (!locals.user) error(401, 'log in first');
	await allow(platform!.env.DB, locals.user.id);
	cookies.set('session', await encode_session({ ...locals.user, a: true }), SESSION_COOKIE);
	return json({ ok: true });
}

export async function DELETE({ locals, platform, cookies }: RequestEvent): Promise<Response> {
	if (!locals.user) error(401, 'log in first');
	await forget_user(platform!.env.DB, locals.user.id);
	cookies.delete('session', SESSION_COOKIE_DELETE);
	return json({ ok: true });
}
