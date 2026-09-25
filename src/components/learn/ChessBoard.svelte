<script lang="ts">
	import { Chess } from 'svelte-chess';
	import { calm, play_move } from '$lib/landing/calm.svelte';
	import { puzzle_move } from './puzzle.svelte';
	import { get_learn_state } from './learn_context.svelte';
	import { cam } from './view.svelte';
	const s = get_learn_state();

	let computer_think_time = $derived(s.computer_think_time);
	let engine = $derived(s.engine);
	let hint_highlights = $derived(s.hint_highlights);
	let show_hints = $derived(s.show_hints);
	let hint_loading = $derived(s.hint_loading);
	let recommended_promotion = $derived(
		s.hints[s.hint_index]?.move.length === 5 ? s.hints[s.hint_index].move[4] : ''
	);
</script>

{#key computer_think_time}
	<Chess
		class="cg-default-style board-themed"
		bind:this={s.chessRef}
		bind:fen={s.fen}
		bind:orientation={s.orientation}
		{engine}
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
