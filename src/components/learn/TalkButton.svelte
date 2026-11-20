<script lang="ts">
	import { vc } from '$lib/voice/call.svelte';
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	const bars = ['[animation-delay:0s]', '[animation-delay:0.25s]', '[animation-delay:0.5s]', '[animation-delay:0.12s]'];
	// what the button says in each part of a call
	const label = $derived(
		vc.s === 'l' ? (vc.g > 0 && vc.g < 1 ? `getting ready ${Math.round(vc.g * 100)}%` : 'getting ready…') : vc.s === 'h' ? 'listening' : vc.s === 't' ? 'thinking…' : vc.s === 's' ? 'speaking' : 'talk'
	);
</script>

<button
	type="button"
	data-tour="voice"
	aria-label={vc.s ? 'stop talking to your coach' : 'talk to your coach out loud'}
	aria-pressed={!!vc.s}
	disabled={typeof navigator === 'undefined' || !navigator.mediaDevices}
	onclick={() => s.toggle_voice()}
	class="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm tabular-nums transition duration-500 ease-expo disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:h-10 lg:px-4 {vc.s ? 'border-glow bg-glow/15 text-glow' : 'border-glow/40 text-haze hover:border-glow hover:bg-glow/10'}"
>
	<span class="flex h-3.5 items-center gap-[2px]" aria-hidden="true">
		{#each bars as d}
			<span class="block h-3.5 w-[2px] rounded-full bg-current {vc.s ? `animate-bar ${d}` : 'scale-y-[0.45]'}"></span>
		{/each}
	</span>
	{label}
</button>
