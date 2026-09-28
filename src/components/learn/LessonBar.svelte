<script lang="ts">
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import BulbIcon from '$lib/components/icons/bulb-icon.svelte';
	import RefreshIcon from '$lib/components/icons/refresh-icon.svelte';
	import SchoolIcon from '$lib/components/icons/school-icon.svelte';
	import { level_id } from '$lib/learn/lessons';
	import { close_lessons, last, level, ls, next, part_end, point, stage, start, won_text } from './lesson.svelte';
	import { glass } from './ui';

	const t = $derived(stage());
	const text = $derived(ls.st === 'w' ? won_text() : ls.st === 'n' ? ls.oops : level().t);
	const pill = 'inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full px-4 transition duration-500 ease-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:h-10';
</script>

<div class="flex w-full flex-col gap-2 animate-surface" aria-live="polite">
	<div class="flex items-center justify-between gap-3">
		<p class="font-calm-mono text-xs tracking-[0.14em] text-mist"><span class="text-glow">lesson</span> · {t.t}</p>
		<div class="flex items-center gap-1.5" role="img" aria-label="level {ls.li + 1} of {t.l.length}">
			{#each t.l as _, k}
				<span class="block size-1.5 rounded-full transition duration-500 ease-expo {k === ls.li ? 'scale-150 bg-glow' : ls.done.includes(level_id(t.k, k)) ? 'bg-glow/55' : 'bg-haze/25'}"></span>
			{/each}
		</div>
	</div>
	<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
		<p class="min-w-0 flex-1 basis-56 text-[15px] leading-snug transition-colors duration-500 {ls.st === 'n' ? 'text-[#e78686]' : ls.st === 'w' ? 'text-glow' : 'text-haze/85'}">{text}</p>
		<div class="flex items-center gap-1.5">
			<button aria-label="All lessons" data-tip="all lessons" class={glass} onclick={() => (ls.list = true)}>
				<SchoolIcon size={16} strokeWidth={1.8} />
			</button>
			<button aria-label="Start over" data-tip="start over" class={glass} onclick={start}>
				<RefreshIcon size={16} strokeWidth={1.8} />
			</button>
			{#if ls.st === 'w'}
				{#if part_end() && !last()}
					<button class="{pill} border border-haze/20 bg-haze/5 text-haze hover:border-glow/60 hover:bg-glow/10" onclick={close_lessons}>play a game</button>
				{/if}
				<button class="{pill} bg-glow text-night shadow-[0_0_30px_-8px_rgba(233,164,124,0.7)]" onclick={next}>{last() ? 'play a game →' : 'next →'}</button>
			{:else}
				<button aria-label="Show me the move" data-tip="show me" class={glass} onclick={point} disabled={ls.st === 'n'}>
					<BulbIcon size={16} strokeWidth={1.8} />
				</button>
			{/if}
			<button aria-label="Leave lessons" data-tip="back to your game" data-tip-end class={glass} onclick={close_lessons}>
				<XIcon size={15} strokeWidth={1.8} />
			</button>
		</div>
	</div>
</div>
