import { tool } from 'ai';
import { z } from 'zod';

export type BoardSnap = { f?: string; b?: string; l?: string };

export function last_board(msgs: { d?: BoardSnap }[]): BoardSnap | undefined {
	for (let i = msgs.length - 1; i >= 0; i--) {
		const d = msgs[i].d;
		if (d?.f || d?.b || d?.l) return d;
	}
}

export function make_get_fen(d?: BoardSnap) {
	return tool({
		description: 'Read the current chess board position as a FEN string. Use when you need to reference the current position.',
		inputSchema: z.object({}),
		execute: async () => {
			if (!d?.f && !d?.b && !d?.l) return { fen: null, error: 'No board position has been set yet.' };
			return { fen: d.f ?? null, pieces: d.b, lesson: d.l };
		},
	});
}
