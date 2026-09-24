<script lang="ts">
	import { get_learn_state } from './learn_context.svelte';
	import ArrowLeftIcon from '$lib/components/icons/arrow-left-icon.svelte';
	import ArrowRightIcon from '$lib/components/icons/arrow-right-icon.svelte';
	import FlipIcon from '$lib/components/icons/flip-icon.svelte';
	import MicIcon from '$lib/components/icons/mic-icon.svelte';
	import MicMuteIcon from '$lib/components/icons/mic-mute-icon.svelte';
	import SpeakerIcon from '$lib/components/icons/speaker-icon.svelte';
	import SpeakerOffIcon from '$lib/components/icons/speaker-off-icon.svelte';
	import VideoIcon from '$lib/components/icons/video-icon.svelte';
	const s = get_learn_state();

	let board_history = $derived(s.board_history);
	let board_history_idx = $derived(s.board_history_idx);
	let recording = $derived(s.recording);
	let screen_recording = $derived(s.screen_recording);
	let voice_muted = $derived(s.voice_muted);
	let audio_muted = $derived(s.audio_muted);
</script>

<span class="flex items-center gap-1.5" data-tour="history">
<button title="Previous board" aria-label="Previous board" data-tour="prev-board" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.go_back_board()} disabled={board_history_idx <= 0}>
	<ArrowLeftIcon size={15} strokeWidth={1.8} />
</button>
<button title="Next board" aria-label="Next board" data-tour="next-board" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.go_forward_board()} disabled={board_history_idx >= board_history.length - 1}>
	<ArrowRightIcon size={15} strokeWidth={1.8} />
</button>
</span>
<button title="Flip board" aria-label="Flip board" data-tour="flip-board" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.chessRef?.toggleOrientation()}>
	<span style="display:inline-flex;transform:scaleX(-1)"><FlipIcon size={15} strokeWidth={1.8} /></span>
</button>
<button title="Switch sides" aria-label="Switch sides" data-tour="switch-sides" class="grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10" onclick={() => s.flipColor()}>
	<FlipIcon size={15} strokeWidth={1.8} />
</button>
<button title={recording ? 'Stop recording' : 'Voice input'}
	onclick={() => s.toggleGeminiLive()}
	disabled={typeof navigator === 'undefined' || !navigator.mediaDevices}
	class={recording ? 'grid size-9 place-items-center rounded-full border border-glow bg-glow/15 text-glow transition duration-500 ease-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10 motion-safe:animate-pulse' : 'grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10'}
>
	<MicIcon size={15} strokeWidth={1.8} />
</button>
{#if recording}
<button title={voice_muted ? 'Unmute mic' : 'Mute mic'}
	onclick={() => s.set_voice_muted(!s.voice_muted)}
	class={voice_muted ? 'grid size-9 place-items-center rounded-full border border-glow bg-glow/15 text-glow transition duration-500 ease-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10' : 'grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10'}
>
	{#if voice_muted}
		<MicMuteIcon size={15} strokeWidth={1.8} />
	{:else}
		<MicIcon size={15} strokeWidth={1.8} />
	{/if}
</button>
<button title={audio_muted ? 'Unmute speaker' : 'Mute speaker'}
	onclick={() => s.toggle_audio()}
	class={audio_muted ? 'grid size-9 place-items-center rounded-full border border-glow bg-glow/15 text-glow transition duration-500 ease-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10' : 'grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10'}
>
	{#if audio_muted}
		<SpeakerOffIcon size={15} strokeWidth={1.8} />
	{:else}
		<SpeakerIcon size={15} strokeWidth={1.8} />
	{/if}
</button>
<button title={screen_recording ? 'Stop screen recording' : 'Record screen with audio'}
	onclick={() => s.toggle_screen_recording()}
	class={screen_recording ? 'grid size-9 place-items-center rounded-full border border-glow bg-glow/15 text-glow transition duration-500 ease-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10 motion-safe:animate-pulse' : 'grid size-9 place-items-center rounded-full border border-haze/15 bg-haze/5 text-haze/85 transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 hover:text-haze disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow lg:size-10'}
>
	<VideoIcon size={15} strokeWidth={1.8} />
</button>
{/if}
