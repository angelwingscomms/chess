<script lang="ts">
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();
	let captured = $derived(s.captured);
</script>

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
