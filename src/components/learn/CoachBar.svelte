<script lang="ts">
	import GearIcon from '$lib/components/icons/gear-icon.svelte';
	import DotsIcon from '$lib/components/icons/dots-icon.svelte';
	import RefreshIcon from '$lib/components/icons/refresh-icon.svelte';
	import FlipIcon from '$lib/components/icons/flip-icon.svelte';
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import InfoIcon from '$lib/components/icons/info-icon.svelte';
	import { end_puzzle } from './puzzle.svelte';
	import TalkButton from './TalkButton.svelte';
	import { get_learn_state } from './learn_context.svelte';
	import { glass } from './ui';
	const s = get_learn_state();

	const item = 'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-haze/90 transition duration-300 ease-expo hover:bg-haze/10 hover:text-haze focus-visible:bg-haze/10 focus-visible:outline-none';

	let open = $state(false);
	let wrap = $state<HTMLDivElement>();
	let busy = $derived(s.chat_loading);
	let recording = $derived(s.recording);

	$effect(() => {
		if (!open) return;
		const away = (e: PointerEvent) => {
			if (!wrap?.contains(e.target as Node)) open = false;
		};
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		addEventListener('pointerdown', away);
		addEventListener('keydown', esc);
		return () => {
			removeEventListener('pointerdown', away);
			removeEventListener('keydown', esc);
		};
	});

	const run = (fn: () => void) => () => {
		open = false;
		fn();
	};
</script>

<div class="flex items-center justify-between gap-2">
	<p class="flex items-center gap-2 pl-1 font-calm-mono text-xs tracking-[0.16em] text-mist">
		<span class="block size-1.5 rounded-full {busy || recording ? 'bg-glow motion-safe:animate-listen' : 'bg-haze/40'}"></span>
		{s.thinking ? 'thinking' : recording ? 'listening' : busy ? 'writing' : 'coach'}
	</p>
	<div class="relative flex items-center gap-1.5" bind:this={wrap}>
		<TalkButton />
		<button title="Settings" aria-label="Settings" data-tour="settings" class={glass} onclick={() => (s.show_settings = true)}>
			<GearIcon size={16} strokeWidth={1.8} />
		</button>
		<button title="More" aria-label="More" aria-haspopup="menu" aria-expanded={open} data-tour="more" class={glass} onclick={() => (open = !open)}>
			<DotsIcon size={16} strokeWidth={1.8} />
		</button>
		{#if open}
			<div role="menu" class="absolute top-[calc(100%+8px)] right-0 z-30 w-56 rounded-2xl border border-haze/12 bg-deep/95 p-1.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-surface">
				<button role="menuitem" title="New game" aria-label="New game" data-tour="new" class={item} onclick={run(() => { end_puzzle(); s.resetGame(); })}>
					<RefreshIcon size={16} strokeWidth={1.6} />new game
				</button>
				<button role="menuitem" title="Flip board" aria-label="Flip board" class={item} onclick={run(() => s.chessRef?.toggleOrientation())}>
					<FlipIcon size={16} strokeWidth={1.6} />flip board
				</button>
				<button role="menuitem" title="Switch sides" aria-label="Switch sides" class={item} onclick={run(() => s.flipColor())}>
					<span class="grid size-4 place-items-center"><span class="block size-3 rounded-full border border-haze/70 {s.orientation === 'w' ? 'bg-haze/10' : 'bg-haze/80'}"></span></span>play as {s.orientation === 'w' ? 'black' : 'white'}
				</button>
				{#if s.chat_messages.length > 0}
					<button role="menuitem" title="Clear chat" aria-label="Clear chat" class={item} onclick={run(() => s.clearChat())}>
						<XIcon size={16} strokeWidth={1.6} />clear chat
					</button>
				{/if}
				<div class="mx-2 my-1 h-px bg-haze/10"></div>
				<button role="menuitem" title="Tutorial" aria-label="Tutorial" class={item} onclick={run(() => (s.show_tour = true))}>
					<span class="grid size-4 place-items-center font-calm-mono text-xs">?</span>show me around
				</button>
				<button role="menuitem" title="Token usage" aria-label="Token usage" class={item} onclick={run(() => (s.show_token_modal = true))}>
					<InfoIcon size={16} strokeWidth={1.6} />usage
				</button>
			</div>
		{/if}
	</div>
</div>
