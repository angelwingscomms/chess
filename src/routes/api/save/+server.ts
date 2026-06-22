import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { save_game } from '$lib/server/save';

export async function POST(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) throw error(401, 'Not logged in');
	const body = await event.request.json() as Record<string, unknown>;
	body.s = 'g';
	body.d = Date.now();
	await save_game(event, event.locals.user.id, body as any);
	return json({ ok: true });
}
