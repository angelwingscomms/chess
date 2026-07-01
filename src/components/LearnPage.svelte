<script lang="ts">
	import { Chess } from 'svelte-chess';
	import { Chess as ChessJS } from 'chess.js';
	import { marked } from 'marked';
	import { browser, dev } from '$app/environment';
	import StepperInput from '$components/stepper-input.svelte';
	import { page } from '$app/stores';
	import { pushState } from '$app/navigation';
	import { LearnEngine, getHints, analyzePosition } from '$lib/util/chess/engine';
	import type { Color, Hint, EvalResult } from '$lib/util/chess/engine';
	import { can_reuse_hints, hint_squares } from '$lib/util/chess/hint_highlight';
	import ArrowUpIcon from '$lib/components/icons/arrow-up-icon.svelte';
	import ArrowLeftIcon from '$lib/components/icons/arrow-left-icon.svelte';
	import ArrowRightIcon from '$lib/components/icons/arrow-right-icon.svelte';
	import BulbIcon from '$lib/components/icons/bulb-icon.svelte';
	import GearIcon from '$lib/components/icons/gear-icon.svelte';
	import InfoIcon from '$lib/components/icons/info-icon.svelte';
	import MicIcon from '$lib/components/icons/mic-icon.svelte';
	import PlusIcon from '$lib/components/icons/plus-icon.svelte';
	import RedoIcon from '$lib/components/icons/redo-icon.svelte';
	import RefreshIcon from '$lib/components/icons/refresh-icon.svelte';
	import UndoIcon from '$lib/components/icons/undo-icon.svelte';
	import FlipIcon from '$lib/components/icons/flip-icon.svelte';
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
	import { calc_cost } from '$lib/util/ai/pricing';
	import { NGN_USD } from '$lib/util/rates';
	import { init_tool_state, get_tool_declarations, dispatch_tool_call } from '$lib/util/chat/tools/gemini_live_dispatcher';

	type ChatContext = { f: string; p: string; u: string; a: string; e?: string };
	type ChatData = Partial<ChatContext> & { h?: string };
	type ChatUsage = { p: number; c: number; cost: number };
	type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string; d?: ChatData; u?: ChatUsage };

	const default_sys = `Keep responses extremely short — 1-3 sentences, plain language. Always answer whatever the user asks — that's your #1 job. If you don't know, say so simply.

You receive board context in [board_context] tags: FEN, move_history, last_user_move, last_ai_move, and optionally a hinted move. Ground every observation in concrete squares and piece locations. Never mention engines, scores, ratings, or that data was provided. Use objective voice — no "I see" or "I notice".

When the player asks "why {move}" (analyzing a hint), explain what that move accomplishes in concrete positional or tactical terms. What does it threaten? What does it prevent? What weakness does it exploit?

When the player makes a mistake: state what happened factually, mention one principle, move on. When they make a good move: note why in chess terms. Vary the domain — tactics, structure, endgame, psychology, openings.`;

	const train_sys = `Keep responses extremely short — 1-3 sentences. Plain language, like you're talking to a friend. Always answer whatever the user asks — that's your #1 job.

You are a chess trainer. Create puzzles for the user to solve, then guide their thinking. They're here to train, not play — internal note, don't say it.

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

No formal wrap-ups. No "What did you learn?" Just end naturally and keep going.`;

	let { sys = default_sys, r: r_init = false } = $props();
	let r = $state(r_init);

	let current_sys = $derived(r ? train_sys : sys);

	let level = $state(3);
	let turn = $state<Color>('w');
	let orientation = $state<Color>('w');
	let moveNum = $state(0);
	let history = $state<string[]>([]);
	let fen = $state('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
	let board_history = $state<string[]>(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);
	let board_history_idx = $state(0);
	let inCheck = $state(false);
	let gameOver = $state(false);
	let resultMsg = $state('');
	let ready = $state(false);
	let chessRef = $state<Chess | null>(null);

	let show_hints = $state(false);
	let hints = $state<Hint[]>([]);
	let hint_fen = $state('');
	let hint_index = $state(0);
	let hint_loading = $state(false);
	let hint_ac = $state<AbortController | null>(null);

	let chat_messages = $state<ChatMsg[]>([]);
	let chat_loading = $state(false);
	let chat_abort = $state<AbortController | null>(null);
	let chat_input = $state('');
	let chat_queue = $state<{ text: string; hint?: string; voice?: boolean; eval?: string }[]>([]);
	let last_eval = $state<string>('');

	function get_training_eval(fen_str: string, user_move_san: string): Promise<string> {
		const log = (msg: string) => console.log(`[eval] ${msg}`);
		log(`get_training_eval fen=${fen_str.slice(0, 50)} user_move="${user_move_san}"`);
		return new Promise((res) => {
			const ac = new AbortController();
			const timeout = setTimeout(() => { log('TIMEOUT after 10000ms — aborting'); ac.abort(); res(''); }, 10000);
			analyzePosition(fen_str, 3, undefined, ac.signal, 3000).then((er) => {
				clearTimeout(timeout);
				log(`analyzePosition done: best_move=${er.best_move} score=${er.best_score} depth=${er.best_depth} multi_pv_lines=${(er.multi_pv ?? []).length}`);
				if (!er.best_move) {
					log('WARNING: best_move is empty from analyzePosition');
				}
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
				const json = JSON.stringify(data);
				last_eval = json;
				log(`stored last_eval (${json.length} chars)`);
				res(json);
			}).catch((err) => {
				clearTimeout(timeout);
				log(`analyzePosition REJECTED: ${err instanceof Error ? err.message : String(err)}`);
				res('');
			});
		});
	}
	let interaction_id = $state('');
	let last_user_move = $state('');
	let last_ai_move = $state('');
	let redo_stack = $state<string[]>([]);
	let successful_context = $state<Partial<ChatContext>>({});
	let captured = $derived.by(() => {
		if (!chessRef) return { w: [], b: [] };
		try {
			const moves = chessRef.getHistory({ verbose: true }) as any[];
			const w: string[] = [], b: string[] = [];
			for (const m of moves) if (m.captured) {
				if (m.color === 'w') b.push(m.captured);
				else w.push(m.captured);
			}
			return { w, b };
		} catch { return { w: [], b: [] }; }
	});

	let chat_suggestions = $derived.by(() => {
		if (chat_messages.length > 0 || gameOver) return [];
		const s: string[] = [];
		if (inCheck) s.push('How do I get out of check?');
		if (moveNum === 0) s.push('Suggest a good opening move');
		else if (last_ai_move) s.push('Why did Stockfish play that?');
		if (moveNum > 0) s.push('What is the best move for me?');
		if (moveNum >= 4) { s.push('Who is winning right now?'); s.push('What is the plan here?'); }
		return s.slice(0, 3);
	});

	let model = $state(browser && localStorage.getItem('explain_model') || 'openai/gpt-oss-120b');
	let autoexplain = $state(browser && localStorage.getItem('autoexplain') !== 'false');
	let auto_hint = $state(browser && localStorage.getItem('auto_hint') === 'true');
	let hint_on_start = $state(browser && localStorage.getItem('hint_on_start') === 'true');
let hint_think_time = $state(browser && parseFloat(localStorage.getItem('hint_think_time') || '2.7') || 2.7);
let computer_think_time = $state(1.5);
let groq_api_key = $state(browser && localStorage.getItem('groq_api_key') || '');
	let voice_name = $state(browser && localStorage.getItem('voice_name') || 'Kore');
	let voice_options = [
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
	let show_voice_menu = $state(false);
	let start_hint_done = $state(false);
	let show_settings = $state(false);
	let show_model_menu = $state(false);
	let show_token_modal = $state(false);

	let total_p = $state(0);
	let total_c = $state(0);
	let total_cost = $state(0);
	let chat_body = $state<HTMLDivElement | null>(null);
	let chat_input_ref = $state<HTMLTextAreaElement | null>(null);
	let recording = $state(false);
	let sel_text = $state('');
	let sel_pos = $state<{ x: number; y: number } | null>(null);
	let voice_tts = $state(false);
	let gemini_live_session: any = null;
	let gemini_live_audio_ctx: AudioContext | null = null;
	let gemini_live_mic_stream: MediaStream | null = null;
	let gemini_live_processor: ScriptProcessorNode | null = null;
	let gemini_live_audio_queue: AudioBuffer[] = [];
	let gemini_live_audio_playing = false;
	let pending_board_context: string | null = null;
	let toasts = $state<{ id: number; msg: string }[]>([]);
	let toast_id = $state(0);
	function add_toast(msg: string) {
		const id = ++toast_id;
		toasts = [...toasts, { id, msg }];
		setTimeout(() => toasts = toasts.filter(t => t.id !== id), 4000);
	}
	let pending_user_idx = $derived.by(() => {
		if (!chat_loading) return -1;
		for (let i = chat_messages.length - 1; i >= 0; i--) if (chat_messages[i].role === 'user') return i;
		return -1;
	});
$effect(() => { if (browser) localStorage.setItem('autoexplain', String(autoexplain)); });
	$effect(() => { if (browser) localStorage.setItem('auto_hint', String(auto_hint)); });
	$effect(() => { if (browser) localStorage.setItem('hint_on_start', String(hint_on_start)); });
	$effect(() => { if (browser) localStorage.setItem('hint_think_time', String(hint_think_time)); });
	$effect(() => { if (browser) localStorage.setItem('groq_api_key', groq_api_key); });
	$effect(() => { if (browser) localStorage.setItem('voice_name', voice_name); });
	$effect(() => {
		if (!browser) return;
		const state_fen = $page.state?.fen as string | undefined;
		if (state_fen && state_fen !== fen) {
			fen = state_fen;
			if (chessRef) chessRef.load(state_fen);
			history = [];
			moveNum = 0;
			gameOver = false;
			resultMsg = '';
			hideHints(true);
			last_user_move = '';
			last_ai_move = '';
			redo_stack = [];
		}
	});
	let save_timeout: ReturnType<typeof setTimeout> | null = null;
	let saved_data: Record<string, unknown> | null = null;
	const LS_KEY = 'chess_save';

	async function save_game_debounced() {
		if (save_timeout) clearTimeout(save_timeout);
		save_timeout = setTimeout(async () => {
			const serialize_chat = (msgs: ChatMsg[]) => msgs.map(m => {
				const r: Record<string, unknown> = { r: m.role === 'user' ? 'u' : 'a', c: m.content };
				if (m.u) r.u = m.u;
				return r;
			});
			const payload = {
				f: fen, h: history.join(' '), m: moveNum, o: orientation,
				u: last_user_move, a: last_ai_move, r: redo_stack.join('|'),
				v: gameOver, x: resultMsg, g: groq_api_key, l: level,
				t: computer_think_time,
				c: JSON.stringify(serialize_chat(chat_messages)),
				d: Date.now()
			};
			if (browser) {
				try { localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, c: JSON.stringify(serialize_chat(chat_messages.slice(-50))) })); } catch {}
			}
			if (!($page.data as any)?.user) return;
			try { await fetch('/api/save', { method: 'POST', body: JSON.stringify(payload) }); } catch {}
		}, 2000);
	}

	function restore_game(d: Record<string, unknown>) {
		if (!chessRef) return;
		chessRef.load(d.f as string);
		fen = d.f as string;
		const h = d.h as string;
		if (h) history = h.split(' ').filter(Boolean);
		moveNum = (d.m as number) ?? 0;
		orientation = (d.o as 'w' | 'b') ?? 'w';
		last_user_move = (d.u as string) ?? '';
		last_ai_move = (d.a as string) ?? '';
		const r = d.r as string;
		if (r) redo_stack = r.split('|').filter(Boolean);
		gameOver = (d.v as boolean) ?? false;
		resultMsg = (d.x as string) ?? '';
		level = (d.l as number) ?? 3;
		computer_think_time = (d.t as number) ?? 1.5;
		const gk = d.g as string;
		if (gk) groq_api_key = gk;
		const cc = d.c as string;
		if (cc) {
			try {
				const parsed = JSON.parse(cc);
				if (Array.isArray(parsed)) chat_messages = parsed.map((m: any) => ({
					role: m.r === 'u' ? 'user' as const : 'assistant' as const,
					content: m.c,
					...(m.u ? { u: m.u as { p: number; c: number; cost: number } } : {})
				}));
			} catch {}
		}
		saved_data = null;
	}

	$effect(() => {
		if (!browser) return;
		let best: Record<string, unknown> | null = null;
		try {
			const ls = localStorage.getItem(LS_KEY);
			if (ls) best = JSON.parse(ls);
		} catch {}
		if (($page.data as any)?.user) {
			fetch('/api/load').then(r => r.json()).then(({data: sd}) => {
				if (sd && (!best || (sd.d ?? 0) > (best.d ?? 0))) best = sd;
				if (best) saved_data = best;
			}).catch(() => { if (best) saved_data = best; });
		} else if (best) {
			saved_data = best;
		}
	});

	$effect(() => {
		if (ready && saved_data) {
			restore_game(saved_data);
		}
	});

	$effect(() => {
		const el = chat_body;
		if (!el) return;
		chat_messages.length, chat_queue.length;
		requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
	});

	function cleanup_gemini_live() {
		if (gemini_live_processor) { gemini_live_processor.disconnect(); gemini_live_processor = null; }
		if (gemini_live_mic_stream) { gemini_live_mic_stream.getTracks().forEach(t => t.stop()); gemini_live_mic_stream = null; }
		if (gemini_live_session) { gemini_live_session.close(); gemini_live_session = null; }
		if (gemini_live_audio_ctx) { gemini_live_audio_ctx.close(); gemini_live_audio_ctx = null; }
		gemini_live_audio_queue = [];
		gemini_live_audio_playing = false;
		pending_board_context = null;
		recording = false;
	}

	$effect(() => {
		return () => { cleanup_gemini_live(); };
	});


	const hint_from_class = 'bg-amber/70';
	const hint_to_class = 'bg-teal/70';
	let model_options = $state<{ v: string; l: string; d: string; r?: boolean }[]>([]);

	async function fetch_models() {
		try {
			const k = groq_api_key.trim();
			if (k) {
				const res = await fetch('https://api.groq.com/openai/v1/models', {
					headers: { Authorization: `Bearer ${k}` },
				});
				if (!res.ok) throw Error(`${res.status}`);
				const body = await res.json();
				model_options = (body.data ?? []).filter((m: any) => m.object === 'model' && m.id && !m.id.includes('whisper') && !m.id.includes('embedding') && !m.id.includes('orpheus') && !m.id.includes('prompt-guard') && !m.id.includes('compound')).map((m: any) => ({ v: m.id, l: m.id.split('/').pop() ?? m.id, d: m.owned_by ?? '' }));
			} else {
				const res = await fetch('/chess/learn/models');
				if (!res.ok) throw Error(`${res.status}`);
				model_options = await res.json();
			}
			const prio = ['nex-agi/nex-n2-pro:free', 'deepseek/deepseek-v4-flash', 'bynara/mimo-v2.5-pro-free', 'bynara/mimo-v2.5-free', 'bynara/mistral-large', 'gemma-4-26b-a4b-it', 'gemma-4-31b-it', 'openai/gpt-oss-120b', 'qwen/qwen3-32b', 'llama-3.3-70b-versatile'];
			model_options.sort((a, b) => {
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
				if (!model_options.find((m: any) => m.v === id) && extra[id]) model_options.push({ v: id, ...extra[id] });
			}
			const first = model_options[0];
			if (first) first.r = true;
		} catch {
		model_options = [
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
		if (model_options.length && !model_options.find((o) => o.v === model)) {
			model = model_options[0].v;
		}
	}

	$effect(() => {
		if (browser) { groq_api_key; fetch_models(); }
	});

	function buildEngine() {
		const mt = Math.round(computer_think_time * 1000);
		return new LearnEngine({ elo: null, depth: 20, moveTime: mt, color: r ? 'none' : 'b' });
	}

	let engine = $derived.by(() => buildEngine());
	let hint_highlights = $derived.by(() => hints[hint_index] ? hint_squares(hints[hint_index].move, orientation) : []);

	function uciToSan(fen: string, uci: string): string {
		try {
			const c = new ChessJS(fen);
			const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
			return m?.san ?? uci;
		} catch {
			return uci;
		}
	}

	function fmtScore(s: number): string {
		if (s >= 100000) return 'Mate';
		if (s <= -100000) return '-Mate';
		const v = (s / 100).toFixed(2);
		return s > 0 ? '+' + v : v;
	}

	function move_text(m: any): string {
		const uci = (m?.from ?? '') + (m?.to ?? '') + (m?.promotion ?? '');
		return m?.san && uci ? `${m.san} (${uci})` : m?.san ?? uci;
	}

	function current_chat_context(): ChatContext {
		return { f: fen, p: history.join(' '), u: last_user_move, a: last_ai_move, e: last_eval || undefined };
	}

	function build_chat_data(h = ''): ChatData {
		const c = current_chat_context();
		const d: ChatData = {};
		if (c.f !== successful_context.f) d.f = c.f;
		if (c.p && c.p !== successful_context.p) d.p = c.p;
		if (c.u && c.u !== successful_context.u) d.u = c.u;
		if (c.a && c.a !== successful_context.a) d.a = c.a;
		if (c.e && c.e !== (successful_context as ChatContext).e) d.e = c.e;
		if (h) d.h = h;
		return d;
	}

	function build_direct_input(msg: ChatMsg) {
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

	function apply_chat_event(raw: string) {
		const lines = raw.split(/\r?\n/);
		const name = lines.find((line) => line.startsWith('event: '))?.slice(7).trim();
		const data = lines.filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
		const msg = data ? JSON.parse(data) : {};
		if (name === 'text' && typeof msg.t === 'string') {
			const last = chat_messages[chat_messages.length - 1];
			if (last?.role === 'assistant') {
				chat_messages[chat_messages.length - 1] = { ...last, content: last.content + msg.t };
				chat_messages = chat_messages;
			} else {
				chat_messages = [...chat_messages, { role: 'assistant', content: msg.t }];
			}
			return true;
		}
		if (name === 'interaction' && typeof msg.i === 'string') {
			interaction_id = msg.i;
			return true;
		}
		if (name === 'usage' && typeof msg.p === 'number') {
				total_p += msg.p;
				total_c += msg.c;
				if (typeof msg.cost === 'number') total_cost += msg.cost;
				const last = chat_messages.length - 1;
				if (last >= 0 && chat_messages[last].role === 'assistant') {
					chat_messages[last] = { ...chat_messages[last], u: { p: msg.p, c: msg.c, cost: msg.cost ?? 0 } };
				}
				if (typeof msg.bal === 'number') window.dispatchEvent(new CustomEvent('balance-update', { detail: msg.bal }));
				return true;
			}
		if (name === 'error') throw Error(msg.e || 'Request failed');
		if (name === 'board' && typeof msg.f === 'string') {
			fen = msg.f;
			if (chessRef) chessRef.load(msg.f);
			history = [];
			moveNum = 0;
			gameOver = false;
			resultMsg = '';
			hideHints(true);
			last_user_move = '';
			last_ai_move = '';
			redo_stack = [];
			board_history = [...board_history.slice(0, board_history_idx + 1), msg.f];
			board_history_idx = board_history.length - 1;
			pushState('', { fen: msg.f });
			return true;
		}
		return false;
	}

	async function read_chat_stream(res: Response) {
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
			for (const part of parts) if (part.trim()) ok = apply_chat_event(part) || ok;
		}
		if (buf.trim()) ok = apply_chat_event(buf) || ok;
		return ok;
	}

	async function send_direct_generation(ac: AbortController, request_messages: ChatMsg[], m: string) {
		const { createGroq } = await import('@ai-sdk/groq');
		const { streamText, wrapLanguageModel, extractReasoningMiddleware } = await import('ai');
		const groq = createGroq({ apiKey: groq_api_key.trim() });

		const result = streamText({
			model: wrapLanguageModel({
				model: groq(m),
				middleware: extractReasoningMiddleware({ tagName: 'think' }),
			}),
			system: request_messages[0]?.role === 'system' ? request_messages[0].content : '',
			messages: (request_messages[0]?.role === 'system' ? request_messages.slice(1) : request_messages).map((msg) => ({
				role: msg.role as 'user' | 'assistant',
				content: msg.role === 'user' ? build_direct_input(msg) : msg.content,
			})),
		});

		let wrote = false;
		for await (const chunk of result.textStream) {
			if (ac.signal.aborted) break;
			if (chunk) {
				wrote = true;
				const last = chat_messages[chat_messages.length - 1];
				if (last?.role === 'assistant') {
					chat_messages[chat_messages.length - 1] = { ...last, content: last.content + chunk };
					chat_messages = chat_messages;
				} else {
					chat_messages = [...chat_messages, { role: 'assistant', content: chunk }];
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
					total_p += p;
					total_c += c;
					total_cost += cost;
					const last = chat_messages.length - 1;
					if (last >= 0 && chat_messages[last].role === 'assistant') {
						chat_messages[last] = { ...chat_messages[last], u: { p, c, cost } };
					}
				}
			} catch {}
		}
		fetch('/api/balance').then(r => r.json()).then(d => { if (typeof d.balance === 'number') window.dispatchEvent(new CustomEvent('balance-update', { detail: d.balance })); }).catch(() => {});
		save_game_debounced();
	}

	function sync_chat_moves() {
		const moves = chessRef?.getHistory({ verbose: true }) as any[] | undefined;
		if (!moves) return;
		history = moves.map((m) => m.san);
		last_user_move = move_text([...moves].reverse().find((m) => m.color === 'w'));
		last_ai_move = move_text([...moves].reverse().find((m) => m.color === 'b'));
	}

	function request_hint() {
		requestAnimationFrame(() => { void showHint(); });
	}

	function onReady() {
		ready = true;
		if (hint_on_start && !start_hint_done) {
			start_hint_done = true;
			request_hint();
		}
	}

	function onMove(e: CustomEvent<{ color: Color }>) {
		const m = e.detail;
		turn = m.color === 'w' ? 'b' : 'w';
		moveNum++;
		inCheck = (e.detail as any).check ?? false;
		if (m.color === 'w') last_user_move = move_text(m);
		else last_ai_move = move_text(m);
		redo_stack = [];
		hideHints(true);
		if (m.color === 'b' && auto_hint) request_hint();
		if (r && m.color === 'w' && browser) {
			get_training_eval(fen, move_text(m));
		}
		save_game_debounced();

		if (gemini_live_session && recording) {
			const last = history[history.length - 1] ?? '';
			pending_board_context = `fen:${fen} last_move:${last} turn:${turn}`;
		}
	}

	function onGameOver(e: CustomEvent<{ reason: string; result: number }>) {
		gameOver = true;
		const { reason, result } = e.detail;
		if (result === 1) resultMsg = 'White wins!';
		else if (result === 0) resultMsg = 'Black wins!';
		else resultMsg = `Draw (${reason})`;
	}

	function resetGame() {
		if (!chessRef) return;
		chessRef.reset();
		resultMsg = '';
		gameOver = false;
		moveNum = 0;
		turn = 'w';
		inCheck = false;
		hideHints(true);
		history = [];
		last_user_move = '';
		last_ai_move = '';
		redo_stack = [];
		clearChat();
	}

	function undoMove() {
		if (!chessRef) return;
		redo_stack.push(fen);
		if (moveNum >= 2) {
			chessRef.undo();
			chessRef.undo();
			moveNum = Math.max(0, moveNum - 2);
		} else if (moveNum === 1) {
			chessRef.undo();
			moveNum = 0;
			turn = 'w';
		}
		gameOver = false;
		resultMsg = '';
		sync_chat_moves();
		hideHints(true);
	}

	function redoMove() {
		if (!chessRef || !redo_stack.length) return;
		const f = redo_stack.pop()!;
		chessRef.load(f);
		sync_chat_moves();
		hideHints(true);
	}

	function flipColor() {
		if (!chessRef) return;
		chessRef.toggleOrientation();
		const cur = engine?.getColor();
		if (cur && cur !== 'none') {
			const new_color = cur === 'b' ? 'w' : 'b';
			engine.setColor(new_color);
			if (new_color === turn) chessRef.playEngineMove();
		}
	}

	function go_back_board() {
		if (!chessRef || board_history_idx <= 0) return;
		board_history_idx--;
		const f = board_history[board_history_idx];
		fen = f;
		chessRef.load(f);
		history = [];
		moveNum = 0;
		gameOver = false;
		resultMsg = '';
		hideHints(true);
		last_user_move = '';
		last_ai_move = '';
		redo_stack = [];
	}

	function go_forward_board() {
		if (!chessRef || board_history_idx >= board_history.length - 1) return;
		board_history_idx++;
		const f = board_history[board_history_idx];
		fen = f;
		chessRef.load(f);
		history = [];
		moveNum = 0;
		gameOver = false;
		resultMsg = '';
		hideHints(true);
		last_user_move = '';
		last_ai_move = '';
		redo_stack = [];
	}

	async function showHint() {
		if (hint_loading) return;
		if (gameOver) return;
		if (can_reuse_hints(hints, hint_fen, fen)) {
			show_hints = true;
			return;
		}
		hint_loading = true;
		show_hints = true;
		if (hint_ac) hint_ac.abort();
		hint_ac = new AbortController();
		const sig = hint_ac.signal;
		try {
			hints = await getHints(fen, 1, undefined, sig, undefined, hint_think_time * 1000);
			if (sig.aborted) return;
			hint_fen = fen;
			console.log('hints:', hints);
			hint_index = 0;
			if (autoexplain) explainHint();
		} catch (e) {
			if ((e as Error)?.name === 'AbortError') return;
			console.error('getHints failed:', e);
			hints = [];
			hint_fen = '';
		} finally {
			hint_loading = false;
			hint_ac = null;
		}
	}

	function nextHint() {
		if (hint_index < hints.length - 1) hint_index++;
	}

	function prevHint() {
		if (hint_index > 0) hint_index--;
	}

	function hideHints(clear = false) {
		show_hints = false;
		hint_loading = false;
		if (hint_ac) { hint_ac.abort(); hint_ac = null; }
		if (clear) {
			hints = [];
			hint_fen = '';
			hint_index = 0;
		}
	}

	async function send_chess_chat(user_msg: string, h = '', clear = false) {
		const d = build_chat_data(h);
		chat_messages = [...chat_messages, { role: 'user', content: user_msg, d }];
		if (clear) chat_input = '';
		await execute_chat();
		if (voice_tts) {
			voice_tts = false;
			const last = chat_messages.at(-1);
			if (last?.role === 'assistant' && last.content) speak(last.content);
		}
		processQueue();
	}

	async function execute_chat() {
		const sent_context = current_chat_context();
		chat_loading = true;
		const ac = new AbortController();
		chat_abort = ac;

		try {
			if (!model.startsWith('deepseek/') && !model.startsWith('bynara/') && groq_api_key.trim() && model.includes('/')) {
				await send_direct_generation(ac, [{ role: 'system', content: current_sys } as ChatMsg, ...chat_messages], model);
				interaction_id = '';
			} else {
				const res = await fetch('/chess/learn/chat', {
					method: 'POST',
					body: JSON.stringify({
						x: [{ r: 'system', c: current_sys }, ...chat_messages.map((msg) => ({ r: msg.role, c: msg.content, d: msg.d }))],
						i: interaction_id,
						m: model,
					}),
					signal: ac.signal,
				});
				if (!res.ok) {
					const err_body = await res.json().catch(() => ({ error: 'Request failed' }));
					throw Error(err_body.error || 'Request failed');
				}
			if (!(await read_chat_stream(res))) throw Error('Request failed');
			}
			successful_context = sent_context;
		save_game_debounced();
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			console.error('[chat] error:', e);
			const last = chat_messages[chat_messages.length - 1];
			if (last?.role === 'assistant') {
				chat_messages[chat_messages.length - 1] = { ...last, content: last.content + '\nError: ' + (e instanceof Error ? e.message : String(e)) };
				chat_messages = chat_messages;
			} else {
				chat_messages = [...chat_messages, { role: 'assistant', content: 'Error: ' + (e instanceof Error ? e.message : String(e)) }];
			}
		} finally {
			chat_loading = false;
			chat_abort = null;
		}
	}

	function processQueue() {
		if (chat_queue.length > 0) {
			const [next, ...rest] = chat_queue;
			chat_queue = rest;
			if (next.voice) voice_tts = true;
			send_chess_chat(next.text, next.hint ?? '', true);
		}
	}

	function removeFromQueue(i: number) {
		chat_queue = chat_queue.filter((_, idx) => idx !== i);
	}

	async function promoteFromQueue(i: number) {
		const item = chat_queue[i];
		if (!item) return;
		chat_queue = chat_queue.filter((_, idx) => idx !== i);
		if (chat_abort) {
			chat_abort.abort();
			chat_abort = null;
		}
		const last = chat_messages[chat_messages.length - 1];
		if (last?.role === 'assistant') {
			if (item.voice) voice_tts = true;
			send_chess_chat(item.text, item.hint ?? '', true);
		} else {
			interaction_id = '';
			chat_messages = [...chat_messages, { role: 'user', content: item.text, d: build_chat_data(item.hint) }];
			await execute_chat();
			if (item.voice) {
				const ll = chat_messages.at(-1);
				if (ll?.role === 'assistant' && ll.content) speak(ll.content);
			}
		}
	}

	async function explainHint() {
		if (!hints[hint_index]) return;
		const h = hints[hint_index];
		const san = uciToSan(fen, h.move);
		const score_str = fmtScore(h.score);
		const msg = `why ${san}`;
		const hint_data = `${san} (${h.move}), eval ${score_str}, depth ${h.depth}`;
		if (chat_loading) {
			chat_queue = [...chat_queue, { text: msg, hint: hint_data }];
			return;
		}
		await send_chess_chat(msg, hint_data);
	}

	function stopChat() {
		if (chat_abort) {
			chat_abort.abort();
			chat_abort = null;
			chat_loading = false;
		}
	}

	async function toggleGeminiLive() {
		const log = (msg: string) => console.log(`[gemini-live] ${msg}`);
		if (gemini_live_session) {
			cleanup_gemini_live();
			return;
		}
		try {
			log('connecting...');
			add_toast('Connecting voice...');
			const res = await fetch('/api/voice/gemini-live/key');
			const { k: key } = await res.json();
			if (!key) throw Error('No API key available');
			log('got API key');

			log('triggering Stockfish eval for voice session...');
			await get_training_eval(fen, last_user_move);
			log(`post-eval: last_eval length=${last_eval.length}, has_eval=${!!last_eval}`);

			init_tool_state({
				get_fen: () => fen,
				get_eval: () => last_eval,
				get_board_state: () => ({
					fen,
					turn,
					in_check: inCheck,
					game_over: gameOver,
					result: resultMsg,
					move_count: moveNum,
					last_user_move,
					last_ai_move,
					orientation,
					captured,
					history_index: board_history_idx,
					history_length: board_history.length,
				}),
				set_fen: (f) => {
					log(`set_fen called with fen=${f.slice(0, 40)}`);
					if (chessRef) chessRef.load(f);
					fen = f;
					history = [];
					moveNum = 0;
					gameOver = false;
					resultMsg = '';
					hideHints(true);
					last_user_move = '';
					last_ai_move = '';
					redo_stack = [];
					board_history = [...board_history.slice(0, board_history_idx + 1), f];
					board_history_idx = board_history.length - 1;
					pushState('', { fen: f });
				},
				make_move: (uci) => {
					if (!chessRef) return { valid: false, uci, error: 'Board not initialized.' };
					if (gameOver) return { valid: false, uci, error: 'Game is already over.' };
					if (!r && turn === 'b') return { valid: false, uci, error: 'Can only move your pieces in this mode.' };
					try {
						const from = uci.slice(0, 2);
						const to = uci.slice(2, 4);
						const promotion = uci.charAt(4) || undefined;
						chessRef.move({ from, to, promotion });
						return {
							valid: true,
							uci,
							san: history[history.length - 1] ?? uci,
							fen,
							turn,
							in_check: inCheck,
							game_over: gameOver,
						};
					} catch (e) {
						return { valid: false, uci, error: e instanceof Error ? e.message : 'Illegal move.' };
					}
				},
				undo_move: () => {
					if (!chessRef || moveNum === 0) return { valid: false, error: 'No moves to undo.' };
					undoMove();
					return { valid: true };
				},
				redo_move: () => {
					if (!chessRef || !redo_stack.length) return { valid: false, error: 'No moves to redo.' };
					redoMove();
					return { valid: true };
				},
				reset_board: () => {
					if (!chessRef) return { valid: false, error: 'Board not initialized.' };
					resetGame();
					return { valid: true };
				},
				toggle_train_mode: () => {
					r = !r;
					if (engine) {
						if (engine.isSearching()) engine.stopSearch();
						engine.setColor(r ? 'none' : 'b');
					}
					return { train_mode: r };
				},
			});

			const devices = await navigator.mediaDevices.enumerateDevices();
			const audio_inputs = devices.filter(d => d.kind === 'audioinput');
			log(`${audio_inputs.length} audio input(s) found: ${audio_inputs.map(d => d.label || d.deviceId.slice(0, 16)).join(', ')}`);
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			gemini_live_mic_stream = stream;
			const audioCtx = new AudioContext();
			gemini_live_audio_ctx = audioCtx;
			const micSource = audioCtx.createMediaStreamSource(stream);
			const processor = audioCtx.createScriptProcessor(2048, 1, 1);
			processor.onaudioprocess = gemini_process_audio;
			micSource.connect(processor);
			const micGain = audioCtx.createGain();
			micGain.gain.value = 0;
			processor.connect(micGain);
			micGain.connect(audioCtx.destination);
			gemini_live_processor = processor;

			const ctx = current_chat_context();
			const has_eval_ctx = !!ctx.e;
			log(`system prompt: fen=${ctx.f.slice(0, 40)} has_move_history=${!!ctx.p} has_eval=${has_eval_ctx} eval_preview=${has_eval_ctx ? ctx.e!.slice(0, 80) : 'none'}`);
			const sys = `${current_sys}
Your name is ${voice_name}.

Current board state:
fen: ${ctx.f}
move_history: ${ctx.p || 'none'}
last_user_move: ${ctx.u || 'none'}
last_ai_move: ${ctx.a || 'none'}
${ctx.e ? `evaluation: ${ctx.e}` : ''}`;

			const { GoogleGenAI } = await import('@google/genai');
			const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1alpha' } });
			log('connecting to Gemini Live WebSocket...');
			const session = await ai.live.connect({
				model: 'gemini-3.1-flash-live-preview',
				callbacks: {
				onopen: () => { log('WebSocket opened'); recording = true; add_toast('Voice connected'); },
				onmessage: (msg: any) => gemini_live_handle(msg),
				onerror: (e: any) => { console.error('[gemini-live] WS error', e); add_toast('Voice connection error: ' + (e?.message || e)); },
				onclose: (e: any) => { log(`WS close code=${e?.code} reason=${e?.reason}`); cleanup_gemini_live(); },
				},
				config: {
					responseModalities: ['AUDIO'] as any,
					speechConfig: {
						voiceConfig: {
							prebuiltVoiceConfig: {
								voiceName: voice_name,
							},
						},
					} as any,
					systemInstruction: { parts: [{ text: sys }] } as any,
					tools: get_tool_declarations() as any,
					inputAudioTranscription: { enabled: true } as any,
				},
			});
			gemini_live_session = session;
			log('session established');
		} catch (e) {
			console.error('[gemini-live] setup error', e);
			if (e instanceof DOMException && e.name === 'NotFoundError') {
				try {
					const devices = await navigator.mediaDevices.enumerateDevices();
					const audio_inputs = devices.filter(d => d.kind === 'audioinput');
					console.warn(`[gemini-live] audio devices: ${audio_inputs.length} found`, audio_inputs.map(d => ({ label: d.label, id: d.deviceId.slice(0, 16), group: d.groupId.slice(0, 16) })));
					add_toast(audio_inputs.length === 0
						? 'No microphone detected. Plug one in, then refresh the page.'
						: `Mic found (${audio_inputs.length} device(s)) but couldn\'t access it. It may be in use by another app.`);
				} catch {
					add_toast('No microphone found. Connect a mic and refresh.');
				}
			} else {
				add_toast('Voice setup error: ' + (e instanceof Error ? e.message : String(e)));
			}
			cleanup_gemini_live();
		}
	}

	function gemini_process_audio(e: AudioProcessingEvent) {
		const s = gemini_live_session;
		if (!s || !recording) return;
		if (pending_board_context) {
			try { s.sendRealtimeInput({ text: pending_board_context }); } catch {}
			pending_board_context = null;
		}
		const input = e.inputBuffer.getChannelData(0);
		const nativeRate = gemini_live_audio_ctx?.sampleRate || 48000;
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
			s.sendRealtimeInput({ audio: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } });
		} catch {}
	}

	function play_next_audio() {
		if (!gemini_live_audio_ctx || gemini_live_audio_playing || gemini_live_audio_queue.length === 0) return;
		gemini_live_audio_playing = true;
		const buffer = gemini_live_audio_queue[0];
		gemini_live_audio_queue = gemini_live_audio_queue.slice(1);
		const source = gemini_live_audio_ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(gemini_live_audio_ctx.destination);
		source.onended = () => {
			gemini_live_audio_playing = false;
			play_next_audio();
		};
		source.start();
	}

	function gemini_live_handle(msg: any) {
		if (msg.toolCall?.functionCalls?.length) {
			console.log(`[gemini-live] received ${msg.toolCall.functionCalls.length} tool call(s)`, msg.toolCall.functionCalls.map((f: any) => f.name).join(', '));
			for (const fc of msg.toolCall.functionCalls) {
				console.log(`[gemini-live] dispatching tool: "${fc.name}" id=${fc.id ?? 'none'}`);
				dispatch_tool_call(fc).then((r) => {
					console.log(`[gemini-live] tool response for "${fc.name}":`, JSON.stringify(r).slice(0, 300));
					gemini_live_session?.sendToolResponse({ functionResponses: [r] } as any);
				}).catch((err) => {
					console.error(`[gemini-live] dispatch_tool_call ERROR for "${fc.name}":`, err);
				});
			}
		}
		if (msg.serverContent?.modelTurn?.parts) {
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
						if (!gemini_live_audio_ctx) return;
						const buffer = gemini_live_audio_ctx.createBuffer(1, float32.length, 24000);
						buffer.getChannelData(0).set(float32);
						gemini_live_audio_queue = [...gemini_live_audio_queue, buffer];
						play_next_audio();
					} catch {}
				}
			}
		}
		if (msg.serverContent?.interrupted) {
			gemini_live_audio_queue = [];
			gemini_live_audio_playing = false;
		}
	}

	function clearChat() {
		chat_messages = [];
		chat_queue = [];
		chat_loading = false;
		interaction_id = '';
		successful_context = {};
		total_p = 0;
		total_c = 0;
		total_cost = 0;
		last_eval = '';
		if (chat_abort) {
			chat_abort.abort();
			chat_abort = null;
		}
	}

	async function sendChatMessage(text: string) {
		if (!text.trim()) return;
		const t = text.trim();
		chat_input = '';
		if (chat_input_ref) chat_input_ref.style.height = 'auto';
		if (chat_loading) {
			chat_queue = [...chat_queue, { text: t }];
			return;
		}
		if (r && !last_eval && browser) {
			await get_training_eval(fen, last_user_move);
		}
		await send_chess_chat(t, '', true);
	}

	function handle_selection() {
		if (!chat_body) return;
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || !sel.rangeCount) {
			sel_text = '';
			sel_pos = null;
			return;
		}
		const range = sel.getRangeAt(0);
		if (!chat_body.contains(range.commonAncestorContainer)) {
			sel_text = '';
			sel_pos = null;
			return;
		}
		const text = sel.toString().trim();
		if (!text) {
			sel_text = '';
			sel_pos = null;
			return;
		}
		const rect = range.getBoundingClientRect();
		const body_rect = chat_body.getBoundingClientRect();
		sel_text = text;
		sel_pos = {
			x: rect.left + rect.width / 2 - body_rect.left,
			y: rect.top - body_rect.top - 8
		};
	}

	function append_selection() {
		if (!sel_text) return;
		const sep = chat_input.trim() ? ' ' : '';
		chat_input = chat_input + sep + sel_text;
		sel_text = '';
		sel_pos = null;
		window.getSelection()?.removeAllRanges();
		chat_input_ref?.focus();
	}

	$effect(() => {
		if (!browser) return;
		document.addEventListener('selectionchange', handle_selection);
		return () => document.removeEventListener('selectionchange', handle_selection);
	});
</script>

<Seo meta={{t:'Chess — Train with AI',d:'Train your chess skills against adaptive Stockfish AI. Get hints, analyze positions, and chat with AI coaches to improve your game.'}} />
<JsonLd data={{'@context':'https://schema.org','@type':'SoftwareApplication','name':'Chess AI','applicationCategory':'GameApplication','operatingSystem':'Web','description':'Play chess against Stockfish AI with interactive hints and AI analysis','offers':{'@type':'Offer','price':'0','priceCurrency':'USD'}}} />
<main class="page-shell" style="background: url(/cosmic-chess-bg.webp) center/cover fixed; position: relative;">
	<div class="absolute inset-0 bg-surface-dark/85"></div>
	{#if dev && toasts.length}
		<div class="fixed left-1/2 top-4 z-[99] flex -translate-x-1/2 flex-col items-center gap-2">
			{#each toasts as t (t.id)}
				<div class="rounded-lg px-4 py-2 text-sm text-white shadow-lg" style="background:var(--error)">{t.msg}</div>
			{/each}
		</div>
	{/if}
	<div class="container relative z-[1] py-4">
		<div class="mx-auto flex w-full max-w-[1328px] flex-col gap-4">
			<div class="mx-auto w-full max-w-[640px] space-y-2 text-center">
				<h1 class="display-sm text-on-dark">Chess — Train</h1>
				<p class="text-sm text-on-dark/70">Play, learn, and analyze with every move.</p>
			</div>

			<div class="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,640px)_minmax(0,640px)] lg:items-start lg:justify-center">
			<div class="relative mx-auto w-full max-w-[640px] lg:mx-0">
			{#key computer_think_time}
				<Chess
					class="cg-default-style board-themed"
					bind:this={chessRef}
					bind:fen
					bind:orientation
					engine={engine as any}
					bind:turn
					bind:moveNumber={moveNum}
					bind:history
					bind:inCheck
					bind:isGameOver={gameOver}
					on:ready={onReady}
					on:move={onMove}
					on:gameOver={onGameOver}
				/>
			{/key}
			{#if show_hints && !hint_loading && hint_highlights.length}
				<div class="pointer-events-none absolute inset-0 z-10 grid grid-cols-8 grid-rows-8">
					{#each hint_highlights as square (square.k)}
						<div
							class={'pointer-events-none motion-safe:animate-hint-pulse size-[2.7rem] rounded-full place-self-center ' + square.r + ' ' + square.c + ' ' + (square.k === 'f' ? hint_from_class : hint_to_class)}
							data-testid={square.k === 'f' ? 'hint-square-from' : 'hint-square-to'}
							role="img"
							aria-label={`Hint ${square.l} square ${square.s}`}
						></div>
					{/each}
				</div>
			{/if}
			</div>

			<div class="mx-auto w-full max-w-[640px] space-y-2 rounded-xl bg-surface-card p-3 lg:mx-0">
				{#if captured.w.length > 0 || captured.b.length > 0}
					<div class="flex items-center justify-between gap-2 text-sm">
						<div class="flex items-center gap-0.5">
							{#each captured.w as p}
								<span class="text-sm opacity-70">{'♔♕♖♗♘♙'['KQRBNP'.indexOf(p.toUpperCase())] || p}</span>
							{/each}
						</div>
						<div class="flex items-center gap-0.5">
							{#each captured.b as p}
								<span class="text-sm opacity-70">{'♚♛♜♝♞♟'['kqrbnp'.indexOf(p)] || p}</span>
							{/each}
						</div>
					</div>
				{/if}
				<div class="flex items-center gap-1.5" data-testid="learn-status-toolbar">
					<span class="mr-1 rounded-full px-2 py-1 text-[11px] font-medium {turn === 'b' && !gameOver ? 'bg-primary text-white motion-safe:animate-opponent-thinking' : 'bg-canvas text-muted'}">
						{turn === 'w' ? 'White' : 'Black'}
					</span>
					{#if inCheck}
						<span class="mr-1 text-[11px] font-medium text-error">Check!</span>
					{/if}
					{#if gameOver}
						<span class="mr-1 text-[11px] font-medium text-primary">{resultMsg}</span>
					{/if}
					{#if !ready}
						<span class="mr-1 text-[11px] font-medium text-amber animate-pulse">Loading...</span>
					{/if}
					<button title="New game" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={resetGame} disabled={!ready}>
						<RefreshIcon size={15} strokeWidth={1.8} />
					</button>
					<button title="Undo move" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={undoMove} disabled={!ready || moveNum === 0 || gameOver}>
						<UndoIcon size={15} strokeWidth={1.8} />
					</button>
					<button title="Redo move" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={redoMove} disabled={!ready || !redo_stack.length}>
						<RedoIcon size={15} strokeWidth={1.8} />
					</button>
					<button title="Flip board" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary" onclick={() => chessRef?.toggleOrientation()}>
						<span style="display:inline-flex;transform:scaleX(-1)"><FlipIcon size={15} strokeWidth={1.8} /></span>
					</button>
					<button title="Switch sides" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary" onclick={flipColor}>
						<FlipIcon size={15} strokeWidth={1.8} />
					</button>
					{#if show_hints}
						<button title="Hide hints" class="grid size-8 place-items-center rounded-full bg-primary text-white transition-colors disabled:bg-primary-disabled disabled:text-muted {hint_loading ? 'motion-safe:animate-hint-loading' : ''}" onclick={() => hideHints()} aria-busy={hint_loading}>
							<BulbIcon size={15} strokeWidth={1.8} />
						</button>
					{:else}
						<button title="Show hint" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={showHint} disabled={!ready || gameOver || hint_loading}>
							<BulbIcon size={15} strokeWidth={1.8} />
						</button>
					{/if}
					<span class="ml-auto flex items-center gap-1.5">
						<button title="Token usage" class="grid size-8 place-items-center rounded-full bg-canvas text-muted transition-colors hover:text-primary" onclick={() => show_token_modal = true}>
							<InfoIcon size={13} strokeWidth={1.8} />
						</button>
						{#if chat_messages.length > 0}
							<button title="Clear chat" class="grid size-8 place-items-center rounded-full bg-canvas text-muted transition-colors hover:text-primary" onclick={clearChat}>
								<XIcon size={13} strokeWidth={1.8} />
							</button>
						{/if}
						<button title="Settings" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary" onclick={() => show_settings = true}>
							<GearIcon size={15} strokeWidth={1.8} />
						</button>
					</span>
				</div>
				<div class="flex items-center gap-1.5">
					<button title="Previous board" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={go_back_board} disabled={board_history_idx <= 0}>
						<ArrowLeftIcon size={15} strokeWidth={1.8} />
					</button>
					<button title="Next board" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={go_forward_board} disabled={board_history_idx >= board_history.length - 1}>
						<ArrowRightIcon size={15} strokeWidth={1.8} />
					</button>
					{#if show_hints && !hint_loading && hints.length > 0}
						<span class="ml-2 rounded-full bg-primary px-2 py-1 text-[11px] font-medium text-white">{uciToSan(fen, hints[hint_index].move)}</span>
						<button title="Explain hint" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted {chat_loading ? 'motion-safe:animate-hint-loading' : ''}" onclick={explainHint}>
							<span class="text-[11px]">?</span>
						</button>
					{/if}
				</div>
				<div class="w-full rounded-xl bg-surface-card/72 overflow-hidden">
					<div bind:this={chat_body} class="relative max-h-80 overflow-y-auto px-4 py-3 space-y-3">
						{#if chat_messages.length === 0}
							<p class="text-sm text-muted text-center py-6">No messages yet</p>
						{/if}
						{#each chat_messages as msg, i (i)}
							<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
								{#if msg.role === 'assistant'}
								<div class="max-w-[85%] bg-canvas text-body rounded-[4px_16px_16px_16px] px-3.5 py-2.5 text-sm leading-relaxed text-left">
									{@html marked.parse(msg.content)}
									{#if msg.u}
										<span class="mt-1.5 block text-[10px] text-muted/60">₦{(msg.u.cost * NGN_USD).toFixed(2)}</span>
									{/if}
								</div>
								{:else}
								<div class="max-w-[85%] bg-primary text-white rounded-[16px_4px_16px_16px] px-3.5 py-2.5 text-sm leading-relaxed {i === pending_user_idx ? 'motion-safe:animate-chat-loading' : ''}">
									{msg.content}
								</div>
								{/if}
							</div>
						{/each}
						{#each chat_queue as q_msg, i (i)}
							<div class="flex justify-end">
								<div class="max-w-[85%] bg-primary/30 text-white rounded-[16px_4px_16px_16px] px-3.5 py-2.5 text-sm leading-relaxed flex items-center gap-2">
									<span>{q_msg.text}</span>
									<button title="Send this message now" onclick={() => promoteFromQueue(i)} class="shrink-0 grid place-items-center">
										<ArrowUpIcon size={12} strokeWidth={2} />
									</button>
									<button title="Remove queued message" onclick={() => removeFromQueue(i)} class="shrink-0 grid place-items-center">
										<XIcon size={12} strokeWidth={2} />
									</button>
								</div>
							</div>
						{/each}
						{#if sel_text && sel_pos}
							<button title="Append selected text to message"
								onclick={append_selection}
								style="left:{sel_pos.x}px;top:{sel_pos.y}px"
								class="absolute z-50 -translate-x-1/2 -translate-y-full grid size-6 place-items-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
							>
								<PlusIcon size={14} strokeWidth={2.5} />
							</button>
						{/if}
					</div>
					{#if chat_suggestions.length > 0}
						<div class="flex flex-wrap items-center gap-1.5 px-3 pb-1">
							{#each chat_suggestions as s}
								<button onclick={() => sendChatMessage(s)} class="rounded-full border border-hairline bg-canvas px-3 py-1 text-xs text-muted transition-colors hover:border-primary/40 hover:text-ink">{s}</button>
							{/each}
						</div>
					{/if}
					<div class="flex items-center gap-2 p-3">
						<textarea
							rows={1}
							bind:this={chat_input_ref}
							bind:value={chat_input}
							onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(chat_input); } }}
							oninput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
							placeholder="Ask about the position..."
							class="flex-1 min-h-[40px] max-h-32 bg-canvas text-ink px-3.5 py-2.5 text-sm outline-none border-none rounded-lg resize-none overflow-y-auto focus:outline-none focus:border-none focus:ring-0"
						></textarea>
						<button title={recording ? 'Stop recording' : 'Voice input'}
							onclick={toggleGeminiLive}
							disabled={typeof navigator === 'undefined' || !navigator.mediaDevices}
							class={'grid size-[40px] shrink-0 place-items-center rounded-lg border !px-0 !min-h-[40px] transition-colors shrink-0 ' + (recording ? 'border-red-400 bg-red-500/10 text-red-400 motion-safe:animate-pulse' : 'border-hairline bg-canvas text-ink hover:border-primary/40')}
						>
							<MicIcon size={16} strokeWidth={1.8} />
						</button>
						<button title="Send"
							onclick={() => sendChatMessage(chat_input)}
							disabled={!chat_loading && !chat_input.trim()}
							class="button-primary !border-0 !px-3 !min-h-[40px] !rounded-lg shrink-0"
						>→</button>
					</div>
				</div>

			</div>
		</div>
	</div>
	</div>
</main>

{#if show_settings}
	<div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm" role="presentation" onkeydown={(e) => e.key === 'Escape' && (show_settings = false)} onclick={() => show_settings = false}>
		<div
			data-testid="learn-settings-modal"
			class="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas text-body shadow-[0_24px_80px_rgba(20,20,19,0.22)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-title"
			tabindex="-1"
			onkeydown={(e) => e.key === 'Escape' && (show_settings = false)}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="shrink-0 border-b border-hairline bg-surface-soft px-6 py-5">
				<p class="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-primary">Preferences</p>
				<h2 id="settings-title" class="font-display text-2xl font-medium text-ink">Settings</h2>
			</div>
			<div class="grid min-h-0 gap-3 overflow-y-auto p-6">
				<section class="grid gap-3 rounded-lg bg-surface-card p-4" data-testid="settings-difficulty">
					<div class="flex items-center justify-between gap-3">
						<h3 class="text-sm font-medium text-ink">Computer think time (seconds)</h3>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-xs text-muted">Fast</span>
						<StepperInput bind:value={computer_think_time} min={0.5} step={0.5} />
						<span class="text-xs text-muted">Deep</span>
					</div>
				</section>
				<section class="grid gap-2 rounded-lg bg-surface-card p-4" data-testid="settings-hint-think-time">
					<div class="flex items-center justify-between gap-3">
						<h3 class="text-sm font-medium text-ink">Hint think time (seconds)</h3>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-xs text-muted">Quick</span>
						<StepperInput bind:value={hint_think_time} min={1} step={0.5} />
						<span class="text-xs text-muted">Deep</span>
					</div>
				</section>
				<section class="relative grid gap-2 rounded-lg bg-surface-card p-4">
					<h3 class="text-sm font-medium text-ink" id="model-label">Analysis model</h3>
					<button
						type="button"
						class="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-left text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
						role="combobox"
						aria-labelledby="model-label"
						aria-haspopup="listbox"
						aria-controls="model-listbox"
						aria-expanded={show_model_menu}
						onclick={() => show_model_menu = !show_model_menu}
						onkeydown={(e) => { if (e.key === 'Escape') show_model_menu = false; }}
					>
						<span>
							<span class="block font-medium">{model_options.find((o) => o.v === model)?.l ?? model}</span>
							<span class="mt-0.5 flex items-center gap-1.5 text-xs text-muted">{(model_options.find((o) => o.v === model)?.d) ?? 'Custom model'}{#if model_options.find((o) => o.v === model)?.r}<span class="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">Recommended</span>{/if}</span>
						</span>
						<span class="text-primary">⌄</span>
					</button>
					{#if show_model_menu}
						<div id="model-listbox" class="absolute left-4 right-4 top-[calc(100%-10px)] z-10 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-[0_16px_48px_rgba(20,20,19,0.16)]" role="listbox" aria-labelledby="model-label">
							{#each model_options as option (option.v)}
								<button
									type="button"
									class={option.v === model ? 'grid w-full gap-0.5 bg-surface-soft px-3.5 py-2.5 text-left text-sm text-ink' : 'grid w-full gap-0.5 px-3.5 py-2.5 text-left text-sm text-muted hover:bg-surface-soft hover:text-ink'}
									role="option"
									aria-selected={option.v === model}
									onclick={() => { model = option.v; show_model_menu = false; }}
								>
									<span class="font-medium">{option.l}</span>
									<span class="flex items-center gap-1.5 text-xs text-muted">{option.d}{#if option.r}<span class="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">Recommended</span>{/if}</span>
								</button>
							{/each}
						</div>
					{/if}
				</section>
				<section class="grid gap-2 rounded-lg bg-surface-card p-4">
					<label class="text-sm font-medium text-ink" for="groq-api-key">Groq API key</label>
					<input
						id="groq-api-key"
						type="password"
						bind:value={groq_api_key}
						placeholder="gsk_..."
						class="min-h-[40px] w-full rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
					/>
					<p class="text-xs leading-5 text-muted">
						Get your Groq API key @
						<a class="text-primary underline-offset-2 hover:underline" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">https://console.groq.com/keys</a>
					</p>
				</section>
				<section class="relative grid gap-2 rounded-lg bg-surface-card p-4">
					<h3 class="text-sm font-medium text-ink" id="voice-label">Gemini Live voice</h3>
					<button
						type="button"
						class="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-left text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
						role="combobox"
						aria-labelledby="voice-label"
						aria-haspopup="listbox"
						aria-controls="voice-listbox"
						aria-expanded={show_voice_menu}
						onclick={() => show_voice_menu = !show_voice_menu}
						onkeydown={(e) => { if (e.key === 'Escape') show_voice_menu = false; }}
					>
						<span>
							<span class="block font-medium">{voice_options.find((o) => o.v === voice_name)?.l ?? voice_name}</span>
							<span class="mt-0.5 flex items-center gap-1.5 text-xs text-muted">{(voice_options.find((o) => o.v === voice_name)?.d) ?? ''}</span>
						</span>
						<span class="text-primary">⌄</span>
					</button>
					{#if show_voice_menu}
						<div id="voice-listbox" class="absolute left-4 right-4 top-[calc(100%-10px)] z-10 max-h-60 overflow-y-auto rounded-lg border border-hairline bg-canvas shadow-[0_16px_48px_rgba(20,20,19,0.16)]" role="listbox" aria-labelledby="voice-label">
							{#each voice_options as option (option.v)}
								<button
									type="button"
									class={option.v === voice_name ? 'grid w-full gap-0.5 bg-surface-soft px-3.5 py-2.5 text-left text-sm text-ink' : 'grid w-full gap-0.5 px-3.5 py-2.5 text-left text-sm text-muted hover:bg-surface-soft hover:text-ink'}
									role="option"
									aria-selected={option.v === voice_name}
									onclick={() => { voice_name = option.v; show_voice_menu = false; }}
								>
									<span class="font-medium">{option.l}</span>
									<span class="text-xs text-muted">{option.d}</span>
								</button>
							{/each}
						</div>
					{/if}
				</section>
				<section class="rounded-lg border border-hairline bg-canvas p-4">
					<label class="flex cursor-pointer items-center justify-between gap-4">
						<span>
							<span class="block text-sm font-medium text-ink">Auto-explain hint</span>
							<span class="mt-1 block text-xs leading-5 text-muted">Start analysis when a hint appears.</span>
						</span>
						<span class="grid size-5 place-items-center rounded-full border border-primary">
							<input type="checkbox" bind:checked={autoexplain} class="sr-only" aria-label="Auto-explain hint" />
							<span class={autoexplain ? 'size-3 rounded-full bg-primary' : 'size-3 rounded-full bg-transparent'}></span>
						</span>
					</label>
				</section>
				<section class="rounded-lg border border-hairline bg-canvas p-4">
					<label class="flex cursor-pointer items-center justify-between gap-4">
						<span>
							<span class="block text-sm font-medium text-ink">Auto hint</span>
							<span class="mt-1 block text-xs leading-5 text-muted">Get a hint after the computer moves.</span>
						</span>
						<span class="grid size-5 place-items-center rounded-full border border-primary">
							<input type="checkbox" bind:checked={auto_hint} class="sr-only" aria-label="Auto hint" />
							<span class={auto_hint ? 'size-3 rounded-full bg-primary' : 'size-3 rounded-full bg-transparent'}></span>
						</span>
					</label>
				</section>
				<section class="rounded-lg border border-hairline bg-canvas p-4">
					<label class="flex cursor-pointer items-center justify-between gap-4">
						<span>
							<span class="block text-sm font-medium text-ink">Hint on start</span>
							<span class="mt-1 block text-xs leading-5 text-muted">Get a hint when this page opens.</span>
						</span>
						<span class="grid size-5 place-items-center rounded-full border border-primary">
							<input type="checkbox" bind:checked={hint_on_start} class="sr-only" aria-label="Hint on start" />
							<span class={hint_on_start ? 'size-3 rounded-full bg-primary' : 'size-3 rounded-full bg-transparent'}></span>
						</span>
					</label>
				</section>
			</div>
			<div class="shrink-0 grid grid-cols-2 gap-3 border-t border-hairline bg-surface-soft px-6 py-4">
				<button class="button-secondary" onclick={() => show_settings = false}>Cancel</button>
				<button class="button-primary" onclick={() => show_settings = false}>Done</button>
			</div>
		</div>
	</div>
{/if}

{#if show_token_modal}
	<div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm" role="presentation" onkeydown={(e) => e.key === 'Escape' && (show_token_modal = false)} onclick={() => show_token_modal = false}>
		<div class="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas text-body shadow-[0_24px_80px_rgba(20,20,19,0.22)]" role="dialog" aria-modal="true" aria-labelledby="bal-title" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (show_token_modal = false)} onclick={(e) => e.stopPropagation()}>
			<div class="shrink-0 border-b border-hairline bg-surface-soft px-6 py-5">
				<p class="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-primary">Usage</p>
				<h2 id="bal-title" class="font-display text-2xl font-medium text-ink">Usage</h2>
			</div>
			<div class="grid gap-4 p-6">
				{#if total_cost > 0}
					<div class="rounded-lg bg-surface-card p-4">
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted">Cost (NGN)</span>
							<span class="font-medium text-primary">₦{(total_cost * NGN_USD).toFixed(2)}</span>
						</div>
					</div>
				{:else}
					<p class="text-sm text-muted text-center py-6">No usage yet.</p>
				{/if}
			</div>
			<div class="shrink-0 flex justify-end border-t border-hairline bg-surface-soft px-6 py-4">
				<button class="button-primary" onclick={() => show_token_modal = false}>Close</button>
			</div>
		</div>
	</div>
{/if}
