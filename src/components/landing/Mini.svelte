<script lang="ts">
	import { page } from '$app/state';
	import { create_learn_state, set_learn_state } from '$components/learn/learn_context.svelte';
	import ChessBoard from '$components/learn/ChessBoard.svelte';
	import ChatPanel from '$components/learn/ChatPanel.svelte';
	import TalkButton from '$components/learn/TalkButton.svelte';
	import ToastContainer from '$components/learn/ToastContainer.svelte';

	let { slot = $bindable(), size }: { slot?: HTMLDivElement; size: string } = $props();
	const s = create_learn_state(!!page.data.user, true);
	set_learn_state(s);
</script>

<div bind:this={slot} class="relative aspect-square animate-surface [&_coords]:!hidden {size}">
	<ChessBoard />
</div>
<div data-quiet class="mt-4 flex h-56 flex-col gap-2 rounded-3xl border border-haze/10 bg-night/40 p-2.5 backdrop-blur-xl animate-surface [animation-delay:0.3s] {size}">
	<div class="flex items-center justify-between gap-2">
		<p class="flex items-center gap-2 pl-1 font-calm-mono text-xs tracking-[0.16em] text-mist">
			<span class="block size-1.5 rounded-full {s.chat_loading || s.recording ? 'bg-glow motion-safe:animate-listen' : 'bg-haze/40'}"></span>
			{s.recording ? 'listening' : s.chat_loading ? 'thinking' : s.history.length || s.chat_messages.length ? 'your coach' : 'tap a piece to play'}
		</p>
		<TalkButton />
	</div>
	<ChatPanel hello="" placeholder="ask me anything…" />
</div>
{#if s.toasts.length}
	<ToastContainer toasts={s.toasts} />
{/if}
