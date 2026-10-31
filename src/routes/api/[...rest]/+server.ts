import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const fallback: RequestHandler = ({ url }) =>
	json(
		{
			code: 'not_found',
			message: `No API route at ${url.pathname}.`,
			hint: 'See /openapi.json for the public endpoints.'
		},
		{ status: 404 }
	);
