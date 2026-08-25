<script lang="ts">
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	$effect(() => {
		if (!s.show_tour || !s.ready) return;
		s.show_tour = false;
		const done = () => localStorage.setItem('e4_tour_done', '1');
		const tour = driver({
			showProgress: true,
			progressText: '{{current}} of {{total}}',
			nextBtnText: 'Next',
			prevBtnText: 'Back',
			doneBtnText: 'Done',
			onDestroyed: done,
			steps: [
				{
					popover: {
						title: 'Welcome to e4',
						description: 'Play chess against Stockfish with an AI coach that explains every position. This quick tour shows you around — 30 seconds.',
					},
				},
				{
					element: '[data-tour="board"]',
					popover: {
						title: 'Make your move',
						description: 'Drag or tap a piece to move it. The engine replies instantly and adapts to your level.',
						side: 'top',
						align: 'center',
					},
				},
				{
					element: '[data-tour="hint"]',
					popover: {
						title: 'Stuck? Get a hint',
						description: 'Tap the bulb and the coach highlights a good move for you.',
						side: 'bottom',
						align: 'start',
					},
				},
				{
					element: '[data-tour="chat"]',
					popover: {
						title: 'Ask the AI coach',
						description: 'Type any question — why a move works, what to do next, ideas and plans. The coach sees the live board.',
						side: 'top',
						align: 'center',
					},
				},
				{
					element: '[data-tour="new"]',
					popover: {
						title: 'Start over anytime',
						description: 'The refresh button starts a new game.',
						side: 'bottom',
						align: 'start',
					},
				},
				{
					popover: {
						title: "Nice — that's the basics!",
						description: "You're ready to play. Want 5 more quick tips on undo, flip & history? Hit Next for a 20-sec extra, or close (×) to jump in.",
					},
				},
				{
					element: '[data-tour="undo"]',
					popover: {
						title: 'Undo',
						description: 'Take back your last move. Great for trying a different idea without restarting.',
						side: 'bottom',
						align: 'start',
					},
				},
				{
					element: '[data-tour="redo"]',
					popover: {
						title: 'Redo',
						description: 'Bring back the move you just undid.',
						side: 'bottom',
						align: 'start',
					},
				},
				{
					element: '[data-tour="flip-board"]',
					popover: {
						title: 'Flip board',
						description: 'Rotate your view of the board without changing the game.',
						side: 'bottom',
						align: 'start',
					},
				},
				{
					element: '[data-tour="switch-sides"]',
					popover: {
						title: 'Switch sides',
						description: 'Swap colors — you play the other side and the engine takes yours.',
						side: 'bottom',
						align: 'start',
					},
				},
				{
					element: '[data-tour="history"]',
					popover: {
						title: 'Move history',
						description: 'Step back and forward through earlier positions — arrows light up once you have moves to revisit.',
						side: 'bottom',
						align: 'start',
					},
				},
			],
		});
		tour.drive();
	});
</script>
