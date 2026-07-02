<script lang="ts">
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	let turn = $derived(s.turn);
	let gameOver = $derived(s.gameOver);
	let inCheck = $derived(s.inCheck);
	let ready = $derived(s.ready);
	let resultMsg = $derived(s.resultMsg);
	let moveNum = $derived(s.moveNum);
</script>

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
</div>
