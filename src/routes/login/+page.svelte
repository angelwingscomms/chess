<script lang="ts">
	import { onMount } from 'svelte';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { browser } from '$app/environment';
	import { use_ambient } from '$lib/landing/calm.svelte';

	let slot = $state<HTMLDivElement>();
	const q = browser ? new URLSearchParams(location.search) : null;
	const next = q?.get('next') || '/i';
	const failed = q?.has('e');

	onMount(() => use_ambient(() => slot));
</script>

<Seo meta={{ t: 'log in — e4', d: 'log in to e4 to keep your chess games and coach chats on every device.' }} />

<main class="calm relative z-10 grid min-h-svh items-center gap-12 px-[7vw] pt-28 pb-16 font-calm font-light text-haze lg:grid-cols-2 lg:gap-8">
	<div class="mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-center">
		<p class="font-calm-mono text-xs tracking-[0.16em] text-mist animate-surface">e4 · log in</p>
		<h1 class="mt-6 text-[clamp(3rem,7vw,5.5rem)] leading-[0.92] font-extralight tracking-[-0.05em]">
			<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span class="block animate-rise [animation-delay:0.15s]">welcome</span></span>
			<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span class="block animate-rise [animation-delay:0.3s]">back.</span></span>
		</h1>
		<p class="mt-5 text-lg leading-relaxed text-haze/90 lg:text-xl lg:leading-8 animate-surface [animation-delay:0.6s]">log in to keep your games and coach chats on every device.</p>

		<div class="mt-8 grid gap-4 animate-surface [animation-delay:0.8s]">
			<a href="/login/google?next={encodeURIComponent(next)}" class="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-haze/20 bg-haze/5 px-6 backdrop-blur-md transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow">
				<svg viewBox="0 0 24 24" class="size-[18px]" aria-hidden="true"><path class="fill-haze" d="M21.35 11.1H12v2.9h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95S8.78 6.2 12 6.2c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.65 14.53 2.7 12 2.7 6.87 2.7 2.7 6.87 2.7 12s4.17 9.3 9.3 9.3c5.37 0 8.93-3.77 8.93-9.09 0-.61-.07-1.08-.16-1.54z" /></svg>
				<span class="text-haze">continue with google</span>
			</a>
			{#if failed}
				<p class="text-sm text-bad" role="alert">google didn’t finish signing you in. try again?</p>
			{/if}
		</div>
		<p class="mt-8 text-sm text-mist animate-surface [animation-delay:1s]">
			no account? you don’t need one.
			<a href="/i" class="group ml-1 inline-flex items-center gap-1"><span class="text-haze transition group-hover:text-glow">start playing</span><span aria-hidden="true" class="text-haze transition-transform duration-500 ease-expo group-hover:translate-x-1 group-hover:text-glow">→</span></a>
		</p>
	</div>
	<div class="hidden flex-col items-center lg:flex">
		<div bind:this={slot} class="aspect-square w-[min(36vw,60svh)]"></div>
		<p class="mt-6 font-calm-mono text-[11px] tracking-[0.16em] text-mist/70 light:text-mist">touch the board</p>
	</div>
</main>
