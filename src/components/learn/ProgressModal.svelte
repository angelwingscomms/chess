<script lang="ts">
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import { pg } from '$lib/progress.svelte';
	import { LEVELS } from '$lib/util/chess/engine';
	import { difficulty } from './puzzle.svelte';
	import { get_learn_state } from './learn_context.svelte';
	import { glass } from './ui';
	const s = get_learn_state();
	const close = () => (s.show_progress = false);

	const games = $derived(pg.g.slice(0, 12));
	const won = $derived(pg.g.filter((g) => g.w === 'w').length);
	const tiles = $derived([
		{ k: 'days in a row', v: pg.s },
		{ k: 'puzzles solved', v: pg.y },
		{ k: 'best puzzle run', v: pg.b },
		{ k: 'games won', v: won }
	]);
	const word = { w: 'won', l: 'lost', d: 'draw' };
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && s.show_progress && close()} />

{#if s.show_progress}
	<div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-night/70 p-4 backdrop-blur-sm" role="presentation" onclick={close}>
		<div class="calm flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-haze/12 bg-deep/95 font-calm font-light text-haze shadow-[0_40px_120px_-30px_rgb(0_0_0/calc(0.9*var(--sh-k)))] animate-surface" role="dialog" aria-modal="true" aria-labelledby="progress-title" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
				<div>
					<p class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">{s.logged_in ? 'saved to your account' : 'saved on this device'}</p>
					<h2 id="progress-title" class="mt-2 text-3xl font-extralight tracking-[-0.03em]">how you’re doing</h2>
				</div>
				<button aria-label="close" class={glass} onclick={close}><XIcon size={15} strokeWidth={1.8} /></button>
			</div>
			<div class="grid min-h-0 gap-6 overflow-y-auto px-6 pb-6">
				<div class="grid grid-cols-2 gap-2">
					{#each tiles as t}
						<div class="rounded-2xl border border-haze/10 bg-haze/[0.03] p-4">
							<p class="text-3xl font-extralight tabular-nums text-glow">{t.v}</p>
							<p class="mt-1 text-xs text-mist">{t.k}</p>
						</div>
					{/each}
				</div>
				<p class="text-sm text-haze/85">{pg.n ? `your puzzles are at the ${difficulty(pg.r)} level, and they get harder as you solve them.` : 'solve a puzzle and e4 finds your level within about ten.'}</p>
				<section>
					<h3 class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">your last games</h3>
					{#if games.length}
						<ul class="mt-2 divide-y divide-haze/8">
							{#each games as g}
								<li class="flex items-center justify-between gap-3 py-2.5 text-sm">
									<span class={g.w === 'w' ? 'text-glow' : 'text-haze/85'}>{word[g.w]}</span>
									<span class="text-xs text-mist">{LEVELS[g.l - 1]?.t ?? ''} computer</span>
									<span class="flex items-center gap-2">
										<span class="block h-1.5 w-16 overflow-hidden rounded-full bg-haze/10"><span class="block h-full rounded-full bg-glow" style:width="{g.a}%"></span></span>
										<span class="w-14 text-right text-xs text-mist">{g.a >= 80 ? 'sharp' : g.a >= 60 ? 'steady' : 'learning'}</span>
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="mt-2 text-sm text-mist">finish a game against the computer and it shows here.</p>
					{/if}
				</section>
			</div>
		</div>
	</div>
{/if}
