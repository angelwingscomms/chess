import { decode_session } from '$lib/server/session';
import { get_balance } from '$lib/server/token_balance';
import { get_user } from '$lib/server/user';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, platform }) => {
	const session_id = cookies.get('session');
	console.log('[LAYOUT] session cookie present:', !!session_id);
	if (!session_id) return { user: null, balance: 0 };

	const s = await decode_session(session_id);
	if (!s) {
		console.log('[LAYOUT] session decode failed');
		return { user: null, balance: 0 };
	}

	console.log('[LAYOUT] fetching balance for', s.user.id);
	const balance = await get_balance({ platform }, s.user.id);
	console.log('[LAYOUT] balance:', balance);
	const u = await get_user(s.user.id);
	console.log('[LAYOUT] get_user result:', !!u, 'date_joined:', u?.d ?? null);
	return { user: s.user, balance, date_joined: u?.d ?? null };
};
