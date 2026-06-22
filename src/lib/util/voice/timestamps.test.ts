import { describe, expect, it } from 'vitest';
import { get_word_timestamps } from './timestamps';

describe('get_word_timestamps', () => {
	it('builds word timestamps from the example data', () => {
		const chars = ['H', 'e', 'y', ' ', 't', 'h', 'e', 'r', 'e', '.'];
		const times: [number, number][] = [
			[0.0374, 0.1247], [0.0873, 0.1746], [0.1372, 0.2245],
			[0.1746, 0.3118], [0.2744, 0.3866], [0.2744, 0.3866],
			[0.3617, 0.4864], [0.4615, 0.5862], [0.4615, 0.5862],
			[0.5488, 0.6984],
		];
		expect(get_word_timestamps(chars, times, ['Hey', 'there.']))
			.toEqual({ Hey: [0.0374, 0.2245], 'there.': [0.2744, 0.6984] });
	});

	it('filters to only requested words', () => {
		const chars = ['H', 'e', 'y', ' ', 't', 'h', 'e', 'r', 'e', '.'];
		const times: [number, number][] = [
			[0.0374, 0.1247], [0.0873, 0.1746], [0.1372, 0.2245],
			[0.1746, 0.3118], [0.2744, 0.3866], [0.2744, 0.3866],
			[0.3617, 0.4864], [0.4615, 0.5862], [0.4615, 0.5862],
			[0.5488, 0.6984],
		];
		expect(get_word_timestamps(chars, times, ['there.']))
			.toEqual({ 'there.': [0.2744, 0.6984] });
	});

	it('excludes words not in search_words', () => {
		const chars = ['y', 'e', 's'];
		const times: [number, number][] = [[0, 1], [1, 2], [2, 3]];
		expect(get_word_timestamps(chars, times, ['no'])).toEqual({});
	});

	it('returns empty for empty chars', () => {
		expect(get_word_timestamps([], [], ['hi'])).toEqual({});
	});

	it('returns empty for empty search_words', () => {
		const chars = ['H', 'i'];
		const times: [number, number][] = [[0, 1], [1, 2]];
		expect(get_word_timestamps(chars, times, [])).toEqual({});
	});

	it('uses last occurrence for duplicate words', () => {
		const chars = ['y', 'e', 's', ' ', 'n', 'o', ' ', 'y', 'e', 's'];
		const times: [number, number][] = [
			[0, 1], [1, 2], [2, 3], [3, 4],
			[4, 5], [5, 6], [6, 7], [7, 8],
			[8, 9], [9, 10],
		];
		expect(get_word_timestamps(chars, times, ['yes', 'no']))
			.toEqual({ yes: [7, 10], no: [4, 6] });
	});

	it('handles single word with no spaces', () => {
		expect(get_word_timestamps(['h', 'i'], [[0, 1], [1, 2]], ['hi']))
			.toEqual({ hi: [0, 2] });
	});

	it('handles leading spaces', () => {
		expect(get_word_timestamps([' ', 'h', 'i'], [[0, 1], [1, 2], [2, 3]], ['hi']))
			.toEqual({ hi: [1, 3] });
	});

	it('handles trailing spaces', () => {
		expect(get_word_timestamps(['h', 'i', ' '], [[0, 1], [1, 2], [2, 3]], ['hi']))
			.toEqual({ hi: [0, 2] });
	});

	it('matches case-sensitively', () => {
		const chars = ['H', 'e', 'y'];
		const times: [number, number][] = [[0, 1], [1, 2], [2, 3]];
		expect(get_word_timestamps(chars, times, ['hey'])).toEqual({});
	});

	it('skips empty words from consecutive spaces', () => {
		const chars = ['a', ' ', ' ', 'b'];
		const times: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4]];
		expect(get_word_timestamps(chars, times, ['a', 'b']))
			.toEqual({ a: [0, 1], b: [3, 4] });
	});

	it('preserves word occurrence order, not search_words order', () => {
		const chars = ['a', ' ', 'b', ' ', 'c'];
		const times: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];
		expect(Object.keys(get_word_timestamps(chars, times, ['c', 'a', 'b'])))
			.toEqual(['a', 'b', 'c']);
	});
});
