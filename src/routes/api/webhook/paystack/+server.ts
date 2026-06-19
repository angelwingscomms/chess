import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { verify_webhook_sig } from '$lib/paystack';
import { credit } from '$lib/server/token_balance';

export const POST: RequestHandler = async ({ request, platform }) => {
	const sig = request.headers.get('x-paystack-signature');
	if (!sig) {
		throw error(401, 'Missing signature');
	}

	const raw = await request.text();

	if (!verify_webhook_sig(raw, sig)) {
		throw error(401, 'Invalid signature');
	}

	const event = JSON.parse(raw);

	if (event.event === 'charge.success') {
		const d = event.data;
		const ref = d.reference;
		const email = d.customer?.email;
		const amount = d.amount;
		const meta = d.metadata || {};

		const user_id = typeof meta === 'object' && meta && typeof (meta as Record<string, unknown>).user_id === 'string'
			? (meta as Record<string, string>).user_id
			: email;

		if (!user_id) {
			console.error('[webhook] no user_id for charge.success', { ref, email });
			return json({ received: true });
		}

		try {
			const bal = await credit({ platform }, user_id, amount);
			console.log('[webhook] credited', { user_id, amount, balance: bal, ref });
		} catch (e) {
			console.error('[webhook] credit failed', { user_id, ref, error: e });
		}
	}

	return json({ received: true });
};
