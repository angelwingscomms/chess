<script lang="ts">
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	let hints = $derived(s.hints);
	let hint_index = $derived(s.hint_index);
	let fen = $derived(s.fen);
	let show_hints = $derived(s.show_hints);
	let hint_loading = $derived(s.hint_loading);
	let chat_loading = $derived(s.chat_loading);
</script>

{#if show_hints && !hint_loading && hints.length > 0}
	<span class="ml-2 rounded-full bg-primary px-2 py-1 text-[11px] font-medium text-white">{s.uciToSan(fen, hints[hint_index].move)}</span>
	<button title="Explain hint" aria-label="Explain hint" class="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-colors hover:text-primary disabled:text-muted {chat_loading ? 'motion-safe:animate-hint-loading' : ''}" onclick={() => s.explainHint()}>
		<span class="text-[11px]">?</span>
	</button>
{/if}
