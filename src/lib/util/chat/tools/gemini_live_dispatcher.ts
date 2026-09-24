import { PUZZLE_TOOL_DESCRIPTION } from '$lib/types/puzzle';
import { arm_puzzle, offer_puzzles, start_puzzle } from '$components/learn/puzzle.svelte';

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

export function get_tool_declarations(include_search = true) {
	const tools: any[] = [
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
				name: 'find_puzzles',
				description: PUZZLE_TOOL_DESCRIPTION,
				parameters: { type: 'OBJECT', properties: {
					t: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Tags that must all be present, e.g. ["fork", "endgame"]' },
					any: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Tags where at least one must be present, e.g. ["pin", "skewer"]' },
					r_min: { type: 'NUMBER', description: 'Minimum puzzle rating' },
					r_max: { type: 'NUMBER', description: 'Maximum puzzle rating' },
					n: { type: 'NUMBER', description: 'How many puzzles to return, 1-30. Default 5.' },
				} },
			},
			{
				name: 'set_state',
				description: 'Set the board to any position using a FEN string. Use this when the user asks you to set up a specific position, a puzzle, or a famous game position. Only use this tool when the user explicitly asks you to, or when you suggest showing a position and they agree.',
				parameters: { type: 'OBJECT', properties: {
					fen: { type: 'STRING', description: 'The FEN string of the position to load. Example: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" for the starting position.' },
				}, required: ['fen'] },
			},
		],
	},
];
	if (include_search) tools.unshift({ googleSearch: {} });
	return tools;
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

		case 'find_puzzles': {
			try {
				const res = await fetch('/api/puzzles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(fc.args ?? {}),
				});
				const body = await res.json();
				offer_puzzles(body?.puzzles);
				log(`find_puzzles: returned ${body?.puzzles?.length ?? 0}`);
				return { id: fc.id, name, response: body };
			} catch (e) {
				log(`find_puzzles FAILED — ${e}`);
				return { id: fc.id, name, response: { puzzles: [], error: 'Puzzle search failed.' } };
			}
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
			const puzzle = arm_puzzle(fen);
			const r = state.load_fen(fen);
			if (puzzle && r.valid) start_puzzle(puzzle);
			log(`set_state: valid=${r.valid} fen=${(r.fen ?? '').slice(0, 40)}`);
			return { id: fc.id, name, response: r };
		}

		default:
			log(`UNKNOWN function: "${name}"`);
			return { id: fc.id, name, response: { error: `Unknown function: ${name}` } };
	}
}

export function summarize_tool_result(name: string, response: Record<string, unknown>) {
	if (response.error) return String(response.error);
	if (name === 'get_fen') return `current fen: ${response.fen ?? ''}`;
	if (name === 'hint') {
		if (!response.available) return 'no hint available';
		return `best move ${response.best_move}, score ${response.score}, depth ${response.depth}`;
	}
	if (name === 'get_board_state') {
		return `fen ${response.fen}. turn ${response.turn}. check ${response.in_check}. game over ${response.game_over}. last user ${response.last_user_move || 'none'}. last engine ${response.last_ai_move || 'none'}.`;
	}
	if (name === 'find_puzzles') {
		const puzzles = Array.isArray(response.puzzles) ? response.puzzles as any[] : [];
		if (!puzzles.length) return 'no puzzles matched';
		return puzzles.slice(0, 5).map((p, i) => `${i + 1}. rating ${p.r} fen ${p.f}`).join(' ');
	}
	if (name === 'set_state') {
		return response.valid ? `board set to ${response.fen}` : `could not set board: ${response.error || 'invalid'}`;
	}
	try { return JSON.stringify(response).slice(0, 400); } catch { return 'done'; }
}
