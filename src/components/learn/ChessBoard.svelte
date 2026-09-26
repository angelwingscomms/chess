<script lang="ts">
	import { Chess } from 'svelte-chess';
	import { Chess as Rules, type Square } from 'chess.js';
	import { calm, play_move } from '$lib/landing/calm.svelte';
	import { puzzle_move } from './puzzle.svelte';
	import { get_learn_state } from './learn_context.svelte';
	import { cam } from './view.svelte';
	const s = get_learn_state();

	let level = $derived(s.level);
	let engine = $derived(s.engine);
	let hint_highlights = $derived(s.hint_highlights);
	let show_hints = $derived(s.show_hints);
	let hint_loading = $derived(s.hint_loading);
	let recommended_promotion = $derived(
		s.hints[s.hint_index]?.move.length === 5 ? s.hints[s.hint_index].move[4] : ''
	);

	let wrap = $state<HTMLDivElement>();
	let sel = '';
	let held = '';

	// the hint as an arrow, in board units with white or black at the bottom
	const arrow = $derived.by(() => {
		const m = show_hints && !hint_loading ? s.hints[s.hint_index]?.move : '';
		if (!m) return null;
		const at = (q: string) => {
			const f = q.charCodeAt(0) - 97;
			const r = +q[1] - 1;
			return s.orientation === 'w' ? [f + 0.5, 7.5 - r] : [7.5 - f, r + 0.5];
		};
		const [x1, y1] = at(m.slice(0, 2));
		const [x2, y2] = at(m.slice(2, 4));
		const d = Math.hypot(x2 - x1, y2 - y1);
		return { x1, y1, x2: x2 - ((x2 - x1) / d) * 0.34, y2: y2 - ((y2 - y1) / d) * 0.34 };
	});

	function square_at(e: PointerEvent) {
		const r = wrap!.getBoundingClientRect();
		const c = Math.floor(((e.clientX - r.left) / r.width) * 8);
		const w = Math.floor(((e.clientY - r.top) / r.height) * 8);
		if (c < 0 || c > 7 || w < 0 || w > 7) return '';
		return (s.orientation === 'w' ? 'abcdefgh'[c] + (8 - w) : 'abcdefgh'[7 - c] + (w + 1)) as Square;
	}

	function mine(q: string) {
		const g = new Rules(s.fen);
		const p = g.get(q as Square);
		const bot = s.engine?.getColor?.();
		return !!p && p.color === g.turn() && p.color !== bot && bot !== 'both' && s.ready && !s.gameOver;
	}

	function legal(from: string, to: string) {
		return new Rules(s.fen).moves({ square: from as Square, verbose: true }).some((m) => m.to === to);
	}

	// a piece that can't go where it was sent gives a little shake
	function shake(q: string) {
		calm.sound.nope();
		requestAnimationFrame(() => {
			const el = [...wrap!.querySelectorAll('piece')].find((p) => (p as unknown as { cgKey?: string }).cgKey === q);
			el?.animate([{ translate: '0 0' }, { translate: '-8% 0' }, { translate: '7% 0' }, { translate: '-5% 0' }, { translate: '3% 0' }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' });
		});
	}

	function down(e: PointerEvent) {
		const q = square_at(e);
		if (!q) return;
		const own = mine(q);
		if (sel && q !== sel && !own && !legal(sel, q)) shake(sel);
		held = own ? q : '';
		sel = own && q !== sel ? q : '';
	}

	function up(e: PointerEvent) {
		const q = square_at(e);
		if (held && q && q !== held) {
			if (!legal(held, q)) shake(held);
			sel = '';
		}
		held = '';
	}
</script>

<div bind:this={wrap} class="relative size-full {s.show_dests ? '' : '[&_square.move-dest]:!hidden'}" role="presentation" onpointerdown={down} onpointerup={up}>
{#key `${level}${s.armed}`}
	<Chess
		class="cg-default-style board-themed"
		bind:this={s.chessRef}
		bind:fen={s.fen}
		bind:orientation={s.orientation}
		engine={s.armed ? engine : undefined}
		bind:turn={s.turn}
		bind:moveNumber={s.moveNum}
		bind:history={s.history}
		bind:inCheck={s.inCheck}
		bind:isGameOver={s.gameOver}
		{recommended_promotion}
		on:ready={() => s.onReady()}
		on:move={(e) => {
			s.onMove(e);
			play_move(e.detail);
			const r = puzzle_move(e.detail);
			if (r === 'y') calm.sound.chime(9, 0.35);
			else if (r === 'n') calm.sound.bowl(0);
			else if (r === 'w') calm.sound.chord();
		}}
		on:gameOver={(e) => {
			s.onGameOver(e);
			calm.sound.bowl(0);
		}}
	/>
{/key}
</div>
{#if arrow && !cam.on}
	<svg viewBox="0 0 8 8" class="pointer-events-none absolute inset-0 z-10 size-full overflow-visible drop-shadow-[0_0_10px_rgba(233,164,124,0.7)]" aria-hidden="true">
		<defs>
			<marker id="hint-head" viewBox="0 0 4 4" refX="1.2" refY="2" markerWidth="2.4" markerHeight="2.4" orient="auto">
				<path d="M0 0 L4 2 L0 4 Z" class="fill-glow" />
			</marker>
		</defs>
		<line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} stroke-width="0.17" stroke-linecap="round" marker-end="url(#hint-head)" class="stroke-glow/90" />
	</svg>
{/if}
{#if show_hints && !hint_loading && hint_highlights.length && !cam.on}
	<div class="pointer-events-none absolute inset-0 z-10 grid grid-cols-8 grid-rows-8">
		{#each hint_highlights as square (square.k)}
			{#if square.k === 'p' && square.p}
				<img
					src="/pieces/gioco/{s.turn === 'w' ? 'w' : 'b'}{square.p.toUpperCase()}.svg"
					alt="promote to {square.p}"
					class={'pointer-events-none size-8 place-self-center drop-shadow-md ' + square.r + ' ' + square.c}
				/>
			{:else}
				<div
					class={'pointer-events-none size-[62%] rounded-full place-self-center ' + square.r + ' ' + square.c + ' ' + (square.k === 'f' ? 'border-2 border-glow/80 shadow-[0_0_24px_rgba(233,164,124,0.5)]' : 'bg-glow/60 motion-safe:animate-listen shadow-[0_0_30px_rgba(233,164,124,0.7)]')}
					data-testid={square.k === 'f' ? 'hint-square-from' : 'hint-square-to'}
					role="img"
					aria-label={`Hint ${square.l} square ${square.s}`}
				></div>
			{/if}
		{/each}
	</div>
{/if}
