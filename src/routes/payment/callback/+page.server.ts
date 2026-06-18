import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { paystack_verify } from '$lib/paystack';
import { credit, tokens_per_kobo, get_balance } from '$lib/server/token_balance';

export const load: PageServerLoad = async ({ url, locals, platform }) => {
	const user = locals.user;
	if (!user?.email || !user.id) {
		throw redirect(303, '/login');
	}

	const ref = url.searchParams.get('reference') || url.searchParams.get('trxref');
	const status = url.searchParams.get('status');

	if (status === 'cancelled') {
		return { success: false, message: 'Payment was cancelled.', ref: null, tokens: 0, balance: 0 };
	}

	if (!ref) {
		return { success: false, message: 'No transaction reference found.', ref: null, tokens: 0, balance: 0 };
	}

	try {
		const result = await paystack_verify(ref);
		if (result.status !== 'success') {
			return { success: false, message: `Transaction ${result.status}.`, ref, tokens: 0, balance: 0 };
		}

		const new_bal = await credit({ platform }, user.id, result.amount);
		const tokens = Math.floor(result.amount / tokens_per_kobo());
		return { success: true, message: 'Payment successful! Tokens credited.', ref, tokens, balance: new_bal };
	} catch (e) {
		console.error('[payment/callback] verify error:', e);
		return { success: false, message: 'Could not verify payment. Contact support.', ref, tokens: 0, balance: 0 };
	}
};
