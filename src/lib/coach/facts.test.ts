import { describe, expect, it } from 'vitest';
import { check_words } from './facts';

describe('check_words', () => {
	it('says the best line and who is ahead in words', () => {
		const fen = '8/1p4p1/p2k4/P3pP1K/1p1p1b2/1P1P4/3q4/1R3Q2 b - - 5 51';
		const w = check_words(fen, { m: 'd2h2', s: -900, k: 0, pv: ['d2h2', 'f1h3'] });
		expect(w).toBe('black to move. best move: queen from d2 to h2, check. then: queen from f1 to h3. black is winning easily.');
	});

	it('turns a mate score into a plain forced mate', () => {
		const fen = '6k1/p1q2ppp/2Q5/8/3P4/1P4P1/P4K1P/2r5 w - - 0 26';
		expect(check_words(fen, { m: 'c6e8', s: 0, k: 1, pv: ['c6e8'] })).toBe('white to move. best move: queen from c6 to e8, checkmate. white can force checkmate in 1.');
	});
});
