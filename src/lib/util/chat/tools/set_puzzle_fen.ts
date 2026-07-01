import { tool } from 'ai';
import { z } from 'zod';
import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';

export const set_puzzle_fen = tool({
	description: 'Set the chess board to a specific FEN position. Use when the user asks to set up a puzzle, a specific board state, or create a custom position from a description.',
	inputSchema: z.object({
		fen: z.string().describe('The FEN string representing the chess board position'),
	}),
	execute: async ({ fen }) => {
		const setup = parseFen(fen);
		if (!setup.isOk) {
			return { valid: false, error: 'Invalid FEN syntax: ' + setup.error.message };
		}
		const pos = Chess.fromSetup(setup.unwrap());
		if (!pos.isOk) {
			return { valid: false, error: 'Invalid position: the FEN describes an impossible board state (missing kings, pawns on back rank, or side not to move is in check)' };
		}
		const chess = pos.unwrap();
		if (chess.isCheckmate()) {
			return { valid: true, fen, warning: 'Checkmate — the game is already over.' };
		}
		if (chess.isStalemate()) {
			return { valid: true, fen, warning: 'Stalemate — the game is already over.' };
		}
		if (chess.isCheck()) {
			return { valid: true, fen, warning: 'The side to move is in check.' };
		}
		return { valid: true, fen };
	},
});
