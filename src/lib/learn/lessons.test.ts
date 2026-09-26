import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { STAGES, cleared, free_moves, parse, play } from './lessons';

const levels = STAGES.flatMap((s) => s.l.map((l, i) => ({ l, id: `${s.k}-${i}` })));

function fewest(l: (typeof levels)[number]['l']) {
	let frontier = [{ b: parse(l.f), got: new Set<string>() }];
	for (let n = 1; n <= l.b; n++) {
		const next: typeof frontier = [];
		for (const st of frontier)
			for (const [q, p] of st.b)
				if (p[0] === 'w')
					for (const to of free_moves(st.b, q)) {
						const b = play(st.b, q, to);
						const got = new Set(st.got);
						if (l.s?.includes(to)) got.add(to);
						if (cleared(l, b, got)) return n;
						next.push({ b, got });
					}
		frontier = next;
	}
	return Infinity;
}

describe('lessons', () => {
	it('every star and capture level can be done in exactly its best number of moves', () => {
		for (const { l, id } of levels.filter((x) => x.l.g === 's' || x.l.g === 'c')) expect(fewest(l), id).toBe(l.b);
	});

	it('check, escape and checkmate levels are real, solvable positions', () => {
		for (const { l, id } of levels.filter((x) => 'kem'.includes(x.l.g))) {
			const c = new Chess(l.f);
			if (l.g === 'e') expect(c.inCheck(), id).toBe(true);
			else expect(c.inCheck(), id).toBe(false);
			const wins = c.moves({ verbose: true }).filter((m) => {
				const t = new Chess(l.f);
				t.move(m);
				return l.g === 'k' ? t.inCheck() : l.g === 'm' ? t.isCheckmate() : true;
			});
			expect(wins.length, id).toBeGreaterThan(0);
		}
	});
});
