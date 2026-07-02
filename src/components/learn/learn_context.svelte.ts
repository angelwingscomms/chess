import { Chess } from 'svelte-chess';
import { Chess as ChessJS } from 'chess.js';
import { browser } from '$app/environment';
import { LearnEngine, getHints, analyzePosition } from '$lib/util/chess/engine';
import type { Color, Hint } from '$lib/util/chess/engine';
import { can_reuse_hints, hint_squares } from '$lib/util/chess/hint_highlight';
import { calc_cost } from '$lib/util/ai/pricing';
import { init_tool_state, get_tool_declarations, dispatch_tool_call } from '$lib/util/chat/tools/gemini_live_dispatcher';
import type { ChatContext, ChatData, ChatUsage, ChatMsg } from './types';
import { getContext, setContext } from 'svelte';

const default_sys = `Keep responses extremely short — 1-3 sentences, plain language. Always answer whatever the user asks — that's your #1 job. If you don't know, say so simply.

You receive board context in [board_context] tags: FEN, move_history, last_user_move, last_ai_move, and optionally a hinted move. Ground every observation in concrete squares and piece locations. Never mention engines, scores, ratings, or that data was provided. Use objective voice — no "I see" or "I notice".

When the player asks "why {move}" (analyzing a hint), explain what that move accomplishes in concrete positional or tactical terms. What does it threaten? What does it prevent? What weakness does it exploit?

When the player makes a mistake: state what happened factually, mention one principle, move on. When they make a good move: note why in chess terms. Vary the domain — tactics, structure, endgame, psychology, openings.`;

const socratic_sys = `Keep responses extremely short — 1-3 sentences. Plain language, like you're talking to a friend. Always answer whatever the user asks — that's your #1 job.

You are a chess trainer. They're here to train, not play — internal note, don't say it.

You have analysis tools — never mention them, you just know. Never mention engines or scores.

Core principle: never give answers. Only ask questions that make the user figure it out themselves.

Ask naturally, like a real coach:
- Tactical error → "What's your opponent threatening?"
- Missed opponent's plan → "What does your opponent want here?"
- Passive move → "Any pieces not doing anything?"
- No plan → "What's the position telling you?"
- Broke a principle → "Which principle did you just break?"
- Good move → "Which principle did you follow?"
- "Is this right?" → "What do you think?"
- "I don't know" → "Let's look at it differently. What stands out?"

Weave in strategic and technical concepts naturally when relevant — piece activity, pawn structure, outposts, weak squares, tempi, prophylaxis, initiative, undermining, simplification, color complexes, and so on. Never lecture — just name the idea as part of the question so it sticks.

No formal wrap-ups. No "What did you learn?" Just end naturally and keep going.`;

const assistant_sys = `Keep responses extremely short — 1-3 sentences. Plain language, like you're talking to a friend.

You are a chess coach helping the user win. Your job: find the best move and explain why it's best in concrete terms — what it threatens, what it prevents, what weakness it exploits.

Before you suggest any move, always call evaluate_position first to get the actual best move. Never make up a move — always use the tool. The model waits for the result before speaking, so the user sees no delay. Never mention engines, scores, or that you used a tool.

When it's the user's turn: tell them the best move and explain why. Compare their last move to the best move when there's a meaningful difference.

When the player asks about a position: tell them the strongest continuation and the idea behind it. Be specific about squares and pieces.

Weave in strategic and technical concepts naturally when relevant — piece activity, pawn structure, outposts, weak squares, tempi, prophylaxis, initiative, undermining, simplification, color complexes, endgame principles, and so on. Name the idea in context so the user picks it up through repeated exposure.

No formal wrap-ups. Just end naturally.`;

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

	show_voice_menu = $state(false);
	start_hint_done = $state(false);
	pending_voice_context = false;
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
	gemini_live_session: any = null;
	gemini_live_audio_ctx: AudioContext | null = null;
	gemini_live_mic_stream: MediaStream | null = null;
	gemini_live_processor: ScriptProcessorNode | null = null;
	gemini_live_audio_queue: AudioBuffer[] = [];
	gemini_live_audio_playing = false;
	last_sent_fen = '';
	cached_eval_data = $state('');
	cached_eval_fen = $state('');
	bg_eval_ac: AbortController | null = null;
	thinking_sound: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
	thinking_sound_buf: AudioBuffer | null = null;
	toasts = $state<{ id: number; msg: string }[]>([]);
	toast_id = $state(0);
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
		].filter(Boolean);
		return rows.length
			? `${msg.content}\n\n[board_context]\n${rows.join('\n')}\n[/board_context]`
			: msg.content;
	}

	get_training_eval(fen_str: string, user_move_san: string, move_time_ms = 3000): Promise<string> {
		const log = (msg: string) => console.log(`[eval] ${msg}`);
		log(`get_training_eval fen=${fen_str.slice(0, 50)} user_move="${user_move_san}"`);
		return new Promise((res) => {
			const ac = new AbortController();
			const timeout = setTimeout(() => { log('TIMEOUT after 10000ms — aborting'); ac.abort(); res(''); }, 10000);
			analyzePosition(fen_str, 3, undefined, ac.signal, move_time_ms).then((er) => {
				clearTimeout(timeout);
				log(`analyzePosition done: best_move=${er.best_move} score=${er.best_score} depth=${er.best_depth} multi_pv_lines=${(er.multi_pv ?? []).length}`);
				if (!er.best_move) log('WARNING: best_move is empty from analyzePosition');
				const data: Record<string, unknown> = {
					fen: fen_str,
					best_move: er.best_move,
					best_score: er.best_score,
					best_depth: er.best_depth,
					best_pv: er.best_pv,
					user_move: user_move_san || undefined,
					user_score: er.multi_pv.find((l) => l.move === user_move_san)?.score,
					multi_pv: er.multi_pv,
				};
				const user_line = er.multi_pv.find((l) => l.move === user_move_san);
				if (user_line) {
					data.user_score = user_line.score;
					data.user_depth = user_line.depth;
					data.user_pv = user_line.pv;
					data.delta = Math.abs(er.best_score - user_line.score);
					if ((data.delta as number) > 100) data.error_type = 'tactical';
					else if ((data.delta as number) > 50) data.error_type = 'prophylactic';
					else if ((data.delta as number) > 30) data.error_type = 'positional';
					else data.error_type = 'none';
					log(`user_line found: move=${user_line.move} score=${user_line.score} delta=${data.delta} error_type=${data.error_type}`);
				} else if (user_move_san) {
					data.delta = 999;
					data.error_type = 'strategic';
					log(`user_move "${user_move_san}" not in multi_pv — treating as strategic error`);
				} else {
					log('no user_move_san provided — storing eval without user analysis');
				}
				res(JSON.stringify(data));
			}).catch((err) => {
				clearTimeout(timeout);
				log(`analyzePosition REJECTED: ${err instanceof Error ? err.message : String(err)}`);
				res('');
			});
		});
	}

	start_background_eval() {
		if (!browser) return;
		if (this.fen === this.cached_eval_fen && this.cached_eval_data) return;
		if (this.bg_eval_ac) { this.bg_eval_ac.abort(); this.bg_eval_ac = null; }
		const ac = new AbortController();
		this.bg_eval_ac = ac;
		this.get_training_eval(this.fen, '', Math.round(this.computer_think_time * 1000)).then(data => {
			if (ac.signal.aborted) return;
			if (data) { this.cached_eval_data = data; this.cached_eval_fen = this.fen; }
			if (this.bg_eval_ac === ac) this.bg_eval_ac = null;
		}).catch(() => {
			if (this.bg_eval_ac === ac) this.bg_eval_ac = null;
		});
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

	onMove(e: CustomEvent<{ color: Color }>) {
		this.pending_voice_context = false;
		const m = e.detail;
		this.turn = m.color === 'w' ? 'b' : 'w';
		this.moveNum++;
		this.inCheck = (e.detail as any).check ?? false;
		if (m.color === 'w') this.last_user_move = this.move_text(m);
		else this.last_ai_move = this.move_text(m);
		this.redo_stack = [];
		this.hideHints(true);
		if (m.color === 'b' && this.auto_hint) this.request_hint();
		this.save_game_debounced();

		if (this.gemini_live_session && this.recording && !this.quiet && m.color !== this.orientation) {
			this.pending_voice_context = true;
			if (!this.auto_hint) this.request_hint();
		}
		this.start_background_eval();
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
		this.start_background_eval();
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
		this.start_background_eval();
	}

	redoMove() {
		if (!this.chessRef || !this.redo_stack.length) return;
		const f = this.redo_stack.pop()!;
		this.chessRef.load(f);
		this.sync_chat_moves();
		this.hideHints(true);
		this.start_background_eval();
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
		this.start_background_eval();
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
		this.start_background_eval();
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
			if (this.pending_voice_context) {
				this.pending_voice_context = false;
				if (this.gemini_live_session && this.recording) {
					const bm = this.hints[0];
					const eval_str = bm ? ` evaluation: best_move=${bm.move} score=${bm.score} depth=${bm.depth}` : '';
					this.gemini_live_session.sendRealtimeInput({
						text: `fen:${this.fen} user_played:${this.last_user_move} opponent_played:${this.last_ai_move}${eval_str}`
					});
				}
			}
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
		await this.execute_chat();
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
		const eval_json = browser ? await this.get_training_eval(this.fen, this.last_user_move) : undefined;
		await this.send_chess_chat(t, '', true, eval_json);
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
		this.start_background_eval();
	}

	cleanup_gemini_live() {
		if (this.gemini_live_processor) { this.gemini_live_processor.disconnect(); this.gemini_live_processor = null; }
		if (this.gemini_live_mic_stream) { this.gemini_live_mic_stream.getTracks().forEach(t => t.stop()); this.gemini_live_mic_stream = null; }
		if (this.gemini_live_session) { this.gemini_live_session.close(); this.gemini_live_session = null; }
		if (this.gemini_live_audio_ctx) { this.gemini_live_audio_ctx.close(); this.gemini_live_audio_ctx = null; }
		this.gemini_live_audio_queue = [];
		this.gemini_live_audio_playing = false;
		this.stop_thinking_sound();
		this.last_sent_fen = '';
		this.recording = false;
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

	async toggleGeminiLive() {
		const log = (msg: string) => console.log(`[gemini-live] ${msg}`);
		if (this.gemini_live_session) {
			this.cleanup_gemini_live();
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
		run_eval: async (f, u) => {
			return this.get_training_eval(f, u ?? '', this.hint_think_time * 1000);
		},
				get_board_state: () => this.get_board_state(),
			});

			const devices = await navigator.mediaDevices.enumerateDevices();
			const audio_inputs = devices.filter(d => d.kind === 'audioinput');
			log(`${audio_inputs.length} audio input(s) found: ${audio_inputs.map(d => d.label || d.deviceId.slice(0, 16)).join(', ')}`);
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			this.gemini_live_mic_stream = stream;
			const audioCtx = new AudioContext();
			this.gemini_live_audio_ctx = audioCtx;
			this.load_thinking_sound();
			const micSource = audioCtx.createMediaStreamSource(stream);
			const processor = audioCtx.createScriptProcessor(2048, 1, 1);
			processor.onaudioprocess = this.gemini_process_audio;
			micSource.connect(processor);
			const micGain = audioCtx.createGain();
			micGain.gain.value = 0;
			processor.connect(micGain);
			micGain.connect(audioCtx.destination);
			this.gemini_live_processor = processor;

			const ctx = this.current_chat_context();
			log(`system prompt: fen=${ctx.f.slice(0, 40)}`);
			const sys = `${this.current_sys}\nYour name is ${this.voice_name}.`;

			const { GoogleGenAI } = await import('@google/genai');
			const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1alpha' } });
			log('connecting to Gemini Live WebSocket...');
			const session = await ai.live.connect({
				model: 'gemini-3.1-flash-live-preview',
				callbacks: {
					onopen: () => { log('WebSocket opened'); this.recording = true; this.add_toast('Voice connected'); },
					onmessage: (msg: any) => this.gemini_live_handle(msg),
					onerror: (e: any) => { console.error('[gemini-live] WS error', e); this.add_toast('Voice connection error: ' + (e?.message || e)); },
					onclose: (e: any) => { log(`WS close code=${e?.code} reason=${e?.reason}`); this.cleanup_gemini_live(); },
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
					inputAudioTranscription: { enabled: true } as any,
				},
			});
			this.gemini_live_session = session;
			log('session established');
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
		const s = this.gemini_live_session;
		if (!s || !this.recording || this.voice_muted) return;
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
		try {
			s.sendRealtimeInput({
				audio: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' },
				...(!this.quiet && this.fen !== this.last_sent_fen ? {
					text: `fen:${this.fen} game_over:${this.gameOver}`
				} : {}),
			});
			if (!this.quiet && this.fen !== this.last_sent_fen) this.last_sent_fen = this.fen;
		} catch {}
	};

	play_next_audio() {
		if (!this.gemini_live_audio_ctx || this.gemini_live_audio_playing || this.gemini_live_audio_queue.length === 0) return;
		this.gemini_live_audio_playing = true;
		const buffer = this.gemini_live_audio_queue[0];
		this.gemini_live_audio_queue = this.gemini_live_audio_queue.slice(1);
		const source = this.gemini_live_audio_ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(this.gemini_live_audio_ctx.destination);
		source.onended = () => {
			this.gemini_live_audio_playing = false;
			this.play_next_audio();
		};
		source.start();
	}

	gemini_live_handle(msg: any) {
		if (msg.toolCall?.functionCalls?.length) {
			this.start_thinking_sound();
			console.log(`[gemini-live] received ${msg.toolCall.functionCalls.length} tool call(s)`, msg.toolCall.functionCalls.map((f: any) => f.name).join(', '));
			for (const fc of msg.toolCall.functionCalls) {
				console.log(`[gemini-live] dispatching tool: "${fc.name}" id=${fc.id ?? 'none'}`);
				dispatch_tool_call(fc).then((r) => {
					console.log(`[gemini-live] tool response for "${fc.name}":`, JSON.stringify(r).slice(0, 300));
					this.gemini_live_session?.sendToolResponse({ functionResponses: [r] } as any);
				}).catch((err) => {
					console.error(`[gemini-live] dispatch_tool_call ERROR for "${fc.name}":`, err);
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
			this.stop_thinking_sound();
			this.gemini_live_audio_queue = [];
			this.gemini_live_audio_playing = false;
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
		if (this.chat_abort) {
			this.chat_abort.abort();
			this.chat_abort = null;
		}
	}
}
