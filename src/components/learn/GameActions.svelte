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

<button title="New game" aria-label="New game" data-tour="new" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.resetGame()} disabled={!ready}>
	<RefreshIcon size={15} strokeWidth={1.8} />
</button>
<button title="Undo move" aria-label="Undo move" data-tour="undo" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.undoMove()} disabled={!ready || moveNum === 0 || gameOver}>
	<UndoIcon size={15} strokeWidth={1.8} />
</button>
<button title="Redo move" aria-label="Redo move" data-tour="redo" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.redoMove()} disabled={!ready || !redo_stack.length}>
	<RedoIcon size={15} strokeWidth={1.8} />
</button>
{#if show_hints}
	<button title="Hide hints" aria-label="Hide hints" class="grid size-9 place-items-center rounded-full border border-glow bg-glow/15 text-glow transition duration-500 ease-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10 {hint_loading ? 'motion-safe:animate-listen' : ''}" onclick={() => s.hideHints()} aria-busy={hint_loading}>
		<BulbIcon size={15} strokeWidth={1.8} />
	</button>
{:else}
	<button title="Show hint" aria-label="Show hint" data-tour="hint" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.showHint()} disabled={!ready || gameOver || hint_loading}>
		<BulbIcon size={15} strokeWidth={1.8} />
	</button>
{/if}
<span class="ml-auto flex items-center gap-1.5">
	<button title="Tutorial" aria-label="Tutorial" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10 font-calm-mono text-xs" onclick={() => s.show_tour = true}>?</button>
	<button title="Token usage" aria-label="Token usage" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.show_token_modal = true}>
		<InfoIcon size={13} strokeWidth={1.8} />
	</button>
	{#if chat_messages.length > 0}
		<button title="Clear chat" aria-label="Clear chat" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.clearChat()}>
			<XIcon size={13} strokeWidth={1.8} />
		</button>
	{/if}
	<button title="Settings" aria-label="Settings" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.show_settings = true}>
		<GearIcon size={15} strokeWidth={1.8} />
	</button>
</span>
