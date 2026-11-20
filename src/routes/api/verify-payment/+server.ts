import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { paid_by, paystack_verify } from '$lib/paystack';
import { credit, get_balance } from '$lib/server/token_balance';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const user = locals.user;
	if (!user?.id) throw error(401, 'Unauthorized');

	const body = await request.json().catch(() => null);
	const ref = body?.reference;
	if (!ref || typeof ref !== 'string') return json({ success: false, error: 'Missing reference' }, { status: 400 });

	try {
		const result = await paystack_verify(ref);
		if (result.status !== 'success') return json({ success: false, error: `Transaction ${result.status}` });
		if (!paid_by(result, user.id)) return json({ success: false, error: 'This payment belongs to another account.' }, { status: 403 });

		await credit({ platform }, user.id, result.amount);
		const bal = await get_balance({ platform }, user.id);
		return json({ success: true, balance: bal });
	} catch (e) {
		console.error('[verify-payment]', e);
		return json({ success: false, error: 'Verification failed' }, { status: 500 });
	}
};
