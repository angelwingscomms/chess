import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';
import { Chess } from 'chess.js';
import type { Puzzle, PuzzleQuery } from '$lib/types/puzzle';

const C = 'puz';
// point id = base62-decoded lichess PuzzleId; the corpus spans 8 .. 916132592 sparsely, so a
// random offset in that range is a free random sample — scroll returns the next ids after it.
const MAX_POINT_ID = 916132592;
let q: QdrantClient | null = null;

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

async function page(filter: object, limit: number, offset: number) {
	const r = await client().scroll(C, {
		filter,
		limit,
		offset,
		with_payload: true,
		with_vector: false
	});
	return r.points ?? [];
}

export async function search_puzzles(query: PuzzleQuery): Promise<Puzzle[]> {
	const must: Record<string, unknown>[] = [];
	for (const tag of query.t ?? []) must.push({ key: 't', match: { value: tag } });
	if (query.any?.length) must.push({ key: 't', match: { any: query.any } });
	if (query.r_min != null || query.r_max != null) {
		must.push({ key: 'r', range: { gte: query.r_min, lte: query.r_max } });
	}
	must.push({ key: 'v', range: { gte: query.v_min ?? 80 } });

	const limit = Math.min(Math.max(query.n ?? 5, 1), 30);
	const filter = { must };
	const random_start = query.after ?? Math.floor(Math.random() * MAX_POINT_ID);
	let points = await page(filter, limit, random_start);
	// a random start near the top of the id space can run out of matches — wrap to the
	// beginning so a narrow filter still fills the page.
	if (points.length < limit && query.after == null) {
		const seen = new Set(points.map((p) => p.id));
		for (const p of await page(filter, limit, 0)) {
			if (points.length >= limit) break;
			if (!seen.has(p.id)) points.push(p);
		}
	}
	return points.map((p) => {
		const pl = p.payload as Record<string, unknown>;
		const moves = (pl.m as string).split(' ');
		return {
			p: pl.p as string,
			f: solve_fen(pl.f as string, moves[0]),
			m: moves.slice(1).join(' '),
			r: pl.r as number,
			v: pl.v as number,
			u: pl.u as string,
			t: (pl.t as string[]) ?? []
		};
	});
}

// A lichess puzzle's stored FEN is the position *before* the opponent's blunder. The first
// stored move is that blunder; the user solves from the position after it.
function solve_fen(fen: string, first: string): string {
	const c = new Chess(fen);
	c.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first.slice(4) || undefined });
	return c.fen();
}
