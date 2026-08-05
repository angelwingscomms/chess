import { Chess } from 'chess.js';
import type { Puzzle, PuzzleQuery } from '$lib/types/puzzle';

const MAX_ID = 916132592;
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

type Row = { i: number; f: string; m: string; r: number; v: number; t: string };

function puzzle_id(i: number): string {
	let s = '';
	for (let k = 0; k < 5; k++) {
		s = B62[i % 62] + s;
		i = Math.floor(i / 62);
	}
	return s;
}

function build(query: PuzzleQuery, after: number, limit: number): [string, unknown[]] {
	const all = query.t ?? [];
	const p: unknown[] = [];
	let from = 'puz p';
	let id = 'p.i';
	if (all.length) {
		from = 'puz_t a0';
		id = 'a0.i';
		for (let k = 1; k < all.length; k++) {
			from += ` join puz_t a${k} on a${k}.i = a0.i and a${k}.t = ?`;
			p.push(all[k]);
		}
		from += ' join puz p on p.i = a0.i';
		p.push(all[0]);
	}
	const where: string[] = [];
	if (all.length) where.push('a0.t = ?');
	where.push(`${id} > ?`);
	p.push(after);
	if (query.r_min != null) {
		where.push('p.r >= ?');
		p.push(query.r_min);
	}
	if (query.r_max != null) {
		where.push('p.r <= ?');
		p.push(query.r_max);
	}
	where.push('p.v >= ?');
	p.push(query.v_min ?? 80);
	if (query.any?.length) {
		where.push(`p.i in (select i from puz_t where t in (${query.any.map(() => '?').join(',')}))`);
		p.push(...query.any);
	}
	p.push(limit);
	return [
		`select p.i, p.f, p.m, p.r, p.v, p.t from ${from} where ${where.join(' and ')} order by ${id} limit ?`,
		p
	];
}

export async function search_puzzles(db: D1Database, query: PuzzleQuery): Promise<Puzzle[]> {
	const limit = Math.min(Math.max(query.n ?? 5, 1), 30);
	const start = query.after ?? Math.floor(Math.random() * MAX_ID);
	const [sql, params] = build(query, start, limit);
	const rows = [...((await db.prepare(sql).bind(...params).all<Row>()).results ?? [])];
	if (rows.length < limit && query.after == null) {
		const [sql2, params2] = build(query, 0, limit);
		const seen = new Set(rows.map((r) => r.i));
		for (const r of (await db.prepare(sql2).bind(...params2).all<Row>()).results ?? []) {
			if (rows.length >= limit) break;
			if (!seen.has(r.i)) rows.push(r);
		}
	}
	return rows.map((row) => {
		const moves = row.m.split(' ');
		const p = puzzle_id(row.i);
		return {
			p,
			f: solve_fen(row.f, moves[0]),
			m: moves.slice(1).join(' '),
			r: row.r,
			v: row.v,
			u: `https://lichess.org/training/${p}`,
			t: row.t ? row.t.split(' ') : []
		};
	});
}

function solve_fen(fen: string, first: string): string {
	const c = new Chess(fen);
	c.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first.slice(4) || undefined });
	return c.fen();
}
