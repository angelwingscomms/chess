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
						description: 'learn chess by playing. your coach explains anything you ask, in plain words. here’s a quick look around, about 30 seconds.'
					}
				},
				{
					element: '[data-tour="board"]',
					popover: { title: 'your board', description: 'tap a piece to see where it can go, then tap a glowing square to move it. the computer plays the other side.', side: 'right', align: 'center' }
				},
				{
					element: '[data-tour="hint"]',
					popover: { title: 'stuck?', description: 'tap the bulb and a good move lights up. tap “why” and the coach tells you why it’s good.', side: 'top', align: 'center' }
				},
				{
					element: '[data-tour="puzzle"]',
					popover: { title: 'puzzles', description: 'short challenges: find the winning move. they match your level. you can also ask the coach, like “an easy puzzle, please”.', side: 'top', align: 'end' }
				},
				{
					element: '[data-tour="view"]',
					popover: { title: 'see it in 3d', description: 'tap here to turn the board into a real 3d chess set. drag around it to spin it any way you like.', side: 'top', align: 'end' }
				},
				{
					element: '[data-tour="chat"]',
					popover: { title: 'ask your coach', description: 'type any question, even “how does the knight move?”. the coach can see your board.', side: 'top', align: 'center' }
				},
				{
					element: '[data-tour="voice"]',
					popover: { title: 'talk out loud', description: 'tap “talk” and just speak, like a phone call. your coach listens and answers out loud.', side: 'bottom', align: 'end' }
				},
				{
					element: '[data-tour="more"]',
					popover: { title: 'new game and more', description: 'start over, turn the board around, or play as black.', side: 'bottom', align: 'end' }
				},
				{
					element: '[data-tour="settings"]',
					popover: { title: 'make it yours', description: 'make the computer easier or harder, pick how your coach helps, and turn on extras like living colours. sound is in the top bar.', side: 'bottom', align: 'end' }
				}
			],
		});
		setTimeout(() => tour.drive(), wait);
	});
</script>
