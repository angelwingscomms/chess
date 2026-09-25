<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { calm, use_ambient } from '$lib/landing/calm.svelte';
	let { data } = $props();
	let countdown = $state(10);

	onMount(() => {
		const stop = use_ambient();
		if (data.success) calm.sound.chord();
		const t = setInterval(() => {
			countdown--;
			if (countdown <= 0) {
				clearInterval(t);
				goto('/i', { replaceState: true });
			}
		}, 1000);
		return () => {
			clearInterval(t);
			stop();
		};
	});
</script>

<Seo meta={{ t: `payment ${data.success ? 'done' : 'not finished'} — e4`, d: 'payment result', n: true }} />

<main class="calm relative z-10 grid min-h-svh place-items-center px-6 pt-24 pb-16 font-calm font-light text-haze">
	<div class="w-full max-w-sm text-center" aria-live="polite">
		<div class="mx-auto grid size-16 place-items-center rounded-full border animate-surface {data.success ? 'border-glow/50 bg-glow/10 text-glow shadow-[0_0_60px_-10px_rgba(233,164,124,0.7)]' : 'border-[#e78686]/40 bg-[#e78686]/10 text-[#e78686]'}">
			<svg class="size-7" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
				{#if data.success}
					<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
				{:else}
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				{/if}
			</svg>
		</div>
		<h1 class="mt-8 text-[clamp(2.4rem,7vw,3.6rem)] leading-[0.95] font-extralight tracking-[-0.04em] animate-surface [animation-delay:0.2s]">{data.success ? 'all done.' : 'not finished.'}</h1>
		<p class="mt-4 text-lg leading-relaxed text-haze/70 animate-surface [animation-delay:0.4s]">
			{data.success ? `your coach credit is now ₦${(data.balance / 100).toFixed(2)}.` : data.message.toLowerCase()}
		</p>
		<a href="/i" class="mt-10 inline-flex min-h-12 items-center gap-3 rounded-full border border-haze/20 bg-haze/5 px-7 backdrop-blur-md transition duration-500 ease-expo animate-surface [animation-delay:0.6s] hover:border-glow/60 hover:bg-glow/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow">
			<span class="text-haze">back to the board</span><span aria-hidden="true" class="text-haze">→</span>
		</a>
		<p class="mt-5 font-calm-mono text-xs tracking-[0.14em] text-mist">going back by itself in {countdown}…</p>
	</div>
</main>
