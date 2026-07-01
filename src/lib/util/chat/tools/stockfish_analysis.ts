import { tool } from 'ai';
import { z } from 'zod';

export type EvalLine = {
	move: string;
	score: number;
	depth: number;
	pv: string[];
};

export type EvalData = {
	fen: string;
	best_move: string;
	best_score: number;
	best_depth: number;
	best_pv: string[];
	user_move?: string;
	user_score?: number;
	user_depth?: number;
	user_pv?: string[];
	delta?: number;
	error_type?: 'tactical' | 'positional' | 'prophylactic' | 'strategic' | 'none';
	multi_pv?: EvalLine[];
};

let current_eval: EvalData | null = null;

export function set_eval(data: EvalData) {
	current_eval = data;
}

export function get_current_eval(): EvalData | null {
	return current_eval;
}

export const evaluate_position = tool({
	description: 'Get the Stockfish evaluation of the current board position. Returns the best move, centipawn score (positive = advantage to side to move), depth searched, and principal variation. Use this to understand what Stockfish thinks is the strongest move and why.',
	inputSchema: z.object({}),
	execute: async () => {
		const e = get_current_eval();
		if (!e) return { error: 'No analysis data available. The client must send evaluation data first.', available: false };
		return {
			fen: e.fen,
			best_move: e.best_move,
			score: e.best_score,
			depth: e.best_depth,
			pv: e.best_pv,
			available: true,
		};
	},
});

export const evaluate_user_move = tool({
	description: 'Get how the user\'s last move compares to Stockfish\'s best move. Returns the centipawn loss (delta), error classification (tactical/positional/prophylactic/strategic/none), and the engine\'s evaluation of the user\'s move.',
	inputSchema: z.object({}),
	execute: async () => {
		const e = get_current_eval();
		if (!e) return { error: 'No analysis data available.', available: false };
		return {
			user_move: e.user_move,
			user_score: e.user_score,
			user_depth: e.user_depth,
			best_move: e.best_move,
			best_score: e.best_score,
			delta: e.delta,
			error_type: e.error_type ?? 'none',
			available: true,
		};
	},
});

export const get_multi_pv = tool({
	description: 'Get multiple candidate moves ranked by Stockfish with their evaluations. Useful when you want to see alternative good moves and understand why the best move is better. Returns top N lines sorted by score.',
	inputSchema: z.object({}),
	execute: async () => {
		const e = get_current_eval();
		if (!e) return { error: 'No analysis data available.', available: false };
		if (!e.multi_pv || e.multi_pv.length < 2) {
			return { lines: e.multi_pv ?? [{ move: e.best_move, score: e.best_score, depth: e.best_depth, pv: e.best_pv }], available: true, note: 'MultiPV data not requested — only best move available' };
		}
		return { lines: e.multi_pv, available: true };
	},
});

export const classify_error = tool({
	description: 'Classify the type of error the user made in their last move. Returns the error category (tactical: missed tactic/blunder >1.0 pawns; positional: suboptimal 0.3-1.0 pawns; prophylactic: missed opponent threat; strategic: correct move but wrong plan <0.3 pawns; none: best or near-best move) and the centipawn loss. Use this to decide what Socratic question to ask.',
	inputSchema: z.object({}),
	execute: async () => {
		const e = get_current_eval();
		if (!e) return { error: 'No analysis data available.', available: false };
		return {
			error_type: e.error_type ?? 'none',
			delta: e.delta,
			user_move: e.user_move,
			best_move: e.best_move,
			severity: e.delta !== undefined
				? e.delta > 100 ? 'severe' : e.delta > 50 ? 'moderate' : e.delta > 30 ? 'minor' : 'negligible'
				: 'unknown',
			available: true,
		};
	},
});
