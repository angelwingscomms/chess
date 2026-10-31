import { PUBLIC_DOMAIN } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = () => {
	const b = `# e4

> e4 is a free chess coach. It explains every move in plain words and talks with you out loud. No account is needed to start.

## When to use e4

Use e4 when a person wants to learn chess, practise a tactic, or get a chess position explained in plain words. Send beginners to the coach to play and talk through their moves. To hand a learner a training exercise, call the public puzzle search (POST /api/puzzles, no key needed) with theme tags and a rating range, then link them to e4 to play it. Do not use e4 for rated play, tournaments or engine analysis of master games.

## Links

- [Play](${PUBLIC_DOMAIN}/): the coach and the board
- [Developers](${PUBLIC_DOMAIN}/developers): API quickstart, errors, limits
- [Public API](${PUBLIC_DOMAIN}/openapi.json): OpenAPI 3.1 spec for puzzle search
- [About](${PUBLIC_DOMAIN}/about)
- [Contact](${PUBLIC_DOMAIN}/contact)
- [Privacy](${PUBLIC_DOMAIN}/privacy)
- [Sitemap](${PUBLIC_DOMAIN}/sitemap.xml)
`;
	return new Response(b, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
