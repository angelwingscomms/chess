<script lang="ts">
	import MicIcon from '$lib/components/icons/mic-icon.svelte';
	import MicMuteIcon from '$lib/components/icons/mic-mute-icon.svelte';
	import SpeakerIcon from '$lib/components/icons/speaker-icon.svelte';
	import SpeakerOffIcon from '$lib/components/icons/speaker-off-icon.svelte';
	import VideoIcon from '$lib/components/icons/video-icon.svelte';
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import { get_learn_state } from './learn_context.svelte';
	import { glass, lit } from './ui';
	const s = get_learn_state();

	let voice_muted = $derived(s.voice_muted);
	let audio_muted = $derived(s.audio_muted);
	let screen_recording = $derived(s.screen_recording);
</script>

<div class="flex items-center justify-between gap-2 rounded-2xl border border-glow/30 bg-glow/5 px-3 py-2 animate-surface">
	<p class="flex items-center gap-2.5 font-calm-mono text-xs tracking-[0.14em] text-glow">
		<span class="flex h-4 items-center gap-[3px]" aria-hidden="true">
			{#each ['[animation-delay:0s]', '[animation-delay:0.25s]', '[animation-delay:0.5s]'] as d}
				<span class="block h-4 w-[2px] rounded-full bg-glow {voice_muted ? 'scale-y-[0.2]' : `animate-bar ${d}`}"></span>
			{/each}
		</span>
		{s.thinking ? 'thinking…' : voice_muted ? 'mic muted' : 'listening'}
	</p>
	<div class="flex items-center gap-1.5">
		<button title={voice_muted ? 'Unmute mic' : 'Mute mic'} aria-label={voice_muted ? 'Unmute mic' : 'Mute mic'} class={voice_muted ? lit : glass} onclick={() => s.set_voice_muted(!s.voice_muted)}>
			{#if voice_muted}
				<MicMuteIcon size={16} strokeWidth={1.8} />
			{:else}
				<MicIcon size={16} strokeWidth={1.8} />
			{/if}
		</button>
		<button title={audio_muted ? 'Unmute speaker' : 'Mute speaker'} aria-label={audio_muted ? 'Unmute speaker' : 'Mute speaker'} class={audio_muted ? lit : glass} onclick={() => s.toggle_audio()}>
			{#if audio_muted}
				<SpeakerOffIcon size={16} strokeWidth={1.8} />
			{:else}
				<SpeakerIcon size={16} strokeWidth={1.8} />
			{/if}
		</button>
		<button title={screen_recording ? 'Stop screen recording' : 'Record screen with audio'} aria-label={screen_recording ? 'Stop screen recording' : 'Record screen with audio'} class={screen_recording ? `${lit} motion-safe:animate-pulse` : glass} onclick={() => s.toggle_screen_recording()}>
			<VideoIcon size={16} strokeWidth={1.8} />
		</button>
		<button title="End voice" aria-label="End voice" class={glass} onclick={() => s.toggleGeminiLive()}>
			<XIcon size={15} strokeWidth={1.8} />
		</button>
	</div>
</div>
