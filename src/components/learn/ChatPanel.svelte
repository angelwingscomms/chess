<script lang="ts">
	import { marked } from 'marked';
	import { NGN_USD } from '$lib/util/rates';
	import ArrowUpIcon from '$lib/components/icons/arrow-up-icon.svelte';
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import PlusIcon from '$lib/components/icons/plus-icon.svelte';
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
</script>

<div class="w-full rounded-xl bg-surface-card/72 overflow-hidden">
	<div bind:this={s.chat_body} class="relative max-h-80 overflow-y-auto px-4 py-3 space-y-3">
		{#if chat_messages.length === 0}
			<p class="text-[9px] text-muted text-center py-6">No messages yet</p>
		{/if}
		{#each chat_messages as msg, i (i)}
			<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
				{#if msg.role === 'assistant'}
				<div class="max-w-[85%] bg-canvas text-body rounded-[4px_16px_16px_16px] px-3.5 py-2.5 text-[9px] leading-relaxed text-left">
					{@html marked.parse(msg.content)}
					{#if msg.u}
						<span class="mt-1.5 block text-[10px] text-muted/60">₦{(msg.u.cost * NGN_USD).toFixed(2)}</span>
					{/if}
				</div>
				{:else}
				<div class="max-w-[85%] bg-primary text-white rounded-[16px_4px_16px_16px] px-3.5 py-2.5 text-[9px] leading-relaxed {i === pending_user_idx ? 'motion-safe:animate-chat-loading' : ''}">
					{msg.content}
				</div>
				{/if}
			</div>
		{/each}
		{#each chat_queue as q_msg, i (i)}
			<div class="flex justify-end">
				<div class="max-w-[85%] bg-primary/30 text-white rounded-[16px_4px_16px_16px] px-3.5 py-2.5 text-[9px] leading-relaxed flex items-center gap-2">
					<span>{q_msg.text}</span>
					<button title="Send this message now" onclick={() => s.promoteFromQueue(i)} class="shrink-0 grid place-items-center">
						<ArrowUpIcon size={12} strokeWidth={2} />
					</button>
					<button title="Remove queued message" onclick={() => s.removeFromQueue(i)} class="shrink-0 grid place-items-center">
						<XIcon size={12} strokeWidth={2} />
					</button>
				</div>
			</div>
		{/each}
		{#if sel_text && sel_pos}
			<button title="Append selected text to message"
				onclick={() => s.append_selection()}
				style="left:{sel_pos.x}px;top:{sel_pos.y}px"
				class="absolute z-50 -translate-x-1/2 -translate-y-full grid size-6 place-items-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
			>
				<PlusIcon size={14} strokeWidth={2.5} />
			</button>
		{/if}
	</div>
	{#if chat_suggestions.length > 0}
		<div class="flex flex-wrap items-center gap-1.5 px-3 pb-1">
			{#each chat_suggestions as suggestion}
				<button onclick={() => s.sendChatMessage(suggestion)} class="rounded-full border border-hairline bg-canvas px-3 py-1 text-xs text-muted transition-colors hover:border-primary/40 hover:text-ink">{suggestion}</button>
			{/each}
		</div>
	{/if}
	<div class="flex items-center gap-2 p-3">
		<textarea
			rows={1}
			bind:this={s.chat_input_ref}
			bind:value={s.chat_input}
			onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); s.sendChatMessage(s.chat_input); } }}
			oninput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
			placeholder="Ask about the position..."
			class="flex-1 min-h-[40px] max-h-32 bg-canvas text-ink px-3.5 py-2.5 text-[9px] outline-none border-none rounded-lg resize-none overflow-y-auto focus:outline-none focus:border-none focus:ring-0"
		></textarea>
		<button title="Send"
			onclick={() => s.sendChatMessage(s.chat_input)}
			disabled={!chat_loading && !chat_input.trim()}
			class="button-primary !border-0 !px-3 !min-h-[40px] !rounded-lg shrink-0"
		>→</button>
	</div>
</div>
