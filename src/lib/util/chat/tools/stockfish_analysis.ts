import { tool } from 'ai';
import { z } from 'zod';

export const evaluate_position = tool({
	description: 'Get the Stockfish evaluation of the current board position. Returns the best move, centipawn score (positive = advantage to side to move), depth searched, and principal variation.',
	inputSchema: z.object({}),
	execute: async () => {
		return { error: 'No analysis data available.', available: false };
	},
});

export const evaluate_user_move = tool({
	description: 'Get how the user\'s last move compares to Stockfish\'s best move.',
	inputSchema: z.object({}),
	execute: async () => {
		return { error: 'No analysis data available.', available: false };
	},
});

export const get_multi_pv = tool({
	description: 'Get multiple candidate moves ranked by Stockfish with their evaluations.',
	inputSchema: z.object({}),
	execute: async () => {
		return { error: 'No analysis data available.', available: false };
	},
});

export const classify_error = tool({
	description: 'Classify the type of error the user made in their last move.',
	inputSchema: z.object({}),
	execute: async () => {
		return { error: 'No analysis data available.', available: false };
	},
});
