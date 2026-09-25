<script lang="ts">
	import MiniBoard from './MiniBoard.svelte';
	import { puzzles } from '$lib/landing/puzzles';

	let { on_hover }: { on_hover?: () => void } = $props();

	const rows = [puzzles.slice(0, 6), puzzles.slice(6)];
	const level = (r: number) => (r < 1000 ? 'easy' : r < 1400 ? 'medium' : 'hard');
</script>

<div class="flex flex-col gap-10 overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] motion-reduce:overflow-x-auto">
	{#each rows as row, k}
		<ul class="flex w-max hover:[animation-play-state:paused] motion-reduce:animate-none {k ? 'animate-drift-back' : 'animate-drift'}">
			{#each [...row, ...row] as p, i}
				<li class="group pr-8 sm:pr-12 {i >= row.length ? 'motion-reduce:hidden' : ''}" aria-hidden={i >= row.length ? 'true' : undefined} onpointerenter={on_hover}>
					<MiniBoard f={p.f} label="{level(p.r)} puzzle: {p.t}" class="w-32 transition duration-700 ease-expo group-hover:-translate-y-2 group-hover:scale-105 sm:w-40" />
					<p class="mt-4 font-calm-mono text-[11px] tracking-[0.14em] text-mist transition-colors duration-500 ease-expo group-hover:text-haze">{p.t} · {level(p.r)}</p>
				</li>
			{/each}
		</ul>
	{/each}
</div>
