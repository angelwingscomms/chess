<script lang="ts">
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Chessground } from 'svelte-chessground';
	import { bind_lesson_board, down, level, ls, moved, up } from './lesson.svelte';
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	let board = $state<Chessground>();
	let el = $state<HTMLDivElement>();
	const COL = ['col-start-1', 'col-start-2', 'col-start-3', 'col-start-4', 'col-start-5', 'col-start-6', 'col-start-7', 'col-start-8'];
	const ROW = ['row-start-1', 'row-start-2', 'row-start-3', 'row-start-4', 'row-start-5', 'row-start-6', 'row-start-7', 'row-start-8'];

	$effect(() => {
		if (board && el) return untrack(() => bind_lesson_board(board!, el!));
	});
</script>

<div bind:this={el} transition:fade={{ duration: 400 }} class="absolute inset-0 z-[2] {s.show_dests ? '' : '[&_square.move-dest]:!hidden'}" role="presentation" onpointerdown={down} onpointerup={up}>
	<Chessground bind:this={board} class="cg-default-style board-themed" config={{ orientation: 'white', coordinates: true, animation: { enabled: true, duration: 260 }, highlight: { lastMove: true, check: true }, premovable: { enabled: false }, drawable: { enabled: false }, movable: { free: false, color: 'white', showDests: true, events: { after: moved } } }} />
	<div class="pointer-events-none absolute inset-0 z-10 grid grid-cols-8 grid-rows-8" aria-hidden="true">
		{#each level().s ?? [] as q (q + ls.si + ls.li)}
			{@const f = q.charCodeAt(0) - 97}
			<span class="grid place-items-center text-[min(7vw,2.6rem)] text-glow drop-shadow-[0_0_14px_rgba(233,164,124,0.9)] transition duration-500 ease-expo {COL[ls.me === 'white' ? f : 7 - f]} {ROW[ls.me === 'white' ? 8 - +q[1] : +q[1] - 1]} {ls.got.includes(q) ? 'scale-150 opacity-0' : 'motion-safe:animate-twinkle'}">✦</span>
		{/each}
	</div>
</div>
