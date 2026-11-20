import { PUBLIC_DOMAIN } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = () => {
	const b = `# e4

e4 is a free chess coach. play a friendly computer, then ask why any move works, by typing or out loud. no account is needed, even to talk.

- [Play](${PUBLIC_DOMAIN}/)
- [Agent summary](${PUBLIC_DOMAIN}/llms.txt)
- [Public API](${PUBLIC_DOMAIN}/openapi.json)
`;
	return new Response(b, {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept' }
	});
};
