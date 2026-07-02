import { tool } from 'ai';
import { z } from 'zod';

export const get_fen = tool({
	description: 'Read the current chess board position as a FEN string. Use when you need to reference the current position.',
	inputSchema: z.object({}),
	execute: async () => {
		return { fen: null, error: 'No board position has been set yet.' };
	},
});
