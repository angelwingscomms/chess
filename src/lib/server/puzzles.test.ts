import { describe, expect, it, vi } from 'vitest';

let last_scroll: any = null;
const scrolls: any[] = [];
const rows: any[] = [];

vi.mock('$env/static/private', () => ({ QDRANT_URL: 'http://x', QDRANT_KEY: 'k' }));

vi.mock('@qdrant/js-client-rest', () => ({
	QdrantClient: class {
		async scroll(_c: string, args: any) {
			last_scroll = args;
			scrolls.push(args);
			// rows are stored as [id, payload]; only those at or after the offset come back
			return {
				points: rows
					.filter(([id]) => id >= args.offset)
					.slice(0, args.limit)
					.map(([id, payload]) => ({ id, payload }))
			};
		}
	}
}));

function seed(...ids: number[]) {
	rows.length = 0;
	scrolls.length = 0;
	for (const id of ids) {
		rows.push([id, { p: 'x', f: '8/8/8/8/8/8/8/K6k w - - 0 1', m: 'a1a2', r: 1, v: 1, t: [] }]);
	}
}

const { search_puzzles } = await import('./puzzles');

describe('search_puzzles', () => {
	it('makes t tags all-match and any tags one-of', async () => {
		seed();
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
		seed();
		await search_puzzles({ r_min: 1500, r_max: 1800 });
		expect(last_scroll.filter.must).toEqual(
			expect.arrayContaining([
				{ key: 'r', range: { gte: 1500, lte: 1800 } },
				{ key: 'v', range: { gte: 80 } }
			])
		);
	});

	it('clamps the result count to 1..30', async () => {
		seed();
		await search_puzzles({ n: 500 });
		expect(last_scroll.limit).toBe(30);
		await search_puzzles({ n: 0 });
		expect(last_scroll.limit).toBe(1);
		await search_puzzles({});
		expect(last_scroll.limit).toBe(5);
	});

	it('starts each search at a different random offset', async () => {
		seed();
		for (let i = 0; i < 5; i++) await search_puzzles({});
		const offsets = new Set(scrolls.map((s) => s.offset));
		expect(offsets.size).toBeGreaterThan(1);
		for (const o of offsets) expect(o).toBeLessThan(916132592);
	});

	it('honours an explicit after offset instead of randomising', async () => {
		seed();
		await search_puzzles({ after: 1234 });
		expect(scrolls.map((s) => s.offset)).toEqual([1234]);
	});

	it('wraps to the start when the random offset lands past the last match', async () => {
		seed(1, 2, 3);
		const got = await search_puzzles({ n: 3 });
		expect(scrolls.length).toBe(2);
		expect(scrolls[1].offset).toBe(0);
		expect(got.length).toBe(3);
	});

	it('returns the position after the blunder, not the stored fen', async () => {
		rows.length = 0;
		scrolls.length = 0;
		rows.push([
			0,
			{
				p: '0000D',
				f: '5rk1/1p3ppp/pq3b2/8/8/1P1Q1N2/P4PPP/3R2K1 w - - 2 27',
				m: 'd3d6 f8d8 d6d8 f6d8',
				r: 1579,
				v: 96,
				u: 'https://lichess.org/F8M8OS71#53',
				t: ['advantage', 'endgame']
			}
		]);
		const [pz] = await search_puzzles({ after: 0, n: 1 });
		expect(pz.f).toBe('5rk1/1p3ppp/pq1Q1b2/8/8/1P3N2/P4PPP/3R2K1 b - - 3 27');
		expect(pz.m).toBe('f8d8 d6d8 f6d8');
		expect(pz.p).toBe('0000D');
	});
});
