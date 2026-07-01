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
	get_eval: () => string;
	set_fen: (fen: string) => void;
	get_board_state: () => BoardState;
	make_move: (uci: string) => MoveResult;
	toggle_voice_show: (active: boolean) => { active: boolean };
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
			{
				name: 'get_board_state',
				description: 'Get the full current board state, including FEN, whose turn it is, check/checkmate status, game over state, move history navigation position, captured pieces, and last moves by both sides. Use this to understand the complete game context.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'move_piece',
				description: 'Make a chess move on the board using UCI notation (e.g. "e2e4", "g1f3", "d7d8q" for promotion). The move is validated for legality. You can move any piece for either side — the tool automatically plays whichever side is to move. Call this multiple times in sequence to show a full variation with alternating moves. Use this when the user asks to play a move, or when you want to demonstrate a line on the board.',
				parameters: {
					type: 'OBJECT',
					properties: {
						uci: { type: 'STRING', description: 'The UCI move string: 4 characters for from/to squares, optional 5th for promotion piece (q/r/b/n). Examples: "e2e4" (pawn), "g1f3" (knight), "e7e8q" (promotion to queen).' },
					},
					required: ['uci'],
				},
			},
			{
				name: 'toggle_voice_show',
				description: 'Toggle "voice show" mode so you can move pieces for both sides. ONLY activate this when you need to move the opponent\'s pieces (e.g. demonstrating a variation, showing alternative lines, responding to "what if" questions). If you only need to move the user\'s pieces, just use move_piece directly. When done showing the variation, ALWAYS toggle voice show back off so the engine can resume normally, then call get_board_state to refresh your view of the board — the engine may have already responded to the last move.',
				parameters: {
					type: 'OBJECT',
					properties: {
						active: { type: 'BOOLEAN', description: 'Set to true to enable voice show mode, false to disable it.' },
					},
					required: ['active'],
				},
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
	const eval_raw = state?.get_eval?.() ?? '';
	const has_eval = eval_raw.length > 0;
	log(`state_initialized=${has_state} has_fen=${has_fen} has_eval=${has_eval} eval_length=${eval_raw.length}`);

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
			const e = parse_eval(eval_raw);
			if (!e) {
				log(`evaluate_position FAILED — no eval data. raw="${eval_raw.slice(0, 100)}"`);
				return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			}
			log(`evaluate_position: best_move=${e.best_move} score=${e.best_score} depth=${e.best_depth} fen=${(e.fen ?? '').slice(0, 40)} pv=${((e.best_pv ?? []) as string[]).join(' ')}`);
			return { id: fc.id, name, response: { fen: e.fen, best_move: e.best_move, score: e.best_score, depth: e.best_depth, pv: e.best_pv, available: true } };
		}

		case 'evaluate_user_move': {
			const e = parse_eval(eval_raw);
			if (!e) {
				log(`evaluate_user_move FAILED — no eval data. raw="${eval_raw.slice(0, 100)}"`);
				return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			}
			log(`evaluate_user_move: user_move=${e.user_move} best_move=${e.best_move} delta=${e.delta} error_type=${e.error_type}`);
			return { id: fc.id, name, response: { user_move: e.user_move, user_score: e.user_score, user_depth: e.user_depth, best_move: e.best_move, best_score: e.best_score, delta: e.delta, error_type: e.error_type ?? 'none', available: true } };
		}

		case 'get_multi_pv': {
			const e = parse_eval(eval_raw);
			if (!e) {
				log(`get_multi_pv FAILED — no eval data. raw="${eval_raw.slice(0, 100)}"`);
				return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			}
			const lines = e.multi_pv as { move: string; score: number; depth: number; pv: string[] }[] | undefined;
			log(`get_multi_pv: ${(lines ?? []).length} lines, best_move=${e.best_move}`);
			return { id: fc.id, name, response: { lines: lines ?? [{ move: e.best_move, score: e.best_score, depth: e.best_depth, pv: e.best_pv }], available: true } };
		}

		case 'classify_error': {
			const e = parse_eval(eval_raw);
			if (!e) {
				log(`classify_error FAILED — no eval data. raw="${eval_raw.slice(0, 100)}"`);
				return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			}
			const delta = e.delta as number | undefined;
			log(`classify_error: error_type=${e.error_type} delta=${delta} user_move=${e.user_move} best_move=${e.best_move}`);
			return { id: fc.id, name, response: { error_type: e.error_type ?? 'none', delta, user_move: e.user_move, best_move: e.best_move, severity: delta !== undefined ? delta > 100 ? 'severe' : delta > 50 ? 'moderate' : delta > 30 ? 'minor' : 'negligible' : 'unknown', available: true } };
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

		case 'toggle_voice_show': {
			const active = args.active as boolean;
			if (typeof active !== 'boolean') {
				log(`toggle_voice_show invalid arg: ${JSON.stringify(args.active)}`);
				return { id: fc.id, name, response: { error: 'Expected boolean "active" parameter.' } };
			}
			if (!state?.toggle_voice_show) {
				log('toggle_voice_show FAILED — callback not available');
				return { id: fc.id, name, response: { error: 'Voice show toggle not available.' } };
			}
			const r = state.toggle_voice_show(active);
			log(`toggle_voice_show: active=${r.active}`);
			return { id: fc.id, name, response: r };
		}

		default:
			log(`UNKNOWN function: "${name}"`);
			return { id: fc.id, name, response: { error: `Unknown function: ${name}` } };
	}
}
