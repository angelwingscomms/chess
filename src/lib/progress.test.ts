import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ browser: false }));
import { chances, move_accuracy, pg, puzzle_done } from './progress.svelte';

describe('progress', () => {
	it('raises the puzzle level after a solve and lowers it after a miss', () => {
		const r = pg.r;
		puzzle_done(true, r);
		expect(pg.r).toBeGreaterThan(r);
		const up = pg.r;
		puzzle_done(false, up);
		expect(pg.r).toBeLessThan(up);
		expect(pg.c).toBe(0);
		expect(pg.b).toBe(1);
	});

	it('scores a move that keeps the chances at 100 and a blunder near 0', () => {
		expect(move_accuracy(0.2, 0.2)).toBeCloseTo(100, 0);
		expect(move_accuracy(chances(0), chances(-900))).toBeLessThan(15);
	});
});
