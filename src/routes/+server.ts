import { PUBLIC_DOMAIN } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = () => {
	const b = `# e4

e4 is a free chess coach. It explains every move in plain words and talks with you out loud. No account is needed to start.

- [Play](${PUBLIC_DOMAIN}/)
- [Agent summary](${PUBLIC_DOMAIN}/llms.txt)
- [Public API](${PUBLIC_DOMAIN}/openapi.json)
`;
	return new Response(b, {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept' }
	});
};
