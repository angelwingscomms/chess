import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { calc_cost } from '$lib/util/ai/pricing';
import { deduct } from '$lib/server/token_balance';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.id) return json({ error: 'Unauthorized' }, { status: 401 });

	const { p: input_t, c: output_t } = await request.json();
	if (typeof input_t !== 'number' || typeof output_t !== 'number' || (input_t <= 0 && output_t <= 0)) {
		return json({ error: 'Invalid token counts' }, { status: 400 });
	}

	const cost = calc_cost('gemini-3.1-flash-live-preview', input_t, output_t);
	const cost_kobo = Math.round(cost * 1440 * 100);
	let bal = 0;
	if (cost_kobo > 0) {
		try { bal = await deduct({ platform }, locals.user.id, cost_kobo); } catch {}
	}

	return json({ cost, bal });
};
