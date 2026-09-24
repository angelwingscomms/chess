<script lang="ts">
	import { parse_fen } from '$lib/landing/puzzles';

	let { f, label, class: cls = '' }: { f: string; label: string; class?: string } = $props();

	const light = Array.from({ length: 32 }, (_, i) => ({ x: (i % 4) * 2 + (Math.floor(i / 4) % 2), y: Math.floor(i / 4) }));
	const pieces = $derived(parse_fen(f));
</script>

<svg viewBox="0 0 8 8" class="overflow-hidden rounded-lg {cls}" role="img" aria-label={label}>
	<rect width="8" height="8" class="fill-haze/10" />
	{#each light as s}
		<rect x={s.x} y={s.y} width="1" height="1" class="fill-haze/25" />
	{/each}
	{#each pieces as p}
		<image href="/pieces/gioco/{p.c}.svg" x={p.x} y={p.y} width="1" height="1" />
	{/each}
</svg>
