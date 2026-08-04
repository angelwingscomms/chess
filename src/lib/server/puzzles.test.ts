import { describe, expect, it, vi } from 'vitest';

let last_scroll: any = null;
const rows: any[] = [];

vi.mock('$env/static/private', () => ({ QDRANT_URL: 'http://x', QDRANT_KEY: 'k' }));

vi.mock('@qdrant/js-client-rest', () => ({
	QdrantClient: class {
		async scroll(_c: string, args: any) {
			last_scroll = args;
			return { points: rows.map((r) => ({ id: 1, payload: r })) };
		}
	}
}));

const { search_puzzles } = await import('./puzzles');

describe('search_puzzles', () => {
	it('makes t tags all-match and any tags one-of', async () => {
		rows.length = 0;
		await search_puzzles({ t: ['fork', 'endgame'], any: ['pin', 'skewer'] });
		expect(last_scroll.filter.must).toEqual(
			expect.arrayContaining([
				{ key: 't', match: { value: 'fork' } },
				{ key: 't', match: { value: 'endgame' } },
				{ key: 't', match: { any: ['pin', 'skewer'] } }
			])
		);
	});

	it('applies the rating range and a default popularity floor', async () => {
		rows.length = 0;
		await search_puzzles({ r_min: 1500, r_max: 1800 });
		expect(last_scroll.filter.must).toEqual(
			expect.arrayContaining([
				{ key: 'r', range: { gte: 1500, lte: 1800 } },
				{ key: 'v', range: { gte: 80 } }
			])
		);
	});

	it('clamps the result count to 1..30', async () => {
		rows.length = 0;
		await search_puzzles({ n: 500 });
		expect(last_scroll.limit).toBe(30);
		await search_puzzles({ n: 0 });
		expect(last_scroll.limit).toBe(1);
		await search_puzzles({});
		expect(last_scroll.limit).toBe(5);
	});

	it('returns the position after the blunder, not the stored fen', async () => {
		rows.length = 0;
		rows.push({
			p: '0000D',
			f: '5rk1/1p3ppp/pq3b2/8/8/1P1Q1N2/P4PPP/3R2K1 w - - 2 27',
			m: 'd3d6 f8d8 d6d8 f6d8',
			r: 1579,
			v: 96,
			u: 'https://lichess.org/F8M8OS71#53',
			t: ['advantage', 'endgame']
		});
		const [pz] = await search_puzzles({});
		expect(pz.f).toBe('5rk1/1p3ppp/pq1Q1b2/8/8/1P3N2/P4PPP/3R2K1 b - - 3 27');
		expect(pz.m).toBe('f8d8 d6d8 f6d8');
		expect(pz.p).toBe('0000D');
	});
});
