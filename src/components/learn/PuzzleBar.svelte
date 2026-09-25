<script lang="ts">
	import BulbIcon from '$lib/components/icons/bulb-icon.svelte';
	import EyeIcon from '$lib/components/icons/eye-icon.svelte';
	import ArrowRightIcon from '$lib/components/icons/arrow-right-icon.svelte';
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import TargetIcon from '$lib/components/icons/target-icon.svelte';
	import { difficulty, end_puzzle, main_theme, next_puzzle, puzzle_hint, puzzle_solution, pz, solution_san, theme_meaning, theme_words, toggle_challenge } from './puzzle.svelte';
	import { say_move } from '$lib/util/chess/words';
	import { get_learn_state } from './learn_context.svelte';
	import ViewMenu from './ViewMenu.svelte';
	import { glass, lit } from './ui';
	const s = get_learn_state();

	const theme = $derived(theme_words(main_theme(pz.p)) || 'best move');
	const meaning = $derived(theme_meaning(main_theme(pz.p)));
	const mover = $derived(pz.p?.f.split(' ')[1] === 'b' ? 'black' : 'white');
	const sans = $derived(solution_san(pz.p).split(' '));
	const steps = $derived(Math.ceil(pz.line.length / 2));
	const done = $derived(Math.ceil(pz.i / 2));
	const challenge = $derived(pz.mode === 'c');
	const say = $derived.by(() => {
		const idea = meaning ? ` that’s a ${theme}: ${meaning}.` : '';
		if (pz.st === 'w') return (pz.shown ? 'that’s the answer.' : challenge ? 'solved!' : 'you found it! keep playing.') + idea;
		if (pz.st === 'x') return `the puzzle move was ${say_move(sans[pz.i] ?? '')}. keep playing.`;
		if (pz.st === 'n') return 'not quite. try again.';
		if (pz.st === 'y') return challenge ? 'yes! keep going.' : 'that’s the idea. keep playing.';
		return `you’re ${mover}. ${challenge ? 'find the best move.' : 'there’s a winning move here.'}`;
	});
	const ask = () =>
		s.sendChatMessage(
			pz.st === 'x' ? `the puzzle move was ${say_move(sans[pz.i] ?? '')}. why is that so strong?` : `why does this ${theme} work?`
		);
</script>

<div class="flex w-full flex-col gap-2 animate-surface" aria-live="polite">
	<div class="flex items-center justify-between gap-3">
		<p class="font-calm-mono text-xs tracking-[0.14em] text-mist">
			<span class="text-glow">{challenge ? 'challenge' : 'puzzle'}</span> · {theme} · {difficulty(pz.p?.r)}
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
			<button aria-label="Challenge mode" aria-pressed={challenge} data-tip={challenge ? 'challenge on: each move is checked' : 'challenge: check each move'} class={challenge ? lit : glass} onclick={toggle_challenge}>
				<TargetIcon size={16} strokeWidth={1.8} />
			</button>
			{#if pz.st === 'w' || pz.st === 'x'}
				<button aria-label="Why it works" data-tip="ask the coach why" class={glass} onclick={ask}>
					<span class="font-calm-mono text-xs">why</span>
				</button>
			{/if}
			{#if pz.st !== 'w'}
				<button aria-label="Puzzle hint" data-tip="hint" class={glass} onclick={puzzle_hint} disabled={pz.st === 'n' || pz.st === 'x' || pz.off}>
					<BulbIcon size={16} strokeWidth={1.8} />
				</button>
				<button aria-label="Show solution" data-tip="show the solution" class={glass} onclick={puzzle_solution} disabled={pz.st === 'n'}>
					<EyeIcon size={16} strokeWidth={1.8} />
				</button>
			{/if}
			<button aria-label="Next puzzle" data-tip="next puzzle" class={pz.st === 'w' ? lit : glass} onclick={() => next_puzzle()} disabled={pz.busy}>
				<ArrowRightIcon size={16} strokeWidth={1.8} />
			</button>
			<button aria-label="Exit puzzle" data-tip="exit puzzle" class={glass} onclick={end_puzzle}>
				<XIcon size={15} strokeWidth={1.8} />
			</button>
			<span class="mx-0.5 h-5 w-px bg-haze/15" aria-hidden="true"></span>
			<ViewMenu />
		</div>
	</div>
</div>
