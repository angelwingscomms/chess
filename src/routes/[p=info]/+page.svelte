<script lang="ts">
	import { page } from '$app/state';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { info } from '$lib/info';

	const x = $derived(info[page.params.p!]);
</script>

<Seo meta={{ t: `${x.t} — e4`, d: x.d }} />

<main class="calm relative z-10 mx-auto max-w-2xl px-6 pt-24 pb-16 font-calm font-light text-haze">
	<a href="/" class="font-calm-mono text-xs tracking-[0.16em] text-mist hover:text-haze">e4</a>
	<h1 class="mt-6 text-[clamp(2.2rem,6vw,3.6rem)] leading-[1] font-extralight tracking-[-0.04em]">{x.t}</h1>
	<p class="mt-5 text-lg leading-relaxed text-haze/90">{x.d}</p>
	{#each x.s as [h, b, c] (h)}
		<h2 class="mt-12 text-2xl font-light tracking-[-0.02em]">{h}</h2>
		<p class="mt-3 leading-relaxed text-haze/90">{b}</p>
		{#if c}<pre class="mt-4 overflow-x-auto rounded-xl bg-haze/5 p-4 font-calm-mono text-xs text-haze/90"><code>{c}</code></pre>{/if}
	{/each}
	<nav class="mt-16 flex flex-wrap gap-5 font-calm-mono text-xs tracking-[0.14em] text-mist">
		{#each Object.entries(info) as [k, v] (k)}<a href="/{k}" class="hover:text-haze">{v.t}</a>{/each}
	</nav>
</main>
