<script lang="ts">
	import { marked } from 'marked';
	import { NGN_USD } from '$lib/util/rates';
	import ArrowUpIcon from '$lib/components/icons/arrow-up-icon.svelte';
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import PlusIcon from '$lib/components/icons/plus-icon.svelte';
	import MicIcon from '$lib/components/icons/mic-icon.svelte';
	import VoiceStrip from './VoiceStrip.svelte';
	import { pz } from './puzzle.svelte';
	import { calm } from '$lib/landing/calm.svelte';
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	let chat_messages = $derived(s.chat_messages);
	let chat_queue = $derived(s.chat_queue);
	let chat_loading = $derived(s.chat_loading);
	let chat_input = $derived(s.chat_input);
	let chat_suggestions = $derived(s.chat_suggestions);
	let pending_user_idx = $derived(s.pending_user_idx);
	let sel_text = $derived(s.sel_text);
	let sel_pos = $derived(s.sel_pos);
	let recording = $derived(s.recording);

	let said = 0;
	let ticked = 0;

	$effect(() => {
		const last = chat_messages[chat_messages.length - 1];
		const n = last?.role === 'assistant' ? last.content.length : 0;
		if (n > said && performance.now() - ticked > 70) {
			calm.sound.tick();
			ticked = performance.now();
		}
		said = n;
	});
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div bind:this={s.chat_body} class="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-2 text-[15px] leading-relaxed">
		{#if chat_messages.length === 0}
			<p class="m-auto max-w-[16rem] text-center font-calm-mono text-xs leading-relaxed tracking-[0.14em] text-mist">ask about any move. the coach waits until you do.</p>
		{/if}
		{#each chat_messages as msg, i (i)}
			{#if msg.role === 'assistant'}
				<div class="calm-md max-w-[94%] self-start rounded-2xl rounded-bl-md border border-haze/10 bg-night/50 px-4 py-3 text-haze backdrop-blur-md animate-surface">
					<span class="mb-1 block font-calm-mono text-[11px] tracking-[0.16em] text-glow">e4</span>
					{@html marked.parse(msg.content)}
					{#if msg.u}
						<span class="mt-2 block font-calm-mono text-[10px] tracking-[0.1em] text-mist/60">₦{(msg.u.cost * NGN_USD).toFixed(2)}</span>
					{/if}
				</div>
			{:else}
				<p class="max-w-[85%] self-end rounded-2xl rounded-br-md bg-haze/10 px-4 py-2.5 text-haze/85 animate-surface {i === pending_user_idx ? 'motion-safe:animate-chat-loading' : ''}">{msg.content}</p>
			{/if}
		{/each}
		{#each chat_queue as q_msg, i (i)}
			<div class="flex max-w-[85%] items-center gap-2 self-end rounded-2xl rounded-br-md border border-dashed border-haze/20 px-4 py-2.5 text-haze/60">
				<span>{q_msg.text}</span>
				<button title="Send this message now" aria-label="Send this message now" onclick={() => s.promoteFromQueue(i)} class="grid shrink-0 place-items-center text-haze/70 transition hover:text-glow">
					<ArrowUpIcon size={13} strokeWidth={2} />
				</button>
				<button title="Remove queued message" aria-label="Remove queued message" onclick={() => s.removeFromQueue(i)} class="grid shrink-0 place-items-center text-haze/70 transition hover:text-glow">
					<XIcon size={13} strokeWidth={2} />
				</button>
			</div>
		{/each}
		{#if sel_text && sel_pos}
			<button
				title="Append selected text to message"
				aria-label="Append selected text to message"
				onclick={() => s.append_selection()}
				style="left:{sel_pos.x}px;top:{sel_pos.y}px"
				class="absolute z-50 grid size-7 -translate-x-1/2 -translate-y-full place-items-center rounded-full bg-glow text-night shadow-[0_0_24px_rgba(233,164,124,0.6)] transition duration-300 ease-expo hover:scale-110 active:scale-95"
			>
				<PlusIcon size={14} strokeWidth={2.5} />
			</button>
		{/if}
	</div>
	{#if chat_suggestions.length > 0 && !pz.on}
		<div data-ms class="flex flex-wrap gap-2 pt-2">
			{#each chat_suggestions as suggestion}
				<button onclick={() => s.sendChatMessage(suggestion)} class="rounded-full border border-glow/40 px-3.5 py-1.5 text-sm text-haze/90 transition duration-500 ease-expo hover:border-glow hover:bg-glow/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow">{suggestion.toLowerCase()}</button>
			{/each}
		</div>
	{/if}
	{#if recording}
		<div class="mt-3">
			<VoiceStrip />
		</div>
	{/if}
	<div data-mi class="mt-3 flex items-end gap-1 rounded-2xl border border-haze/15 bg-haze/5 p-1.5 transition duration-500 ease-expo focus-within:border-glow/50">
		<textarea
			data-tour="chat"
			rows={1}
			bind:this={s.chat_input_ref}
			bind:value={s.chat_input}
			onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); s.sendChatMessage(s.chat_input); } }}
			oninput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
			placeholder="ask about the position…"
			class="max-h-32 min-h-[40px] flex-1 resize-none overflow-y-auto border-none bg-transparent px-3 py-2.5 text-[15px] text-haze outline-none placeholder:text-mist/70 focus:border-none focus:ring-0 focus:outline-none"
		></textarea>
		<button
			title={recording ? 'Stop talking' : 'Talk to the coach'}
			aria-label="Voice input"
			data-tour="voice"
			onclick={() => s.toggleGeminiLive()}
			disabled={typeof navigator === 'undefined' || !navigator.mediaDevices}
			class="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition duration-500 ease-expo disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow {recording ? 'bg-glow/20 text-glow motion-safe:animate-pulse' : 'text-haze/70 hover:bg-haze/10 hover:text-haze'}"
		>
			<MicIcon size={17} strokeWidth={1.8} />
		</button>
		<button
			title="Send"
			aria-label="Send"
			onclick={() => s.sendChatMessage(s.chat_input)}
			disabled={!chat_loading && !chat_input.trim()}
			class="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-glow text-night transition duration-500 ease-expo hover:shadow-[0_0_30px_rgba(233,164,124,0.6)] disabled:cursor-default disabled:opacity-30 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow"
		>
			<ArrowUpIcon size={16} strokeWidth={2} />
		</button>
	</div>
</div>
