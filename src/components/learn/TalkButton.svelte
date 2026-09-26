<script lang="ts">
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	let waiting = $state(false);
	const bars = ['[animation-delay:0s]', '[animation-delay:0.25s]', '[animation-delay:0.5s]', '[animation-delay:0.12s]'];

	$effect(() => {
		if (s.recording) waiting = false;
	});

	function talk() {
		if (!s.recording) {
			waiting = true;
			setTimeout(() => (waiting = false), 12000);
		}
		s.toggleGeminiLive();
	}
</script>

<button
	type="button"
	data-tour="voice"
	aria-label={s.recording ? 'stop talking to your coach' : 'talk to your coach out loud'}
	aria-pressed={s.recording}
	disabled={typeof navigator === 'undefined' || !navigator.mediaDevices}
	onclick={talk}
	class="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition duration-500 ease-expo disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:h-10 lg:px-4 {s.recording ? 'border-glow bg-glow/15 text-glow' : 'border-glow/40 text-haze hover:border-glow hover:bg-glow/10'}"
>
	<span class="flex h-3.5 items-center gap-[2px]" aria-hidden="true">
		{#each bars as d}
			<span class="block h-3.5 w-[2px] rounded-full bg-current {s.recording || waiting ? `animate-bar ${d}` : 'scale-y-[0.45]'}"></span>
		{/each}
	</span>
	{s.recording ? (s.thinking ? 'thinking…' : 'listening') : waiting ? 'connecting…' : 'talk'}
</button>
