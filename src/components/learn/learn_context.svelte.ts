import { Chess } from 'svelte-chess';
import { Chess as ChessJS, type Move } from 'chess.js';
import { browser } from '$app/environment';
import { LEVELS, LearnEngine, check_position } from '$lib/util/chess/engine';
import type { Color, Hint } from '$lib/util/chess/engine';
import { can_reuse_hints, hint_squares } from '$lib/util/chess/hint_highlight';
import { calc_cost } from '$lib/util/ai/pricing';
import { say_move } from '$lib/util/chess/words';
import { board_note, type ChatData } from '$lib/coach/context';
import { check_words } from '$lib/coach/facts';
import { pick_model } from '$lib/coach/models';
import { coach_prompt } from '$lib/coach/prompts';
import { call_audio, end_call, say, start_call, toggle_mic as flip_mic, toggle_speaker as flip_speaker, vc } from '$lib/voice/call.svelte';
import { arm_puzzle, end_puzzle, main_theme, offer_puzzles, pz, start_puzzle, theme_words } from './puzzle.svelte';
import { words, type Sess } from '$lib/sessions';
import { close_lessons, lesson_data, lesson_suggestions, ls } from './lesson.svelte';
import { end_watch, look, undo_watch, watch_move, wt } from './watch.svelte';
import { game_done } from '$lib/progress.svelte';
import type { ChatContext, ChatUsage, ChatMsg } from './types';
import { getContext, setContext } from 'svelte';

const SORRY = 'the coach couldn’t answer just now. try again in a moment.';
// an error whose words are fit to show the player as they are
const said = (m: string) => Object.assign(new Error(m), { name: 'coach' });

const KEY = Symbol('learn');
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const new_id = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

// players who are not logged in keep their sessions on the device
const device = (): Sess[] => {
	try {
		return JSON.parse(localStorage.getItem('e4_sessions') ?? '[]');
	} catch {
		return [];
	}
};
const keep = (all: Sess[]) => {
	try {
		localStorage.setItem('e4_sessions', JSON.stringify(all.sort((a, b) => b.d - a.d).slice(0, 30)));
	} catch {}
};

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
	fen = $state(START);
	board_history = $state<string[]>([START]);
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
	hint_step = $state(1); // 1 shows only which piece to move, 2 the whole move: the player gets a chance to find it first
	hint_loading = $state(false);
	hint_ac = $state<AbortController | null>(null);
	chat_messages = $state<ChatMsg[]>([]);
	chat_loading = $state(false);
	chat_abort = $state<AbortController | null>(null);
	chat_input = $state('');
	chat_queue = $state<{ text: string; hint?: string }[]>([]);

	last_user_move = $state('');
	last_ai_move = $state('');
	redo_stack = $state<string[]>([]); // each entry is the moves one undo took back, as uci, space separated
	successful_context = $state<Partial<ChatContext>>({});

	model = $state(pick_model(browser && localStorage.getItem('explain_model')));
	autoexplain = $state(browser && localStorage.getItem('autoexplain') === 'true');
	warn = $state(!browser || localStorage.getItem('e4_warn') !== '0'); // the mistake watch
	auto_hint = $state(browser && localStorage.getItem('auto_hint') === 'true');
	hint_on_start = $state(browser && localStorage.getItem('hint_on_start') === 'true');
	groq_api_key = $state(browser && localStorage.getItem('groq_api_key') || '');
	quiet = $state(browser && localStorage.getItem('quiet') === 'true');
	show_dests = $state(!browser || localStorage.getItem('e4_dots') !== '0');

	start_hint_done = $state(false);
	show_settings = $state(false);
	show_model_menu = $state(false);
	show_vibe_menu = $state(false);
	show_token_modal = $state(false);
	show_tour = $state(false);
	show_progress = $state(false);

	total_p = $state(0);
	total_c = $state(0);
	total_cost = $state(0);
	chat_body = $state<HTMLDivElement | null>(null);
	chat_input_ref = $state<HTMLTextAreaElement | null>(null);
	sel_text = $state('');
	sel_pos = $state<{ x: number; y: number } | null>(null);
	screen_recording = $state(false);
	screen_media_recorder: MediaRecorder | null = null;
	screen_recording_chunks: Blob[] = [];

	get recording() {
		return vc.s !== '';
	}
	get voice_muted() {
		return vc.m;
	}
	get audio_muted() {
		return vc.o;
	}
	get thinking() {
		const last = this.chat_messages[this.chat_messages.length - 1];
		return (this.chat_loading && last?.role === 'user') || vc.s === 't';
	}
	toasts = $state<{ id: number; msg: string; t: string }[]>([]);
	toast_id = $state(0);
	save_timeout: ReturnType<typeof setTimeout> | null = null;
	saved_data: Record<string, unknown> | null = null;
	sid = $state('');
	sessions = $state<Sess[] | null>(null);
	show_sessions = $state(false);
	list_n = 0;
	// the chess computer's words per position, so a second question about it waits for nothing
	#checks = new Map<string, string>();
	#redoing = false;
	#initial_resume: Promise<void> | undefined;

	logged_in = $state(false);
	// the home page's mini app: no saved game, no tour, and no engine until the first move
	demo = false;
	armed = $state(true);

	constructor(logged_in = false, demo = false) {
		this.logged_in = logged_in;
		this.demo = demo;
		this.armed = !demo;
		// settings the app no longer has, so old keys don't sit in the browser
		if (browser) for (const k of ['hint_think_time', 'gemini_api_key', 'openai_api_key', 'voice_provider', 'e4_voice', 'noise_suppression', 'noise_suppression_level']) localStorage.removeItem(k);
		$effect(() => { if (browser) localStorage.setItem('autoexplain', String(this.autoexplain)); });
		$effect(() => { if (browser) localStorage.setItem('auto_hint', String(this.auto_hint)); });
		$effect(() => { if (browser) localStorage.setItem('hint_on_start', String(this.hint_on_start)); });
		$effect(() => { if (browser) localStorage.setItem('e4_warn', this.warn ? '1' : '0'); });
		$effect(() => { if (browser) localStorage.setItem('groq_api_key', this.groq_api_key); });
		$effect(() => { if (browser) localStorage.setItem('explain_model', this.model); });
		$effect(() => { if (browser) localStorage.setItem('quiet', String(this.quiet)); });
		$effect(() => { if (browser) localStorage.setItem('e4_dots', this.show_dests ? '1' : '0'); });
		$effect(() => { if (browser) localStorage.setItem('e4_help', this.vibe); });
		let lv = 0;
		$effect(() => {
			if (lv && lv !== this.level) this.save_game_debounced();
			lv = this.level;
		});

		$effect(() => {
			const el = this.chat_body;
			if (!el) return;
			this.chat_messages.length;
			this.chat_queue.length;
			requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
		});

		// a call belongs to this board, so it ends with it
		$effect(() => () => end_call());

		$effect(() => {
			if (!browser) return;
			document.addEventListener('selectionchange', this.handle_selection);
			return () => document.removeEventListener('selectionchange', this.handle_selection);
		});

		if (browser && !demo) this.#initial_resume = this.resume().catch(() => {});

		// keep the last move when the tab closes before the save timer runs
		$effect(() => {
			if (!browser || demo) return;
			const hide = () => {
				if (document.visibilityState === 'hidden' && this.save_timeout) void this.save_now(true);
			};
			document.addEventListener('visibilitychange', hide);
			return () => document.removeEventListener('visibilitychange', hide);
		});

		$effect(() => {
			if (this.ready && this.saved_data) {
				this.restore_game(this.saved_data);
			}
		});
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
		if (ls.on) return lesson_suggestions();
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
		const all = this.hints[this.hint_index] ? hint_squares(this.hints[this.hint_index].move, this.orientation) : [];
		return this.hint_step === 1 ? all.filter((q) => q.k === 'f') : all;
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

	build_chat_data(h = ''): ChatData {
		if (ls.on) return lesson_data();
		const c = this.current_chat_context();
		const d: ChatData = { f: c.f, b: this.board_words() };
		if (c.p && c.p !== this.successful_context.p) d.p = c.p;
		if (c.u && c.u !== this.successful_context.u) d.u = c.u;
		if (c.a && c.a !== this.successful_context.a) {
			d.a = c.a;
			if (this.level <= 2) d.n = 'the computer is set to play easy: it sometimes misses better moves on purpose.';
		}
		if (h) d.h = h;
		return d;
	}

	add_toast(msg: string, t: 'e' | 'i' = 'i') {
		const id = ++this.toast_id;
		this.toasts = [...this.toasts, { id, msg, t }];
		setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 4000);
	}

	// the player is whoever the computer isn't
	get me(): Color {
		const b = this.engine?.getColor?.();
		return b === 'w' ? 'b' : b === 'b' ? 'w' : this.orientation;
	}

	sync_chat_moves() {
		const moves = this.chessRef?.getHistory({ verbose: true }) as any[] | undefined;
		if (!moves) return;
		const me = this.me;
		this.history = moves.map((m) => m.san);
		this.last_user_move = this.move_text([...moves].reverse().find((m) => m.color === me));
		this.last_ai_move = this.move_text([...moves].reverse().find((m) => m.color !== me));
	}


	request_hint() {
		requestAnimationFrame(() => { void this.showHint(); });
	}

	async onReady() {
		// Apply any saved game before accepting a new move.
		await this.#initial_resume;
		this.#initial_resume = undefined;
		this.ready = true;
		if (this.demo) return;
		if (this.hint_on_start && !this.start_hint_done) {
			this.start_hint_done = true;
			this.request_hint();
		}
	}

	onMove(m: Move & { check: boolean }) {
		this.armed = true;
		this.turn = m.color === 'w' ? 'b' : 'w';
		this.moveNum++;
		this.inCheck = m.check ?? false;
		const game = !this.demo && !pz.on && !ls.on && !this.#redoing && ['w', 'b'].includes(this.engine?.getColor?.());
		if (m.color === this.me) {
			this.last_user_move = this.move_text(m);
			if (game && this.warn) void watch_move(m, this.me);
		} else {
			this.last_ai_move = this.move_text(m);
			// the player is thinking now, so the computer checks this position in the meantime
			if (game && this.warn && m.after) void look(m.after);
		}
		if (!this.#redoing) this.redo_stack = [];
		this.hideHints(true);
		this.save_game_debounced();
		if (game && this.auto_hint && m.color !== this.me) this.request_hint();
	}



	onGameOver(e: CustomEvent<{ reason: string; result: number }>) {
		this.gameOver = true;
		const { reason, result } = e.detail;
		const draw: Record<string, string> = { stalemate: 'stalemate: no legal move left', 'insufficient material': 'not enough pieces to checkmate', repetition: 'the same moves kept repeating', 'fifty-move rule': '50 moves without a capture' };
		const bot = this.engine?.getColor?.();
		const winner = result === 1 ? 'w' : 'b';
		if (!this.demo && !pz.on && !ls.on && (bot === 'w' || bot === 'b')) game_done(result === 0.5 ? 'd' : bot === winner ? 'l' : 'w', end_watch(), this.level);
		if (result === 0.5) this.resultMsg = `draw: ${draw[reason] ?? reason}`;
		else if (bot === 'w' || bot === 'b') this.resultMsg = bot === winner ? 'checkmate. the computer wins this one.' : 'checkmate. you win!';
		else this.resultMsg = `checkmate. ${winner === 'w' ? 'white' : 'black'} wins.`;
	}

	// a new game is a new session
	resetGame() {
		if (!this.chessRef) return;
		void this.flush();
		end_puzzle();
		this.sid = new_id();
		localStorage.setItem('e4_session', this.sid);
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
		end_watch();
		this.clearChat();

	}

	undoMove() {
		if (!this.chessRef || !this.history.length) return;
		if (this.engine.isSearching()) void this.engine.stopSearch();
		// the computer is to move, so its reply has not come yet and only the player's move goes back
		const pending = this.turn === this.engine.getColor();
		const all = this.chessRef.getHistory({ verbose: true }) as { from: string; to: string; promotion?: string }[];
		const back = all.slice(pending ? -1 : -2).map((m) => m.from + m.to + (m.promotion ?? '')).join(' ');
		this.chessRef.undo();
		if (!pending) this.chessRef.undo();
		undo_watch();
		this.redo_stack.push(back);
		this.gameOver = false;
		this.resultMsg = '';
		this.sync_chat_moves();
		this.hideHints(true);
	}

	// plays the taken-back moves again, so the game keeps its moves; the computer only thinks if its reply was never played
	redoMove() {
		if (!this.chessRef || !this.redo_stack.length) return;
		const moves = this.redo_stack.pop()!.split(' ');
		if (moves[0]?.includes('/')) return; // saves from before kept positions here, not moves
		const bot = this.engine.getColor();
		this.#redoing = true;
		this.engine.setColor('none');
		try {
			for (const u of moves) (this.chessRef.move as unknown as (m: object) => void)({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
		} catch {}
		this.engine.setColor(bot);
		this.#redoing = false;
		if (moves.length === 1) void this.chessRef.playEngineMove();
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
			this.hint_step = 1;
			return;
		}
		this.hint_loading = true;
		this.show_hints = true;
		this.hint_step = 1;
		if (this.hint_ac) this.hint_ac.abort();
		this.hint_ac = new AbortController();
		const sig = this.hint_ac.signal;
		const fen = this.fen;
		try {
			const c = await look(fen);
			if (sig.aborted) return;
			this.hints = c ? [{ move: c.m, score: c.s, depth: 0 }] : [];
			this.hint_fen = fen;
			this.hint_index = 0;
		} finally {
			this.hint_loading = false;
			this.hint_ac = null;
		}
	}

	// the second tap of the hint shows the whole move, and the coach explains it if asked to
	reveal_hint() {
		this.hint_step = 2;
		if (this.autoexplain) void this.explainHint();
	}

	nextHint() {
		if (this.hint_index < this.hints.length - 1) this.hint_index++;
	}

	prevHint() {
		if (this.hint_index > 0) this.hint_index--;
	}

	hideHints(clear = false) {
		this.show_hints = false;
		this.hint_step = 1;
		this.hint_loading = false;
		if (this.hint_ac) { this.hint_ac.abort(); this.hint_ac = null; }
		if (clear) {
			this.hints = [];
			this.hint_fen = '';
			this.hint_index = 0;
		}
	}

	async send_chess_chat(user_msg: string, h = '', clear = false, voice = false) {
		const d = this.build_chat_data(h);
		this.chat_messages = [...this.chat_messages, { role: 'user', content: user_msg, d }];
		if (clear) this.chat_input = '';
		await this.execute_chat(voice);
		// a typed question during a call gets a spoken answer too, unless the coach only talks when talked to
		if (!voice && this.recording && !this.quiet) {
			const last = this.chat_messages.at(-1);
			if (last?.role === 'assistant' && last.content) say(last.content);
		}
		this.processQueue();
	}

	// the chess computer checks the position first, so what the coach says about the game rests on facts
	async check(fen: string) {
		if (!this.#checks.has(fen)) {
			const c = await check_position(fen);
			this.#checks.set(fen, c ? check_words(fen, c) : '');
			if (this.#checks.size > 30) this.#checks.delete(this.#checks.keys().next().value!);
		}
		return this.#checks.get(fen)!;
	}

	async execute_chat(voice = false) {
		const sent_context = this.current_chat_context();
		this.chat_loading = true;
		const ac = new AbortController();
		this.chat_abort = ac;
		try {
			const last = this.chat_messages.at(-1);
			const d = last?.role === 'user' ? last.d : undefined;
			if (d?.f && !d.l && !d.e && !this.gameOver && d.f !== START) {
				const e = await this.check(d.f);
				if (ac.signal.aborted) return;
				if (e) last!.d = { ...d, e };
			}
			const b = this.vibe === 'socratic' ? 's' : 'a';
			if (this.groq_api_key.trim()) await this.send_direct_generation(ac, b, voice);
			else {
				const res = await fetch('/chess/learn/chat', {
					method: 'POST',
					body: JSON.stringify({ x: this.chat_messages.map((m) => ({ r: m.role, c: m.content, d: m.d })), m: this.model, b, v: voice ? 1 : 0 }),
					signal: ac.signal
				});
				if (!res.ok) throw said((await res.json().catch(() => null))?.error || SORRY);
				if (!(await this.read_chat_stream(res))) throw said(SORRY);
			}
			this.successful_context = sent_context;
			this.save_game_debounced();
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			console.error('[chat]', e);
			const msg = e instanceof Error && e.name === 'coach' ? e.message : SORRY;
			const last = this.chat_messages[this.chat_messages.length - 1];
			if (last?.role === 'assistant') {
				this.chat_messages[this.chat_messages.length - 1] = { ...last, content: last.content + '\n' + msg };
				this.chat_messages = this.chat_messages;
			} else {
				this.chat_messages = [...this.chat_messages, { role: 'assistant', content: msg }];
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
		if (name === 'error') throw said(msg.e || SORRY);
		if (name === 'undo') {
			this.undoMove();
			return true;
		}
		if (name === 'board' && typeof msg.f === 'string') {
			close_lessons();
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

	// a grown-up's own groq key: the browser talks to groq itself, with the same instructions but no board tools
	async send_direct_generation(ac: AbortController, b: 'a' | 's', voice: boolean) {
		const { createGroq } = await import('@ai-sdk/groq');
		const { streamText, wrapLanguageModel, extractReasoningMiddleware } = await import('ai');
		const groq = createGroq({ apiKey: this.groq_api_key.trim() });
		const result = streamText({
			model: wrapLanguageModel({ model: groq(this.model), middleware: extractReasoningMiddleware({ tagName: 'think' }) }),
			system: coach_prompt(b, voice, false),
			messages: this.chat_messages
				.filter((m) => m.role !== 'system')
				.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.role === 'user' ? board_note(m.content, m.d) : m.content }))
		});
		let wrote = false;
		for await (const chunk of result.textStream) {
			if (ac.signal.aborted) break;
			if (!chunk) continue;
			wrote = true;
			const last = this.chat_messages[this.chat_messages.length - 1];
			if (last?.role === 'assistant') {
				this.chat_messages[this.chat_messages.length - 1] = { ...last, content: last.content + chunk };
				this.chat_messages = this.chat_messages;
			} else {
				this.chat_messages = [...this.chat_messages, { role: 'assistant', content: chunk }];
			}
		}
		if (!wrote) throw said(SORRY);
		if (ac.signal.aborted) return;
		try {
			const u = await result.totalUsage;
			const p = u.inputTokens ?? 0;
			const c = u.outputTokens ?? 0;
			const cost = calc_cost(this.model, p, c);
			this.total_p += p;
			this.total_c += c;
			this.total_cost += cost;
			const last = this.chat_messages.length - 1;
			if (last >= 0 && this.chat_messages[last].role === 'assistant') this.chat_messages[last] = { ...this.chat_messages[last], u: { p, c, cost } };
		} catch {}
	}

	processQueue() {
		if (this.chat_queue.length > 0) {
			const [next, ...rest] = this.chat_queue;
			this.chat_queue = rest;
			void this.send_chess_chat(next.text, next.hint ?? '', true);
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
		if (last?.role === 'assistant') void this.send_chess_chat(item.text, item.hint ?? '', true);
		else {
			this.chat_messages = [...this.chat_messages, { role: 'user', content: item.text, d: this.build_chat_data(item.hint) }];
			await this.execute_chat();
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

	// the coach explains what the mistake allowed; the chess computer's check of the new position rides along
	async explain_mistake() {
		const w = wt.w;
		if (!w || this.chat_loading) return;
		await this.send_chess_chat('what did my last move allow?', `the player's last move was a big mistake. the computer saw: ${w}`);
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
		this.save_timeout = setTimeout(() => void this.save_now(), 2000);
	}

	flush() {
		return this.save_timeout ? this.save_now() : Promise.resolve();
	}

	get session_title() {
		if (pz.on) return `a ${theme_words(main_theme(pz.p)) || 'chess'} puzzle`;
		// counted from the fen, since the move list starts over whenever a position loads
		const f = this.fen.split(' ');
		const n = +f[5] - (f[1] === 'w' ? 1 : 0) || 0;
		const m = n === 1 ? '1 move' : `${n} moves`;
		const r = this.resultMsg;
		const how = !n ? 'no moves yet' : r.includes('you win') ? `you won in ${m}` : r.includes('computer wins') ? `the computer won in ${m}` : r.startsWith('draw') ? `a draw after ${m}` : r || `${m} so far`;
		return `${how} · ${LEVELS[this.level - 1]?.t ?? ''}`;
	}

	// api keys stay on the device, so they are never part of a session
	async save_now(keepalive = false) {
		if (this.save_timeout) clearTimeout(this.save_timeout);
		this.save_timeout = null;
		if (this.demo || !this.sid || (!this.history.length && !this.chat_messages.length && this.fen === START)) return;
		const c = this.chat_messages.map((m) => ({ r: m.role === 'user' ? 'u' : 'a', c: m.content, ...(m.u ? { u: m.u } : {}) }));
		await this.put([{
			i: this.sid,
			t: this.session_title,
			p: this.chat_messages.find((m) => m.role === 'user')?.content.slice(0, 300) ?? '',
			f: this.fen,
			d: Date.now(),
			b: JSON.stringify({
				f: this.fen, h: this.history.join(' '), m: this.moveNum, o: this.orientation,
				u: this.last_user_move, a: this.last_ai_move, r: this.redo_stack.join('|'),
				v: this.gameOver, x: this.resultMsg, l: this.level, c: JSON.stringify(c)
			})
		}], keepalive);
	}

	async put(all: Sess[], keepalive = false) {
		if (!this.logged_in) return keep([...all, ...device().filter((o) => !all.some((x) => x.i === o.i))]);
		await fetch('/api/sessions', { method: 'POST', body: JSON.stringify(all), keepalive }).catch(() => {});
	}

	async get(i: string): Promise<Sess | null | undefined> {
		if (!this.logged_in) return device().find((o) => o.i === i);
		return fetch(`/api/sessions?i=${i}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
	}

	// picks up the session this device was on
	async resume() {
		if (this.logged_in && device().length) {
			const r = await fetch('/api/sessions', { method: 'POST', body: JSON.stringify(device()) }).catch(() => null);
			if (r?.ok) localStorage.removeItem('e4_sessions');
		}
		const old = localStorage.getItem('chess_save');
		if (old) {
			// the one save from before sessions becomes the first session
			try {
				const b = JSON.parse(old);
				delete b.g;
				delete b.k;
				const i = new_id();
				await this.put([{ i, t: 'your last game', p: JSON.parse(b.c ?? '[]').find((m: { r: string }) => m.r === 'u')?.c.slice(0, 300) ?? '', f: b.f, d: b.d ?? Date.now(), b: JSON.stringify(b) }]);
				localStorage.setItem('e4_session', i);
			} catch {}
			localStorage.removeItem('chess_save');
		}
		const p = localStorage.getItem('e4_session');
		const x = p ? await this.get(p) : null;
		// a fresh id when it is gone, so a guest game never reuses an account session's id
		this.sid = x?.i ?? new_id();
		localStorage.setItem('e4_session', this.sid);
		if (x?.b) this.saved_data = JSON.parse(x.b);
	}

	async list_sessions(q = '') {
		const n = ++this.list_n;
		await this.flush();
		const w = words(q);
		const all: Sess[] = this.logged_in
			? await fetch(`/api/sessions?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])).catch(() => [])
			: device().filter((o) => w.every((x) => `${o.t} ${o.p} ${o.b}`.toLowerCase().includes(x)));
		if (n === this.list_n) this.sessions = all;
	}

	async open_session(i: string) {
		this.show_sessions = false;
		if (i === this.sid) return;
		void this.flush();
		const x = await this.get(i);
		if (!x?.b) return this.add_toast('couldn’t open that game', 'e');
		end_puzzle();
		close_lessons();
		// the voice call knows the old game, so it ends
		if (this.recording) end_call();
		this.clearChat();
		this.sid = i;
		localStorage.setItem('e4_session', i);
		this.restore_game(JSON.parse(x.b));
	}

	async delete_session(i: string) {
		this.sessions = this.sessions?.filter((o) => o.i !== i) ?? null;
		if (i === this.sid) {
			if (this.save_timeout) clearTimeout(this.save_timeout);
			this.save_timeout = null;
			this.resetGame();
		}
		if (this.logged_in) await fetch(`/api/sessions?i=${i}`, { method: 'DELETE' }).catch(() => {});
		else keep(device().filter((o) => o.i !== i));
	}

	restore_game(d: Record<string, unknown>) {
		if (!this.chessRef) return;
		const o = (d.o as 'w' | 'b') ?? 'w';
		// set before the load, which makes the computer move at once when it is its turn
		this.engine?.setColor?.(o === 'w' ? 'b' : 'w');
		this.chessRef.load(d.f as string);
		this.fen = d.f as string;
		this.history = ((d.h as string) ?? '').split(' ').filter(Boolean);
		this.moveNum = (d.m as number) ?? 0;
		this.orientation = o;
		this.last_user_move = (d.u as string) ?? '';
		this.last_ai_move = (d.a as string) ?? '';
		this.redo_stack = ((d.r as string) ?? '').split('|').filter(Boolean);
		this.gameOver = (d.v as boolean) ?? false;
		this.resultMsg = (d.x as string) ?? '';
		this.level = (d.l as number) ?? 2;
		this.hideHints(true);
		const cc = d.c as string;
		if (cc) {
			try {
				const parsed = JSON.parse(cc);
				if (Array.isArray(parsed)) {
					const old: ChatMsg[] = parsed.map((m: any) => ({
						role: m.r === 'u' ? 'user' as const : 'assistant' as const,
						content: m.c,
						...(m.u ? { u: m.u as ChatUsage } : {})
					}));
					// keep what was said before the save arrived, like a lesson's opening line
					const now = this.chat_messages.filter((m, i) => i || m.content !== old.at(-1)?.content);
					this.chat_messages = [...old, ...now];
				}
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

	// talk: the call listens and speaks in the browser (lib/voice), and its questions go to the same coach as typed ones
	toggle_voice() {
		if (vc.s) {
			this.screen_media_recorder?.stop();
			return end_call();
		}
		void start_call((q) => this.voice_ask(q), (msg) => this.add_toast(msg, 'e'));
	}

	async voice_ask(q: string) {
		while (this.chat_loading) await new Promise((r) => setTimeout(r, 100));
		const n = this.chat_messages.length;
		await this.send_chess_chat(q, '', false, true);
		return this.chat_messages.slice(n).findLast((m) => m.role === 'assistant')?.content ?? '';
	}

	toggle_mic() {
		flip_mic();
	}

	toggle_audio() {
		flip_speaker();
	}

	toggle_screen_recording = async () => {
		const audio = call_audio();
		if (!audio) return;
		if (this.screen_media_recorder) {
			this.screen_media_recorder.stop();
			return;
		}
		try {
			const screen_stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
			const combined = new MediaStream([...screen_stream.getVideoTracks(), ...audio.getAudioTracks().slice(0, 1)]);
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
				screen_stream.getTracks().forEach((t) => t.stop());
				if (this.screen_recording_chunks.length) {
					const url = URL.createObjectURL(new Blob(this.screen_recording_chunks, { type: mime }));
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
			this.add_toast('screen recording couldn’t start.', 'e');
		}
	};

	clearChat() {
		this.chat_messages = [];
		this.chat_queue = [];
		this.chat_loading = false;
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
