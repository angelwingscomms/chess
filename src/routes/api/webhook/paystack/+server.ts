import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { payer, verify_webhook_sig } from '$lib/paystack';
import { credit } from '$lib/server/token_balance';

// paystack says a charge went through; only payments that name their account count, and each reference once
export const POST: RequestHandler = async ({ request, platform }) => {
	const sig = request.headers.get('x-paystack-signature');
	const raw = await request.text();
	if (!sig || !verify_webhook_sig(raw, sig)) error(401, 'bad signature');
	const ev = JSON.parse(raw);
	if (ev.event !== 'charge.success') return json({ received: true });
	const u = payer(ev.data);
	if (!u || typeof ev.data?.reference !== 'string') console.error('[webhook] payment names no account', ev.data?.reference);
	else await credit(platform!.env.DB, u, ev.data.reference, ev.data.amount);
	return json({ received: true });
};
