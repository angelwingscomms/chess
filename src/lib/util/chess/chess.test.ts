import { describe, it, expect } from 'vitest';
import { LEVELS, getHints } from './engine';

describe('getHints', () => {
	it('should be a function', () => {
		expect(typeof getHints).toBe('function');
	});

	it('should reject in node (no Worker)', async () => {
		await expect(getHints('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 3)).rejects.toThrow();
	});
});

describe('LEVELS', () => {
	it('goes from learning to strongest', () => {
		expect(LEVELS.map((l) => l.t)).toEqual(['learning', 'easy', 'medium', 'hard', 'strongest']);
	});

	it('searches deeper and slips less as the level rises', () => {
		for (let i = 1; i < LEVELS.length; i++) {
			expect(LEVELS[i].depth).toBeGreaterThanOrEqual(LEVELS[i - 1].depth);
			expect(LEVELS[i].blunder).toBeLessThanOrEqual(LEVELS[i - 1].blunder);
		}
	});

	it('plays at full strength on the top level only', () => {
		const top = LEVELS[LEVELS.length - 1];
		expect(top.elo).toBeNull();
		expect(top.blunder).toBe(0);
		expect(LEVELS[0].blunder).toBeGreaterThan(0.3);
	});
});
