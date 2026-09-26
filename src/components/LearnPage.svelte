<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
	import { calm, palettes, take_handoff, ui, use_scene } from '$lib/landing/calm.svelte';
	import { create_learn_state, set_learn_state } from '$components/learn/learn_context.svelte';
	import ToastContainer from '$components/learn/ToastContainer.svelte';
	import BoardBar from '$components/learn/BoardBar.svelte';
	import CoachBar from '$components/learn/CoachBar.svelte';
	import { bind_puzzles } from '$components/learn/puzzle.svelte';
	import ChessBoard from '$components/learn/ChessBoard.svelte';
	import Board3d from '$components/learn/Board3d.svelte';
	import { cam, load_view } from '$components/learn/view.svelte';
	import ChatPanel from '$components/learn/ChatPanel.svelte';
	import SettingsModal from '$components/learn/SettingsModal.svelte';
	import TokenModal from '$components/learn/TokenModal.svelte';
	import Tour from '$components/learn/Tour.svelte';

	const s = create_learn_state(!!$page.data.user, false, $page.url.searchParams.get('play') === 'first');
	set_learn_state(s);
	bind_puzzles(s);

	const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w';
	const cycle = [0, 2, 4, 5];
	const arrived = take_handoff();
	const born = performance.now();
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	const mix = (a: number, b: number, t: number) => a + (b - a) * t;
	const smooth = (t: number) => t * t * (3 - 2 * t);

	let shown = $state(!arrived);
	let board_box = $state<HTMLDivElement>();
	let opened = false;

	$effect(() => {
		if (!s.ready) return;
		const state_fen = $page.state?.fen as string | undefined;
		if (state_fen && state_fen !== s.fen) {
			s.fen = state_fen;
			if (s.chessRef) s.chessRef.load(state_fen);
			s.history = [];
			s.moveNum = 0;
			s.gameOver = false;
			s.resultMsg = '';
			s.hideHints(true);
			s.last_user_move = '';
			s.last_ai_move = '';
			s.redo_stack = [];
		}
	});

	$effect(() => {
		void cam.on;
		void shown;
		calm.wake();
	});

	$effect(() => {
		if (!arrived || !s.ready || opened) return;
		opened = true;
		setTimeout(
			() => {
				if (arrived === 'e4' && s.orientation === 'w' && s.fen.startsWith(START)) {
					calm.quiet = true;
					s.chessRef?.move('e4');
				}
				setTimeout(() => (shown = true), 300);
			},
			Math.max(0, 1150 - (performance.now() - born))
		);
	});

	onMount(() => {
		const t0 = performance.now();
		const pal = new Float32Array(15);
		calm.app = true;
		load_view();
		if (arrived) setTimeout(() => (shown = true), 5000);
		const stop = use_scene((now) => {
			const r = board_box!.getBoundingClientRect();
			const u = Math.max(0, now - t0) / 45000 + (arrived ? 3 : 0);
			const i = Math.floor(u) % cycle.length;
			const w = smooth(clamp(((u % 1) - 0.7) / 0.3));
			for (let j = 0; j < 15; j++) pal[j] = mix(palettes[cycle[i]][j], palettes[cycle[(i + 1) % cycle.length]][j], w);
			return {
				x: r.left + r.width / 2,
				y: r.top + r.height / 2,
				s: r.width,
				k: 0,
				m: 0,
				p: pal,
				q: [calm.lit.c, calm.lit.r, Math.exp(-(now - calm.lit.t) / 900) * 0.9],
				w: arrived && !shown ? 1 : 0,
				r: 4,
				f: s.orientation === 'b' ? 1 : 0,
				h: cam.on && shown ? 1 : 0
			};
		});
		return () => {
			stop();
			calm.app = false;
		};
	});
</script>

<Seo meta={{ t: 'play — e4', d: 'play chess with a friendly computer and ask your ai coach why any move works, out loud or in words.' }} />
<JsonLd data={{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'e4', applicationCategory: 'GameApplication', operatingSystem: 'Web', description: 'a calm chess coach that explains every move, with hints, voice, and a million puzzles', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }} />

<main class="calm relative z-10 flex h-svh flex-col gap-3 overflow-hidden px-3 pt-[4.25rem] pb-3 font-calm font-light text-haze lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:gap-10 lg:px-[4vw] lg:pt-20 lg:pb-8">
	<h1 class="sr-only">e4 — play, learn, and ask why</h1>
	{#if s.toasts.length}
		<ToastContainer toasts={s.toasts} />
	{/if}
	<div class="flex min-h-0 flex-col items-center justify-center gap-6 lg:gap-8">
		<div bind:this={board_box} data-tour="board" class="relative ml-4 aspect-square w-[min(calc(100%-1rem),calc(100svh-23rem))] shrink-0 transition-opacity duration-700 ease-calm lg:ml-5 lg:w-[min(calc(100%-1.25rem),calc(100svh-11.5rem))] {shown ? '' : 'opacity-0'}">
			<div class="size-full transition-opacity duration-500 ease-calm {cam.on ? 'pointer-events-none opacity-0' : ''}">
				<ChessBoard />
			</div>
			{#if !ui.flat}
				<Board3d {shown} />
			{/if}
		</div>
		<div class="relative z-10 w-full pl-4 animate-surface [animation-delay:0.6s] lg:ml-5 lg:w-[min(calc(100%-1.25rem),calc(100svh-11.5rem))] lg:pl-0">
			<BoardBar />
		</div>
	</div>

	<aside data-quiet class="relative z-10 flex min-h-0 flex-1 flex-col gap-2 rounded-3xl border border-haze/10 bg-night/40 p-2.5 backdrop-blur-xl lg:gap-3 animate-surface [animation-delay:0.9s] lg:h-full lg:p-4">
		<CoachBar />
		<ChatPanel />
	</aside>
</main>

<SettingsModal />
<TokenModal />
<Tour wait={arrived ? 3200 : 0} />
