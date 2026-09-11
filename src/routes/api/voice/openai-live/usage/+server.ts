import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { deduct, TOKEN_RATE } from '$lib/server/token_balance';
import { NGN_USD } from '$lib/util/rates';
import { calc_openai_live_cost } from '$lib/util/voice/openai_live';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.id) return json({ error: 'Unauthorized' }, { status: 401 });
	const { s: seconds } = await request.json().catch(() => ({}));
	if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
		return json({ error: 'Invalid seconds' }, { status: 400 });
	}
	const cost = calc_openai_live_cost(seconds);
	const cost_kobo = Math.round(cost * NGN_USD * 100 * TOKEN_RATE);
	let bal = 0;
	if (cost_kobo > 0) {
		try { bal = await deduct({ platform }, locals.user.id, cost_kobo); } catch {}
	}
	return json({ cost, bal });
};
