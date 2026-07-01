import { tool } from 'ai';
import { z } from 'zod';

let current_fen: string | null = null;

export function set_fen(fen: string) {
	current_fen = fen;
}

export function get_current_fen(): string | null {
	return current_fen;
}

export const get_fen = tool({
	description: 'Read the current chess board position as a FEN string. Use when you need to reference the current position.',
	inputSchema: z.object({}),
	execute: async () => {
		if (current_fen) {
			return { fen: current_fen };
		}
		return { fen: null, error: 'No board position has been set yet.' };
	},
});
