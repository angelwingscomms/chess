<script lang="ts">
	import { get_learn_state } from './learn_context.svelte';
	import RefreshIcon from '$lib/components/icons/refresh-icon.svelte';
	import UndoIcon from '$lib/components/icons/undo-icon.svelte';
	import RedoIcon from '$lib/components/icons/redo-icon.svelte';
	import BulbIcon from '$lib/components/icons/bulb-icon.svelte';
	import GearIcon from '$lib/components/icons/gear-icon.svelte';
	import InfoIcon from '$lib/components/icons/info-icon.svelte';
	import XIcon from '$lib/components/icons/x-icon.svelte';
	const s = get_learn_state();

	let ready = $derived(s.ready);
	let moveNum = $derived(s.moveNum);
	let gameOver = $derived(s.gameOver);
	let redo_stack = $derived(s.redo_stack);
	let show_hints = $derived(s.show_hints);
	let hint_loading = $derived(s.hint_loading);
	let chat_messages = $derived(s.chat_messages);
	let chat_loading = $derived(s.chat_loading);
</script>

<button title="New game" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={() => s.resetGame()} disabled={!ready}>
	<RefreshIcon size={15} strokeWidth={1.8} />
</button>
<button title="Undo move" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={() => s.undoMove()} disabled={!ready || moveNum === 0 || gameOver}>
	<UndoIcon size={15} strokeWidth={1.8} />
</button>
<button title="Redo move" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={() => s.redoMove()} disabled={!ready || !redo_stack.length}>
	<RedoIcon size={15} strokeWidth={1.8} />
</button>
{#if show_hints}
	<button title="Hide hints" class="grid size-8 place-items-center rounded-full bg-primary text-white transition-colors disabled:bg-primary-disabled disabled:text-muted {hint_loading ? 'motion-safe:animate-hint-loading' : ''}" onclick={() => s.hideHints()} aria-busy={hint_loading}>
		<BulbIcon size={15} strokeWidth={1.8} />
	</button>
{:else}
	<button title="Show hint" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted" onclick={() => s.showHint()} disabled={!ready || gameOver || hint_loading}>
		<BulbIcon size={15} strokeWidth={1.8} />
	</button>
{/if}
<span class="ml-auto flex items-center gap-1.5">
	<button title="Token usage" class="grid size-8 place-items-center rounded-full bg-canvas text-muted transition-colors hover:text-primary" onclick={() => s.show_token_modal = true}>
		<InfoIcon size={13} strokeWidth={1.8} />
	</button>
	{#if chat_messages.length > 0}
		<button title="Clear chat" class="grid size-8 place-items-center rounded-full bg-canvas text-muted transition-colors hover:text-primary" onclick={() => s.clearChat()}>
			<XIcon size={13} strokeWidth={1.8} />
		</button>
	{/if}
	<button title="Settings" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary" onclick={() => s.show_settings = true}>
		<GearIcon size={15} strokeWidth={1.8} />
	</button>
</span>
