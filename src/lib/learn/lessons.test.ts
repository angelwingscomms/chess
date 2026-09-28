import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { STAGES, cleared, free_hint, free_moves, hint, parse, play, right, type Level } from './lessons';

const levels = STAGES.flatMap((s) => s.l.map((l, i) => ({ l, id: `${s.k}-${i}` })));
const played = (fen: string, u: string) => {
	const c = new Chess(fen);
	try {
		c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: 'q' });
		return c;
	} catch {
		return null;
	}
};

function fewest(l: Level) {
	let frontier = [{ b: parse(l.f), got: new Set<string>() }];
	for (let n = 1; n <= l.b!; n++) {
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

// plays every allowed answer with the computer's replies; returns how many lines end in a win
function lines(l: Level, fen: string, step: number, id: string): number {
	let wins = 0;
	for (const u of l.a![step].split('|')) {
		const c = played(fen, u);
		if (!c) continue;
		expect(right(l, c, step, u), `${id} ${u}`).toBe(true);
		if (step === l.a!.length - 1 || c.isCheckmate()) {
			if (l.g === 'm') expect(c.isCheckmate(), `${id} ${u} mates`).toBe(true);
			wins++;
			continue;
		}
		const r = played(c.fen(), l.a![step + 1]);
		expect(r, `${id} reply ${l.a![step + 1]}`).not.toBeNull();
		wins += lines(l, r!.fen(), step + 2, id);
	}
	return wins;
}

describe('lessons', () => {
	it('every star and capture level can be done in exactly its best number of moves', () => {
		for (const { l, id } of levels.filter((x) => x.l.g === 's' || x.l.g === 'c')) expect(fewest(l), id).toBe(l.b);
	});

	it('following the hint finishes every star and capture level in its best number of moves', () => {
		for (const { l, id } of levels.filter((x) => x.l.g === 's' || x.l.g === 'c')) {
			let b = parse(l.f);
			const got: string[] = [];
			let n = 0;
			while (!cleared(l, b, new Set(got)) && n < 10) {
				const m = free_hint(l, b, got)!;
				b = play(b, m.slice(0, 2), m.slice(2, 4));
				if (l.s?.includes(m.slice(2, 4)) && !got.includes(m.slice(2, 4))) got.push(m.slice(2, 4));
				n++;
			}
			expect(n, id).toBe(l.b);
		}
	});

	it('every other level is a real position with a right answer and a wrong one', () => {
		for (const { l, id } of levels.filter((x) => x.l.g !== 's' && x.l.g !== 'c')) {
			const c = new Chess(l.f);
			expect(c.inCheck(), id).toBe(l.g === 'e');
			if (l.a) expect(lines(l, l.f, 0, id), id).toBeGreaterThan(0);
			else expect(hint(l, c, 0), id).toBeTruthy();
			const wrong = c.moves({ verbose: true }).some((m) => !right(l, played(l.f, m.from + m.to)!, 0, m.from + m.to));
			expect(wrong, id).toBe(l.g !== 'e');
		}
	});

	it('castling may not cross an attacked square', () => {
		const c = new Chess(STAGES.find((s) => s.k === 'castle')!.l[2].f);
		expect(c.moves({ verbose: true }).map((m) => m.from + m.to)).not.toContain('e1g1');
	});
});
