

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

type LoadFenResult = {
	valid: boolean;
	error?: string;
	fen?: string;
};

type ToolState = {
	get_fen: () => string;
	hint: (fen: string, think_time?: number) => Promise<{ move: string; score: number; depth: number } | null>;
	get_board_state: () => BoardState;
	load_fen: (fen: string) => LoadFenResult;
};

let state: ToolState | null = null;

export function init_tool_state(s: ToolState) {
	state = s;
}

export function get_tool_declarations() {
	return [
		{ googleSearch: {} },
		{
			functionDeclarations: [
			{
				name: 'get_fen',
				description: 'Read the current chess board position as a FEN string. Use when you need to reference the current position.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'hint',
				description: 'Get the Stockfish evaluation of the current board position. Returns the best move and its centipawn score. Only call this when the user explicitly asks for a hint or move suggestion — never proactively. The model waits for the result before speaking, so the user sees no delay. Optionally specify think_time in seconds to control analysis depth (default matches your setting).',
				parameters: { type: 'OBJECT', properties: {
					think_time: { type: 'NUMBER', description: 'Optional. How many seconds to let Stockfish think. Higher = deeper analysis. Defaults to your setting.' },
				} },
			},
			{
				name: 'get_board_state',
				description: 'Get the full current board state, including FEN, whose turn it is, check/checkmate status, game over state, move history navigation position, captured pieces, and last moves by both sides. Use this to understand the complete game context.',
				parameters: { type: 'OBJECT', properties: {} },
			},
			{
				name: 'set_state',
				description: 'Set the board to any position using a FEN string. Use this when the user asks you to set up a specific position, a puzzle, or a famous game position. Only use this tool when the user explicitly asks you to, or when you suggest showing a position and they agree.',
				parameters: { type: 'OBJECT', properties: {
					fen: { type: 'STRING', description: 'The FEN string of the position to load. Example: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" for the starting position.' },
				}, required: ['fen'] },
			},
			// {
		// 		description: 'Make a chess move on the board using UCI notation (e.g. "e2e4", "g1f3", "d7d8q" for promotion). The move is validated for legality. In train mode you can move pieces for both sides; in normal mode you can only move the user\'s pieces. Call this multiple times in sequence to show a full variation with alternating moves. Use this when the user asks to play a move, or when you want to demonstrate a line on the board. IMPORTANT: In train mode, when moving the user\'s pieces (it\'s their turn), you must first ask for confirmation. If the move is rejected with pending_confirmation, ask the user if they want to play it, then retry with confirmed:true.',
		// 		parameters: {
		// 			type: 'OBJECT',
		// 			properties: {
		// 				uci: { type: 'STRING', description: 'The UCI move string: 4 characters for from/to squares, optional 5th for promotion piece (q/r/b/n). Examples: "e2e4" (pawn), "g1f3" (knight), "e7e8q" (promotion to queen).' },
		// 				confirmed: { type: 'BOOLEAN', description: 'In train mode, set to true only after asking the user and receiving explicit verbal confirmation to play this move. Not needed when moving the opponent\'s pieces.' },
		// 			},
		// 			required: ['uci'],
		// 		},
		// 	},
		// 	{
		// 		name: 'undo_move',
		// 		description: 'Undo the last move (or last pair of moves). Use this when the user asks to take back a move.',
		// 		parameters: { type: 'OBJECT', properties: {} },
		// 	},
		// 	{
		// 		name: 'redo_move',
		// 		description: 'Redo a previously undone move. Only works if an undo was performed. Use this when the user asks to redo a move they took back.',
		// 		parameters: { type: 'OBJECT', properties: {} },
		// 	},
		// 	{
		// 		name: 'reset_board',
		// 		description: 'Reset the chess board to the starting position. Clears all move history and starts a new game. Use this when the user asks to start a new game or reset the board.',
		// 		parameters: { type: 'OBJECT', properties: {} },
		// 	},
		// 	{
		// 		name: 'toggle_train_mode',
		// 		description: 'Toggle train mode on/off. In train mode you can move pieces for both sides and act as the opponent. In normal mode the engine plays the opponent and you can only move the user\'s pieces. Use this when you need to demonstrate a variation that requires moving the opponent\'s pieces in normal mode, or when the user asks to switch modes. Always announce the mode change to the user.',
		// 		parameters: { type: 'OBJECT', properties: {} },
		// 	},
		],
	},
];
}

export async function dispatch_tool_call(fc: { id?: string; name?: string; args?: Record<string, unknown> }) {
	const name = fc.name || '';
	const log = (msg: string) => console.log(`[tool-dispatch] ${msg}`);

	log(`dispatch_tool_call name="${name}" id=${fc.id ?? 'none'}`);
	const has_state = state !== null;
	const has_fen = !!state?.get_fen?.();
	log(`state_initialized=${has_state} has_fen=${has_fen}`);

	switch (name) {
		case 'get_fen': {
			const f = state?.get_fen?.() ?? null;
			log(`get_fen returning fen=${f ?? 'null'}`);
			return { id: fc.id, name, response: { fen: f, error: f ? undefined : 'No board position has been set yet.' } };
		}

		case 'hint': {
			const fen = state?.get_fen?.() ?? '';
			const think_time = (fc.args?.think_time as number | undefined) ?? undefined;
			log(`hint: calling hint for fen=${fen.slice(0, 40)} think_time=${think_time ?? 'default'}`);
			const best = await state?.hint?.(fen, think_time) ?? null;
			if (!best) {
				log('hint FAILED — no hints returned');
				return { id: fc.id, name, response: { error: 'No analysis data available.', available: false } };
			}
			log(`hint: best_move=${best.move} score=${best.score} depth=${best.depth}`);
			return { id: fc.id, name, response: { best_move: best.move, score: best.score, depth: best.depth, available: true } };
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

		case 'set_state': {
			const fen = (fc.args?.fen as string || '').trim();
			if (!fen) {
				return { id: fc.id, name, response: { valid: false, error: 'No FEN provided.' } };
			}
			if (!state?.load_fen) {
				log('set_state FAILED — load_fen callback not available');
				return { id: fc.id, name, response: { valid: false, error: 'Set state not available.' } };
			}
			const r = state.load_fen(fen);
			log(`set_state: valid=${r.valid} fen=${(r.fen ?? '').slice(0, 40)}`);
			return { id: fc.id, name, response: r };
		}

		// case 'move_piece': {
		// 	const uci = (args.uci as string || '').trim().toLowerCase();
		// 	if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
		// 		log(`move_piece invalid UCI format: "${args.uci}"`);
		// 		return { id: fc.id, name, response: { valid: false, uci, error: 'Invalid UCI format. Expected format like "e2e4", "g1f3", or "d7d8q" for promotion.' } };
		// 	}
		// 	if (!state?.make_move) {
		// 		log('move_piece FAILED — make_move callback not available');
		// 		return { id: fc.id, name, response: { valid: false, uci, error: 'Move execution not available.' } };
		// 	}
		// 	const confirmed = args.confirmed === true;
		// 	const r = state.make_move(uci, confirmed);
		// 	log(`move_piece: uci=${uci} valid=${r.valid} san=${r.san ?? '?'} fen=${(r.fen ?? '').slice(0, 40)}`);
		// 	return { id: fc.id, name, response: r };
		// }

		// case 'undo_move': {
		// 	if (!state?.undo_move) {
		// 		log('undo_move FAILED — callback not available');
		// 		return { id: fc.id, name, response: { valid: false, error: 'Undo not available.' } };
		// 	}
		// 	const ur = state.undo_move();
		// 	log(`undo_move: valid=${ur.valid}`);
		// 	return { id: fc.id, name, response: ur };
		// }

		// case 'redo_move': {
		// 	if (!state?.redo_move) {
		// 		log('redo_move FAILED — callback not available');
		// 		return { id: fc.id, name, response: { valid: false, error: 'Redo not available.' } };
		// 	}
		// 	const rr = state.redo_move();
		// 	log(`redo_move: valid=${rr.valid}`);
		// 	return { id: fc.id, name, response: rr };
		// }

		// case 'reset_board': {
		// 	if (!state?.reset_board) {
		// 		log('reset_board FAILED — callback not available');
		// 		return { id: fc.id, name, response: { valid: false, error: 'Reset not available.' } };
		// 	}
		// 	state.reset_board();
		// 	log('reset_board: done');
		// 	return { id: fc.id, name, response: { valid: true } };
		// }

		// case 'toggle_train_mode': {
		// 	if (!state?.toggle_train_mode) {
		// 		log('toggle_train_mode FAILED — callback not available');
		// 		return { id: fc.id, name, response: { train_mode: false, error: 'Toggle not available.' } };
		// 	}
		// 	const tr = state.toggle_train_mode();
		// 	log(`toggle_train_mode: train_mode=${tr.train_mode}`);
		// 	return { id: fc.id, name, response: tr };
		// }

		default:
			log(`UNKNOWN function: "${name}"`);
			return { id: fc.id, name, response: { error: `Unknown function: ${name}` } };
	}
}
