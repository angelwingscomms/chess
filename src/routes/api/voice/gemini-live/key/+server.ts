import { GEMINI } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	if (url.searchParams.get('u') === '1') return json({ k: '' });
	return json({ k: GEMINI });
};
