import { PUBLIC_DOMAIN } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = () => {
	const spec = {
		openapi: '3.1.0',
		info: { title: 'e4 public API', version: '1.0.0', description: 'Anonymous, read-only API for the e4 chess coach. No key needed. Docs: /developers' },
		servers: [{ url: PUBLIC_DOMAIN }],
		paths: {
			'/api/puzzles': {
				post: {
					operationId: 'search_puzzles',
					summary: 'Search chess puzzles by theme tags and rating',
					description: 'Returns up to n training puzzles whose tags match all of t and at least one of any, within the rating range.',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										t: { type: 'array', items: { type: 'string' }, description: 'Tags that must all be present' },
										any: { type: 'array', items: { type: 'string' }, description: 'Tags where at least one must be present' },
										r_min: { type: 'number', description: 'Minimum puzzle rating' },
										r_max: { type: 'number', description: 'Maximum puzzle rating' },
										n: { type: 'integer', minimum: 1, maximum: 30, default: 5, description: 'How many puzzles to return' }
									}
								}
							}
						}
					},
					responses: {
						'200': { description: 'Matching puzzles', content: { 'application/json': { schema: { type: 'object', properties: { puzzles: { type: 'array', items: { type: 'object' } } } } } } },
						'400': { description: 'Invalid query', content: { 'application/json': { schema: { type: 'object', properties: { puzzles: { type: 'array', items: { type: 'object' } }, error: { type: 'string' } } } } } },
						'500': { description: 'Search failed', content: { 'application/json': { schema: { type: 'object', properties: { puzzles: { type: 'array', items: { type: 'object' } }, error: { type: 'string' } } } } } }
					}
				}
			}
		}
	};
	return new Response(JSON.stringify(spec), { headers: { 'Content-Type': 'application/json' } });
};
