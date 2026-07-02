<script lang="ts">
	import { Chess } from 'svelte-chess';
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	let computer_think_time = $derived(s.computer_think_time);
	let engine = $derived(s.engine);
	let hint_highlights = $derived(s.hint_highlights);
	let show_hints = $derived(s.show_hints);
	let hint_loading = $derived(s.hint_loading);
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
		on:ready={() => s.onReady()}
		on:move={(e) => s.onMove(e)}
		on:gameOver={(e) => s.onGameOver(e)}
	/>
{/key}
{#if show_hints && !hint_loading && hint_highlights.length}
	<div class="pointer-events-none absolute inset-0 z-10 grid grid-cols-8 grid-rows-8">
		{#each hint_highlights as square (square.k)}
			<div
				class={'pointer-events-none motion-safe:animate-hint-pulse size-[2.7rem] rounded-full place-self-center ' + square.r + ' ' + square.c + ' ' + (square.k === 'f' ? 'bg-amber/70' : 'bg-teal/70')}
				data-testid={square.k === 'f' ? 'hint-square-from' : 'hint-square-to'}
				role="img"
				aria-label={`Hint ${square.l} square ${square.s}`}
			></div>
		{/each}
	</div>
{/if}
