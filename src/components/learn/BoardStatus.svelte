<script lang="ts">
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	let turn = $derived(s.turn);
	let gameOver = $derived(s.gameOver);
	let inCheck = $derived(s.inCheck);
	let ready = $derived(s.ready);
	let resultMsg = $derived(s.resultMsg);
	let thinking = $derived(!gameOver && s.engine?.getColor?.() === turn);
</script>

<div class="flex items-center gap-3 font-calm-mono text-xs tracking-[0.14em] text-mist" data-testid="learn-status-toolbar">
	{#if !ready}
		<span class="motion-safe:animate-pulse">waking the board…</span>
	{:else if gameOver}
		<span class="text-glow">{resultMsg.toLowerCase()}</span>
	{:else}
		<span class="flex items-center gap-2">
			<span class="block size-1.5 rounded-full {thinking ? 'bg-glow motion-safe:animate-listen' : 'bg-haze/50'}"></span>
			{thinking ? 'thinking…' : `${turn === 'w' ? 'white' : 'black'} to move`}
		</span>
		{#if inCheck}
			<span class="text-[#e78686]">check</span>
		{/if}
	{/if}
</div>
