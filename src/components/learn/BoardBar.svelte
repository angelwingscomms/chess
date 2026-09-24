<script lang="ts">
	import UndoIcon from '$lib/components/icons/undo-icon.svelte';
	import RedoIcon from '$lib/components/icons/redo-icon.svelte';
	import BulbIcon from '$lib/components/icons/bulb-icon.svelte';
	import ArrowLeftIcon from '$lib/components/icons/arrow-left-icon.svelte';
	import ArrowRightIcon from '$lib/components/icons/arrow-right-icon.svelte';
	import PuzzleIcon from '$lib/components/icons/puzzle-icon.svelte';
	import BoardStatus from './BoardStatus.svelte';
	import CapturedPieces from './CapturedPieces.svelte';
	import PuzzleBar from './PuzzleBar.svelte';
	import { next_puzzle, pz } from './puzzle.svelte';
	import { get_learn_state } from './learn_context.svelte';
	import { glass, lit } from './ui';
	const s = get_learn_state();

	let ready = $derived(s.ready);
	let gameOver = $derived(s.gameOver);
	let history = $derived(s.history);
	let redo_stack = $derived(s.redo_stack);
	let board_history = $derived(s.board_history);
	let board_history_idx = $derived(s.board_history_idx);
	let hints = $derived(s.hints);
	let hint_index = $derived(s.hint_index);
	let fen = $derived(s.fen);
	let show_hints = $derived(s.show_hints);
	let hint_loading = $derived(s.hint_loading);
	let chat_loading = $derived(s.chat_loading);
</script>

{#if pz.on}
	<PuzzleBar />
{:else}
	<div class="flex w-full flex-col gap-2">
		<div class="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2">
			<div class="flex min-w-0 items-center gap-3">
				<BoardStatus />
				<CapturedPieces />
			</div>
			<div class="flex items-center gap-1.5">
				{#if board_history.length > 1}
					<span class="flex items-center gap-1.5" data-tour="history">
						<button title="Previous board" aria-label="Previous board" class={glass} onclick={() => s.go_back_board()} disabled={board_history_idx <= 0}>
							<ArrowLeftIcon size={16} strokeWidth={1.8} />
						</button>
						<button title="Next board" aria-label="Next board" class={glass} onclick={() => s.go_forward_board()} disabled={board_history_idx >= board_history.length - 1}>
							<ArrowRightIcon size={16} strokeWidth={1.8} />
						</button>
					</span>
					<span class="mx-0.5 h-5 w-px bg-haze/15" aria-hidden="true"></span>
				{/if}
				<button title="Undo move" aria-label="Undo move" data-tour="undo" class={glass} onclick={() => s.undoMove()} disabled={!ready || !history.length || gameOver}>
					<UndoIcon size={16} strokeWidth={1.8} />
				</button>
				{#if redo_stack.length}
					<button title="Redo move" aria-label="Redo move" data-tour="redo" class={glass} onclick={() => s.redoMove()}>
						<RedoIcon size={16} strokeWidth={1.8} />
					</button>
				{/if}
				{#if show_hints}
					<button title="Hide hints" aria-label="Hide hints" class="{lit} {hint_loading ? 'motion-safe:animate-listen' : ''}" onclick={() => s.hideHints()} aria-busy={hint_loading}>
						<BulbIcon size={16} strokeWidth={1.8} />
					</button>
				{:else}
					<button title="Show hint" aria-label="Show hint" data-tour="hint" class={glass} onclick={() => s.showHint()} disabled={!ready || gameOver || hint_loading}>
						<BulbIcon size={16} strokeWidth={1.8} />
					</button>
				{/if}
				<button title="Puzzle at your level" aria-label="Puzzle at your level" data-tour="puzzle" class={glass} onclick={() => next_puzzle('', undefined)} disabled={!ready || pz.busy}>
					<PuzzleIcon size={16} strokeWidth={1.8} />
				</button>
			</div>
		</div>
		{#if show_hints && !hint_loading && hints.length > 0}
			<div class="flex items-center justify-end gap-2 animate-surface">
				<span class="font-calm-mono text-xs tracking-[0.14em] text-mist">try</span>
				<span class="rounded-full border border-glow/50 bg-glow/10 px-3 py-1.5 font-calm-mono text-xs tracking-[0.08em] text-glow">{s.uciToSan(fen, hints[hint_index].move)}</span>
				<button title="Explain hint" aria-label="Explain hint" class="{glass} {chat_loading ? 'motion-safe:animate-listen' : ''}" onclick={() => s.explainHint()}>
					<span class="font-calm-mono text-xs">why</span>
				</button>
			</div>
		{/if}
	</div>
{/if}
