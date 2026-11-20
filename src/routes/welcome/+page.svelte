<script lang="ts">
	import { onMount } from 'svelte';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { use_ambient } from '$lib/landing/calm.svelte';
	let { data } = $props();
	let kid = $state(false);
	let busy = $state(false);
	let err = $state('');
	const btn = 'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full px-6 text-[15px] transition duration-500 ease-expo active:scale-[0.97] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow';

	onMount(() => use_ambient());

	// a grown-up says yes, so the account may keep this player's games and chats
	async function yes() {
		busy = true;
		const r = await fetch('/api/me', { method: 'PATCH' }).catch(() => null);
		if (r?.ok) return void (location.href = data.next);
		busy = false;
		err = 'that didn’t save. check the connection and try again.';
	}

	async function guest() {
		await fetch('/logout', { method: 'POST' }).catch(() => {});
		location.href = '/i';
	}
</script>

<Seo meta={{ t: 'one quick question — e4', d: 'a grown-up says yes before e4 keeps a player’s games.', n: true }} />

<main class="calm relative z-10 grid min-h-svh place-items-center px-6 pt-24 pb-16 font-calm font-light text-haze">
	<div class="w-full max-w-sm" aria-live="polite">
		<p class="font-calm-mono text-xs tracking-[0.16em] text-mist animate-surface">e4 · one quick question</p>
		{#if !kid}
			<h1 class="mt-6 text-[clamp(2.6rem,8vw,3.8rem)] leading-[0.95] font-extralight tracking-[-0.04em] text-balance animate-surface [animation-delay:0.15s]">are you a grown-up?</h1>
			<p class="mt-5 text-lg leading-relaxed text-haze/90 text-pretty animate-surface [animation-delay:0.3s]">your account keeps your games and your chats with the coach. if the player is under 18, a parent or guardian says yes first.</p>
			<div class="mt-8 grid gap-3 animate-surface [animation-delay:0.45s]">
				<button class="{btn} bg-glow text-night shadow-[0_0_60px_-12px_color-mix(in_srgb,var(--color-glow)_60%,transparent)]" onclick={yes} disabled={busy}>
					{busy ? 'saving…' : 'yes, i’m 18 or older'}
				</button>
				<button class="{btn} border border-haze/20 bg-haze/5 text-haze hover:border-glow/60" onclick={() => (kid = true)}>i’m under 18</button>
				{#if err}<p class="text-sm text-bad" role="alert">{err}</p>{/if}
			</div>
			<p class="mt-6 text-sm leading-relaxed text-mist">a parent or guardian setting this up for a child can say yes too. it means you have read <a href="/privacy" class="text-haze underline underline-offset-4">what e4 keeps</a>.</p>
		{:else}
			<h1 class="mt-6 text-[clamp(2.6rem,8vw,3.8rem)] leading-[0.95] font-extralight tracking-[-0.04em] text-balance animate-surface">ask a grown-up.</h1>
			<p class="mt-5 text-lg leading-relaxed text-haze/90 text-pretty animate-surface [animation-delay:0.15s]">show this screen to a parent or guardian. they can tap yes below. or play without an account: your games stay on this phone.</p>
			<div class="mt-8 grid gap-3 animate-surface [animation-delay:0.3s]">
				<button class="{btn} bg-glow text-night" onclick={guest}>play without an account</button>
				<button class="{btn} border border-haze/20 bg-haze/5 text-haze hover:border-glow/60" onclick={yes} disabled={busy}>
					{busy ? 'saving…' : 'i’m their parent or guardian: yes'}
				</button>
				{#if err}<p class="text-sm text-bad" role="alert">{err}</p>{/if}
			</div>
		{/if}
	</div>
</main>
