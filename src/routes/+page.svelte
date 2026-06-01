<script lang="ts">
	import { Chess } from 'svelte-chess';
	import { Chess as ChessJS } from 'chess.js';
	import { marked } from 'marked';
	import { browser } from '$app/environment';
	import { LearnEngine, DIFFICULTY_PRESETS, getHints } from '$lib/util/chess/engine';
	import type { Color, Hint } from '$lib/util/chess/engine';
	import { can_reuse_hints, hint_squares } from '$lib/util/chess/hint_highlight';
	import { Lightbulb, RotateCcw, Settings, Square, Undo2, X } from '@lucide/svelte';

	type ChatContext = { f: string; p: string; u: string; a: string };
	type ChatData = Partial<ChatContext> & { h?: string };
	type ChatMsg = { role: 'user' | 'assistant'; content: string; d?: ChatData };

	const sys = 'You are a concise chess coach. Use the supplied board context when present.';

	let level = $state(3);
	let turn = $state<Color>('w');
	let orientation = $state<Color>('w');
	let moveNum = $state(0);
	let history = $state<string[]>([]);
	let fen = $state('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
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
	let chat_queue = $state<string[]>([]);
	let interaction_id = $state('');
	let last_user_move = $state('');
	let last_ai_move = $state('');
	let successful_context = $state<Partial<ChatContext>>({});

	let model = $state(browser && localStorage.getItem('explain_model') || 'gemma-4-31b-it');
	let autoexplain = $state(browser && localStorage.getItem('autoexplain') !== 'false');
	let auto_hint = $state(browser && localStorage.getItem('auto_hint') === 'true');
	let hint_on_start = $state(browser && localStorage.getItem('hint_on_start') === 'true');
	let gemini_api_key = $state(browser && localStorage.getItem('gemini_api_key') || '');
	let start_hint_done = $state(false);
	let show_settings = $state(false);
	let show_model_menu = $state(false);
	let chat_body = $state<HTMLDivElement | null>(null);
	let chat_input_ref = $state<HTMLInputElement | null>(null);
	$effect(() => { if (browser) localStorage.setItem('explain_model', model); });
	$effect(() => { if (browser) localStorage.setItem('autoexplain', String(autoexplain)); });
	$effect(() => { if (browser) localStorage.setItem('auto_hint', String(auto_hint)); });
	$effect(() => { if (browser) localStorage.setItem('hint_on_start', String(hint_on_start)); });
	$effect(() => { if (browser) localStorage.setItem('gemini_api_key', gemini_api_key); });
	$effect(() => {
		const el = chat_body;
		if (!el) return;
		chat_messages.length, chat_queue.length;
		requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
	});


	const presets = DIFFICULTY_PRESETS;
	const labels = ['Beginner', 'Novice', 'Casual', 'Intermediate', 'Intermediate+', 'Advanced', 'Strong', 'Expert', 'Master', 'Grandmaster'];
	const hint_from_class = 'bg-amber/70';
	const hint_to_class = 'bg-teal/70';
	const model_options = [
		{ v: 'gemma-4-31b-it', l: 'Gemma 4 31B', d: 'Best open model' },
		{ v: 'gemini-3.5-flash', l: 'Gemini 3.5 Flash', d: 'Fast coach' },
	];

	function buildEngine() {
		const p = presets[level - 1];
		return new LearnEngine({ elo: p.elo, depth: p.depth, moveTime: p.moveTime, color: 'b' });
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
		return { f: fen, p: history.join(' '), u: last_user_move, a: last_ai_move };
	}

	function build_chat_data(h = ''): ChatData {
		const c = current_chat_context();
		const d: ChatData = {};
		if (c.f !== successful_context.f) d.f = c.f;
		if (c.p && c.p !== successful_context.p) d.p = c.p;
		if (c.u && c.u !== successful_context.u) d.u = c.u;
		if (c.a && c.a !== successful_context.a) d.a = c.a;
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

	function build_direct_steps(messages: ChatMsg[]) {
		return messages.map((msg) => ({
			type: msg.role === 'assistant' ? 'model_output' : 'user_input',
			content: [{ type: 'text', text: msg.role === 'user' ? build_direct_input(msg) : msg.content }],
		}));
	}

	function direct_parts(v: any): any[] {
		return [
			...(v?.steps ?? []),
			...(v?.outputs ?? []),
		].flatMap((step: any) => step?.content ?? step?.parts ?? []);
	}

	function direct_text(v: any): string {
		return v?.output_text
			?? direct_parts(v)
				.filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
				.map((part: any) => part.text)
				.join('')
			?? '';
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
		if (name === 'error') throw Error(msg.e || 'Request failed');
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

	async function send_direct_interaction(ac: AbortController, request_messages: ChatMsg[], m: string) {
		const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-goog-api-key': gemini_api_key.trim(),
				'Api-Revision': '2026-05-20',
			},
			body: JSON.stringify({
				model: m,
				input: build_direct_steps(request_messages),
				store: false,
				system_instruction: sys,
				generation_config: { thinking_level: 'high' },
			}),
			signal: ac.signal,
		});
		const body = await res.json().catch(() => null);
		if (!res.ok) {
			const err_msg = body?.error?.message || body?.error || 'Request failed';
			console.error('[chat] direct interaction error:', err_msg);
			throw Error(err_msg);
		}
		const t = direct_text(body).trim();
		if (!t) throw Error('Request failed');
		const last = chat_messages[chat_messages.length - 1];
		if (last?.role === 'assistant') {
			chat_messages[chat_messages.length - 1] = { ...last, content: t };
			chat_messages = chat_messages;
		} else {
			chat_messages = [...chat_messages, { role: 'assistant', content: t }];
		}
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
		hideHints(true);
		if (m.color === 'b' && auto_hint) request_hint();
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
		clearChat();
	}

	function undoMove() {
		if (!chessRef) return;
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
			hints = await getHints(fen, 5, undefined, sig);
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
		const sent_context = current_chat_context();
		const request_messages: ChatMsg[] = [...chat_messages, { role: 'user', content: user_msg, d: build_chat_data(h) }];
		chat_messages = request_messages;
		chat_loading = true;
		const ac = new AbortController();
		chat_abort = ac;

		try {
			if (gemini_api_key.trim()) {
				await send_direct_interaction(ac, request_messages, model);
				interaction_id = '';
			} else {
				const res = await fetch('/chess/learn/chat', {
					method: 'POST',
					body: JSON.stringify({
						x: request_messages.map((msg) => ({ r: msg.role, c: msg.content, d: msg.d })),
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
			if (clear) chat_input = '';
			if (chat_queue.length > 0) {
				const [next, ...rest] = chat_queue;
				chat_queue = rest;
				send_chess_chat(next, '', true);
			}
		}
	}

	function removeFromQueue(i: number) {
		chat_queue = chat_queue.filter((_, idx) => idx !== i);
	}

	async function explainHint() {
		if (chat_loading) return;
		if (!hints[hint_index]) return;
		const h = hints[hint_index];
		const san = uciToSan(fen, h.move);
		const score_str = fmtScore(h.score);
		await send_chess_chat(
			`why ${san}`,
			`${san} (${h.move}), eval ${score_str}, depth ${h.depth}`,
		);
	}

	function stopChat() {
		if (chat_abort) {
			chat_abort.abort();
			chat_abort = null;
			chat_loading = false;
		}
	}

	function clearChat() {
		chat_messages = [];
		chat_queue = [];
		chat_loading = false;
		interaction_id = '';
		successful_context = {};
		if (chat_abort) {
			chat_abort.abort();
			chat_abort = null;
		}
	}

	async function sendChatMessage(text: string) {
		if (!text.trim()) return;
		if (chat_loading) {
			chat_queue = [...chat_queue, text.trim()];
			chat_input = '';
			return;
		}
		await send_chess_chat(text.trim(), '', true);
	}
</script>

<main class="page-shell">
	<div class="container py-4">
		<div class="mx-auto flex w-full max-w-[1328px] flex-col gap-4">
			<div class="mx-auto w-full max-w-[640px] space-y-2 text-center">
				<h1 class="display-sm">Chess — Learn</h1>
				<p class="text-muted text-sm">Play against Stockfish. Adjust difficulty to match your level.</p>
			</div>

			<div class="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,640px)_minmax(0,640px)] lg:items-start lg:justify-center">
			<div class="relative mx-auto w-full max-w-[640px] lg:mx-0">
			{#key level}
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
				<div class="flex items-center gap-1.5" data-testid="learn-status-toolbar">
					<span class="mr-1 rounded-full bg-canvas px-2 py-1 text-[11px] font-medium text-muted">
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
					<button class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={resetGame} disabled={!ready} aria-label="New game">
						<RotateCcw size={15} strokeWidth={1.8} />
					</button>
					<button class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={undoMove} disabled={!ready || moveNum === 0 || gameOver} aria-label="Undo move">
						<Undo2 size={15} strokeWidth={1.8} />
					</button>
					{#if show_hints}
						<button class="grid size-8 place-items-center rounded-full bg-primary text-white transition-colors disabled:bg-primary-disabled disabled:text-muted {hint_loading ? 'motion-safe:animate-hint-loading' : ''}" onclick={() => hideHints()} aria-label="Hide hints" aria-busy={hint_loading}>
							<Lightbulb size={15} strokeWidth={1.8} />
						</button>
					{:else}
						<button class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={showHint} disabled={!ready || gameOver || hint_loading} aria-label="Show hint">
							<Lightbulb size={15} strokeWidth={1.8} />
						</button>
					{/if}
					{#if show_hints && !hint_loading && hints.length > 0}
						<span class="rounded-full bg-primary px-2 py-1 text-[11px] font-medium text-white">{uciToSan(fen, hints[hint_index].move)}</span>
						<button class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted {chat_loading ? 'motion-safe:animate-hint-loading' : ''}" onclick={explainHint} disabled={chat_loading} aria-label="Explain hint">
							<span class="text-[11px]">?</span>
						</button>
					{/if}
					<span class="ml-auto flex items-center gap-1.5">
						{#if chat_messages.length > 0}
							<button class="grid size-8 place-items-center rounded-full bg-canvas text-muted transition-colors hover:text-primary" onclick={clearChat} aria-label="Clear chat">
								<X size={13} strokeWidth={1.8} />
							</button>
						{/if}
						<button class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary" onclick={() => show_settings = true} aria-label="Settings">
							<Settings size={15} strokeWidth={1.8} />
						</button>
					</span>
				</div>
				<div class="w-full rounded-xl bg-surface-card overflow-hidden">
					<div bind:this={chat_body} class="max-h-80 overflow-y-auto px-4 py-3 space-y-3">
						{#if chat_messages.length === 0}
							<p class="text-sm text-muted text-center py-6">No messages yet</p>
						{/if}
						{#each chat_messages as msg, i (i)}
							<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
								{#if msg.role === 'assistant'}
									<div class="max-w-[85%] bg-canvas text-body rounded-[4px_16px_16px_16px] px-3.5 py-2.5 text-sm leading-relaxed">
										{@html marked.parse(msg.content)}
									</div>
								{:else}
									<div class="max-w-[85%] bg-primary text-white rounded-[16px_4px_16px_16px] px-3.5 py-2.5 text-sm leading-relaxed">
										{msg.content}
									</div>
								{/if}
							</div>
						{/each}
						{#each chat_queue as q_msg, i (i)}
							<div class="flex justify-end">
								<div class="max-w-[85%] bg-primary/30 text-white rounded-[16px_4px_16px_16px] px-3.5 py-2.5 text-sm leading-relaxed flex items-center gap-2">
									<span>{q_msg}</span>
									<button onclick={() => removeFromQueue(i)} class="shrink-0 grid place-items-center" aria-label="Remove queued message">
										<X size={12} strokeWidth={2} />
									</button>
								</div>
							</div>
						{/each}
					</div>
					<div class="flex items-center gap-2 p-3">
						<input
							bind:this={chat_input_ref}
							bind:value={chat_input}
							onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (chat_loading && !chat_input.trim()) stopChat(); else sendChatMessage(chat_input); } }}
							placeholder="Ask about the position..."
							class="flex-1 min-h-[40px] bg-canvas text-ink px-3.5 py-2.5 text-sm outline-none border-none rounded-lg focus:outline-none focus:border-none focus:ring-0"
						/>
						<button
							onclick={() => { if (chat_loading) stopChat(); else sendChatMessage(chat_input); }}
							disabled={!chat_loading && !chat_input.trim()}
							class="button-primary !border-0 !px-3 !min-h-[40px] !rounded-lg shrink-0 {chat_loading ? 'motion-safe:animate-hint-loading' : ''}"
							aria-label={chat_loading ? 'Stop generating' : 'Send'}
						>{#if chat_loading}<Square size={16} />{:else}→{/if}</button>
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
				<p class="mt-2 text-sm leading-6 text-muted">Choose how hint explanations behave.</p>
			</div>
			<div class="grid min-h-0 gap-3 overflow-y-auto p-6">
				<section class="grid gap-3 rounded-lg bg-surface-card p-4" data-testid="settings-difficulty">
					<div class="flex items-center justify-between gap-3">
						<h3 class="text-sm font-medium text-ink">Difficulty</h3>
						<span class="text-sm font-medium text-primary">{labels[level - 1]}</span>
					</div>
					<input
						type="range"
						min="1"
						max="10"
						bind:value={level}
						class="w-full accent-primary"
					/>
					<div class="flex items-center justify-between gap-3 text-xs text-muted">
						<span>Easy</span>
						<span>Elo: {presets[level - 1].elo ?? '∞'} · Depth: {presets[level - 1].depth} · Time: {presets[level - 1].moveTime}ms</span>
						<span>Hard</span>
					</div>
				</section>
				{#if gemini_api_key.trim()}
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
							<span class="mt-0.5 block text-xs text-muted">{model_options.find((o) => o.v === model)?.d ?? 'Custom model'}</span>
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
									<span class="text-xs text-muted">{option.d}</span>
								</button>
							{/each}
						</div>
					{/if}
				</section>
			{/if}
				<section class="grid gap-2 rounded-lg bg-surface-card p-4">
					<label class="text-sm font-medium text-ink" for="gemini-api-key">Gemini API key</label>
					<input
						id="gemini-api-key"
						type="password"
						bind:value={gemini_api_key}
						placeholder="AIza..."
						class="min-h-[40px] w-full rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
					/>
					<p class="text-xs leading-5 text-muted">
						Get your Gemini API key @
						<a class="text-primary underline-offset-2 hover:underline" href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer">https://aistudio.google.com/api-keys</a>
					</p>
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
