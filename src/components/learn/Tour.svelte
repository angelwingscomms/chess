<script lang="ts">
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';
	import { get_learn_state } from './learn_context.svelte';
	import { ls } from './lesson.svelte';
	const s = get_learn_state();
	let { wait = 0 }: { wait?: number } = $props();

	$effect(() => {
		// the tour shows the game, so it waits until lessons are closed
		if (!s.show_tour || !s.ready || ls.on) return;
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
						description: 'Learn chess by playing. Your coach explains anything you ask, in plain words. Here’s a quick look around, about 30 seconds.'
					}
				},
				{
					element: '[data-tour="board"]',
					popover: { title: 'your board', description: 'Tap a piece to see where it can go, then tap a glowing square to move it. The computer plays the other side.', side: 'right', align: 'center' }
				},
				{
					element: '[data-tour="lessons"]',
					popover: { title: 'new to chess?', description: 'Short lessons, step by step: how every piece moves, the rules, clever tricks and famous checkmates. Your coach helps with each one. Start here if you’ve never played.', side: 'top', align: 'center' }
				},
				{
					element: '[data-tour="hint"]',
					popover: { title: 'stuck?', description: 'Tap the bulb and a good move lights up. Tap “why” and the coach tells you why it’s good.', side: 'top', align: 'center' }
				},
				{
					element: '[data-tour="puzzle"]',
					popover: { title: 'puzzles', description: 'Short challenges: find the winning move. They match your level. You can also ask the coach, like “an easy puzzle, please”.', side: 'top', align: 'end' }
				},
				{
					element: '[data-tour="view"]',
					popover: { title: 'see it in 3d', description: 'Tap here to turn the board into a real 3D chess set. Drag around it to spin it any way you like.', side: 'top', align: 'end' }
				},
				{
					element: '[data-tour="chat"]',
					popover: { title: 'ask your coach', description: 'Type any question, even “how does the knight move?”. The coach can see your board.', side: 'top', align: 'center' }
				},
				{
					element: '[data-tour="voice"]',
					popover: { title: 'talk out loud', description: 'Tap “talk” and just speak, like a phone call. Your coach listens and answers out loud.', side: 'bottom', align: 'end' }
				},
				{
					element: '[data-tour="more"]',
					popover: { title: 'new game and more', description: 'Start over, turn the board around, or play as black.', side: 'bottom', align: 'end' }
				},
				{
					element: '[data-tour="settings"]',
					popover: { title: 'make it yours', description: 'Make the computer easier or harder, pick how your coach helps, and turn on extras like living colours. Sound is in the top bar.', side: 'bottom', align: 'end' }
				}
			],
		});
		setTimeout(() => tour.drive(), wait);
	});
</script>
