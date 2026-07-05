import { describe, expect, it } from 'vitest';
import { can_reuse_hints, hint_squares } from './hint_highlight';

describe('hint_squares', () => {
	it('maps a white-view hint move to from and to board cells', () => {
		expect(hint_squares('e2e4')).toEqual([
			{ s: 'e2', k: 'f', r: 'row-start-7', c: 'col-start-5', l: 'from' },
			{ s: 'e4', k: 't', r: 'row-start-5', c: 'col-start-5', l: 'to' },
		]);
	});

	it('maps a black-view hint move to flipped board cells', () => {
		expect(hint_squares('e2e4', 'b')).toEqual([
			{ s: 'e2', k: 'f', r: 'row-start-2', c: 'col-start-4', l: 'from' },
			{ s: 'e4', k: 't', r: 'row-start-4', c: 'col-start-4', l: 'to' },
		]);
	});

	it('includes promotion piece hint for promotion moves', () => {
		expect(hint_squares('e7e8q')).toEqual([
			{ s: 'e7', k: 'f', r: 'row-start-2', c: 'col-start-5', l: 'from' },
			{ s: 'e8', k: 't', r: 'row-start-1', c: 'col-start-5', l: 'to' },
			{ s: 'e8', k: 'p', r: 'row-start-1', c: 'col-start-5', l: 'promotion', p: 'q' },
		]);
	});

	it('includes underpromotion piece hint', () => {
		expect(hint_squares('e7e8n')).toEqual([
			{ s: 'e7', k: 'f', r: 'row-start-2', c: 'col-start-5', l: 'from' },
			{ s: 'e8', k: 't', r: 'row-start-1', c: 'col-start-5', l: 'to' },
			{ s: 'e8', k: 'p', r: 'row-start-1', c: 'col-start-5', l: 'promotion', p: 'n' },
		]);
	});

	it('ignores invalid move text', () => {
		expect(hint_squares('')).toEqual([]);
		expect(hint_squares('e2')).toEqual([]);
		expect(hint_squares('e9e4')).toEqual([]);
	});
});

describe('can_reuse_hints', () => {
	it('reuses cached hints only for the same position', () => {
		expect(can_reuse_hints([{ move: 'e2e4' }], 'fen-a', 'fen-a')).toBe(true);
		expect(can_reuse_hints([], 'fen-a', 'fen-a')).toBe(false);
		expect(can_reuse_hints([{ move: 'e2e4' }], 'fen-a', 'fen-b')).toBe(false);
	});
});
