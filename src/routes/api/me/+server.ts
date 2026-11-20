import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { forget_user, get_user } from '$lib/server/user';
import { session_cookie_delete } from '$lib/server/session';

export async function GET(event: RequestEvent): Promise<Response> {
  if (!event.locals.user) return json({ user: null });
  const u = await get_user(event.locals.user.id);
  return json({ user: u ?? { s: 'u', n: event.locals.user.name, p: event.locals.user.picture, m: event.locals.user.email, d: 0 } });
}

export async function DELETE({ locals, platform, cookies, url }: RequestEvent): Promise<Response> {
  if (!locals.user) error(401, 'log in first');
  await forget_user(locals.user.id, platform!.env.DB);
  cookies.delete('session', session_cookie_delete(url.hostname));
  return json({ ok: true });
}
