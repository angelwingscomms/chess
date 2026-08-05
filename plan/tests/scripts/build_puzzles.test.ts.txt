import { describe, it, expect } from 'vitest';
import { point_id, rating_band, tags, cutoff } from './build_puzzles.mjs';

describe('point_id', () => {
	it('base62-decodes the lichess puzzle id', () => {
		expect(point_id('00008')).toBe(8);
	});

	it('decodes the top of the range', () => {
		expect(point_id('zzzw8')).toBe(916132592);
	});

	it('is stable, so a re-run overwrites rather than duplicates', () => {
		expect(point_id('00008')).toBe(point_id('00008'));
	});
});

describe('rating_band', () => {
	it('bands by the documented cutoffs', () => {
		expect(rating_band(1199)).toBe('rating_beginner');
		expect(rating_band(1200)).toBe('rating_easy');
		expect(rating_band(1499)).toBe('rating_easy');
		expect(rating_band(1500)).toBe('rating_intermediate');
		expect(rating_band(1799)).toBe('rating_intermediate');
		expect(rating_band(1800)).toBe('rating_advanced');
		expect(rating_band(2099)).toBe('rating_advanced');
		expect(rating_band(2100)).toBe('rating_expert');
		expect(rating_band(2399)).toBe('rating_expert');
		expect(rating_band(2400)).toBe('rating_master');
	});

	it('always prefixes, because lichess has a theme literally named master', () => {
		expect(rating_band(2400)).not.toBe('master');
	});
});

describe('tags', () => {
	const t = tags('fork endgame', 'Sicilian_Defense', 1600, 95, '8/8/8/8/8/8/8/K6k w - - 0 1');

	it('keeps every theme', () => {
		expect(t).toContain('fork');
		expect(t).toContain('endgame');
	});

	it('keeps the opening tag verbatim, underscores and all', () => {
		expect(t).toContain('Sicilian_Defense');
	});

	it('adds exactly one prefixed rating band', () => {
		expect(t).toContain('rating_intermediate');
		expect(t.filter((x: string) => x.startsWith('rating_'))).toHaveLength(1);
	});

	it('never emits a bare master tag that would collide with the lichess theme', () => {
		expect(t).not.toContain('master');
	});

	it('marks the side the USER moves, which is the opposite of side-to-move', () => {
		expect(t).toContain('solve_black');
		expect(t).not.toContain('solve_white');
	});

	it('flips for a black-to-move position', () => {
		const b = tags('fork', '', 1600, 95, '8/8/8/8/8/8/8/K6k b - - 0 1');
		expect(b).toContain('solve_white');
		expect(b).not.toContain('solve_black');
	});

	it('marks popular at 90 and above only', () => {
		expect(t).toContain('popular');
		expect(tags('fork', '', 1600, 90, '8/8/8/8/8/8/8/K6k w - - 0 1')).toContain('popular');
		expect(tags('fork', '', 1600, 89, '8/8/8/8/8/8/8/K6k w - - 0 1')).not.toContain('popular');
	});
});

describe('cutoff', () => {
	it('returns the popularity at which the running total reaches K', () => {
		expect(cutoff({ 100: 10, 99: 10, 98: 10 }, 25)).toBe(98);
	});

	it('returns -100 when the bucket never reaches K, so the bucket is kept whole', () => {
		expect(cutoff({ 100: 5 }, 2500)).toBe(-100);
	});

	it('walks downward from the top, not upward', () => {
		expect(cutoff({ 100: 30, 50: 30 }, 10)).toBe(100);
	});

	it('an empty bucket keeps everything', () => {
		expect(cutoff({}, 2500)).toBe(-100);
	});
});
