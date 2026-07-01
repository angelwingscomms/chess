import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/routes/+page.svelte'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');

describe('/chess/learn hint highlights', () => {
	it('wires a visible board overlay to the current hint squares', () => {
		expect(page).toContain('hint_squares(');
		expect(page).toContain('data-testid={square.k === \'f\' ? \'hint-square-from\' : \'hint-square-to\'}');
		expect(page).toContain('aria-label={`Hint ${square.l} square ${square.s}`}');
		expect(page).toContain('const hint_from_class = \'bg-amber/70\'');
		expect(page).toContain('const hint_to_class = \'bg-teal/70\'');
		expect(page).toContain('motion-safe:animate-hint-pulse size-[2.7rem] rounded-full place-self-center');
		expect(page).toContain('can_reuse_hints(hints, hint_fen, fen)');
		expect(page).toContain('onclick={() => hideHints()}');
		expect(page).toContain('hideHints(true)');
		expect(page).toContain('hint_fen = fen;');
	});
});



describe('/chess/learn chat', () => {
	it('uses side by side desktop layout without widening the board or controls', () => {
		expect(page).toContain('max-w-[1328px]');
		expect(page).toContain('lg:grid-cols-[minmax(0,640px)_minmax(0,640px)]');
		expect(page).toContain('lg:items-start');
		expect(page).toContain('max-w-[640px]');
	});

	it('keeps desktop vertical chrome tight around the board', () => {
		expect(page).toContain('container py-4');
		expect(page).toContain('flex w-full max-w-[1328px] flex-col gap-4');
		expect(page).toContain('grid w-full grid-cols-1 gap-4');
		expect(page).not.toContain('container py-12');
		expect(page).not.toContain('flex w-full max-w-[1328px] flex-col gap-6');
	});

	it('replaces analysis panel with chat interface', () => {
		expect(page).toContain('chat_messages');
		expect(page).toContain('chat_loading');
		expect(page).toContain('chat_abort');
		expect(page).toContain('chat_queue');
		expect(page).toContain('sendChatMessage');
		expect(page).toContain('removeFromQueue');
		expect(page).toContain('promoteFromQueue');
		expect(page).toContain('execute_chat');
		expect(page).toContain('processQueue');
		expect(page).toContain('stopChat');
		expect(page).toContain('clearChat');
		expect(page).toContain('/chess/learn/chat');
		expect(page).toContain('Chat');
		expect(page).toContain('Ask about the position');
	});

	it('keeps board context hidden while sending request state', () => {
		expect(page).toContain('successful_context');
		expect(page).toContain('build_chat_data(');
		expect(page).toContain('apply_chat_event(');
		expect(page).toContain('bind:history');
		expect(page).toContain('d: build_chat_data(');
		expect(page).toContain('msg.content');
		expect(page).not.toContain('{msg.d');
	});

	it('queues messages sent while response is loading and shows light bubbles with remove button', () => {
		expect(page).toContain('chat_queue');
		expect(page).toContain('removeFromQueue(');
		expect(page).toContain('promoteFromQueue(');
		expect(page).toContain('bg-primary/30 text-white');
		expect(page).toContain('aria-label="Remove queued message"');
		expect(page).toContain('aria-label="Send this message now"');
		expect(page).toContain('class="flex-1 min-h-[40px] bg-canvas text-ink px-3.5 py-2.5 text-sm outline-none border-none rounded-lg focus:outline-none focus:border-none focus:ring-0"');
		expect(page).toContain("sendChatMessage(chat_input)");
		expect(page).toContain("chat_queue = [...chat_queue, { text: t }]");
	});

	it('saves game progress and chat to user profile on move and message', () => {
		expect(page).toContain("import { page } from '$app/stores'");
		expect(page).toContain('save_game_debounced');
		expect(page).toContain('/api/save');
		expect(page).toContain('/api/load');
		expect(page).toContain('fetch(\'/api/load\')');
		expect(page).toContain("chessRef.load(d.f as string)");
		expect(page).toContain('clearTimeout');
		expect(page).toContain('join(\'|\')');
		expect(page).toContain("m.r === 'u' ? 'user'");
	});

	it('undo pushes FEN to redo_stack and redo restores it', () => {
		expect(page).toContain('redo_stack.push(fen)');
		expect(page).toContain('redo_stack.pop()');
		expect(page).toContain("chessRef.load(f)");
		expect(page).toContain('redo_stack = []');
		expect(page).toContain('redo_stack.length');
		expect(page).toContain('aria-label="Undo move"');
		expect(page).toContain('aria-label="Redo move"');
		expect(page).toContain('<Redo2');
	});

	it('shows board-state-aware chat suggestions above the input', () => {
		expect(page).toContain('chat_suggestions');
		expect(page).toContain("How do I get out of check?");
		expect(page).toContain("Suggest a good opening move");
		expect(page).toContain("Why did Stockfish play that?");
		expect(page).toContain("What is the best move for me?");
		expect(page).toContain("Who is winning right now?");
		expect(page).toContain("What is the plan here?");
		expect(page).toContain('rounded-full border border-hairline bg-canvas px-3 py-1 text-xs');
	});
});

describe('/chess/learn settings modal', () => {
	it('uses the warm product design system instead of the shared checkout modal shell', () => {
		expect(page).toContain('data-testid="learn-settings-modal"');
		expect(page).toContain('bg-canvas text-body shadow-[0_24px_80px_rgba(20,20,19,0.22)]');
		expect(page).toContain('font-display text-2xl font-medium text-ink');
		expect(page).toContain('bg-surface-card p-4');
		expect(page).toContain('rounded-lg border border-hairline bg-canvas');
		expect(page).not.toContain('modal-card max-w-sm');
	});

	it('moves difficulty into settings and uses compact icon controls above chat', () => {
		expect(page).toContain("import ArrowUpIcon from '$lib/components/icons/arrow-up-icon.svelte';");
		expect(page).toContain("import BulbIcon from '$lib/components/icons/bulb-icon.svelte';");
		expect(page).toContain("import GearIcon from '$lib/components/icons/gear-icon.svelte';");
		expect(page).toContain("import RefreshIcon from '$lib/components/icons/refresh-icon.svelte';");
		expect(page).toContain("import UndoIcon from '$lib/components/icons/undo-icon.svelte';");
		expect(page).toContain("import XIcon from '$lib/components/icons/x-icon.svelte';");
		expect(page).toContain('data-testid="learn-status-toolbar"');
		expect(page).toContain('aria-label="New game"');
		expect(page).toContain('<RotateCcw');
		expect(page).toContain('aria-label="Undo move"');
		expect(page).toContain('<Undo2');
		expect(page).toContain('aria-label="Show hint"');
		expect(page).toContain('<Lightbulb');
		expect(page).toContain('aria-label="Settings"');
		expect(page).toContain('<Settings');
		expect(page).toContain('data-testid="settings-difficulty"');
		expect(page).not.toContain('<span class="text-muted">Move:</span>');
		expect(page).not.toContain('<button class="button-secondary text-xs ml-auto"');
	});

	it('uses a tiny coral round control for auto explain', () => {
		expect(page).toContain('sr-only');
		expect(page).toContain('rounded-full border border-primary');
		expect(page).toContain('bg-primary');
		expect(page).not.toContain('type="checkbox" bind:checked={autoexplain} class="h-4 w-4 accent-primary"');
	});

	it('can request hints automatically after load and after the computer moves', () => {
		expect(page).toContain("let auto_hint = $state(browser && localStorage.getItem('auto_hint') === 'true');");
		expect(page).toContain("let hint_on_start = $state(browser && localStorage.getItem('hint_on_start') === 'true');");
		expect(page).toContain("localStorage.setItem('auto_hint', String(auto_hint))");
		expect(page).toContain("localStorage.setItem('hint_on_start', String(hint_on_start))");
		expect(page).toContain('function request_hint()');
		expect(page).toContain('if (hint_on_start && !start_hint_done)');
		expect(page).toContain("if (m.color === 'b' && auto_hint) request_hint();");
		expect(page).toContain('Auto hint');
		expect(page).toContain('Hint on start');
	});

	it('shows hint loading through the hint button instead of analyzing text', () => {
		expect(page).toContain('motion-safe:animate-hint-loading');
		expect(css).toContain('--animate-hint-loading: hint-loading 3.2s ease-in-out infinite;');
		expect(css).toContain('background-color: #ffffff;');
		expect(css).not.toContain('border-color: var(--color-primary);');
		expect(page).not.toContain('Analyzing');
	});

	it('keeps chat chrome compact and icon-only', () => {
		expect(page).toContain('data-testid="learn-status-toolbar"');
		expect(page).toContain('aria-label="Clear chat"');
		expect(page).toContain('<X size={13}');
		expect(page).toContain('rounded-full bg-primary px-2 py-1 text-[11px] font-medium text-white');
		expect(page).not.toContain('<span class="text-sm font-medium text-ink">Chat</span>');
		expect(page).not.toContain('<button class="text-xs text-muted" onclick={clearChat}>Clear</button>');
	});

	it('lets users bring a Groq key and sends keyed chat directly to AI SDK', () => {
		expect(page).toContain("let groq_api_key = $state(browser && localStorage.getItem('groq_api_key') || '');");
		expect(page).toContain("localStorage.setItem('groq_api_key', groq_api_key)");
		expect(page).toContain('async function send_direct_generation(');
		expect(page).toContain("createGroq({ apiKey: groq_api_key.trim() })");
		expect(page).toContain('streamText');
		expect(page).toContain("if (!model.startsWith('deepseek/') && !model.startsWith('bynara/') && groq_api_key.trim() && model.includes('/'))");
		expect(page).toContain('Groq API key');
		expect(page).toContain('type="password"');
		expect(page).toContain('Get your Groq API key @');
		expect(page).toContain('href="https://console.groq.com/keys"');
		expect(page).toContain('target="_blank"');
	});

	it('reads direct text from AI SDK textStream', () => {
		expect(page).toContain('textStream');
		expect(page).toContain('for await (const chunk of result.textStream)');
		expect(page).toContain('send_direct_generation(');
		expect(page).toContain('groq_api_key.trim()');
	});

	it('tracks and displays API cost in token modal', () => {
		expect(page).toContain("import { calc_cost } from '$lib/util/ai/pricing'");
		expect(page).toContain('let total_cost = $state(0)');
		expect(page).toContain('total_cost += msg.cost');
		expect(page).toContain('const cost = calc_cost(m, p, c)');
		expect(page).toContain('total_cost += cost');
		expect(page).toContain('total_cost = 0');
		expect(page).toContain('Cost (USD)');
		expect(page).toContain('Cost (NGN)');
		expect(page).toContain('total_cost * 1440).toFixed(2)}');
		expect(page).toContain('Input');
		expect(page).toContain('Output');
	});

	it('stores per-message usage and shows NGN cost inline', () => {
		expect(page).toContain('type ChatUsage = { p: number; c: number; cost: number };');
		expect(page).toContain("u?: ChatUsage");
		expect(page).toContain('chat_messages[last] = { ...chat_messages[last], u:');
		expect(page).toContain('msg.u.cost * NGN_USD).toFixed(2)}');
	});

	it('shows model combobox regardless of api key', () => {
		expect(page).toContain('let show_model_menu = $state(false);');
		expect(page).toContain('let model_options =');
		expect(page).toContain('role="combobox"');
		expect(page).toContain('aria-haspopup="listbox"');
		expect(page).toContain('aria-expanded={show_model_menu}');
		expect(page).toContain('role="listbox"');
		expect(page).toContain('role="option"');
		expect(page).toContain('rounded-lg border border-hairline bg-canvas');
		expect(page).not.toContain('<select bind:value={model}');
	});

	it('keeps the settings modal inside the viewport with only the body scrolling', () => {
		expect(page).toContain('max-h-[calc(100dvh-2rem)]');
		expect(page).toContain('flex max-h-[calc(100dvh-2rem)]');
		expect(page).toContain('flex-col overflow-hidden');
		expect(page).toContain('grid min-h-0 gap-3 overflow-y-auto');
		expect(page).toContain('shrink-0 border-b border-hairline');
		expect(page).toContain('shrink-0 grid grid-cols-2');
	});
});
