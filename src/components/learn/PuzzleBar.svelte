<script lang="ts">
	import BulbIcon from '$lib/components/icons/bulb-icon.svelte';
	import EyeIcon from '$lib/components/icons/eye-icon.svelte';
	import ArrowRightIcon from '$lib/components/icons/arrow-right-icon.svelte';
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import { end_puzzle, main_theme, next_puzzle, puzzle_hint, puzzle_solution, pz, solution_san, theme_words } from './puzzle.svelte';
	import { get_learn_state } from './learn_context.svelte';
	import { glass, lit } from './ui';
	const s = get_learn_state();

	const theme = $derived(theme_words(main_theme(pz.p)) || 'tactic');
	const mover = $derived(pz.p?.f.split(' ')[1] === 'b' ? 'black' : 'white');
	const steps = $derived(Math.ceil(pz.line.length / 2));
	const done = $derived(Math.ceil(pz.i / 2));
	const say = $derived(
		pz.st === 'w' ? (pz.shown ? 'that’s the line.' : 'solved.') : pz.st === 'y' ? 'yes. keep going.' : pz.st === 'n' ? 'not quite. try again.' : `${mover} to play. find the best move.`
	);
</script>

<div class="flex w-full flex-col gap-2 animate-surface" aria-live="polite">
	<div class="flex items-center justify-between gap-3">
		<p class="font-calm-mono text-xs tracking-[0.14em] text-mist">
			<span class="text-glow">puzzle</span> · {theme} · {pz.p?.r}
		</p>
		<div class="flex items-center gap-1" aria-label="{done} of {steps} moves found">
			{#each Array(steps) as _, k}
				<span class="block size-1.5 rounded-full transition duration-500 ease-expo {k < done ? 'bg-glow' : 'bg-haze/25'}"></span>
			{/each}
		</div>
	</div>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<p class="text-[15px] transition-colors duration-500 {pz.st === 'n' ? 'text-[#e78686]' : pz.st === 'w' ? 'text-glow' : 'text-haze/85'}">{say}</p>
		<div class="flex items-center gap-1.5">
			{#if pz.st === 'w'}
				<button title="Why it works" aria-label="Why it works" class={glass} onclick={() => s.sendChatMessage(`why does ${solution_san(pz.p)} work in this ${theme} puzzle?`)}>
					<span class="font-calm-mono text-xs">why</span>
				</button>
			{:else}
				<button title="Puzzle hint" aria-label="Puzzle hint" class={glass} onclick={puzzle_hint} disabled={pz.st === 'n'}>
					<BulbIcon size={16} strokeWidth={1.8} />
				</button>
				<button title="Show solution" aria-label="Show solution" class={glass} onclick={puzzle_solution} disabled={pz.st === 'n'}>
					<EyeIcon size={16} strokeWidth={1.8} />
				</button>
			{/if}
			<button title="Next puzzle" aria-label="Next puzzle" class={pz.st === 'w' ? lit : glass} onclick={() => next_puzzle()} disabled={pz.busy}>
				<ArrowRightIcon size={16} strokeWidth={1.8} />
			</button>
			<button title="Exit puzzle" aria-label="Exit puzzle" class={glass} onclick={end_puzzle}>
				<XIcon size={15} strokeWidth={1.8} />
			</button>
		</div>
	</div>
</div>
