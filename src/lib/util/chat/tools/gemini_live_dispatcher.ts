import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';

type BoardState = {
	fen: string;
	turn: 'w' | 'b';
	in_check: boolean;
	game_over: boolean;
	result: string;
	move_count: number;
	last_user_move: string;
	last_ai_move: string;
	orientation: 'w' | 'b';
	captured: { w: string[]; b: string[] };
	history_index: number;
	history_length: number;
};

type MoveResult = {
	valid: boolean;
	uci: string;
	san?: string;
	fen?: string;
	turn?: 'w' | 'b';
	in_check?: boolean;
	game_over?: boolean;
	error?: string;
};

type ToolState = {
	get_fen: () => string;
	run_eval: (fen: string, user_move_san: string) => Promise<string>;
	set_fen: (fen: string) => void;
	get_board_state: () => BoardState;
	make_move: (uci: string) => MoveResult;
	undo_move: () => { valid: boolean; error?: string };
	redo_move: () => { valid: boolean; error?: string };
	reset_board: () => { valid: boolean; error?: string };
	toggle_train_mode: () => { train_mode: boolean };
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
				description: 'Get the Stockfish evaluation of the current board position. Returns the best move, centipawn score (positive = advantage to side to move), depth searched, and principal variation. Use this to understand what Stockfish thinks is the strongest move and why. This tool takes a few seconds — acknowledge the user first, then call it.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'evaluate_user_move',
				description: "Get how the user's last move compares to Stockfish's best move. Returns the centipawn loss (delta), error classification (tactical/positional/prophylactic/strategic/none), and the engine's evaluation of the user's move. This tool takes a few seconds — acknowledge the user first, then call it.",
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'get_multi_pv',
				description: 'Get multiple candidate moves ranked by Stockfish with their evaluations. Useful when you want to see alternative good moves and understand why the best move is better. This tool takes a few seconds — acknowledge the user first, then call it.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'classify_error',
				description: 'Classify the type of error the user made in their last move. Returns the error category (tactical/positional/prophylactic/strategic/none) and the centipawn loss. This tool takes a few seconds — acknowledge the user first, then call it.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'get_board_state',
				description: 'Get the full current board state, including FEN, whose turn it is, check/checkmate status, game over state, move history navigation position, captured pieces, and last moves by both sides. Use this to understand the complete game context.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'move_piece',
				description: 'Make a chess move on the board using UCI notation (e.g. "e2e4", "g1f3", "d7d8q" for promotion). The move is validated for legality. In train mode you can move pieces for both sides; in normal mode you can only move the user\'s pieces. Call this multiple times in sequence to show a full variation with alternating moves. Use this when the user asks to play a move, or when you want to demonstrate a line on the board.',
				parameters: {
					type: 'OBJECT',
					properties: {
						uci: { type: 'STRING', description: 'The UCI move string: 4 characters for from/to squares, optional 5th for promotion piece (q/r/b/n). Examples: "e2e4" (pawn), "g1f3" (knight), "e7e8q" (promotion to queen).' },
					},
					required: ['uci'],
				},
			},
			{
				name: 'undo_move',
				description: 'Undo the last move (or last pair of moves). Use this when the user asks to take back a move.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'redo_move',
				description: 'Redo a previously undone move. Only works if an undo was performed. Use this when the user asks to redo a move they took back.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'reset_board',
				description: 'Reset the chess board to the starting position. Clears all move history and starts a new game. Use this when the user asks to start a new game or reset the board.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'toggle_train_mode',
				description: 'Toggle train mode on/off. In train mode you can move pieces for both sides and act as the opponent. In normal mode the engine plays the opponent and you can only move the user\'s pieces. Use this when you need to demonstrate a variation that requires moving the opponent\'s pieces in normal mode, or when the user asks to switch modes. Always announce the mode change to the user.',
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
	const log = (msg: string) => console.log(`[tool-dispatch] ${msg}`);

	log(`dispatch_tool_call name="${name}" id=${fc.id ?? 'none'} args=${JSON.stringify(args)}`);
	const has_state = state !== null;
	const has_fen = !!state?.get_fen?.();
	log(`state_initialized=${has_state} has_fen=${has_fen}`);

	switch (name) {
		case 'set_puzzle_fen': {
			const fen_str = args.fen as string;
			const setup = parseFen(fen_str);
			if (!setup.isOk) {
				log(`set_puzzle_fen invalid FEN: ${fen_str}`);
				return { id: fc.id, name, response: { valid: false, error: 'Invalid FEN syntax' } };
			}
			const pos = Chess.fromSetup(setup.unwrap());
			if (!pos.isOk) {
				log(`set_puzzle_fen impossible position: ${fen_str}`);
				return { id: fc.id, name, response: { valid: false, error: 'Invalid position: the FEN describes an impossible board state' } };
			}
			const chess = pos.unwrap();
			let warning: string | undefined;
			if (chess.isCheckmate()) warning = 'Checkmate — the game is already over.';
			else if (chess.isStalemate()) warning = 'Stalemate — the game is already over.';
			else if (chess.isCheck()) warning = 'The side to move is in check.';
			if (state) state.set_fen(fen_str);
			log(`set_puzzle_fen success fen=${fen_str}`);
			return { id: fc.id, name, response: { valid: true, fen: fen_str, warning } };
		}

		case 'get_fen': {
			const f = state?.get_fen?.() ?? null;
			log(`get_fen returning fen=${f ?? 'null'}`);
			return { id: fc.id, name, response: { fen: f, error: f ? undefined : 'No board position has been set yet.' } };
		}

		case 'evaluate_position': {
			const fen_ep = state?.get_fen?.() ?? '';
			const board_ep = state?.get_board_state?.();
			log(`evaluate_position: calling run_eval for fen=${fen_ep.slice(0, 40)}...`);
			const eval_json_ep = await state?.run_eval?.(fen_ep, board_ep?.last_user_move ?? '') ?? '';
			const e_ep = parse_eval(eval_json_ep);
			if (!e_ep) {
				log('evaluate_position FAILED — no eval data returned');
				return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			}
			log(`evaluate_position: best_move=${e_ep.best_move} score=${e_ep.best_score} depth=${e_ep.best_depth} fen=${(e_ep.fen ?? '').slice(0, 40)} pv=${((e_ep.best_pv ?? []) as string[]).join(' ')}`);
			return { id: fc.id, name, response: { fen: e_ep.fen, best_move: e_ep.best_move, score: e_ep.best_score, depth: e_ep.best_depth, pv: e_ep.best_pv, available: true } };
		}

		case 'evaluate_user_move': {
			const fen_eum = state?.get_fen?.() ?? '';
			const board_eum = state?.get_board_state?.();
			const user_move_eum = board_eum?.last_user_move ?? '';
			log(`evaluate_user_move: calling run_eval for fen=${fen_eum.slice(0, 40)} user_move=${user_move_eum}`);
			const eval_json_eum = await state?.run_eval?.(fen_eum, user_move_eum) ?? '';
			const e_eum = parse_eval(eval_json_eum);
			if (!e_eum) {
				log('evaluate_user_move FAILED — no eval data returned');
				return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			}
			log(`evaluate_user_move: user_move=${e_eum.user_move} best_move=${e_eum.best_move} delta=${e_eum.delta} error_type=${e_eum.error_type}`);
			return { id: fc.id, name, response: { user_move: e_eum.user_move, user_score: e_eum.user_score, user_depth: e_eum.user_depth, best_move: e_eum.best_move, best_score: e_eum.best_score, delta: e_eum.delta, error_type: e_eum.error_type ?? 'none', available: true } };
		}

		case 'get_multi_pv': {
			const fen_gmp = state?.get_fen?.() ?? '';
			const board_gmp = state?.get_board_state?.();
			log(`get_multi_pv: calling run_eval for fen=${fen_gmp.slice(0, 40)}...`);
			const eval_json_gmp = await state?.run_eval?.(fen_gmp, board_gmp?.last_user_move ?? '') ?? '';
			const e_gmp = parse_eval(eval_json_gmp);
			if (!e_gmp) {
				log('get_multi_pv FAILED — no eval data returned');
				return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			}
			const lines_gmp = e_gmp.multi_pv as { move: string; score: number; depth: number; pv: string[] }[] | undefined;
			log(`get_multi_pv: ${(lines_gmp ?? []).length} lines, best_move=${e_gmp.best_move}`);
			return { id: fc.id, name, response: { lines: lines_gmp ?? [{ move: e_gmp.best_move, score: e_gmp.best_score, depth: e_gmp.best_depth, pv: e_gmp.best_pv }], available: true } };
		}

		case 'classify_error': {
			const fen_ce = state?.get_fen?.() ?? '';
			const board_ce = state?.get_board_state?.();
			const user_move_ce = board_ce?.last_user_move ?? '';
			log(`classify_error: calling run_eval for fen=${fen_ce.slice(0, 40)} user_move=${user_move_ce}`);
			const eval_json_ce = await state?.run_eval?.(fen_ce, user_move_ce) ?? '';
			const e_ce = parse_eval(eval_json_ce);
			if (!e_ce) {
				log('classify_error FAILED — no eval data returned');
				return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			}
			const delta_ce = e_ce.delta as number | undefined;
			log(`classify_error: error_type=${e_ce.error_type} delta=${delta_ce} user_move=${e_ce.user_move} best_move=${e_ce.best_move}`);
			return { id: fc.id, name, response: { error_type: e_ce.error_type ?? 'none', delta: delta_ce, user_move: e_ce.user_move, best_move: e_ce.best_move, severity: delta_ce !== undefined ? delta_ce > 100 ? 'severe' : delta_ce > 50 ? 'moderate' : delta_ce > 30 ? 'minor' : 'negligible' : 'unknown', available: true } };
		}

		case 'get_board_state': {
			const b = state?.get_board_state?.();
			if (!b) {
				log('get_board_state FAILED — state or callback missing');
				return { id: fc.id, name, response: { error: 'Board state not available.' } };
			}
			log(`get_board_state: fen=${b.fen.slice(0, 40)} turn=${b.turn} game_over=${b.game_over}`);
			return { id: fc.id, name, response: b };
		}

		case 'move_piece': {
			const uci = (args.uci as string || '').trim().toLowerCase();
			if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
				log(`move_piece invalid UCI format: "${args.uci}"`);
				return { id: fc.id, name, response: { valid: false, uci, error: 'Invalid UCI format. Expected format like "e2e4", "g1f3", or "d7d8q" for promotion.' } };
			}
			if (!state?.make_move) {
				log('move_piece FAILED — make_move callback not available');
				return { id: fc.id, name, response: { valid: false, uci, error: 'Move execution not available.' } };
			}
			const r = state.make_move(uci);
			log(`move_piece: uci=${uci} valid=${r.valid} san=${r.san ?? '?'} fen=${(r.fen ?? '').slice(0, 40)}`);
			return { id: fc.id, name, response: r };
		}

		case 'undo_move': {
			if (!state?.undo_move) {
				log('undo_move FAILED — callback not available');
				return { id: fc.id, name, response: { valid: false, error: 'Undo not available.' } };
			}
			const ur = state.undo_move();
			log(`undo_move: valid=${ur.valid}`);
			return { id: fc.id, name, response: ur };
		}

		case 'redo_move': {
			if (!state?.redo_move) {
				log('redo_move FAILED — callback not available');
				return { id: fc.id, name, response: { valid: false, error: 'Redo not available.' } };
			}
			const rr = state.redo_move();
			log(`redo_move: valid=${rr.valid}`);
			return { id: fc.id, name, response: rr };
		}

		case 'reset_board': {
			if (!state?.reset_board) {
				log('reset_board FAILED — callback not available');
				return { id: fc.id, name, response: { valid: false, error: 'Reset not available.' } };
			}
			state.reset_board();
			log('reset_board: done');
			return { id: fc.id, name, response: { valid: true } };
		}

		case 'toggle_train_mode': {
			if (!state?.toggle_train_mode) {
				log('toggle_train_mode FAILED — callback not available');
				return { id: fc.id, name, response: { train_mode: false, error: 'Toggle not available.' } };
			}
			const tr = state.toggle_train_mode();
			log(`toggle_train_mode: train_mode=${tr.train_mode}`);
			return { id: fc.id, name, response: tr };
		}

		default:
			log(`UNKNOWN function: "${name}"`);
			return { id: fc.id, name, response: { error: `Unknown function: ${name}` } };
	}
}
