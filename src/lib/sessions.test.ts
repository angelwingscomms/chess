import { describe, expect, it } from 'vitest';
import { words } from './sessions';

describe('words', () => {
	it('cuts words to their root', () => {
		expect(words('Forks castling PINNED queen')).toEqual(['fork', 'castl', 'pin', 'queen']);
	});

	it('skips one-letter words and keeps five', () => {
		expect(words(' a  b1 c2 d3 e4 f5 g6')).toEqual(['b1', 'c2', 'd3', 'e4', 'f5']);
	});
});
