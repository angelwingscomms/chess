import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { paid_by, paystack_verify } from '$lib/paystack';
import { credit, get_balance } from '$lib/server/token_balance';

export const load: PageServerLoad = async ({ url, locals, platform }) => {
	const user = locals.user;
	if (!user?.email || !user.id) {
		throw redirect(303, '/login');
	}

	const ref = url.searchParams.get('reference') || url.searchParams.get('trxref');
	const status = url.searchParams.get('status');

	if (status === 'cancelled') {
		return { success: false, message: 'payment was cancelled.', ref: null, balance: 0 };
	}

	if (!ref) {
		return { success: false, message: 'no transaction reference found.', ref: null, balance: 0 };
	}

	try {
		const result = await paystack_verify(ref);
		if (result.status !== 'success') {
			return { success: false, message: `Transaction ${result.status}.`, ref, balance: 0 };
		}
		if (!paid_by(result, user.id)) return { success: false, message: 'this payment belongs to another account.', ref, balance: 0 };

		const new_bal = await credit({ platform }, user.id, result.amount);
		return { success: true, message: 'deposit successful!', ref, balance: new_bal };
	} catch (e) {
		console.error('[payment/callback] verify error:', e);
		return { success: false, message: 'could not verify payment. contact support.', ref, balance: 0 };
	}
};
