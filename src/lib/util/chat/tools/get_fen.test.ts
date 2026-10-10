import { describe, expect, it } from 'vitest';
import { last_board, make_get_fen } from './get_fen';

describe('last_board', () => {
	it('returns the last message that has a board', () => {
		expect(last_board([
			{ d: { f: 'start' } },
			{ d: { f: 'now', b: 'white: king e1' } },
			{ d: undefined },
		])).toEqual({ f: 'now', b: 'white: king e1' });
	});
});

describe('make_get_fen', () => {
	it('returns the board instead of a missing-position error', async () => {
		const d = { f: '8/8/8/8/8/8/8/4K3 w - - 0 1', b: 'white: king e1' };
		const r = await make_get_fen(d).execute!({}, { toolCallId: 't', messages: [] } as never);
		expect(r).toEqual({ fen: d.f, pieces: d.b, lesson: undefined });
	});

	it('errors only when no board was sent', async () => {
		const r = await make_get_fen().execute!({}, { toolCallId: 't', messages: [] } as never);
		expect(r).toEqual({ fen: null, error: 'No board position has been set yet.' });
	});
});
