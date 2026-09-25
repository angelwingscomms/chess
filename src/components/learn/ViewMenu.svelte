<script lang="ts">
	import CubeIcon from '$lib/components/icons/cube-icon.svelte';
	import { set_feel, ui } from '$lib/landing/calm.svelte';
	import type { View } from '$lib/board3d/scene';
	import { cam, set_view } from './view.svelte';
	import { glass, lit } from './ui';

	let open = $state(false);
	let box = $state<HTMLDivElement>();

	const VIEWS: { v: View | 'f'; t: string; d: string }[] = [
		{ v: 'f', t: '2d', d: 'M4 4h16v16H4zM12 4v16M4 12h16' },
		{ v: 't', t: 'top', d: 'M4 4h16v16H4zM9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' },
		{ v: 'p', t: 'tilted', d: 'M7 7h10l4 11H3z' },
		{ v: 'l', t: 'low', d: 'M8.5 11h7l6.5 7H2z' },
		{ v: 's', t: 'side', d: 'M4 8l16 -4v16l-16 -4z' }
	];
	const now = $derived(ui.flat ? 'f' : cam.v);

	function pick(v: View | 'f') {
		open = false;
		if (v === 'f') {
			if (!ui.flat) cam.out = true;
			return;
		}
		set_view(v);
		if (ui.flat) set_feel('flat', false);
	}
</script>

<svelte:window onpointerdown={(e) => open && !box?.contains(e.target as Node) && (open = false)} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

{#if cam.gl}
	<div bind:this={box} class="relative">
		<button aria-label="Board view" aria-haspopup="menu" aria-expanded={open} data-tip={open ? undefined : 'view'} data-tip-end data-tour="view" class={open ? lit : glass} onclick={() => (open = !open)}>
			<CubeIcon size={16} strokeWidth={1.8} />
		</button>
		{#if open}
			<div role="menu" aria-label="Board view" class="absolute right-0 bottom-full z-30 mb-2 flex w-48 flex-col gap-0.5 rounded-2xl border border-haze/15 bg-deep p-1.5 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)] animate-surface">
				{#each VIEWS as o (o.v)}
					<button
						role="menuitemradio"
						aria-checked={now === o.v}
						class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition duration-300 ease-expo hover:bg-haze/8 focus-visible:outline-2 focus-visible:outline-glow {now === o.v ? 'text-glow' : 'text-haze/85'}"
						onclick={() => pick(o.v)}
					>
						<svg viewBox="0 0 24 24" class="size-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d={o.d} /></svg>
						{o.t}
					</button>
				{/each}
				<p class="px-3 pt-2 pb-1 text-xs leading-snug text-mist">drag around the board to turn it. scroll or pinch to zoom.</p>
			</div>
		{/if}
	</div>
{/if}
