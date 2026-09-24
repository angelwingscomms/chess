<script lang="ts">
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();
	let captured = $derived(s.captured);
</script>

{#if captured.w.length > 0 || captured.b.length > 0}
	<div class="flex items-center gap-4" aria-label="captured pieces">
		{#each [['w', captured.w], ['b', captured.b]] as [c, list]}
			<span class="flex items-center">
				{#each list as p}
					<img src="/pieces/gioco/{c}{String(p).toUpperCase()}.svg" alt="" class="-ml-1.5 size-5 first:ml-0 drop-shadow-[0_0_1px_rgba(236,231,241,0.4)]" />
				{/each}
			</span>
		{/each}
	</div>
{/if}
