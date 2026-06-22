import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { load_game } from '$lib/server/save';

export async function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) throw error(401, 'Not logged in');
	const data = await load_game(event, event.locals.user.id);
	return json({ data });
}
