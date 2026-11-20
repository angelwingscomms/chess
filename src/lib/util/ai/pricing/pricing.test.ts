import { describe, expect, it } from 'vitest';
import { calc_cost } from './index';

describe('calc_cost', () => {
	it('prices the coach models', () => {
		expect(calc_cost('openai/gpt-oss-120b', 200_000, 100_000)).toBeCloseTo(0.09, 6);
		expect(calc_cost('openai/gpt-oss-20b', 200_000, 100_000)).toBeCloseTo(0.045, 6);
	});

	it('is 0 for a model it does not know', () => {
		expect(calc_cost('unknown-model', 1000, 500)).toBe(0);
	});
});
