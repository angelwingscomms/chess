import { redirect } from '@sveltejs/kit';
import { decode_session } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const session_id = cookies.get('session');
	if (!session_id) return;
	const s = await decode_session(session_id);
	if (s) throw redirect(302, '/i');
};
