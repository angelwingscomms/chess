import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { search_puzzles } from '$lib/server/puzzles';
import { puzzle_input } from '$lib/util/chat/tools/find_puzzles';
import { over_limit } from '$lib/server/limit';

export const POST: RequestHandler = async ({ request, platform }) => {
	if (await over_limit(platform, 'p', request)) return json({ puzzles: [], error: 'Too many requests. Wait a minute.' }, { status: 429 });
	const parsed = puzzle_input.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return json({ puzzles: [], error: 'Invalid query.' }, { status: 400 });
	try {
		return json({ puzzles: await search_puzzles(platform!.env.PUZ, parsed.data) });
	} catch (e) {
		console.error('[puzzles] search failed:', e);
		return json({ puzzles: [], error: 'Puzzle search failed.' }, { status: 500 });
	}
};
