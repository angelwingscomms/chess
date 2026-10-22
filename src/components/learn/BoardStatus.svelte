<script lang="ts">
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	let turn = $derived(s.turn);
	let gameOver = $derived(s.gameOver);
	let inCheck = $derived(s.inCheck);
	let ready = $derived(s.ready);
	let resultMsg = $derived(s.resultMsg);
	let bot = $derived(s.engine?.getColor?.());
	let thinking = $derived(!gameOver && bot === turn);
</script>

<div class="flex items-center gap-3 font-calm-mono text-xs tracking-[0.14em] text-mist" data-testid="learn-status-toolbar">
	{#if !ready}
		<span class="motion-safe:animate-pulse">Waking the board…</span>
	{:else if gameOver}
		<span class="text-glow">{resultMsg}</span>
	{:else}
		<span class="flex items-center gap-2">
			<span class="block size-1.5 rounded-full {thinking ? 'bg-glow motion-safe:animate-listen' : 'bg-haze/50'}"></span>
			{thinking ? 'The computer is thinking…' : bot === 'w' || bot === 'b' ? 'Your move' : `${turn === 'w' ? 'White' : 'Black'} to move`}
		</span>
		{#if inCheck}
			<span class="text-bad">Check!</span>
		{/if}
	{/if}
</div>
