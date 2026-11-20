import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { paid_by, paystack_verify } from '$lib/paystack';
import { credit } from '$lib/server/token_balance';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, 'log in first');
	const ref = (await request.json().catch(() => null))?.reference;
	if (!ref || typeof ref !== 'string') return json({ success: false, error: 'no payment reference.' }, { status: 400 });
	try {
		const r = await paystack_verify(ref);
		if (r.status !== 'success') return json({ success: false, error: 'that payment didn’t go through.' });
		if (!paid_by(r, locals.user.id)) return json({ success: false, error: 'this payment belongs to another account.' }, { status: 403 });
		return json({ success: true, balance: await credit(platform!.env.DB, locals.user.id, ref, r.amount) });
	} catch (e) {
		console.error('[verify-payment]', e instanceof Error ? e.message : e);
		return json({ success: false, error: 'we couldn’t check that payment. try again soon.' }, { status: 500 });
	}
};
