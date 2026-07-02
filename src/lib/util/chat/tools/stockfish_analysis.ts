import { tool } from 'ai';
import { z } from 'zod';

export const evaluate_position = tool({
	description: 'Get the Stockfish evaluation of the current board position. Returns the best move, centipawn score (positive = advantage to side to move), depth searched, and principal variation.',
	inputSchema: z.object({}),
	execute: async () => {
		return { error: 'No analysis data available.', available: false };
	},
});
