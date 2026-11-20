import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const next = /^\/(?!\/)/.test(url.searchParams.get('next') ?? '') ? url.searchParams.get('next')! : '/i';
	if (!locals.user) redirect(303, '/login');
	if (locals.user.a) redirect(303, next);
	return { next };
};
