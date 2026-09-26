import { Chess } from 'svelte-chess';
import { Chess as ChessJS } from 'chess.js';
import { browser } from '$app/environment';
import { LEVELS, LearnEngine, getHints } from '$lib/util/chess/engine';
import type { Color, Hint } from '$lib/util/chess/engine';
import { can_reuse_hints, hint_squares } from '$lib/util/chess/hint_highlight';
import { calc_cost } from '$lib/util/ai/pricing';
import { say_move } from '$lib/util/chess/words';
import { arm_puzzle, offer_puzzles, start_puzzle } from './puzzle.svelte';
import { init_tool_state, get_tool_declarations, dispatch_tool_call, summarize_tool_result } from '$lib/util/chat/tools/gemini_live_dispatcher';
import { is_openai_voice, openai_voice_options } from '$lib/util/voice/openai_live';
import type { ChatContext, ChatData, ChatUsage, ChatMsg } from './types';
import { getContext, setContext } from 'svelte';

const audience = `You are e4, a friendly chess coach. Many players are kids aged 10 to 14, and many have never played chess before.

How to answer:
- Answer the question straight away, in 1 to 3 short sentences. The answer comes first.
- Use simple words a 10-year-old knows. If you use a chess word, explain it in a few words ("a fork: one piece attacking two at once").
- Say moves and pieces in words ("move your knight to f3", "the pawn on d5"), not codes like Nf3 or "d-pawn". Skip chess jargon like develop, tempo, or initiative, or explain it in a few words.
- Stop when the answer is done. Never offer choices or ask what they want next ("do you want to…", "would you like…", "shall we…"). If a question at the end helps them learn, ask one short question about the board instead, like "can you see what that pawn attacks now?".
- You always know the board: it comes with their messages as board_context. Use it without mentioning it, and never say you can't see the board. If you're unsure, give your best simple answer.
- Never say Stockfish, engine, evaluation, or scores like +1.5. Call the other side "the computer" or "your opponent".
- Be warm. Mistakes are how people learn, so never make anyone feel bad.`;

const assistant_sys = `${audience}

When they ask what to play, name the move and the reason. Don't suggest moves or give hints they didn't ask for, and only use the hint or analysis tools when they ask for a move or a hint.`;

const socratic_sys = `${audience}

Help them find good moves themselves. When they ask what to play or why a move is good, give one short clue or guiding question instead of the move, for example:
- "what is the computer's last move attacking?"
- "is any of your pieces left with nobody guarding it?"
- "can anything be taken for free?"
If they say "i don't know", give a bigger clue. Questions about the rules, how pieces move, or what a word means always get a direct answer.`;

const voice_sys = `You are speaking out loud, like a friendly coach sitting next to them. Keep each answer to one or two short sentences, in a warm, natural voice. Never read out symbols, lists, or board codes.
Text that starts with "fen:" is a silent board update, not a question. Never reply to it.
When the call starts, say one short hello, like "hi! ask me anything about chess."`;

function tool_use_rules(search_enabled: boolean) {
	let r = `You have a set_state tool to set up any board position. Only use it when the user explicitly asks you to set up a position, puzzle, or game. If you suggest showing a position to teach something, ask first and only proceed if the user agrees. After changing the board, say in one short line what is on the board now.`;
	if (search_enabled) r += `\nYou can search the web in real time for current chess information — openings, grandmaster games, tournament results, strategy, and best responses to any position. When a user asks what the best move is or what to play in a given position, search the web to find up-to-date analysis, recent master games, or theoretical recommendations before answering.`;
	return r;
}

export { openai_voice_options };
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

export function create_learn_state(logged_in = false, demo = false) {
	return new LearnState(logged_in, demo);
}

export class LearnState {
	vibe = $state<'socratic' | 'assistant'>(browser && (localStorage.getItem('e4_help') as 'socratic' | 'assistant') || 'assistant');
	level = $state(2);
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
	groq_api_key = $state(browser && localStorage.getItem('groq_api_key') || '');
	gemini_api_key = $state(browser && localStorage.getItem('gemini_api_key') || '');
	openai_api_key = $state(browser && localStorage.getItem('openai_api_key') || '');
	gemini_search_tool = $state(false);
	quiet = $state(browser && localStorage.getItem('quiet') === 'true');
	show_dests = $state(!browser || localStorage.getItem('e4_dots') !== '0');
	voice_provider = $state<'gemini' | 'openai'>('gemini');
	// voice_provider = $state<'gemini' | 'openai'>(browser && (localStorage.getItem('voice_provider') as 'gemini' | 'openai') || 'gemini');
	voice_name = $state(voice_options.find((o) => o.v === (browser && localStorage.getItem('e4_voice')))?.v ?? 'Achird');
	noise_suppression = $state(browser && localStorage.getItem('noise_suppression') !== 'false');
	noise_suppression_level = $state(browser && parseFloat(localStorage.getItem('noise_suppression_level') || '50') || 50);

	show_voice_menu = $state(false);
	start_hint_done = $state(false);
	show_settings = $state(false);
	show_model_menu = $state(false);
	show_vibe_menu = $state(false);
	show_token_modal = $state(false);
	show_tour = $state(false);

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
	voice_provider_active: 'gemini' | 'openai' | null = null;
	gemini_live_session: any = null;
	openai_live_pc: RTCPeerConnection | null = null;
	openai_live_dc: RTCDataChannel | null = null;
	openai_live_audio: HTMLAudioElement | null = null;
	openai_live_id = '';
	openai_live_seconds = 0;
	openai_live_billed = 0;
	openai_live_left: number | null = null;
	openai_live_cut: ReturnType<typeof setTimeout> | null = null;
	openai_live_evt = 0;
	gemini_live_audio_ctx: AudioContext | null = null;
	gemini_live_audio_gain: GainNode | null = null;
	gemini_live_mic_stream: MediaStream | null = null;
	gemini_live_processor: ScriptProcessorNode | null = null;
	gemini_live_audio_queue: AudioBuffer[] = [];
	gemini_live_audio_playing = false;
	gemini_live_current_source: AudioBufferSourceNode | null = null;
	screen_recording = $state(false);
	gemini_live_recording_dest: MediaStreamAudioDestinationNode | null = null;
	screen_media_recorder: MediaRecorder | null = null;
	screen_recording_chunks: Blob[] = [];
	gemini_last_usage_p = $state(0);
	gemini_last_usage_c = $state(0);
	gemini_deduct_pending = false;

	rnnoise_node: AudioWorkletNode | null = null;

	_set_state_fail_count = 0;
	gemini_live_healthy = false;
	gemini_live_closing = false;
	thinking_sound: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
	voice_thinking = $state(false);
	// the gap between the end of what they said and the first word of the answer
	voice_pending = $state(false);
	pending_timer: ReturnType<typeof setTimeout> | undefined;

	get thinking() {
		const last = this.chat_messages[this.chat_messages.length - 1];
		return (this.chat_loading && last?.role === 'user') || (this.recording && (this.voice_thinking || this.voice_pending));
	}
	thinking_sound_buf: AudioBuffer | null = null;
	toasts = $state<{ id: number; msg: string; t: string }[]>([]);
	toast_id = $state(0);
	output_turn_active = false;
	model_options = $state<{ v: string; l: string; d: string; r?: boolean }[]>([]);
	save_timeout: ReturnType<typeof setTimeout> | null = null;
	saved_data: Record<string, unknown> | null = null;

	readonly LS_KEY = 'chess_save';

	logged_in = $state(false);
	// the home page's mini app: no saved game, no tour, and no engine until the first move
	demo = false;
	armed = $state(true);

	constructor(logged_in = false, demo = false) {
		this.logged_in = logged_in;
		this.demo = demo;
		this.armed = !demo;
		$effect(() => { if (browser) localStorage.setItem('autoexplain', String(this.autoexplain)); });
		$effect(() => { if (browser) localStorage.setItem('auto_hint', String(this.auto_hint)); });
		$effect(() => { if (browser) localStorage.setItem('hint_on_start', String(this.hint_on_start)); });
		$effect(() => { if (browser) localStorage.setItem('hint_think_time', String(this.hint_think_time)); });
		$effect(() => { if (browser) localStorage.setItem('groq_api_key', this.groq_api_key); });
		$effect(() => { if (browser) localStorage.setItem('gemini_api_key', this.gemini_api_key); });
		$effect(() => { if (browser) localStorage.setItem('openai_api_key', this.openai_api_key); });
		$effect(() => { if (browser) localStorage.setItem('quiet', String(this.quiet)); });
		$effect(() => { if (browser) localStorage.setItem('e4_dots', this.show_dests ? '1' : '0'); });
		$effect(() => { if (browser) localStorage.setItem('voice_provider', this.voice_provider); });
		$effect(() => { if (browser) localStorage.setItem('e4_voice', this.voice_name); });
		$effect(() => { if (browser) localStorage.setItem('e4_help', this.vibe); });
		$effect(() => {
			void this.fen;
			void this.gameOver;
			if (this.recording) this.send_board_to_voice();
		});
		let lv = 0;
		$effect(() => {
			if (lv && lv !== this.level) this.save_game_debounced();
			lv = this.level;
		});
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
			if (browser && !demo) { this.groq_api_key; this.gemini_api_key; this.fetch_models(); }
		});

		$effect(() => {
			if (!browser) return;
			document.addEventListener('selectionchange', this.handle_selection);
			return () => document.removeEventListener('selectionchange', this.handle_selection);
		});

		if (browser && !demo) {
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
		if (this.inCheck) s.push('how do i get out of check?');
		// moveNum reads 1 at the start, so count the moves played instead
		const played = this.history.length;
		if (!played) s.push('how do the pieces move?', 'how should i start?');
		else if (this.last_ai_move) s.push('why did the computer do that?');
		if (played) s.push('what should i do now?');
		if (played >= 4) s.push('who is winning?', 'what is my plan?');
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

	#eng: LearnEngine | null = null;
	#eng_lv = 0;

	get engine() {
		if (!this.#eng || this.#eng_lv !== this.level) {
			const l = LEVELS[Math.min(Math.max(this.level, 1), LEVELS.length) - 1];
			this.#eng = new LearnEngine({ ...l, color: this.#eng?.getColor() ?? 'b' });
			this.#eng_lv = this.level;
		}
		return this.#eng;
	}

	init_live_tools() {
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
						this.add_toast('couldn’t set up that board', 'e');
					}
					return { valid: false, error: 'Invalid FEN' };
				}
			},
		});
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

	move_text(m: any): string {
		const uci = (m?.from ?? '') + (m?.to ?? '') + (m?.promotion ?? '');
		return m?.san && uci ? `${m.san} (${uci})` : m?.san ?? uci;
	}

	current_chat_context(): ChatContext {
		return { f: this.fen, p: this.history.join(' '), u: this.last_user_move, a: this.last_ai_move };
	}

	// where every piece stands, in words; models misread fen, and every reply should know the board
	board_words() {
		const names: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
		const side: Record<string, string[]> = { w: [], b: [] };
		try {
			const c = new ChessJS(this.fen);
			for (const row of c.board()) for (const p of row) if (p) side[p.color].push(`${names[p.type]} ${p.square}`);
			const bot = this.engine?.getColor?.();
			const me = bot === 'w' ? 'black' : bot === 'b' ? 'white' : '';
			return `white: ${side.w.join(', ')}. black: ${side.b.join(', ')}. ${c.turn() === 'w' ? 'white' : 'black'} to move.${me ? ` the player is ${me}.` : ''}`;
		} catch {
			return '';
		}
	}

	send_board_to_voice() {
		if (!this.gemini_live_can_send()) return;
		try {
			this.gemini_live_session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: `fen: ${this.fen}. ${this.board_words()} game over: ${this.gameOver ? 'yes' : 'no'}.` }] }], turnComplete: false });
		} catch {}
	}

	build_chat_data(h = '', eval_data?: string): ChatData {
		const c = this.current_chat_context();
		const d: ChatData = { f: c.f, b: this.board_words() };
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
			d.b && `pieces: ${d.b}`,
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


	add_toast(msg: string, t: 'e' | 'i' = 'i') {
		const id = ++this.toast_id;
		this.toasts = [...this.toasts, { id, msg, t }];
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
		if (this.demo) return;
		if (browser && !localStorage.getItem('e4_tour_done')) this.show_tour = true;
		if (this.hint_on_start && !this.start_hint_done) {
			this.start_hint_done = true;
			this.request_hint();
		}
	}

	async onMove(e: CustomEvent<Record<string, unknown>>) {
		const m = e.detail as any;
		this.armed = true;
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
		const draw: Record<string, string> = { stalemate: 'stalemate: no legal move left', 'insufficient material': 'not enough pieces to checkmate', repetition: 'the same moves kept repeating', 'fifty-move rule': '50 moves without a capture' };
		const bot = this.engine?.getColor?.();
		const winner = result === 1 ? 'w' : 'b';
		if (result === 0.5) this.resultMsg = `draw: ${draw[reason] ?? reason}`;
		else if (bot === 'w' || bot === 'b') this.resultMsg = bot === winner ? 'checkmate. the computer wins this one.' : 'checkmate. you win!';
		else this.resultMsg = `checkmate. ${winner === 'w' ? 'white' : 'black'} wins.`;
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
		if (this.voice_provider_active === 'openai' && this.openai_live_can_send()) {
			this.output_turn_active = false;
			this.send_openai_live_event({
				type: 'session.thinking.append',
				event_id: this.next_openai_evt(),
				delegation_id: null,
				content: `typed message from the user: ${user_msg}`,
			});
		} else if (this.gemini_live_can_send()) {
			this.output_turn_active = false;
			this.send_gemini_realtime_input({ text: user_msg }, 'send_chess_chat');
		} else {
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

		const is_gemini = this.model.startsWith('gemini-') || this.model.startsWith('gemma-');

		try {
			if (is_gemini && this.gemini_api_key.trim()) {
				await this.send_direct_gemini(ac, [{ role: 'system', content: this.current_sys } as ChatMsg, ...this.chat_messages], this.model);
				this.interaction_id = '';
			} else if (!this.model.startsWith('deepseek/') && !this.model.startsWith('bynara/') && this.groq_api_key.trim() && this.model.includes('/')) {
				await this.send_direct_generation(ac, [{ role: 'system', content: this.current_sys } as ChatMsg, ...this.chat_messages], this.model);
				this.interaction_id = '';
			} else {
				const body: Record<string, unknown> = {
					x: [{ r: 'system', c: this.current_sys }, ...this.chat_messages.map((msg) => ({ r: msg.role, c: msg.content, d: msg.d }))],
					i: this.interaction_id,
					m: this.model,
				};
				if (is_gemini && this.gemini_api_key.trim()) body.gmk = this.gemini_api_key.trim();
				const res = await fetch('/chess/learn/chat', {
					method: 'POST',
					body: JSON.stringify(body),
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
			if (msg.p) offer_puzzles([msg.p]);
			const puzzle = arm_puzzle(msg.f);
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
			if (puzzle) start_puzzle(puzzle);
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

	async send_direct_gemini(ac: AbortController, request_messages: ChatMsg[], m: string) {
		const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
		const { streamText, wrapLanguageModel, extractReasoningMiddleware } = await import('ai');
		const google = createGoogleGenerativeAI({ apiKey: this.gemini_api_key.trim() });

		const result = streamText({
			model: wrapLanguageModel({
				model: google(m),
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
		const msg = `why is ${say_move(san)} a good move?`;
		const hint_data = `${san} (${h.move}) is the best move here`;
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
		// free for everyone — restore paywall later
		// if (!this.logged_in && !this.groq_api_key.trim()) {
		// 	this.add_toast('Please login or set a Groq API key to use text chat', 'e');
		// 	return;
		// }
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
		if (this.demo) return;
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
				v: this.gameOver, x: this.resultMsg, g: this.groq_api_key, k: this.gemini_api_key, l: this.level,
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
		this.level = (d.l as number) ?? 2;
		const gk = d.g as string;
		if (gk) this.groq_api_key = gk;
		const gemk = d.k as string;
		if (gemk) this.gemini_api_key = gemk;
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
		if (this.gemini_live_closing) return;
		this.gemini_live_closing = true;
		clearTimeout(this.pending_timer);
		this.voice_pending = false;
		this.voice_thinking = false;
		this.cleanup_openai_live();
		if (this.screen_media_recorder) {
			try { if (this.screen_media_recorder.state !== 'inactive') this.screen_media_recorder.stop(); } catch {}
			this.screen_media_recorder = null;
		}
		if (this.gemini_live_recording_dest) {
			this.gemini_live_recording_dest.disconnect();
			this.gemini_live_recording_dest = null;
		}
		this.gemini_live_healthy = false;
		this.recording = false;
		this.interrupt_audio();
		if (this.rnnoise_node) {
			(this.rnnoise_node as any).destroy?.();
			this.rnnoise_node.disconnect();
			this.rnnoise_node = null;
		}
		if (this.gemini_live_processor) {
			this.gemini_live_processor.disconnect();
			this.gemini_live_processor = null;
		}
		if (this.gemini_live_mic_stream) {
			this.gemini_live_mic_stream.getTracks().forEach(t => t.stop());
			this.gemini_live_mic_stream = null;
		}
		const session = this.gemini_live_session;
		this.gemini_live_session = null;
		if (session) {
			try { session.close(); } catch {}
		}
		if (this.gemini_live_audio_gain) {
			this.gemini_live_audio_gain.disconnect();
			this.gemini_live_audio_gain = null;
		}
		if (this.gemini_live_audio_ctx) {
			this.gemini_live_audio_ctx.close();
			this.gemini_live_audio_ctx = null;
		}
		this.gemini_live_audio_queue = [];
		this.gemini_live_audio_playing = false;
		this.gemini_live_current_source = null;
		this.thinking_sound_buf = null;
	}

	gemini_live_can_send() {
		return Boolean(this.voice_provider_active !== 'openai' && this.gemini_live_session && this.recording && this.gemini_live_healthy);
	}

	openai_live_can_send() {
		return Boolean(this.voice_provider_active === 'openai' && this.openai_live_dc && this.openai_live_dc.readyState === 'open' && this.recording && this.gemini_live_healthy);
	}

	next_openai_evt() {
		return `e${++this.openai_live_evt}`;
	}

	send_openai_live_event(event: Record<string, unknown>) {
		if (!this.openai_live_can_send() || this.gemini_live_closing) return false;
		try {
			this.openai_live_dc!.send(JSON.stringify(event));
			return true;
		} catch {
			return false;
		}
	}

	end_openai_trial() {
		if (this.gemini_live_closing) return;
		this.add_toast("today's 3 minutes are used. paste your own openai key to keep talking.", 'e');
		if (this.openai_live_can_send()) {
			this.send_openai_live_event({ type: 'session.close', event_id: this.next_openai_evt() });
			setTimeout(() => this.cleanup_gemini_live(), 1500);
		} else {
			this.cleanup_gemini_live();
		}
	}

	cleanup_openai_live() {
		if (this.openai_live_cut) {
			clearTimeout(this.openai_live_cut);
			this.openai_live_cut = null;
		}
		if (this.openai_live_id) this.report_openai_usage(this.openai_live_seconds, true);
		this.openai_live_seconds = 0;
		this.openai_live_billed = 0;
		this.openai_live_left = null;
		this.openai_live_id = '';
		try { this.openai_live_dc?.close(); } catch {}
		this.openai_live_dc = null;
		if (this.openai_live_pc) {
			try { this.openai_live_pc.close(); } catch {}
			this.openai_live_pc = null;
		}
		if (this.openai_live_audio) {
			this.openai_live_audio.srcObject = null;
			this.openai_live_audio.remove();
			this.openai_live_audio = null;
		}
		if (this.voice_provider_active === 'openai') this.voice_provider_active = null;
	}

	report_openai_usage(seconds: number, done = false) {
		if (this.openai_api_key.trim() || !this.openai_live_id) return;
		fetch('/api/voice/openai-live/usage', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ s: seconds, i: this.openai_live_id, d: done }),
			keepalive: done,
		}).then(r => r.json().catch(() => null)).then(d => {
			if (d?.left !== undefined) this.openai_live_left = d.left;
			if (d?.stop && !this.gemini_live_closing) this.end_openai_trial();
		}).catch(() => {});
	}

	apply_openai_tool_result(name: string, response: Record<string, unknown>) {
		if (name === 'hint' && (response as any)?.best_move && (response as any).available) {
			const resp = response as any;
			this.hints = [{ move: resp.best_move, score: resp.score ?? 0, depth: resp.depth ?? 0 }];
			this.hint_fen = this.fen;
			this.hint_index = 0;
			this.show_hints = true;
		}
	}

	async handle_openai_delegation(id: string) {
		this.start_thinking_sound();
		const recent = this.chat_messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
		const board = this.get_board_state();
		const name = /puzzle/i.test(recent) ? 'find_puzzles' : /hint|best move|suggest/i.test(recent) ? 'hint' : /set up|load this|starting position|fen/i.test(recent) ? 'set_state' : 'get_board_state';
		const args: Record<string, unknown> = {};
		if (name === 'set_state') args.fen = board.fen;
		try {
			const r = await dispatch_tool_call({ id, name, args });
			this.apply_openai_tool_result(r.name, r.response as Record<string, unknown>);
			this.send_openai_live_event({
				type: 'session.commentary.append',
				event_id: this.next_openai_evt(),
				delegation_id: id,
				content: summarize_tool_result(r.name, r.response as Record<string, unknown>),
			});
		} catch {
			this.send_openai_live_event({
				type: 'session.commentary.append',
				event_id: this.next_openai_evt(),
				delegation_id: id,
				content: 'tool failed',
			});
		} finally {
			this.stop_thinking_sound();
		}
	}

	handle_openai_event(event: any) {
		const t = event?.type;
		if (t === 'session.started') {
			this.gemini_live_healthy = true;
			this.recording = true;
			this.add_toast('your voice coach is listening');
			const greet = this.quiet
				? 'Stay quiet until the user speaks. Then answer in 1-3 short sentences.'
				: 'Greet the user in one short sentence and ask if they want a move idea or a chess concept.';
			this.send_openai_live_event({
				type: 'session.instructions.append',
				event_id: this.next_openai_evt(),
				delegation_id: null,
				content: greet,
			});
			return;
		}
		if (t === 'session.closed') {
			this.cleanup_gemini_live();
			return;
		}
		if (t === 'session.usage.updated') {
			const seconds = Number(event?.usage?.seconds ?? 0);
			this.openai_live_seconds = seconds;
			const delta = seconds - this.openai_live_billed;
			if (delta >= 15) {
				this.report_openai_usage(seconds);
				this.openai_live_billed = seconds;
			}
			return;
		}
		if (t === 'session.input_transcript.delta' && typeof event.delta === 'string') {
			this.output_turn_active = false;
			const last = this.chat_messages[this.chat_messages.length - 1];
			if (last?.role === 'user') {
				const updated = [...this.chat_messages];
				updated[updated.length - 1] = { ...last, content: last.content + event.delta };
				this.chat_messages = updated;
			} else {
				this.chat_messages = [...this.chat_messages, { role: 'user', content: event.delta }];
			}
			this.save_game_debounced();
			return;
		}
		if (t === 'session.output_transcript.delta' && typeof event.delta === 'string') {
			if (!this.output_turn_active) {
				this.output_turn_active = true;
				this.chat_messages = [...this.chat_messages, { role: 'assistant', content: event.delta }];
			} else {
				const last = this.chat_messages[this.chat_messages.length - 1];
				const updated = [...this.chat_messages];
				updated[updated.length - 1] = { ...last, content: last.content + event.delta };
				this.chat_messages = updated;
			}
			this.save_game_debounced();
			return;
		}
		if (t === 'session.delegation.created') {
			const id = event?.delegation?.id;
			if (typeof id === 'string') void this.handle_openai_delegation(id);
			return;
		}
		if (t === 'error') {
			this.add_toast(event?.error?.message || 'voice error', 'e');
		}
	}

	async wait_ice(pc: RTCPeerConnection) {
		if (pc.iceGatheringState === 'complete') return;
		await new Promise<void>((resolve, reject) => {
			const t = setTimeout(() => {
				pc.removeEventListener('icegatheringstatechange', on);
				reject(new Error('timed out gathering ice'));
			}, 10000);
			const on = () => {
				if (pc.iceGatheringState !== 'complete') return;
				clearTimeout(t);
				pc.removeEventListener('icegatheringstatechange', on);
				resolve();
			};
			pc.addEventListener('icegatheringstatechange', on);
		});
	}

	async start_openai_live() {
		const voice = is_openai_voice(this.voice_name) ? this.voice_name : 'marin';
		this.voice_name = voice;
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		this.gemini_live_mic_stream = stream;
		const audioCtx = new AudioContext();
		this.gemini_live_audio_ctx = audioCtx;
		const outputGain = audioCtx.createGain();
		outputGain.gain.value = this.audio_muted ? 0 : 1;
		outputGain.connect(audioCtx.destination);
		this.gemini_live_audio_gain = outputGain;
		this.load_thinking_sound();
		const micSource = audioCtx.createMediaStreamSource(stream);
		if (this.noise_suppression) {
			this.add_toast('openai live uses the raw mic');
		}
		const recording_dest = audioCtx.createMediaStreamDestination();
		this.gemini_live_recording_dest = recording_dest;
		outputGain.connect(recording_dest);
		micSource.connect(recording_dest);

		const pc = new RTCPeerConnection();
		this.openai_live_pc = pc;
		const audio_el = new Audio();
		audio_el.autoplay = true;
		this.openai_live_audio = audio_el;
		pc.addEventListener('track', (e) => {
			const remote = new MediaStream([e.track]);
			audio_el.srcObject = remote;
			try {
				const remote_src = audioCtx.createMediaStreamSource(remote);
				remote_src.connect(outputGain);
			} catch {}
			audio_el.play().catch(() => {});
		});
		for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
		const dc = pc.createDataChannel('oai-events');
		this.openai_live_dc = dc;
		dc.addEventListener('message', (e) => {
			try { this.handle_openai_event(JSON.parse(String(e.data))); } catch {}
		});
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		await this.wait_ice(pc);
		const sdp = pc.localDescription?.sdp;
		if (!sdp) throw Error('missing sdp');
		const res = await fetch('/api/voice/openai-live/session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ s: sdp, v: voice, b: this.vibe, k: this.openai_api_key.trim() }),
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw Error(body.error || 'live session create failed');
		this.openai_live_id = body.i || '';
		this.openai_live_left = typeof body.l === 'number' ? body.l : null;
		if (this.openai_live_cut) clearTimeout(this.openai_live_cut);
		this.openai_live_cut = this.openai_live_left !== null
			? setTimeout(() => { if (!this.gemini_live_closing) this.end_openai_trial(); }, this.openai_live_left * 1000)
			: null;
		if (this.openai_live_left !== null) this.add_toast(`${Math.max(1, Math.ceil(this.openai_live_left / 60))} minutes of openai live left today`);
		await pc.setRemoteDescription({ type: 'answer', sdp: body.s });
	}

	send_gemini_realtime_input(input: Record<string, unknown>, caller = '') {
		if (!this.gemini_live_can_send() || this.gemini_live_closing) {
			return false;
		}
		try {
			this.gemini_live_session.sendRealtimeInput(input);
			return true;
		} catch {
			return false;
		}
	}

	send_gemini_tool_response(input: Record<string, unknown>) {
		if (!this.gemini_live_can_send() || this.gemini_live_closing) return;
		try {
			this.gemini_live_session.sendToolResponse(input);
		} catch {}
	}

	// one 1.9 s loop: a C3 sine with soft 2nd and 3rd partials (so small speakers still carry it),
	// a slow 0.45 s rise, a long fall, and a gentle lowpass so it stays muted
	load_thinking_sound() {
		const ctx = this.gemini_live_audio_ctx;
		if (this.thinking_sound_buf || !ctx) return;
		const rate = ctx.sampleRate;
		const buf = ctx.createBuffer(1, Math.round(rate * 1.9), rate);
		const d = buf.getChannelData(0);
		const f = 130.81;
		let lp = 0;
		for (let i = 0; i < d.length; i++) {
			const t = i / rate;
			const env = t < 0.45 ? Math.sin((t / 0.45) * Math.PI * 0.5) ** 2 : Math.exp(-(t - 0.45) * 3.2);
			const w = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) + 0.08 * Math.sin(6 * Math.PI * f * t);
			lp += (w * env - lp) * 0.12;
			d[i] = lp * 0.22;
		}
		this.thinking_sound_buf = buf;
	}

	start_thinking_sound() {
		this.voice_thinking = true;
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
		this.voice_thinking = false;
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
		if (this.gemini_live_session || this.openai_live_pc) {
			if (this.openai_live_can_send()) {
				this.send_openai_live_event({ type: 'session.close', event_id: this.next_openai_evt() });
				setTimeout(() => this.cleanup_gemini_live(), 1500);
			} else {
				this.cleanup_gemini_live();
			}
			return;
		}
		// free for everyone — restore paywall later
		// if (!this.logged_in && !this.gemini_api_key.trim()) {
		// 	this.add_toast('Please login or set a Gemini API key to use live chat', 'e');
		// 	return;
		// }
		this.gemini_live_closing = false;
		try {
			this.add_toast('connecting your voice coach…');
			this.init_live_tools();
			// if (this.voice_provider === 'openai') {
			// 	this.voice_provider_active = 'openai';
			// 	await this.start_openai_live();
			// 	return;
			// }
			this.voice_provider_active = 'gemini';
			const own = this.gemini_api_key.trim();
			let key = own;
			if (!key) {
				const res = await fetch('/api/voice/gemini-live/key');
				const body = await res.json();
				key = body.k;
			}
			if (!key) throw Error('No API key available');

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
				} catch {
					this.add_toast('the noise filter isn’t available here, so your mic is used as it is');
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

			// Recording audio bus — mixes AI output + mic for screen recording
			const recording_dest = audioCtx.createMediaStreamDestination();
			this.gemini_live_recording_dest = recording_dest;
			outputGain.connect(recording_dest);
			(processorSource ?? micSource).connect(recording_dest);

			const sys = this.current_sys + '\n\n' + voice_sys + '\n\n' + tool_use_rules(this.gemini_search_tool);

			const { GoogleGenAI } = await import('@google/genai');
			const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1alpha' } });
			const connect_timeout = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Timed out connecting to voice service')), 10000);
			});
			const session = await Promise.race([ai.live.connect({
				model: 'gemini-3.8-live',
				callbacks: {
					onopen: () => {
						this.gemini_live_healthy = true;
						this.recording = true;
						this.add_toast('your voice coach is listening');
					},
					onmessage: (msg: any) => {
						this.gemini_live_handle(msg);
					},
					onerror: (e: any) => {
						this.gemini_live_healthy = false;
						this.cleanup_gemini_live();
						this.add_toast('voice couldn’t connect: ' + (e?.message || e), 'e');
					},
					onclose: () => {
						this.gemini_live_healthy = false;
						this.cleanup_gemini_live();
					},
				},
				config: {
					responseModalities: ['AUDIO'] as any,
					inputAudioTranscription: {} as any,
					outputAudioTranscription: {} as any,
					speechConfig: {
						voiceConfig: {
							prebuiltVoiceConfig: {
								voiceName: this.voice_name,
							},
						},
					} as any,
					systemInstruction: { parts: [{ text: sys }] } as any,
					tools: get_tool_declarations(this.gemini_search_tool) as any,
				} as any,
			}), connect_timeout]);
			this.gemini_live_session = session;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'NotFoundError') {
				try {
					const devices = await navigator.mediaDevices.enumerateDevices();
					const audio_inputs = devices.filter(d => d.kind === 'audioinput');
					this.add_toast(audio_inputs.length === 0
						? 'no microphone found. plug one in, then refresh the page.'
						: 'your mic is there, but another app may be using it. close it and try again.', 'e');
				} catch {
					this.add_toast('no microphone found. plug one in, then refresh the page.', 'e');
				}
			} else {
				this.add_toast('voice couldn’t start: ' + (e instanceof Error ? e.message : String(e)), 'e');
			}
			this.cleanup_gemini_live();
		}
	}

	toggle_screen_recording = async () => {
		if (!this.gemini_live_audio_ctx || !this.gemini_live_recording_dest) return;
		if (this.screen_media_recorder) {
			this.screen_media_recorder.stop();
			return;
		}
		try {
			const screen_stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
			const tracks: MediaStreamTrack[] = [...screen_stream.getVideoTracks()];
			const audio_tracks = this.gemini_live_recording_dest.stream.getAudioTracks();
			if (audio_tracks.length) tracks.push(audio_tracks[0]);
			const combined = new MediaStream(tracks);
			const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
				? 'video/webm;codecs=vp9,opus'
				: MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
					? 'video/webm;codecs=vp8,opus'
					: 'video/webm';
			const recorder = new MediaRecorder(combined, { mimeType: mime });
			this.screen_recording_chunks = [];
			recorder.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) this.screen_recording_chunks.push(e.data); };
			recorder.onstop = () => {
				this.screen_media_recorder = null;
				this.screen_recording = false;
				screen_stream.getTracks().forEach(t => t.stop());
				if (this.screen_recording_chunks.length) {
					const blob = new Blob(this.screen_recording_chunks, { type: mime });
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = `e4-recording-${Date.now()}.webm`;
					a.click();
					URL.revokeObjectURL(url);
				}
				this.screen_recording_chunks = [];
			};
			screen_stream.getVideoTracks()[0].onended = () => {
				if (recorder.state !== 'inactive') recorder.stop();
			};
			recorder.start(1000);
			this.screen_media_recorder = recorder;
			this.screen_recording = true;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'NotAllowedError') return;
			this.add_toast('screen recording couldn’t start: ' + (e instanceof Error ? e.message : String(e)), 'e');
		}
	};

	set_voice_muted(v: boolean) {
		this.voice_muted = v;
		this.gemini_live_mic_stream?.getAudioTracks().forEach((t) => { t.enabled = !v; });
		// with no more audio the service never hears the pause that ends a sentence, so say the stream ended
		if (v && this.gemini_live_can_send()) this.send_gemini_realtime_input({ audioStreamEnd: true }, 'set_voice_muted');
		if (this.openai_live_can_send()) {
			this.send_openai_live_event({
				type: v ? 'session.input_audio.mute' : 'session.input_audio.unmute',
				event_id: this.next_openai_evt(),
			});
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
		this.send_gemini_realtime_input({ audio: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } }, 'gemini_process_audio');
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
		if (msg.toolCall?.functionCalls?.length) {
			this.interrupt_audio();
			this.start_thinking_sound();
			for (const fc of msg.toolCall.functionCalls) {
				const current_fen = this.fen;
				dispatch_tool_call(fc).then((r) => {
					if (r.name === 'hint' && (r.response as any)?.best_move && current_fen === this.fen) {
						const resp = r.response as any;
						this.hints = [{ move: resp.best_move, score: resp.score ?? 0, depth: resp.depth ?? 0 }];
						this.hint_fen = current_fen;
						this.hint_index = 0;
						this.show_hints = true;
					}
					this.send_gemini_tool_response({ functionResponses: [r] } as any);
				}).catch(() => {
					this.send_gemini_tool_response({ functionResponses: [{ id: fc.id, name: fc.name, response: { error: 'Tool dispatch failed' } }] } as any);
				});
			}
		}
		if (msg.serverContent?.modelTurn?.parts) {
			clearTimeout(this.pending_timer);
			this.voice_pending = false;
			this.stop_thinking_sound();
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
			clearTimeout(this.pending_timer);
			this.voice_pending = false;
			this.interrupt_audio();
		}
		if (msg.serverContent?.inputTranscription?.text) {
			clearTimeout(this.pending_timer);
			this.pending_timer = setTimeout(() => (this.voice_pending = true), 700);
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
			clearTimeout(this.pending_timer);
			this.voice_pending = false;
			this.output_turn_active = false;
		}
		if (msg.usageMetadata) {
			const p = msg.usageMetadata.promptTokenCount ?? 0;
			const c = (msg.usageMetadata.responseTokenCount ?? 0) + (msg.usageMetadata.thoughtsTokenCount ?? 0);
			if (p > 0 || c > 0) {
				const dp = p - this.gemini_last_usage_p;
				const dc = c - this.gemini_last_usage_c;
				this.gemini_last_usage_p = p;
				this.gemini_last_usage_c = c;
				const cost = calc_cost('gemini-3.8-live', dp, dc);
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
