<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
	import { calm, palettes, take_handoff, use_scene } from '$lib/landing/calm.svelte';
	import { create_learn_state, set_learn_state } from '$components/learn/learn_context.svelte';
	import ToastContainer from '$components/learn/ToastContainer.svelte';
	import CapturedPieces from '$components/learn/CapturedPieces.svelte';
	import BoardStatus from '$components/learn/BoardStatus.svelte';
	import GameActions from '$components/learn/GameActions.svelte';
	import BoardNavigation from '$components/learn/BoardNavigation.svelte';
	import HintLabel from '$components/learn/HintLabel.svelte';
	import ChessBoard from '$components/learn/ChessBoard.svelte';
	import ChatPanel from '$components/learn/ChatPanel.svelte';
	import SettingsModal from '$components/learn/SettingsModal.svelte';
	import TokenModal from '$components/learn/TokenModal.svelte';
	import Tour from '$components/learn/Tour.svelte';

	const s = create_learn_state(!!$page.data.user);
	set_learn_state(s);

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
		if (!arrived || !s.ready || opened) return;
		opened = true;
		setTimeout(
			() => {
				if (s.orientation === 'w' && s.fen.startsWith(START)) {
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
		if (arrived) setTimeout(() => (shown = true), 5000);
		return use_scene((now) => {
			const r = board_box!.getBoundingClientRect();
			const u = (now - t0) / 45000 + (arrived ? 3 : 0);
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
				f: s.orientation === 'b' ? 1 : 0
			};
		});
	});
</script>

<Seo meta={{ t: 'play — e4', d: 'play chess on a calm, breathing board. ask the coach why any move works, out loud or in words.' }} />
<JsonLd data={{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'e4', applicationCategory: 'GameApplication', operatingSystem: 'Web', description: 'a calm chess coach that explains every move, with hints, voice, and a million puzzles', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }} />

<main class="calm relative z-10 flex h-svh flex-col gap-4 overflow-hidden px-4 pt-[4.5rem] pb-4 font-calm font-light text-haze lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:gap-10 lg:px-[4vw] lg:pt-20 lg:pb-8">
	<h1 class="sr-only">e4 — play, learn, and ask why</h1>
	{#if s.toasts.length}
		<ToastContainer toasts={s.toasts} />
	{/if}
	<div class="flex min-h-0 flex-col items-center justify-center gap-3 lg:gap-4">
		<div bind:this={board_box} data-tour="board" class="relative aspect-square w-[min(100%,calc(100svh-26rem))] shrink-0 transition-opacity duration-700 ease-calm lg:w-[min(100%,calc(100svh-10rem))] {shown ? '' : 'opacity-0'}">
			<ChessBoard />
		</div>
		<div class="flex w-[min(100%,calc(100svh-26rem))] items-center justify-between gap-3 animate-surface [animation-delay:0.6s] lg:w-[min(100%,calc(100svh-10rem))]">
			<BoardStatus />
			<CapturedPieces />
		</div>
	</div>

	<aside data-quiet class="flex min-h-0 flex-1 flex-col gap-3 rounded-3xl border border-haze/10 bg-night/40 p-3 backdrop-blur-xl animate-surface [animation-delay:0.9s] lg:h-full lg:p-4">
		<div class="flex items-center gap-1.5">
			<GameActions />
		</div>
		<div class="flex items-center gap-1.5">
			<BoardNavigation />
			<HintLabel />
		</div>
		<ChatPanel />
	</aside>
</main>

<SettingsModal />
<TokenModal />
<Tour wait={arrived ? 3200 : 0} />
