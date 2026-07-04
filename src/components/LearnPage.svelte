<script lang="ts">
	import { dev } from '$app/environment';
	import { page } from '$app/stores';
	import { pushState } from '$app/navigation';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
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

	const s = create_learn_state();
	set_learn_state(s);

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
</script>

<Seo meta={{t:'Train — sonu',d:'Train your chess skills against adaptive Stockfish AI with sonu. Get hints, analyze positions, chat with an AI coach, and choose from 30 voices.'}} />
<JsonLd data={{'@context':'https://schema.org','@type':'SoftwareApplication','name':'sonu','applicationCategory':'GameApplication','operatingSystem':'Web','description':'Play chess against Stockfish AI with interactive hints, AI analysis, and 30 AI voices','offers':{'@type':'Offer','price':'0','priceCurrency':'USD'}}} />
<main class="page-shell" style="background: url(/cosmic-chess-bg.webp) center/cover fixed; position: relative;">
	<div class="absolute inset-0 bg-surface-dark/85"></div>
	{#if dev && s.toasts.length}
		<ToastContainer toasts={s.toasts} />
	{/if}
	<div class="container relative z-[1] py-4">
		<div class="mx-auto flex w-full max-w-[1328px] flex-col gap-4">
			<div class="mx-auto w-full max-w-[640px] space-y-2 text-center">
				<h1 class="display-sm text-on-dark">sonu</h1>
				<p class="text-sm text-on-dark/70">Play, learn, and analyze. 30 AI voices to choose from.</p>
			</div>

			<div class="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,640px)_minmax(0,640px)] lg:items-start lg:justify-center">
			<div class="relative mx-auto w-full max-w-[640px] lg:mx-0">
				<ChessBoard />
			</div>

			<div class="mx-auto w-full max-w-[640px] space-y-2 rounded-xl bg-surface-card p-3 lg:mx-0">
				<CapturedPieces />
				<BoardStatus />
				<div class="flex items-center gap-1.5">
					<GameActions />
				</div>
				<div class="flex items-center gap-1.5">
					<BoardNavigation />
					<HintLabel />
				</div>
				<!-- {#if $page.data.user} -->
					<ChatPanel />
				<!-- {:else}
					<div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-hairline px-4 py-8 text-center">
						<p class="text-sm text-muted">Sign in to chat with your AI coach</p>
						<a href="/login" class="button-primary text-sm">Sign in</a>
					</div>
				{/if} -->
			</div>
		</div>
	</div>
	</div>
</main>

<SettingsModal />
<TokenModal />
