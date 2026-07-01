import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';

type ToolState = {
	get_fen: () => string;
	get_eval: () => string;
	set_fen: (fen: string) => void;
};

let state: ToolState | null = null;

export function init_tool_state(s: ToolState) {
	state = s;
}

export function get_tool_declarations() {
	return [{
		functionDeclarations: [
			{
				name: 'set_puzzle_fen',
				description: 'Set the chess board to a specific FEN position. Use when the user asks to set up a puzzle, a specific board state, or create a custom position from a description.',
				parameters: {
					type: 'OBJECT',
					properties: {
						fen: { type: 'STRING', description: 'The FEN string representing the chess board position' },
					},
					required: ['fen'],
				},
			},
			{
				name: 'get_fen',
				description: 'Read the current chess board position as a FEN string. Use when you need to reference the current position.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'evaluate_position',
				description: 'Get the Stockfish evaluation of the current board position. Returns the best move, centipawn score (positive = advantage to side to move), depth searched, and principal variation. Use this to understand what Stockfish thinks is the strongest move and why.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'evaluate_user_move',
				description: "Get how the user's last move compares to Stockfish's best move. Returns the centipawn loss (delta), error classification (tactical/positional/prophylactic/strategic/none), and the engine's evaluation of the user's move.",
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'get_multi_pv',
				description: 'Get multiple candidate moves ranked by Stockfish with their evaluations. Useful when you want to see alternative good moves and understand why the best move is better.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'classify_error',
				description: 'Classify the type of error the user made in their last move. Returns the error category (tactical/positional/prophylactic/strategic/none) and the centipawn loss.',
				parameters: { type: 'OBJECT', properties: {} },
			},
		],
	}];
}

function parse_eval(eval_json: string) {
	if (!eval_json) return null;
	try { return JSON.parse(eval_json); } catch { return null; }
}

export async function dispatch_tool_call(fc: { id?: string; name?: string; args?: Record<string, unknown> }) {
	const name = fc.name || '';
	const args = fc.args || {};

	switch (name) {
		case 'set_puzzle_fen': {
			const fen_str = args.fen as string;
			const setup = parseFen(fen_str);
			if (!setup.isOk) {
				return { id: fc.id, name, response: { valid: false, error: 'Invalid FEN syntax' } };
			}
			const pos = Chess.fromSetup(setup.unwrap());
			if (!pos.isOk) {
				return { id: fc.id, name, response: { valid: false, error: 'Invalid position: the FEN describes an impossible board state' } };
			}
			const chess = pos.unwrap();
			let warning: string | undefined;
			if (chess.isCheckmate()) warning = 'Checkmate — the game is already over.';
			else if (chess.isStalemate()) warning = 'Stalemate — the game is already over.';
			else if (chess.isCheck()) warning = 'The side to move is in check.';
			if (state) state.set_fen(fen_str);
			return { id: fc.id, name, response: { valid: true, fen: fen_str, warning } };
		}

		case 'get_fen': {
			const f = state?.get_fen?.() ?? null;
			return { id: fc.id, name, response: { fen: f, error: f ? undefined : 'No board position has been set yet.' } };
		}

		case 'evaluate_position': {
			const e = parse_eval(state?.get_eval?.() ?? '');
			if (!e) return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			return { id: fc.id, name, response: { fen: e.fen, best_move: e.best_move, score: e.best_score, depth: e.best_depth, pv: e.best_pv, available: true } };
		}

		case 'evaluate_user_move': {
			const e = parse_eval(state?.get_eval?.() ?? '');
			if (!e) return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			return { id: fc.id, name, response: { user_move: e.user_move, user_score: e.user_score, user_depth: e.user_depth, best_move: e.best_move, best_score: e.best_score, delta: e.delta, error_type: e.error_type ?? 'none', available: true } };
		}

		case 'get_multi_pv': {
			const e = parse_eval(state?.get_eval?.() ?? '');
			if (!e) return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			return { id: fc.id, name, response: { lines: e.multi_pv ?? [{ move: e.best_move, score: e.best_score, depth: e.best_depth, pv: e.best_pv }], available: true } };
		}

		case 'classify_error': {
			const e = parse_eval(state?.get_eval?.() ?? '');
			if (!e) return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			const delta = e.delta;
			return { id: fc.id, name, response: { error_type: e.error_type ?? 'none', delta, user_move: e.user_move, best_move: e.best_move, severity: delta !== undefined ? delta > 100 ? 'severe' : delta > 50 ? 'moderate' : delta > 30 ? 'minor' : 'negligible' : 'unknown', available: true } };
		}

		default:
			return { id: fc.id, name, response: { error: `Unknown function: ${name}` } };
	}
}
