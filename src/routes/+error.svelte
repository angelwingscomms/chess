<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { use_ambient } from '$lib/landing/calm.svelte';

	onMount(() => use_ambient());
	const lost = $derived(page.status === 404);
</script>

<Seo meta={{ t: `${lost ? 'page not found' : 'something went wrong'} — e4`, d: 'this page could not be shown', n: true }} />

<main class="calm relative z-10 grid min-h-svh place-items-center px-6 pt-24 pb-16 font-calm font-light text-haze">
	<div class="w-full max-w-md text-center">
		<p class="font-calm-mono text-xs tracking-[0.16em] text-mist animate-surface">{page.status}</p>
		<h1 class="mt-6 text-[clamp(2.6rem,8vw,4.6rem)] leading-[0.95] font-extralight tracking-[-0.05em] animate-surface [animation-delay:0.15s]">{lost ? 'this square is empty.' : 'something slipped.'}</h1>
		<p class="mt-5 text-lg leading-relaxed text-haze/70 animate-surface [animation-delay:0.35s]">{lost ? 'there’s no page here. let’s get you back to the board.' : 'that didn’t work. take a breath and try again.'}</p>
		<div class="mt-10 flex flex-wrap items-center justify-center gap-3 animate-surface [animation-delay:0.55s]">
			<a href="/i" class="inline-flex min-h-12 items-center rounded-full bg-glow px-7 shadow-[0_0_60px_-12px_rgba(233,164,124,0.6)] transition duration-500 ease-expo hover:shadow-[0_0_80px_-8px_rgba(233,164,124,0.85)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow"><span class="text-night">back to the board</span></a>
			<a href="/" class="inline-flex min-h-12 items-center rounded-full border border-haze/20 bg-haze/5 px-7 backdrop-blur-md transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow"><span class="text-haze">home</span></a>
		</div>
	</div>
</main>
