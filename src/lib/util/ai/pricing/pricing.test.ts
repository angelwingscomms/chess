import { describe, expect, it } from 'vitest';
import { calc_cost } from './index';

describe('calc_cost', () => {
	it('returns 0 for unknown model', () => {
		expect(calc_cost('unknown-model', 1000, 500)).toBe(0);
	});

	it('calculates deepseek/deepseek-v4-flash cost correctly', () => {
		const cost = calc_cost('deepseek/deepseek-v4-flash', 1_000_000, 500_000);
		expect(cost).toBeCloseTo(0.20, 6);
	});

	it('calculates gemma-4-26b-a4b-it cost correctly', () => {
		const cost = calc_cost('gemma-4-26b-a4b-it', 100_000, 50_000);
		expect(cost).toBeCloseTo(0.0225, 6);
	});

	it('calculates gemma-4-31b-it cost correctly', () => {
		const cost = calc_cost('gemma-4-31b-it', 100_000, 50_000);
		expect(cost).toBeCloseTo(0.030, 6);
	});

	it('calculates openai/gpt-oss-120b cost correctly', () => {
		const cost = calc_cost('openai/gpt-oss-120b', 200_000, 100_000);
		expect(cost).toBeCloseTo(0.090, 6);
	});

	it('calculates qwen/qwen3-32b cost correctly', () => {
		const cost = calc_cost('qwen/qwen3-32b', 500_000, 200_000);
		expect(cost).toBeCloseTo(0.263, 6);
	});

	it('calculates llama-3.3-70b-versatile cost correctly', () => {
		const cost = calc_cost('llama-3.3-70b-versatile', 300_000, 150_000);
		expect(cost).toBeCloseTo(0.2955, 6);
	});

	it('handles zero tokens', () => {
		expect(calc_cost('deepseek/deepseek-v4-flash', 0, 0)).toBe(0);
	});

	it('handles small token counts', () => {
		const cost = calc_cost('openai/gpt-oss-120b', 100, 50);
		expect(cost).toBeGreaterThan(0);
		expect(cost).toBeLessThan(0.001);
	});
});
