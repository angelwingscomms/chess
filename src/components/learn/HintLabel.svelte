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
	<span class="ml-2 rounded-full border border-glow/50 bg-glow/10 px-3 py-1.5 font-calm-mono text-xs tracking-[0.08em] text-glow">{s.uciToSan(fen, hints[hint_index].move)}</span>
	<button title="Explain hint" aria-label="Explain hint" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10 {chat_loading ? 'motion-safe:animate-listen' : ''}" onclick={() => s.explainHint()}>
		<span class="font-calm-mono text-xs">why</span>
	</button>
{/if}
