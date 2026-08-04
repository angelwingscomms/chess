import { tool } from 'ai';
import { z } from 'zod';
import { search_puzzles } from '$lib/server/puzzles';
import { PUZZLE_TOOL_DESCRIPTION } from '$lib/types/puzzle';

export const puzzle_input = z.object({
	t: z.array(z.string()).optional().describe('Tags that must all be present, e.g. ["fork", "endgame"]'),
	any: z.array(z.string()).optional().describe('Tags where at least one must be present, e.g. ["pin", "skewer"]'),
	r_min: z.number().optional().describe('Minimum puzzle rating'),
	r_max: z.number().optional().describe('Maximum puzzle rating'),
	n: z.number().optional().describe('How many puzzles to return, 1-30. Default 5.'),
});

export const find_puzzles = tool({
	description: PUZZLE_TOOL_DESCRIPTION,
	inputSchema: puzzle_input,
	execute: async (q) => {
		try {
			const puzzles = await search_puzzles(q);
			if (!puzzles.length) return { puzzles: [], error: 'No puzzles matched. Try fewer tags in "t".' };
			return { puzzles };
		} catch (e) {
			return { puzzles: [], error: e instanceof Error ? e.message : String(e) };
		}
	},
});
