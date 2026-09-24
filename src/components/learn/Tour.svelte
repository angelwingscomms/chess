<script lang="ts">
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();
	let { wait = 0 }: { wait?: number } = $props();

	$effect(() => {
		if (!s.show_tour || !s.ready) return;
		s.show_tour = false;
		const done = () => localStorage.setItem('e4_tour_done', '1');
		const tour = driver({
			showProgress: true,
			progressText: '{{current}} of {{total}}',
			nextBtnText: 'next',
			prevBtnText: 'back',
			doneBtnText: 'done',
			onDestroyed: done,
			steps: [
				{
					popover: {
						title: 'welcome to e4',
						description: 'play stockfish on a calm board, with a coach that explains any move. a quick look around — 30 seconds.'
					}
				},
				{
					element: '[data-tour="board"]',
					popover: { title: 'make your move', description: 'drag or tap a piece. the engine answers, at the level you choose.', side: 'right', align: 'center' }
				},
				{
					element: '[data-tour="hint"]',
					popover: { title: 'stuck?', description: 'the bulb shows a good move. tap “why” and the coach explains it.', side: 'top', align: 'center' }
				},
				{
					element: '[data-tour="puzzle"]',
					popover: { title: 'puzzles', description: 'a puzzle at your level, checked move by move. or ask the coach for any theme — “forks, around 1200”.', side: 'top', align: 'end' }
				},
				{
					element: '[data-tour="chat"]',
					popover: { title: 'ask the coach', description: 'type any question. the coach sees the live board.', side: 'top', align: 'center' }
				},
				{
					element: '[data-tour="voice"]',
					popover: { title: 'talk out loud', description: 'tap the mic and just ask. it answers in a calm voice.', side: 'top', align: 'end' }
				},
				{
					element: '[data-tour="more"]',
					popover: { title: 'new game, flip, sides', description: 'start over, flip the board, or play as black.', side: 'bottom', align: 'end' }
				},
				{
					element: '[data-tour="settings"]',
					popover: { title: 'make it yours', description: 'living colours, hover notes and ripples start off, so the board stays clear. turn them on in settings for the full dreamy feel. sound lives in the top bar.', side: 'bottom', align: 'end' }
				}
			],
		});
		setTimeout(() => tour.drive(), wait);
	});
</script>
