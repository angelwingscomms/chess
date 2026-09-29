<script lang="ts">
	let { f }: { f: string } = $props();
	const cells = $derived(f.split(' ')[0].split('/').flatMap((r) => [...r].flatMap((c) => (/\d/.test(c) ? Array(+c).fill('') : [(c < 'a' ? 'w' : 'b') + c.toUpperCase()]))));
</script>

<span class="relative grid size-14 shrink-0 grid-cols-8 overflow-hidden rounded-lg border border-haze/10 bg-haze/40" aria-hidden="true">
	<span class="absolute inset-0 bg-[repeating-conic-gradient(var(--color-night)_0_25%,transparent_0_50%)] bg-size-[25%_25%] opacity-25"></span>
	{#each cells as c, i (i)}
		<span class="relative">
			{#if c}<img src="/pieces/gioco/{c}.svg" alt="" class="size-full" />{/if}
		</span>
	{/each}
</span>
