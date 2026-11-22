<script lang="ts">
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import { PARTS, STAGES } from '$lib/learn/lessons';
	import { due, pg } from '$lib/progress.svelte';
	import { basics_done, go, is_done, ls, start_run } from './lesson.svelte';
	import { glass } from './ui';

	const total = STAGES.reduce((n, t) => n + t.l.length, 0);
	const waiting = $derived(ls.list ? due().length : 0);
	const chip = 'flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition duration-300 ease-expo focus-visible:outline-2 focus-visible:outline-glow';
	const close = () => (ls.list = false);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && ls.list && close()} />

{#if ls.list}
	<div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-night/70 p-4 backdrop-blur-sm" role="presentation" onclick={close}>
		<div
			class="calm flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-haze/12 bg-deep/95 font-calm font-light text-haze shadow-[0_40px_120px_-30px_rgb(0_0_0/calc(0.9*var(--sh-k)))] animate-surface"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lessons-title"
			tabindex="-1"
			onkeydown={(e) => e.key === 'Escape' && close()}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
				<div>
					<p class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">lessons · {pg.l.length} of {total} done</p>
					<h2 id="lessons-title" class="mt-2 text-3xl font-extralight tracking-[-0.03em]">learn step by step</h2>
				</div>
				<button aria-label="close lessons list" class={glass} onclick={close}>
					<XIcon size={15} strokeWidth={1.8} />
				</button>
			</div>
			{#if pg.l.length >= 3 || !basics_done()}
				<div class="flex shrink-0 flex-wrap gap-2 px-6 pb-5">
					{#if pg.l.length >= 3}
						<button class="{chip} {waiting ? 'border-glow/70 bg-glow/10 text-glow' : 'border-haze/12 text-haze/80 hover:border-haze/30'}" onclick={() => start_run('r')}>
							mixed review
							<span class="font-calm-mono text-[11px] {waiting ? 'text-glow' : 'text-mist'}">{waiting ? `${waiting} due` : 'practice'}</span>
						</button>
					{/if}
					{#if !basics_done()}
						<button class="{chip} border-haze/12 text-haze/80 hover:border-haze/30" onclick={() => start_run('t')}>
							skip the basics
							<span class="font-calm-mono text-[11px] text-mist">7 questions</span>
						</button>
					{/if}
				</div>
			{/if}
			<nav class="grid min-h-0 gap-x-8 gap-y-6 overflow-y-auto px-6 pb-6 sm:grid-cols-2" aria-label="lessons">
				{#each PARTS as p (p)}
					<section>
						<h3 class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">{p}</h3>
						<ul class="mt-3 flex flex-wrap gap-2">
							{#each STAGES as t, i (t.k)}
								{#if t.p === p}
									{@const n = t.l.filter((_, j) => is_done(t.k, j)).length}
									<li>
										<button
											class="flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm transition duration-300 ease-expo focus-visible:outline-2 focus-visible:outline-glow {i === ls.si && !ls.mode ? 'border-glow/70 bg-glow/10 text-glow' : 'border-haze/12 text-haze/80 hover:border-haze/30'}"
											aria-current={i === ls.si && !ls.mode ? 'step' : undefined}
											onclick={() => go(i)}
										>
											<img src="/pieces/e4/{t.i}.svg" alt="" class="size-6" />
											{t.t}
											<span class="font-calm-mono text-[11px] text-mist">{n === t.l.length ? '✓' : `${n}/${t.l.length}`}</span>
										</button>
									</li>
								{/if}
							{/each}
						</ul>
					</section>
				{/each}
			</nav>
		</div>
	</div>
{/if}
