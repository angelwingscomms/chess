import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { search_puzzles } from './puzzles';

type Row = { i: number; f: string; m: string; r: number; v: number; t: string };

const calls: { sql: string; params: unknown[] }[] = [];
let pages: Row[][] = [];

const db = {
	prepare: (sql: string) => ({
		bind: (...params: unknown[]) => ({
			all: async () => {
				calls.push({ sql, params });
				return { results: pages.shift() ?? [] };
			}
		})
	})
} as unknown as D1Database;

const row = (i: number): Row => ({
	i,
	f: '8/8/8/8/8/8/8/K6k w - - 0 1',
	m: 'a1a2 h1h2',
	r: 1500,
	v: 90,
	t: 'fork'
});

const rows = (n: number, from = 1) => Array.from({ length: n }, (_, k) => row(from + k));

beforeEach(() => {
	calls.length = 0;
	pages = [];
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('tag filtering', () => {
	it('emits one join per extra all-match tag and binds them in order', async () => {
		await search_puzzles(db, { t: ['fork', 'endgame', 'pin'] });
		expect(calls[0].sql).toContain('join puz_t a1 on a1.i = a0.i and a1.t = ?');
		expect(calls[0].sql).toContain('join puz_t a2 on a2.i = a0.i and a2.t = ?');
		expect(calls[0].params.slice(0, 3)).toEqual(['endgame', 'pin', 'fork']);
	});

	it('drives from puz_t when tags are present and puz when they are not', async () => {
		await search_puzzles(db, { t: ['fork'] });
		expect(calls[0].sql).toContain('from puz_t a0');
		calls.length = 0;
		await search_puzzles(db, {});
		expect(calls[0].sql).toContain('from puz p');
	});

	it('emits one placeholder per any-match tag', async () => {
		await search_puzzles(db, { any: ['mateIn1', 'mateIn2'] });
		expect(calls[0].sql).toContain('p.i in (select i from puz_t where t in (?,?))');
		expect(calls[0].params).toContain('mateIn1');
		expect(calls[0].params).toContain('mateIn2');
	});
});

describe('rating and popularity filters', () => {
	it('emits the rating bounds only when given', async () => {
		await search_puzzles(db, { r_min: 1500, r_max: 1800 });
		expect(calls[0].sql).toContain('p.r >= ?');
		expect(calls[0].sql).toContain('p.r <= ?');
		calls.length = 0;
		await search_puzzles(db, {});
		expect(calls[0].sql).not.toContain('p.r >= ?');
	});

	it('always applies a popularity floor, defaulting to 80', async () => {
		await search_puzzles(db, {});
		expect(calls[0].sql).toContain('p.v >= ?');
		expect(calls[0].params).toContain(80);
	});

	it('honours an explicit popularity floor', async () => {
		await search_puzzles(db, { v_min: 95 });
		expect(calls[0].params).toContain(95);
	});
});

describe('count clamping', () => {
	const limit_of = () => calls[0].params.at(-1);

	it('defaults to 5', async () => {
		await search_puzzles(db, {});
		expect(limit_of()).toBe(5);
	});

	it('clamps up to 1', async () => {
		await search_puzzles(db, { n: 0 });
		expect(limit_of()).toBe(1);
	});

	it('clamps down to 30', async () => {
		await search_puzzles(db, { n: 500 });
		expect(limit_of()).toBe(30);
	});
});

describe('random offset sampling', () => {
	it('uses a different offset on successive calls', async () => {
		await search_puzzles(db, {});
		const a = calls[0].params[0];
		calls.length = 0;
		await search_puzzles(db, {});
		expect(calls[0].params[0]).not.toBe(a);
	});

	it('never samples past the top of the id range', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.999999999);
		await search_puzzles(db, {});
		expect(calls[0].params[0] as number).toBeLessThan(916132592);
	});

	it('an explicit after suppresses randomisation and issues exactly one query', async () => {
		pages = [rows(1)];
		await search_puzzles(db, { after: 12345, n: 5 });
		expect(calls).toHaveLength(1);
		expect(calls[0].params[0]).toBe(12345);
	});

	it('a short first page wraps to offset 0 in a second query', async () => {
		pages = [rows(2, 1), rows(3, 10)];
		await search_puzzles(db, { n: 5 });
		expect(calls).toHaveLength(2);
		expect(calls[1].params[0]).toBe(0);
	});

	it('the wrap dedupes by id and never exceeds the limit', async () => {
		pages = [rows(2, 1), [row(1), row(2), row(3), row(4), row(5)]];
		const out = await search_puzzles(db, { n: 5 });
		expect(out.map((p) => p.p)).toHaveLength(5);
		expect(new Set(out.map((p) => p.p)).size).toBe(5);
	});

	it('a full first page does not issue a second query', async () => {
		pages = [rows(5)];
		await search_puzzles(db, { n: 5 });
		expect(calls).toHaveLength(1);
	});
});

describe('row mapping', () => {
	const stored = {
		i: 8,
		f: '5rk1/1p3ppp/pq3b2/8/8/1P1Q1N2/P4PPP/3R2K1 w - - 2 27',
		m: 'd3d6 f8d8 d6d8 f6d8',
		r: 1579,
		v: 96,
		t: 'advantage endgame'
	};

	it('re-encodes the id and links to lichess', async () => {
		pages = [[stored]];
		const [p] = await search_puzzles(db, { after: 0, n: 1 });
		expect(p.p).toBe('00008');
		expect(p.u).toBe('https://lichess.org/training/00008');
	});

	it('applies the opponent blunder, so f is the position the user solves', async () => {
		pages = [[stored]];
		const [p] = await search_puzzles(db, { after: 0, n: 1 });
		expect(p.f).toBe('5rk1/1p3ppp/pq1Q1b2/8/8/1P3N2/P4PPP/3R2K1 b - - 3 27');
	});

	it('drops the blunder from the move list', async () => {
		pages = [[stored]];
		const [p] = await search_puzzles(db, { after: 0, n: 1 });
		expect(p.m).toBe('f8d8 d6d8 f6d8');
	});

	it('splits the tag string', async () => {
		pages = [[stored]];
		const [p] = await search_puzzles(db, { after: 0, n: 1 });
		expect(p.t).toEqual(['advantage', 'endgame']);
	});

	it('carries rating and popularity through unchanged', async () => {
		pages = [[stored]];
		const [p] = await search_puzzles(db, { after: 0, n: 1 });
		expect(p.r).toBe(1579);
		expect(p.v).toBe(96);
	});

	it('an empty tag string maps to an empty array, not [""]', async () => {
		pages = [[{ ...stored, t: '' }]];
		const [p] = await search_puzzles(db, { after: 0, n: 1 });
		expect(p.t).toEqual([]);
	});
});
