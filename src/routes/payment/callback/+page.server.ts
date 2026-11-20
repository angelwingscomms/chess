import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { paid_by, paystack_verify } from '$lib/paystack';
import { credit } from '$lib/server/token_balance';

export const load: PageServerLoad = async ({ url, locals, platform }) => {
	if (!locals.user) redirect(303, '/login');
	const ref = url.searchParams.get('reference') || url.searchParams.get('trxref');
	const no = (message: string) => ({ success: false, message, balance: 0 });
	if (url.searchParams.get('status') === 'cancelled') return no('payment was cancelled.');
	if (!ref) return no('no payment reference came back.');
	try {
		const r = await paystack_verify(ref);
		if (r.status !== 'success') return no('that payment didn’t go through.');
		if (!paid_by(r, locals.user.id)) return no('this payment belongs to another account.');
		return { success: true, message: 'deposit done.', balance: await credit(platform!.env.DB, locals.user.id, ref, r.amount) };
	} catch (e) {
		console.error('[payment/callback]', e instanceof Error ? e.message : e);
		return no('we couldn’t check that payment. it is safe: try this page again soon.');
	}
};
