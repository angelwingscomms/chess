import { describe, expect, it } from 'vitest';
import { say_move } from './words';

describe('say_move', () => {
	it('puts chess codes into words', () => {
		expect(say_move('Nf3')).toBe('knight to f3');
		expect(say_move('exd5')).toBe('pawn takes on d5');
		expect(say_move('Qxf7#')).toBe('queen takes on f7, checkmate');
		expect(say_move('Bb5+')).toBe('bishop to b5, check');
		expect(say_move('O-O')).toBe('castle to the king’s side');
		expect(say_move('O-O-O+')).toBe('castle to the queen’s side, check');
		expect(say_move('e8=Q')).toBe('pawn to e8, becomes a queen');
		expect(say_move('Rad1')).toBe('rook to d1');
	});
});
