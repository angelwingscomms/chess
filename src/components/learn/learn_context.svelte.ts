import { Chess } from 'svelte-chess';
import { Chess as ChessJS } from 'chess.js';
import { browser } from '$app/environment';
import { LearnEngine, getHints } from '$lib/util/chess/engine';
import type { Color, Hint } from '$lib/util/chess/engine';
import { can_reuse_hints, hint_squares } from '$lib/util/chess/hint_highlight';
import { calc_cost } from '$lib/util/ai/pricing';
import { init_tool_state, get_tool_declarations, dispatch_tool_call } from '$lib/util/chat/tools/gemini_live_dispatcher';
import type { ChatContext, ChatData, ChatUsage, ChatMsg } from './types';
import { getContext, setContext } from 'svelte';

const socratic_sys = `Keep responses extremely short — 1-3 sentences. Plain language, like talking to a friend.

You are a chess trainer asking questions to make the user think. Weave move types and strategic concepts into questions naturally — never lecture, just name the idea in context. Never mention engines or scores.

Core: never give answers. Make the user figure it out. Use the move type and strategy as the frame:
- Tactical error → "What's your opponent threatening?"
- Passive/aimless move → "What's the strategic goal of your last move?"
- Missed idea → "What does that move accomplish?"
- No plan → "What's the position telling you?"
- Broke a principle → "Which principle did you just break?"
- Good move → "What does that accomplish strategically?"
- "I don't know" → "Let's look at it differently. What stands out?"

Weave in concepts: move types (development, attack, defense, prophylaxis, positional, tactical), initiative, pawn structure, outposts, weak squares, tempi, color complexes, simplification, undermining, openings. Every question teaches by naming the idea.

End by asking if they want you to explain any of those chess concepts further. No formal wrap-ups.`;

const assistant_sys = `Keep responses extremely short — 1-3 sentences. Plain language, like talking to a friend.

You are a chess coach helping the user win. When analyzing a move, always name its type (development, attack, defense, prophylaxis, positional, tactical, simplification, undermining, etc.), explain the strategy behind it, and state the concrete advantage — what it threatens, prevents, or exploits. Weave in advanced ideas naturally: initiative, pawn structure, outposts, weak squares, tempi, color complexes, endgame principles, openings, etc., when relevant.

Never suggest moves or provide hints unless the user explicitly asks. Never call get_hints or any analysis tool proactively — only use them when the user directly requests a move suggestion or hint. Never mention engines or scores.

When the user asks about a position: strongest continuation, its type, and the strategic idea. Be specific about squares and pieces.

End by asking if they want you to explain any of those chess concepts further. No formal wrap-ups.`;

const tool_use_rules = `You have a set_state tool to set up any board position. Only use it when the user explicitly asks you to set up a position, puzzle, or game. If you suggest showing a position to teach something, ask first and only proceed if the user agrees. After changing the board, briefly state the new position.`;

export const voice_options = [
	{ v: 'Kore', l: 'Kore', d: 'Firm' },
	{ v: 'Zephyr', l: 'Zephyr', d: 'Bright' },
	{ v: 'Orus', l: 'Orus', d: 'Firm' },
	{ v: 'Puck', l: 'Puck', d: 'Upbeat' },
	{ v: 'Fenrir', l: 'Fenrir', d: 'Excitable' },
	{ v: 'Aoede', l: 'Aoede', d: 'Breezy' },
	{ v: 'Charon', l: 'Charon', d: 'Informative' },
	{ v: 'Leda', l: 'Leda', d: 'Youthful' },
	{ v: 'Umbriel', l: 'Umbriel', d: 'Easy-going' },
	{ v: 'Erinome', l: 'Erinome', d: 'Clear' },
	{ v: 'Algieba', l: 'Algieba', d: 'Smooth' },
	{ v: 'Achernar', l: 'Achernar', d: 'Soft' },
	{ v: 'Gacrux', l: 'Gacrux', d: 'Mature' },
	{ v: 'Despina', l: 'Despina', d: 'Smooth' },
	{ v: 'Sulafat', l: 'Sulafat', d: 'Warm' },
	{ v: 'Autonoe', l: 'Autonoe', d: 'Bright' },
	{ v: 'Laomedeia', l: 'Laomedeia', d: 'Upbeat' },
	{ v: 'Schedar', l: 'Schedar', d: 'Even' },
	{ v: 'Achird', l: 'Achird', d: 'Friendly' },
	{ v: 'Sadachbia', l: 'Sadachbia', d: 'Lively' },
	{ v: 'Enceladus', l: 'Enceladus', d: 'Breathy' },
	{ v: 'Algenib', l: 'Algenib', d: 'Gravelly' },
	{ v: 'Zubenelgenubi', l: 'Zubenelgenubi', d: 'Casual' },
	{ v: 'Sadaltager', l: 'Sadaltager', d: 'Knowledgeable' },
	{ v: 'Callirrhoe', l: 'Callirrhoe', d: 'Easy-going' },
	{ v: 'Iapetus', l: 'Iapetus', d: 'Clear' },
	{ v: 'Rasalgethi', l: 'Rasalgethi', d: 'Informative' },
	{ v: 'Alnilam', l: 'Alnilam', d: 'Firm' },
	{ v: 'Pulcherrima', l: 'Pulcherrima', d: 'Forward' },
	{ v: 'Vindemiatrix', l: 'Vindemiatrix', d: 'Gentle' },
];

const KEY = Symbol('learn');

export function set_learn_state(state: LearnState) {
	setContext(KEY, state);
}

export function get_learn_state(): LearnState {
	return getContext(KEY)!;
}

export function create_learn_state() {
	return new LearnState();
}

export class LearnState {
	vibe = $state<'socratic' | 'assistant'>(browser && (localStorage.getItem('vibe') as 'socratic' | 'assistant') || 'socratic');
	level = $state(3);
	turn = $state<Color>('w');
	orientation = $state<Color>('w');
	moveNum = $state(0);
	history = $state<string[]>([]);
	fen = $state('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
	board_history = $state<string[]>(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);
	board_history_idx = $state(0);
	inCheck = $state(false);
	gameOver = $state(false);
	resultMsg = $state('');
	ready = $state(false);
	chessRef = $state<Chess | null>(null);

	show_hints = $state(false);
	hints = $state<Hint[]>([]);
	hint_fen = $state('');
	hint_index = $state(0);
	hint_loading = $state(false);
	hint_ac = $state<AbortController | null>(null);
	chat_messages = $state<ChatMsg[]>([]);
	chat_loading = $state(false);
	chat_abort = $state<AbortController | null>(null);
	chat_input = $state('');
	chat_queue = $state<{ text: string; hint?: string; voice?: boolean }[]>([]);

	interaction_id = $state('');
	last_user_move = $state('');
	last_ai_move = $state('');
	redo_stack = $state<string[]>([]);
	successful_context = $state<Partial<ChatContext>>({});

	model = $state(browser && localStorage.getItem('explain_model') || 'openai/gpt-oss-120b');
	autoexplain = $state(browser && localStorage.getItem('autoexplain') !== 'false');
	auto_hint = $state(browser && localStorage.getItem('auto_hint') === 'true');
	hint_on_start = $state(browser && localStorage.getItem('hint_on_start') === 'true');
	hint_think_time = $state(browser && parseFloat(localStorage.getItem('hint_think_time') || '2.7') || 2.7);
	computer_think_time = $state(1.5);
	groq_api_key = $state(browser && localStorage.getItem('groq_api_key') || '');
	quiet = $state(browser && localStorage.getItem('quiet') === 'true');
	voice_name = $state(browser && localStorage.getItem('voice_name') || 'Kore');
	noise_suppression = $state(browser && localStorage.getItem('noise_suppression') !== 'false');
	noise_suppression_level = $state(browser && parseFloat(localStorage.getItem('noise_suppression_level') || '50') || 50);

	show_voice_menu = $state(false);
	start_hint_done = $state(false);
	show_settings = $state(false);
	show_model_menu = $state(false);
	show_vibe_menu = $state(false);
	show_token_modal = $state(false);

	total_p = $state(0);
	total_c = $state(0);
	total_cost = $state(0);
	chat_body = $state<HTMLDivElement | null>(null);
	chat_input_ref = $state<HTMLTextAreaElement | null>(null);
	recording = $state(false);
	sel_text = $state('');
	sel_pos = $state<{ x: number; y: number } | null>(null);
	voice_tts = $state(false);
	voice_muted = $state(false);
	audio_muted = $state(false);
	gemini_live_session: any = null;
	gemini_live_audio_ctx: AudioContext | null = null;
	gemini_live_audio_gain: GainNode | null = null;
	gemini_live_mic_stream: MediaStream | null = null;
	gemini_live_processor: ScriptProcessorNode | null = null;
	gemini_live_audio_queue: AudioBuffer[] = [];
	gemini_live_audio_playing = false;
	gemini_live_current_source: AudioBufferSourceNode | null = null;
	gemini_last_usage_p = $state(0);
	gemini_last_usage_c = $state(0);
	gemini_deduct_pending = false;

	rnnoise_node: AudioWorkletNode | null = null;

	_last_fen_sent = 0;
	_set_state_fail_count = 0;
	gemini_live_healthy = false;
	thinking_sound: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
	thinking_sound_buf: AudioBuffer | null = null;
	toasts = $state<{ id: number; msg: string }[]>([]);
	toast_id = $state(0);
	output_turn_active = false;
	model_options = $state<{ v: string; l: string; d: string; r?: boolean }[]>([]);
	save_timeout: ReturnType<typeof setTimeout> | null = null;
	saved_data: Record<string, unknown> | null = null;

	readonly LS_KEY = 'chess_save';

	constructor() {
		$effect(() => { if (browser) localStorage.setItem('autoexplain', String(this.autoexplain)); });
		$effect(() => { if (browser) localStorage.setItem('auto_hint', String(this.auto_hint)); });
		$effect(() => { if (browser) localStorage.setItem('hint_on_start', String(this.hint_on_start)); });
		$effect(() => { if (browser) localStorage.setItem('hint_think_time', String(this.hint_think_time)); });
		$effect(() => { if (browser) localStorage.setItem('groq_api_key', this.groq_api_key); });
		$effect(() => { if (browser) localStorage.setItem('quiet', String(this.quiet)); });
		$effect(() => { if (browser) localStorage.setItem('voice_name', this.voice_name); });
		$effect(() => { if (browser) localStorage.setItem('vibe', this.vibe); });
		$effect(() => { if (browser) localStorage.setItem('noise_suppression', String(this.noise_suppression)); });
		$effect(() => { if (browser) localStorage.setItem('noise_suppression_level', String(this.noise_suppression_level)); });

		$effect(() => {
			const el = this.chat_body;
			if (!el) return;
			this.chat_messages.length;
			this.chat_queue.length;
			requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
		});

		$effect(() => {
			return () => { this.cleanup_gemini_live(); };
		});

		$effect(() => {
			if (browser) { this.groq_api_key; this.fetch_models(); }
		});

		$effect(() => {
			if (!browser) return;
			document.addEventListener('selectionchange', this.handle_selection);
			return () => document.removeEventListener('selectionchange', this.handle_selection);
		});

		if (browser) {
			let best: Record<string, unknown> | null = null;
			try {
				const ls = localStorage.getItem(this.LS_KEY);
				if (ls) best = JSON.parse(ls);
			} catch {}
			fetch('/api/load').then(r => r.json()).then(({ data: sd }) => {
				if (sd && (!best || (sd.d ?? 0) > (best.d ?? 0))) best = sd;
				if (best) this.saved_data = best;
			}).catch(() => { if (best) this.saved_data = best; });
		}

		$effect(() => {
			if (this.ready && this.saved_data) {
				this.restore_game(this.saved_data);
			}
		});
	}

	get current_sys() {
		return this.vibe === 'assistant' ? assistant_sys : socratic_sys;
	}

	get captured() {
		if (!this.chessRef) return { w: [] as string[], b: [] as string[] };
		try {
			const moves = this.chessRef.getHistory({ verbose: true }) as any[];
			const w: string[] = [], b: string[] = [];
			for (const m of moves) if (m.captured) {
				if (m.color === 'w') b.push(m.captured);
				else w.push(m.captured);
			}
			return { w, b };
		} catch { return { w: [] as string[], b: [] as string[] }; }
	}

	get chat_suggestions() {
		if (this.chat_messages.length > 0 || this.gameOver) return [];
		const s: string[] = [];
		if (this.inCheck) s.push('How do I get out of check?');
		if (this.moveNum === 0) s.push('Suggest a good opening move');
		else if (this.last_ai_move) s.push('Why did Stockfish play that?');
		if (this.moveNum > 0) s.push('What is the best move for me?');
		if (this.moveNum >= 4) { s.push('Who is winning right now?'); s.push('What is the plan here?'); }
		return s.slice(0, 3);
	}

	get pending_user_idx() {
		if (!this.chat_loading) return -1;
		for (let i = this.chat_messages.length - 1; i >= 0; i--) if (this.chat_messages[i].role === 'user') return i;
		return -1;
	}

	get hint_highlights() {
		return this.hints[this.hint_index] ? hint_squares(this.hints[this.hint_index].move, this.orientation) : [];
	}

	get engine() {
		const mt = Math.round(this.computer_think_time * 1000);
		return new LearnEngine({ elo: null, depth: 20, moveTime: mt, color: 'b' });
	}

	get_board_state() {
		return {
			fen: this.fen,
			turn: this.turn,
			in_check: this.inCheck,
			game_over: this.gameOver,
			result: this.resultMsg,
			move_count: this.moveNum,
			last_user_move: this.last_user_move,
			last_ai_move: this.last_ai_move,
			orientation: this.orientation,
			captured: this.captured,
			history_index: this.board_history_idx,
			history_length: this.board_history.length,
		};
	}

	fetch_models = async () => {
		try {
			const k = this.groq_api_key.trim();
			if (k) {
				const res = await fetch('https://api.groq.com/openai/v1/models', {
					headers: { Authorization: `Bearer ${k}` },
				});
				if (!res.ok) throw Error(`${res.status}`);
				const body = await res.json();
				this.model_options = (body.data ?? []).filter((m: any) => m.object === 'model' && m.id && !m.id.includes('whisper') && !m.id.includes('embedding') && !m.id.includes('orpheus') && !m.id.includes('prompt-guard') && !m.id.includes('compound')).map((m: any) => ({ v: m.id, l: m.id.split('/').pop() ?? m.id, d: m.owned_by ?? '' }));
			} else {
				const res = await fetch('/chess/learn/models');
				if (!res.ok) throw Error(`${res.status}`);
				this.model_options = await res.json();
			}
			const prio = ['nex-agi/nex-n2-pro:free', 'deepseek/deepseek-v4-flash', 'bynara/mimo-v2.5-pro-free', 'bynara/mimo-v2.5-free', 'bynara/mistral-large', 'gemma-4-26b-a4b-it', 'gemma-4-31b-it', 'openai/gpt-oss-120b', 'qwen/qwen3-32b', 'llama-3.3-70b-versatile'];
			this.model_options.sort((a, b) => {
				const pa = prio.indexOf(a.v), pb = prio.indexOf(b.v);
				return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
			});
			const extra: Record<string, { l: string; d: string }> = {
				'nex-agi/nex-n2-pro:free': { l: 'Nex-N2-Pro', d: 'openrouter' },
				'deepseek/deepseek-v4-flash': { l: 'DeepSeek V4 Flash', d: 'openrouter' },
				'bynara/mimo-v2.5-pro-free': { l: 'MiMo V2.5 Pro', d: 'bynara' },
				'bynara/mimo-v2.5-free': { l: 'MiMo V2.5', d: 'bynara' },
				'bynara/mistral-large': { l: 'Mistral Large', d: 'bynara' },
				'gemma-4-26b-a4b-it': { l: 'Gemma 4 26B', d: 'google' },
				'gemma-4-31b-it': { l: 'Gemma 4 31B', d: 'google' },
				'openai/gpt-oss-120b': { l: 'GPT-OSS 120B', d: 'groq' },
				'qwen/qwen3-32b': { l: 'Qwen3 32B', d: 'groq' },
				'llama-3.3-70b-versatile': { l: 'Llama 3.3 70B', d: 'meta' },
			};
			for (const id of prio) {
				if (!this.model_options.find((m: any) => m.v === id) && extra[id]) this.model_options.push({ v: id, ...extra[id] });
			}
			const first = this.model_options[0];
			if (first) first.r = true;
		} catch {
			this.model_options = [
				{ v: 'nex-agi/nex-n2-pro:free', l: 'Nex-N2-Pro', d: 'openrouter', r: true },
				{ v: 'deepseek/deepseek-v4-flash', l: 'DeepSeek V4 Flash', d: 'openrouter' },
				{ v: 'bynara/mimo-v2.5-pro-free', l: 'MiMo V2.5 Pro', d: 'bynara' },
				{ v: 'gemma-4-26b-a4b-it', l: 'Gemma 4 26B', d: 'google' },
				{ v: 'gemma-4-31b-it', l: 'Gemma 4 31B', d: 'google' },
				{ v: 'openai/gpt-oss-120b', l: 'GPT-OSS 120B', d: 'groq' },
				{ v: 'qwen/qwen3-32b', l: 'Qwen3 32B', d: 'groq' },
				{ v: 'llama-3.3-70b-versatile', l: 'Llama 3.3 70B', d: 'meta' },
			];
		}
		if (this.model_options.length && !this.model_options.find((o) => o.v === this.model)) {
			this.model = this.model_options[0].v;
		}
	};

	uciToSan(fen_str: string, uci: string): string {
		try {
			const c = new ChessJS(fen_str);
			const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
			return m?.san ?? uci;
		} catch {
			return uci;
		}
	}

	fmtScore(s: number): string {
		if (s >= 100000) return 'Mate';
		if (s <= -100000) return '-Mate';
		const v = (s / 100).toFixed(2);
		return s > 0 ? '+' + v : v;
	}

	move_text(m: any): string {
		const uci = (m?.from ?? '') + (m?.to ?? '') + (m?.promotion ?? '');
		return m?.san && uci ? `${m.san} (${uci})` : m?.san ?? uci;
	}

	current_chat_context(): ChatContext {
		return { f: this.fen, p: this.history.join(' '), u: this.last_user_move, a: this.last_ai_move };
	}

	build_chat_data(h = '', eval_data?: string): ChatData {
		const c = this.current_chat_context();
		const d: ChatData = {};
		if (c.f !== this.successful_context.f) d.f = c.f;
		if (c.p && c.p !== this.successful_context.p) d.p = c.p;
		if (c.u && c.u !== this.successful_context.u) d.u = c.u;
		if (c.a && c.a !== this.successful_context.a) d.a = c.a;
		if (eval_data) d.e = eval_data;
		if (h) d.h = h;
		d.t = this.hint_think_time;
		return d;
	}

	build_direct_input(msg: ChatMsg) {
		const d = msg.d ?? {};
		const rows = [
			d.f && `fen: ${d.f}`,
			d.p && `move_history: ${d.p}`,
			d.u && `last_user_move: ${d.u}`,
			d.a && `last_ai_move: ${d.a}`,
			d.h && `hint: ${d.h}`,
			d.t !== undefined && `hint_think_time: ${d.t}s`,
		].filter(Boolean);
		return rows.length
			? `${msg.content}\n\n[board_context]\n${rows.join('\n')}\n[/board_context]`
			: msg.content;
	}


	add_toast(msg: string) {
		const id = ++this.toast_id;
		this.toasts = [...this.toasts, { id, msg }];
		setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 4000);
	}

	sync_chat_moves() {
		const moves = this.chessRef?.getHistory({ verbose: true }) as any[] | undefined;
		if (!moves) return;
		this.history = moves.map((m) => m.san);
		this.last_user_move = this.move_text([...moves].reverse().find((m) => m.color === 'w'));
		this.last_ai_move = this.move_text([...moves].reverse().find((m) => m.color === 'b'));
	}

	request_hint() {
		requestAnimationFrame(() => { void this.showHint(); });
	}

	onReady() {
		this.ready = true;
		if (this.hint_on_start && !this.start_hint_done) {
			this.start_hint_done = true;
			this.request_hint();
		}
	}

	async onMove(e: CustomEvent<Record<string, unknown>>) {
		const m = e.detail as any;
		this.turn = m.color === 'w' ? 'b' : 'w';
		this.moveNum++;
		this.inCheck = m.check ?? false;
		if (m.color === 'w') this.last_user_move = this.move_text(m);
		else this.last_ai_move = this.move_text(m);
		this.redo_stack = [];
		this.hideHints(true);
		this.save_game_debounced();
	}

	onGameOver(e: CustomEvent<{ reason: string; result: number }>) {
		this.gameOver = true;
		const { reason, result } = e.detail;
		if (result === 1) this.resultMsg = 'White wins!';
		else if (result === 0) this.resultMsg = 'Black wins!';
		else this.resultMsg = `Draw (${reason})`;
	}

	resetGame() {
		if (!this.chessRef) return;
		this.chessRef.reset();
		this.resultMsg = '';
		this.gameOver = false;
		this.moveNum = 0;
		this.turn = 'w';
		this.inCheck = false;
		this.hideHints(true);
		this.history = [];
		this.last_user_move = '';
		this.last_ai_move = '';
		this.redo_stack = [];
		this.clearChat();

	}

	undoMove() {
		if (!this.chessRef) return;
		this.redo_stack.push(this.fen);
		if (this.moveNum >= 2) {
			this.chessRef.undo();
			this.chessRef.undo();
			this.moveNum = Math.max(0, this.moveNum - 2);
		} else if (this.moveNum === 1) {
			this.chessRef.undo();
			this.moveNum = 0;
			this.turn = 'w';
		}
		this.gameOver = false;
		this.resultMsg = '';
		this.sync_chat_moves();
		this.hideHints(true);

	}

	redoMove() {
		if (!this.chessRef || !this.redo_stack.length) return;
		const f = this.redo_stack.pop()!;
		this.chessRef.load(f);
		this.sync_chat_moves();
		this.hideHints(true);

	}

	flipColor() {
		if (!this.chessRef) return;
		this.chessRef.toggleOrientation();
		const cur = this.engine?.getColor();
		if (cur && cur !== 'none') {
			const new_color = cur === 'b' ? 'w' : 'b';
			this.engine.setColor(new_color);
			if (new_color === this.turn) this.chessRef.playEngineMove();
		}
	}

	go_back_board() {
		if (!this.chessRef || this.board_history_idx <= 0) return;
		this.board_history_idx--;
		const f = this.board_history[this.board_history_idx];
		this.fen = f;
		this.chessRef.load(f);
		this.history = [];
		this.moveNum = 0;
		this.gameOver = false;
		this.resultMsg = '';
		this.hideHints(true);
		this.last_user_move = '';
		this.last_ai_move = '';
		this.redo_stack = [];

	}

	go_forward_board() {
		if (!this.chessRef || this.board_history_idx >= this.board_history.length - 1) return;
		this.board_history_idx++;
		const f = this.board_history[this.board_history_idx];
		this.fen = f;
		this.chessRef.load(f);
		this.history = [];
		this.moveNum = 0;
		this.gameOver = false;
		this.resultMsg = '';
		this.hideHints(true);
		this.last_user_move = '';
		this.last_ai_move = '';
		this.redo_stack = [];

	}

	async showHint() {
		if (this.hint_loading) return;
		if (this.gameOver) return;
		if (can_reuse_hints(this.hints, this.hint_fen, this.fen)) {
			this.show_hints = true;
			return;
		}
		this.hint_loading = true;
		this.show_hints = true;
		if (this.hint_ac) this.hint_ac.abort();
		this.hint_ac = new AbortController();
		const sig = this.hint_ac.signal;
		try {
			this.hints = await getHints(this.fen, 1, undefined, sig, undefined, this.hint_think_time * 1000);
			if (sig.aborted) return;
			this.hint_fen = this.fen;
			console.log('hints:', this.hints);
			this.hint_index = 0;
			if (this.autoexplain) this.explainHint();
		} catch (e) {
			if ((e as Error)?.name === 'AbortError') return;
			console.error('getHints failed:', e);
			this.hints = [];
			this.hint_fen = '';
		} finally {
			this.hint_loading = false;
			this.hint_ac = null;
		}
	}

	nextHint() {
		if (this.hint_index < this.hints.length - 1) this.hint_index++;
	}

	prevHint() {
		if (this.hint_index > 0) this.hint_index--;
	}

	hideHints(clear = false) {
		this.show_hints = false;
		this.hint_loading = false;
		if (this.hint_ac) { this.hint_ac.abort(); this.hint_ac = null; }
		if (clear) {
			this.hints = [];
			this.hint_fen = '';
			this.hint_index = 0;
		}
	}

	async send_chess_chat(user_msg: string, h = '', clear = false, eval_data?: string) {
		const d = this.build_chat_data(h, eval_data);
		this.chat_messages = [...this.chat_messages, { role: 'user', content: user_msg, d }];
		if (clear) this.chat_input = '';
		console.log(`[gemini-live/send_chess_chat] checking can_send: rec=${this.recording} session=${Boolean(this.gemini_live_session)}`);
		if (this.gemini_live_can_send()) {
			console.log('[gemini-live/send_chess_chat] routing to realtime');
			this.output_turn_active = false;
			this.send_gemini_realtime_input({ text: user_msg }, 'send_chess_chat');
		} else {
			console.log('[gemini-live/send_chess_chat] routing to execute_chat');
			await this.execute_chat();
		}
		if (this.voice_tts) {
			this.voice_tts = false;
			const last = this.chat_messages.at(-1);
			if (last?.role === 'assistant' && last.content) this.speak(last.content);
		}
		this.processQueue();
	}

	async execute_chat() {
		const sent_context = this.current_chat_context();
		this.chat_loading = true;
		const ac = new AbortController();
		this.chat_abort = ac;

		try {
			if (!this.model.startsWith('deepseek/') && !this.model.startsWith('bynara/') && this.groq_api_key.trim() && this.model.includes('/')) {
				await this.send_direct_generation(ac, [{ role: 'system', content: this.current_sys } as ChatMsg, ...this.chat_messages], this.model);
				this.interaction_id = '';
			} else {
				const res = await fetch('/chess/learn/chat', {
					method: 'POST',
					body: JSON.stringify({
						x: [{ r: 'system', c: this.current_sys }, ...this.chat_messages.map((msg) => ({ r: msg.role, c: msg.content, d: msg.d }))],
						i: this.interaction_id,
						m: this.model,
					}),
					signal: ac.signal,
				});
				if (!res.ok) {
					const err_body = await res.json().catch(() => ({ error: 'Request failed' }));
					throw Error(err_body.error || 'Request failed');
				}
				if (!(await this.read_chat_stream(res))) throw Error('Request failed');
			}
			this.successful_context = sent_context;
			this.save_game_debounced();
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			console.error('[chat] error:', e);
			const last = this.chat_messages[this.chat_messages.length - 1];
			if (last?.role === 'assistant') {
				this.chat_messages[this.chat_messages.length - 1] = { ...last, content: last.content + '\nError: ' + (e instanceof Error ? e.message : String(e)) };
				this.chat_messages = this.chat_messages;
			} else {
				this.chat_messages = [...this.chat_messages, { role: 'assistant', content: 'Error: ' + (e instanceof Error ? e.message : String(e)) }];
			}
		} finally {
			this.chat_loading = false;
			this.chat_abort = null;
		}
	}

	apply_chat_event(raw: string) {
		const lines = raw.split(/\r?\n/);
		const name = lines.find((line) => line.startsWith('event: '))?.slice(7).trim();
		const data = lines.filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
		const msg = data ? JSON.parse(data) : {};
		if (name === 'text' && typeof msg.t === 'string') {
			const last = this.chat_messages[this.chat_messages.length - 1];
			if (last?.role === 'assistant') {
				this.chat_messages[this.chat_messages.length - 1] = { ...last, content: last.content + msg.t };
				this.chat_messages = this.chat_messages;
			} else {
				this.chat_messages = [...this.chat_messages, { role: 'assistant', content: msg.t }];
			}
			return true;
		}
		if (name === 'interaction' && typeof msg.i === 'string') {
			this.interaction_id = msg.i;
			return true;
		}
		if (name === 'usage' && typeof msg.p === 'number') {
			this.total_p += msg.p;
			this.total_c += msg.c;
			if (typeof msg.cost === 'number') this.total_cost += msg.cost;
			const last = this.chat_messages.length - 1;
			if (last >= 0 && this.chat_messages[last].role === 'assistant') {
				this.chat_messages[last] = { ...this.chat_messages[last], u: { p: msg.p, c: msg.c, cost: msg.cost ?? 0 } };
			}
			if (typeof msg.bal === 'number') window.dispatchEvent(new CustomEvent('balance-update', { detail: msg.bal }));
			return true;
		}
		if (name === 'error') throw Error(msg.e || 'Request failed');
		if (name === 'board' && typeof msg.f === 'string') {
			this.fen = msg.f;
			if (this.chessRef) this.chessRef.load(msg.f);
			this.history = [];
			this.moveNum = 0;
			this.gameOver = false;
			this.resultMsg = '';
			this.hideHints(true);
			this.last_user_move = '';
			this.last_ai_move = '';
			this.redo_stack = [];
			this.board_history = [...this.board_history.slice(0, this.board_history_idx + 1), msg.f];
			this.board_history_idx = this.board_history.length - 1;
			return true;
		}
		return false;
	}

	async read_chat_stream(res: Response) {
		if (!res.body) throw Error('Request failed');
		const reader = res.body.getReader();
		const dec = new TextDecoder();
		let buf = '';
		let ok = false;
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buf += dec.decode(value, { stream: true });
			const parts = buf.split('\n\n');
			buf = parts.pop() ?? '';
			for (const part of parts) if (part.trim()) ok = this.apply_chat_event(part) || ok;
		}
		if (buf.trim()) ok = this.apply_chat_event(buf) || ok;
		return ok;
	}

	async send_direct_generation(ac: AbortController, request_messages: ChatMsg[], m: string) {
		const { createGroq } = await import('@ai-sdk/groq');
		const { streamText, wrapLanguageModel, extractReasoningMiddleware } = await import('ai');
		const groq = createGroq({ apiKey: this.groq_api_key.trim() });

		const result = streamText({
			model: wrapLanguageModel({
				model: groq(m),
				middleware: extractReasoningMiddleware({ tagName: 'think' }),
			}),
			system: request_messages[0]?.role === 'system' ? request_messages[0].content : '',
			messages: (request_messages[0]?.role === 'system' ? request_messages.slice(1) : request_messages).map((msg) => ({
				role: msg.role as 'user' | 'assistant',
				content: msg.role === 'user' ? this.build_direct_input(msg) : msg.content,
			})),
		});

		let wrote = false;
		for await (const chunk of result.textStream) {
			if (ac.signal.aborted) break;
			if (chunk) {
				wrote = true;
				const last = this.chat_messages[this.chat_messages.length - 1];
				if (last?.role === 'assistant') {
					this.chat_messages[this.chat_messages.length - 1] = { ...last, content: last.content + chunk };
					this.chat_messages = this.chat_messages;
				} else {
					this.chat_messages = [...this.chat_messages, { role: 'assistant', content: chunk }];
				}
			}
		}

		if (!wrote) throw Error('Request failed');
		if (!ac.signal.aborted) {
			try {
				const u = await result.usage;
				if (u) {
					const p = u.inputTokens ?? 0, c = u.outputTokens ?? 0;
					const cost = calc_cost(m, p, c);
					this.total_p += p;
					this.total_c += c;
					this.total_cost += cost;
					const last = this.chat_messages.length - 1;
					if (last >= 0 && this.chat_messages[last].role === 'assistant') {
						this.chat_messages[last] = { ...this.chat_messages[last], u: { p, c, cost } };
					}
				}
			} catch {}
		}
		fetch('/api/balance').then(r => r.json()).then(d => { if (typeof d.balance === 'number') window.dispatchEvent(new CustomEvent('balance-update', { detail: d.balance })); }).catch(() => {});
		this.save_game_debounced();
	}

	processQueue() {
		if (this.chat_queue.length > 0) {
			const [next, ...rest] = this.chat_queue;
			this.chat_queue = rest;
			if (next.voice) this.voice_tts = true;
			this.send_chess_chat(next.text, next.hint ?? '', true);
		}
	}

	removeFromQueue(i: number) {
		this.chat_queue = this.chat_queue.filter((_, idx) => idx !== i);
	}

	async promoteFromQueue(i: number) {
		const item = this.chat_queue[i];
		if (!item) return;
		this.chat_queue = this.chat_queue.filter((_, idx) => idx !== i);
		if (this.chat_abort) {
			this.chat_abort.abort();
			this.chat_abort = null;
		}
		const last = this.chat_messages[this.chat_messages.length - 1];
		if (last?.role === 'assistant') {
			if (item.voice) this.voice_tts = true;
			this.send_chess_chat(item.text, item.hint ?? '', true);
		} else {
			this.interaction_id = '';
			this.chat_messages = [...this.chat_messages, { role: 'user', content: item.text, d: this.build_chat_data(item.hint) }];
			await this.execute_chat();
			if (item.voice) {
				const ll = this.chat_messages.at(-1);
				if (ll?.role === 'assistant' && ll.content) this.speak(ll.content);
			}
		}
	}

	async explainHint() {
		if (!this.hints[this.hint_index]) return;
		const h = this.hints[this.hint_index];
		const san = this.uciToSan(this.fen, h.move);
		const score_str = this.fmtScore(h.score);
		const msg = `why ${san}`;
		const hint_data = `${san} (${h.move}), eval ${score_str}, depth ${h.depth}`;
		if (this.chat_loading) {
			this.chat_queue = [...this.chat_queue, { text: msg, hint: hint_data }];
			return;
		}
		await this.send_chess_chat(msg, hint_data);
	}

	stopChat() {
		if (this.chat_abort) {
			this.chat_abort.abort();
			this.chat_abort = null;
			this.chat_loading = false;
		}
	}

	async sendChatMessage(text: string) {
		if (!text.trim()) return;
		const t = text.trim();
		this.chat_input = '';
		if (this.chat_input_ref) this.chat_input_ref.style.height = 'auto';
		if (this.chat_loading) {
			this.chat_queue = [...this.chat_queue, { text: t }];
			return;
		}
		await this.send_chess_chat(t, '', true);
	}

	speak(text: string) {
		if (!('speechSynthesis' in window)) return;
		const utter = new SpeechSynthesisUtterance(text);
		const voices = speechSynthesis.getVoices();
		const v = voices.find(x => x.name === this.voice_name);
		if (v) utter.voice = v;
		speechSynthesis.speak(utter);
	}

	handle_selection = () => {
		if (!this.chat_body) return;
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || !sel.rangeCount) {
			this.sel_text = '';
			this.sel_pos = null;
			return;
		}
		const range = sel.getRangeAt(0);
		if (!this.chat_body.contains(range.commonAncestorContainer)) {
			this.sel_text = '';
			this.sel_pos = null;
			return;
		}
		const text = sel.toString().trim();
		if (!text) {
			this.sel_text = '';
			this.sel_pos = null;
			return;
		}
		const rect = range.getBoundingClientRect();
		const body_rect = this.chat_body.getBoundingClientRect();
		this.sel_text = text;
		this.sel_pos = {
			x: rect.left + rect.width / 2 - body_rect.left,
			y: rect.top - body_rect.top - 8
		};
	};

	append_selection() {
		if (!this.sel_text) return;
		const sep = this.chat_input.trim() ? ' ' : '';
		this.chat_input = this.chat_input + sep + this.sel_text;
		this.sel_text = '';
		this.sel_pos = null;
		window.getSelection()?.removeAllRanges();
		this.chat_input_ref?.focus();
	}

	save_game_debounced() {
		if (this.save_timeout) clearTimeout(this.save_timeout);
		this.save_timeout = setTimeout(async () => {
			const serialize_chat = (msgs: ChatMsg[]) => msgs.map(m => {
				const r: Record<string, unknown> = { r: m.role === 'user' ? 'u' : 'a', c: m.content };
				if (m.u) r.u = m.u;
				return r;
			});
			const payload = {
				f: this.fen, h: this.history.join(' '), m: this.moveNum, o: this.orientation,
				u: this.last_user_move, a: this.last_ai_move, r: this.redo_stack.join('|'),
				v: this.gameOver, x: this.resultMsg, g: this.groq_api_key, l: this.level,
				t: this.computer_think_time,
				c: JSON.stringify(serialize_chat(this.chat_messages)),
				d: Date.now()
			};
			if (browser) {
				try { localStorage.setItem(this.LS_KEY, JSON.stringify({ ...payload, c: JSON.stringify(serialize_chat(this.chat_messages.slice(-50))) })); } catch {}
			}
			try { await fetch('/api/save', { method: 'POST', body: JSON.stringify(payload) }); } catch {}
		}, 2000);
	}

	restore_game(d: Record<string, unknown>) {
		if (!this.chessRef) return;
		this.chessRef.load(d.f as string);
		this.fen = d.f as string;
		const h = d.h as string;
		if (h) this.history = h.split(' ').filter(Boolean);
		this.moveNum = (d.m as number) ?? 0;
		this.orientation = (d.o as 'w' | 'b') ?? 'w';
		this.last_user_move = (d.u as string) ?? '';
		this.last_ai_move = (d.a as string) ?? '';
		const r = d.r as string;
		if (r) this.redo_stack = r.split('|').filter(Boolean);
		this.gameOver = (d.v as boolean) ?? false;
		this.resultMsg = (d.x as string) ?? '';
		this.level = (d.l as number) ?? 3;
		this.computer_think_time = (d.t as number) ?? 1.5;
		const gk = d.g as string;
		if (gk) this.groq_api_key = gk;
		const cc = d.c as string;
		if (cc) {
			try {
				const parsed = JSON.parse(cc);
				if (Array.isArray(parsed)) this.chat_messages = parsed.map((m: any) => ({
					role: m.r === 'u' ? 'user' as const : 'assistant' as const,
					content: m.c,
					...(m.u ? { u: m.u as ChatUsage } : {})
				}));
			} catch {}
		}
		this.saved_data = null;
	}

	reset_board_state(fen_str: string) {
		if (!this.chessRef) return;
		this.chessRef.load(fen_str);
		this.fen = fen_str;
		this.history = [];
		this.moveNum = 0;
		this.gameOver = false;
		this.resultMsg = '';
		this.hideHints(true);
		this.last_user_move = '';
		this.last_ai_move = '';
		this.redo_stack = [];
		this.board_history = [...this.board_history.slice(0, this.board_history_idx + 1), fen_str];
		this.board_history_idx = this.board_history.length - 1;

	}

	cleanup_gemini_live() {
		const log = (msg: string) => console.log(`[gemini-live/cleanup] ${msg}`);
		log(`START recording=${this.recording} session=${Boolean(this.gemini_live_session)} processor=${Boolean(this.gemini_live_processor)} ctx=${Boolean(this.gemini_live_audio_ctx)}`);
		this.gemini_live_healthy = false;
		this.recording = false;
		log('recording set to false');
		this.interrupt_audio();
		if (this.rnnoise_node) {
			log('destroying rnnoise node');
			(this.rnnoise_node as any).destroy?.();
			this.rnnoise_node.disconnect();
			this.rnnoise_node = null;
		}
		if (this.gemini_live_processor) {
			log('disconnecting processor');
			this.gemini_live_processor.disconnect();
			this.gemini_live_processor = null;
		}
		if (this.gemini_live_mic_stream) {
			log('stopping mic tracks');
			this.gemini_live_mic_stream.getTracks().forEach(t => t.stop());
			this.gemini_live_mic_stream = null;
		}
		const session = this.gemini_live_session;
		this.gemini_live_session = null;
		log('session nulled');
		if (session) {
			log('calling session.close()');
			try { session.close(); log('session.close() succeeded'); } catch (e) { log(`session.close() threw: ${e}`); }
		}
		if (this.gemini_live_audio_gain) {
			log('disconnecting audio gain');
			this.gemini_live_audio_gain.disconnect();
			this.gemini_live_audio_gain = null;
		}
		if (this.gemini_live_audio_ctx) {
			log('closing audio context');
			this.gemini_live_audio_ctx.close();
			this.gemini_live_audio_ctx = null;
		}
		this.gemini_live_audio_queue = [];
		this.gemini_live_audio_playing = false;
		this.gemini_live_current_source = null;
		this.thinking_sound_buf = null;

		log('DONE');
	}

	gemini_live_can_send() {
		const ok = Boolean(this.gemini_live_session && this.recording && this.gemini_live_healthy);
		if (!ok) {
			const why = !this.gemini_live_session ? 'no_session' : !this.recording ? 'not_recording' : 'unhealthy';
			console.log(`[gemini-live/can_send] false (${why})`);
		}
		return ok;
	}

	send_gemini_realtime_input(input: Record<string, unknown>, caller = '') {
		if (!this.gemini_live_can_send()) {
			// console.log(`[gemini-live/send_input] BLOCKED caller=${caller} has_text=${Boolean(input.text)} has_audio=${Boolean(input.audio)}`);
			return false;
		}
		const has_text = Boolean(input.text);
		const has_audio = Boolean(input.audio);
		// console.log(`[gemini-live/send_input] CALLING caller=${caller} has_text=${has_text} has_audio=${has_audio} session=${Boolean(this.gemini_live_session)} recording=${this.recording}`);
		try {
			this.gemini_live_session.sendRealtimeInput(input);
			// console.log(`[gemini-live/send_input] OK caller=${caller}`);
			return true;
		} catch (e) {
			// console.error(`[gemini-live/send_input] FAILED caller=${caller} error=${e instanceof Error ? e.message : e}`);
			return false;
		}
	}

	send_gemini_tool_response(input: Record<string, unknown>) {
		if (!this.gemini_live_can_send()) {
			console.log('[gemini-live/send_tool] BLOCKED');
			return;
		}
		console.log('[gemini-live/send_tool] CALLING', JSON.stringify(input).slice(0, 200));
		try {
			this.gemini_live_session.sendToolResponse(input);
			console.log('[gemini-live/send_tool] OK');
		} catch (e) {
			console.error('[gemini-live/send_tool] FAILED', e);
		}
	}

	async load_thinking_sound() {
		if (this.thinking_sound_buf) return;
		try {
			const ctx = this.gemini_live_audio_ctx;
			if (!ctx) return;
			const res = await fetch('/sounds/thinking.wav');
			if (!res.ok) return;
			const array_buf = await res.arrayBuffer();
			this.thinking_sound_buf = await ctx.decodeAudioData(array_buf);
		} catch {}
	}

	start_thinking_sound() {
		const ctx = this.gemini_live_audio_ctx;
		if (!ctx || this.thinking_sound || !this.thinking_sound_buf) return;
		try {
			const source = ctx.createBufferSource();
			source.buffer = this.thinking_sound_buf;
			source.loop = true;
			const gain = ctx.createGain();
			gain.gain.setValueAtTime(0, ctx.currentTime);
			gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.3);
			source.connect(gain);
			gain.connect(ctx.destination);
			source.start();
			this.thinking_sound = { source, gain };
		} catch {}
	}

	stop_thinking_sound() {
		if (!this.thinking_sound) return;
		const { source, gain } = this.thinking_sound;
		const ctx = this.gemini_live_audio_ctx;
		if (ctx) {
			gain.gain.cancelScheduledValues(ctx.currentTime);
			gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
			gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
			source.stop(ctx.currentTime + 0.6);
		} else {
			source.stop();
		}
		this.thinking_sound = null;
	}

	toggle_audio() {
		this.audio_muted = !this.audio_muted;
		if (this.gemini_live_audio_gain) this.gemini_live_audio_gain.gain.value = this.audio_muted ? 0 : 1;
	}

	async toggleGeminiLive() {
		const log = (msg: string) => console.log(`[gemini-live] ${msg}`);
		console.log(`[gemini-live/toggle] ENTER session=${Boolean(this.gemini_live_session)} recording=${this.recording}`);
		if (this.gemini_live_session) {
			log('toggle: session exists, cleaning up');
			this.cleanup_gemini_live();
			console.log(`[gemini-live/toggle] cleanup done, session=${Boolean(this.gemini_live_session)} recording=${this.recording}`);
			return;
		}
		try {
			log('connecting...');
			this.add_toast('Connecting voice...');
			const res = await fetch('/api/voice/gemini-live/key');
			const { k: key } = await res.json();
			if (!key) throw Error('No API key available');
			log('got API key');

			init_tool_state({
				get_fen: () => this.fen,
				hint: async (f, think_time) => {
					const mt = (think_time ?? this.hint_think_time) * 1000;
					return (await getHints(f, 1, undefined, undefined, undefined, mt))[0] ?? null;
				},
				get_board_state: () => this.get_board_state(),
			load_fen: (fen) => {
				try {
					this.chessRef?.load(fen);
					this.hideHints(true);
					this.last_user_move = '';
					this.last_ai_move = '';
					this.redo_stack = [];
					this._set_state_fail_count = 0;
					return { valid: true, fen: this.fen };
				} catch {
					this._set_state_fail_count++;
					if (this._set_state_fail_count >= 9) {
						this._set_state_fail_count = 0;
						this.add_toast('Could not set position after multiple attempts. Try describing it differently.');
					}
					return { valid: false, error: 'Invalid FEN' };
				}
			},
			});

			const devices = await navigator.mediaDevices.enumerateDevices();
			const audio_inputs = devices.filter(d => d.kind === 'audioinput');
			log(`${audio_inputs.length} audio input(s) found: ${audio_inputs.map(d => d.label || d.deviceId.slice(0, 16)).join(', ')}`);
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			this.gemini_live_mic_stream = stream;
			const audioCtx = new AudioContext();
			this.gemini_live_audio_ctx = audioCtx;
			const outputGain = audioCtx.createGain();
			outputGain.gain.value = 1;
			outputGain.connect(audioCtx.destination);
			this.gemini_live_audio_gain = outputGain;
			this.load_thinking_sound();
			const micSource = audioCtx.createMediaStreamSource(stream);

			// Optionally insert RNNoise noise suppression
			let processorSource: MediaStreamAudioSourceNode | null = null;
			if (this.noise_suppression) {
				try {
					const { RnnoiseWorkletNode, loadRnnoise } = await import('@sapphi-red/web-noise-suppressor');
					this.add_toast('Loading noise suppression...');
					const wasmBinary = await loadRnnoise(
						{ url: '/rnnoise.wasm', simdUrl: '/rnnoise_simd.wasm' }
					);
					await audioCtx.audioWorklet.addModule('/rnnoise-worklet.js');
					const rnnoiseNode = new RnnoiseWorkletNode(audioCtx, {
						maxChannels: 1,
						wasmBinary,
					});
					this.rnnoise_node = rnnoiseNode;
					const intermediateDest = audioCtx.createMediaStreamDestination();
					micSource.connect(rnnoiseNode).connect(intermediateDest);
					processorSource = audioCtx.createMediaStreamSource(intermediateDest.stream);
				} catch (e) {
					console.warn('[gemini-live] RNNoise init failed, falling back to raw mic', e);
					this.add_toast('Noise suppression unavailable, using raw mic');
				}
			}

			const processor = audioCtx.createScriptProcessor(2048, 1, 1);
			processor.onaudioprocess = this.gemini_process_audio;
			(processorSource ?? micSource).connect(processor);
			const micGain = audioCtx.createGain();
			micGain.gain.value = 0;
			processor.connect(micGain);
			micGain.connect(audioCtx.destination);
			this.gemini_live_processor = processor;

			const ctx = this.current_chat_context();
			log(`system prompt: fen=${ctx.f.slice(0, 40)}`);
			const sys = this.current_sys + `\n\nWhen the conversation starts, greet the user and ask if they would like a move suggestion or to learn about a chess concept.` + '\n\n' + tool_use_rules;

			const { GoogleGenAI } = await import('@google/genai');
			const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1alpha' } });
			log('connecting to Gemini Live WebSocket...');
			console.log(`[gemini-live/toggle] before ai.live.connect: session=${Boolean(this.gemini_live_session)} recording=${this.recording}`);
			console.log(`[gemini-live/toggle] config includes: responseModalities=['AUDIO'], speechConfig.voiceName=${this.voice_name}, tools, sysInstruction, model=gemini-3.1-flash-live-preview`);
			console.log(`[gemini-live/toggle] NOTE: inputAudioTranscription and historyConfig REMOVED — they were sending empty obj or conflicting with audio stream`);
			const session = await ai.live.connect({
				model: 'gemini-3.1-flash-live-preview',
				callbacks: {
					onopen: () => {
						log('WebSocket opened — setting recording=true, healthy=true');
						console.log(`[gemini-live/callback] onopen before: recording=${this.recording} session=${Boolean(this.gemini_live_session)} healthy=${this.gemini_live_healthy}`);
						this.gemini_live_healthy = true;
						this.recording = true;
						console.log(`[gemini-live/callback] onopen after: recording=${this.recording} session=${Boolean(this.gemini_live_session)} healthy=${this.gemini_live_healthy}`);
						this.add_toast('Voice connected');
					},
					onmessage: (msg: any) => {
						console.log(`[gemini-live/callback] onmessage type=${Object.keys(msg).join(',')}`);
						this.gemini_live_handle(msg);
					},
					onerror: (e: any) => {
						console.error('[gemini-live/callback] onerror', e?.message || e, `recording=${this.recording} session=${Boolean(this.gemini_live_session)} healthy=${this.gemini_live_healthy}`);
						this.gemini_live_healthy = false;
						this.cleanup_gemini_live();
						this.add_toast('Voice connection error: ' + (e?.message || e));
					},
					onclose: (e: any) => {
						log(`onclose code=${e?.code} reason=${e?.reason} recording=${this.recording} session=${Boolean(this.gemini_live_session)} healthy=${this.gemini_live_healthy}`);
						this.gemini_live_healthy = false;
						this.cleanup_gemini_live();
					},
				},
				config: {
					responseModalities: ['AUDIO'] as any,
					speechConfig: {
						voiceConfig: {
							prebuiltVoiceConfig: {
								voiceName: this.voice_name,
							},
						},
					} as any,
					systemInstruction: { parts: [{ text: sys }] } as any,
					tools: get_tool_declarations() as any,
				} as any,
			});
			this.gemini_live_session = session;
			log(`session assigned to this.gemini_live_session, recording=${this.recording}`);
			log(`history seeding SKIPPED — sendClientContent+turnComplete conflicts with ongoing audio stream`);
		} catch (e) {
			console.error('[gemini-live] setup error', e);
			if (e instanceof DOMException && e.name === 'NotFoundError') {
				try {
					const devices = await navigator.mediaDevices.enumerateDevices();
					const audio_inputs = devices.filter(d => d.kind === 'audioinput');
					console.warn(`[gemini-live] audio devices: ${audio_inputs.length} found`, audio_inputs.map(d => ({ label: d.label, id: d.deviceId.slice(0, 16), group: d.groupId.slice(0, 16) })));
					this.add_toast(audio_inputs.length === 0
						? 'No microphone detected. Plug one in, then refresh the page.'
						: `Mic found (${audio_inputs.length} device(s)) but couldn\'t access it. It may be in use by another app.`);
				} catch {
					this.add_toast('No microphone found. Connect a mic and refresh.');
				}
			} else {
				this.add_toast('Voice setup error: ' + (e instanceof Error ? e.message : String(e)));
			}
			this.cleanup_gemini_live();
		}
	}

	gemini_process_audio = (e: AudioProcessingEvent) => {
		if (this.voice_muted) return;
		if (!this.gemini_live_can_send()) return;
		const input = e.inputBuffer.getChannelData(0);
		const nativeRate = this.gemini_live_audio_ctx?.sampleRate || 48000;
		const targetRate = 16000;
		const ratio = nativeRate / targetRate;
		const outputLen = Math.floor(input.length / ratio);
		const pcm16 = new Int16Array(outputLen);
		for (let i = 0; i < outputLen; i++) {
			pcm16[i] = Math.max(-32768, Math.min(32767, input[Math.floor(i * ratio)] * 32768));
		}
		const bytes = new Uint8Array(pcm16.buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
		const now = Date.now();
		this.send_gemini_realtime_input({
			audio: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' },
			...(this.quiet || now - (this._last_fen_sent ?? 0) < 2000 ? {} : { text: `fen:${this.fen} game_over:${this.gameOver}` }),
		}, 'gemini_process_audio');
		if (!this.quiet) this._last_fen_sent = now;
	};

	play_next_audio() {
		if (!this.gemini_live_audio_ctx || !this.gemini_live_audio_gain || this.gemini_live_audio_playing || this.gemini_live_audio_queue.length === 0) return;
		this.gemini_live_audio_playing = true;
		const buffer = this.gemini_live_audio_queue[0];
		this.gemini_live_audio_queue = this.gemini_live_audio_queue.slice(1);
		const source = this.gemini_live_audio_ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(this.gemini_live_audio_gain);
		source.onended = () => {
			if (this.gemini_live_current_source !== source) return;
			this.gemini_live_current_source = null;
			this.gemini_live_audio_playing = false;
			this.play_next_audio();
		};
		this.gemini_live_current_source = source;
		source.start();
	}

	interrupt_audio() {
		this.stop_thinking_sound();
		const ctx = this.gemini_live_audio_ctx;
		const gain = this.gemini_live_audio_gain;
		if (ctx && gain) {
			gain.gain.cancelScheduledValues(ctx.currentTime);
			gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
			gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
		}
		this.gemini_live_audio_playing = false;
		this.gemini_live_audio_queue = [];
		this.gemini_live_current_source?.stop();
		this.gemini_live_current_source = null;
		setTimeout(() => {
			if (this.gemini_live_audio_gain) this.gemini_live_audio_gain.gain.value = 1;
		}, 200);
	}

	gemini_live_handle(msg: any) {
		console.log(`[gemini-live/handle] entry msg_keys=${Object.keys(msg).join(',')} toolCall=${Boolean(msg.toolCall)} serverContent=${Boolean(msg.serverContent)} usage=${Boolean(msg.usageMetadata)}`);
		if (msg.toolCall?.functionCalls?.length) {
			this.interrupt_audio();
			this.start_thinking_sound();
			console.log(`[gemini-live] received ${msg.toolCall.functionCalls.length} tool call(s)`, msg.toolCall.functionCalls.map((f: any) => f.name).join(', '));
			for (const fc of msg.toolCall.functionCalls) {
				console.log(`[gemini-live] dispatching tool: "${fc.name}" id=${fc.id ?? 'none'}`);
				const current_fen = this.fen;
				dispatch_tool_call(fc).then((r) => {
					if (r.name === 'hint' && (r.response as any)?.best_move && current_fen === this.fen) {
						const resp = r.response as any;
						this.hints = [{ move: resp.best_move, score: resp.score ?? 0, depth: resp.depth ?? 0 }];
						this.hint_fen = current_fen;
						this.hint_index = 0;
						this.show_hints = true;
					}
					console.log(`[gemini-live] tool response for "${fc.name}":`, JSON.stringify(r).slice(0, 300));
					this.send_gemini_tool_response({ functionResponses: [r] } as any);
				}).catch((err) => {
					console.error(`[gemini-live] dispatch_tool_call ERROR for "${fc.name}":`, err);
					this.send_gemini_tool_response({ functionResponses: [{ id: fc.id, name: fc.name, response: { error: String(err) } }] } as any);
				});
			}
		}
		if (msg.serverContent?.modelTurn?.parts) {
			this.stop_thinking_sound();
			console.log(`[gemini-live] modelTurn with ${msg.serverContent.modelTurn.parts.length} parts`);
			for (const part of msg.serverContent.modelTurn.parts) {
				if (part.inlineData?.mimeType?.startsWith('audio/')) {
					try {
						const binary = atob(part.inlineData.data);
						const bytes = new Uint8Array(binary.length);
						for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
						const pcm16 = new Int16Array(bytes.buffer);
						const float32 = new Float32Array(pcm16.length);
						for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
						if (!this.gemini_live_audio_ctx) return;
						const buffer = this.gemini_live_audio_ctx.createBuffer(1, float32.length, 24000);
						buffer.getChannelData(0).set(float32);
						this.gemini_live_audio_queue = [...this.gemini_live_audio_queue, buffer];
						this.play_next_audio();
					} catch {}
				}
			}
		}
		if (msg.serverContent?.interrupted) {
			this.interrupt_audio();
		}
		if (msg.serverContent?.inputTranscription?.text) {
			const text = msg.serverContent.inputTranscription.text;
			this.output_turn_active = false;
			this.chat_messages = [...this.chat_messages, { role: 'user', content: text }];
			this.save_game_debounced();
		}
		if (msg.serverContent?.outputTranscription?.text) {
			const text = msg.serverContent.outputTranscription.text;
			if (!this.output_turn_active) {
				this.output_turn_active = true;
				this.chat_messages = [...this.chat_messages, { role: 'assistant', content: text }];
			} else {
				const last = this.chat_messages[this.chat_messages.length - 1];
				const updated = [...this.chat_messages];
				updated[updated.length - 1] = { ...last, content: last.content + text };
				this.chat_messages = updated;
			}
			this.save_game_debounced();
		}
		if (msg.serverContent?.turnComplete) {
			this.output_turn_active = false;
		}
		if (msg.usageMetadata) {
			const p = msg.usageMetadata.promptTokenCount ?? 0;
			const c = msg.usageMetadata.responseTokenCount ?? 0;
			if (p > 0 || c > 0) {
				const dp = p - this.gemini_last_usage_p;
				const dc = c - this.gemini_last_usage_c;
				this.gemini_last_usage_p = p;
				this.gemini_last_usage_c = c;
				const cost = calc_cost('gemini-3.1-flash-live-preview', dp, dc);
				this.total_p += dp;
				this.total_c += dc;
				this.total_cost += cost;
				if ((dp > 0 || dc > 0) && !this.gemini_deduct_pending) {
					this.gemini_deduct_pending = true;
					fetch('/api/voice/gemini-live/usage', { method: 'POST', body: JSON.stringify({ p: dp, c: dc }), headers: { 'Content-Type': 'application/json' } })
						.then(r => r.json().catch(() => null))
						.then(d => { if (d?.bal !== undefined) window.dispatchEvent(new CustomEvent('balance-update', { detail: d.bal })); })
						.finally(() => { this.gemini_deduct_pending = false; });
				}
				const last = this.chat_messages[this.chat_messages.length - 1];
				if (last?.role === 'assistant') {
					const updated = [...this.chat_messages];
					updated[updated.length - 1] = { ...last, u: { p: dp, c: dc, cost } };
					this.chat_messages = updated;
				}
			}
		}
	}

	clearChat() {
		this.chat_messages = [];
		this.chat_queue = [];
		this.chat_loading = false;
		this.interaction_id = '';
		this.successful_context = {};
		this.total_p = 0;
		this.total_c = 0;
		this.total_cost = 0;
		this.gemini_last_usage_p = 0;
		this.gemini_last_usage_c = 0;
		this.output_turn_active = false;
		if (this.chat_abort) {
			this.chat_abort.abort();
			this.chat_abort = null;
		}
	}
}
