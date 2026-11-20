import { describe, expect, it } from 'vitest';
import { LEVELS } from './engine';

describe('LEVELS', () => {
	it('has five levels, from learning to strongest', () => {
		expect(LEVELS.map((l) => l.t)).toEqual(['learning', 'easy', 'medium', 'hard', 'strongest']);
	});

	it('only gets stronger, and ends at full strength', () => {
		for (let i = 1; i < LEVELS.length; i++) {
			expect(LEVELS[i].skill).toBeGreaterThan(LEVELS[i - 1].skill);
			expect(LEVELS[i].depth).toBeGreaterThanOrEqual(LEVELS[i - 1].depth);
		}
		expect(LEVELS.at(-1)!.skill).toBe(20);
	});
});
