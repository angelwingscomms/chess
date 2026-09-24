<script lang="ts">
	import { onMount } from 'svelte';
	import type { Sound } from '$lib/landing/sound';

	let { sound }: { sound: Sound } = $props();

	const lines = [
		'f7 was guarded only by your king. white’s queen and bishop both hit it — the queen takes f7, and it’s mate.',
		'g6. it blocks the queen and attacks her. she has to move — and f7 is safe.'
	];
	const pieces = [
		['wr1', 'wR', 'a1'], ['wn1', 'wN', 'b1'], ['wb1', 'wB', 'c1'], ['wk', 'wK', 'e1'], ['wn2', 'wN', 'g1'], ['wr2', 'wR', 'h1'],
		['wpa', 'wP', 'a2'], ['wpb', 'wP', 'b2'], ['wpc', 'wP', 'c2'], ['wpd', 'wP', 'd2'], ['wpe', 'wP', 'e4'], ['wpf', 'wP', 'f2'],
		['wpg', 'wP', 'g2'], ['wph', 'wP', 'h2'], ['wb2', 'wB', 'c4'], ['wq', 'wQ', 'h5'],
		['br1', 'bR', 'a8'], ['bb1', 'bB', 'c8'], ['bq', 'bQ', 'd8'], ['bk', 'bK', 'e8'], ['bb2', 'bB', 'f8'], ['br2', 'bR', 'h8'],
		['bpa', 'bP', 'a7'], ['bpb', 'bP', 'b7'], ['bpc', 'bP', 'c7'], ['bpd', 'bP', 'd7'], ['bpe', 'bP', 'e5'], ['bpf', 'bP', 'f7'],
		['bpg', 'bP', 'g7'], ['bph', 'bP', 'h7'], ['bn1', 'bN', 'c6'], ['bn2', 'bN', 'f6']
	];
	const fix: Record<string, string> = { bn2: 'g8', bpg: 'g6' };
	const at = (s: string) => ({ x: 7 - (s.charCodeAt(0) - 97), y: +s[1] - 1 });
	const mid = (s: string) => ({ x: at(s).x + 0.5, y: at(s).y + 0.5 });
	const light = Array.from({ length: 32 }, (_, i) => ({ x: (i % 4) * 2 + (Math.floor(i / 4) % 2), y: Math.floor(i / 4) }));
	const [h5, f7, c4, g6, f6, g8] = ['h5', 'f7', 'c4', 'g6', 'f6', 'g8'].map(mid);

	let host = $state<HTMLDivElement>();
	let step = $state(0);
	let typed = $state(['', '']);
	let done = $state([false, false]);
	let timers: ReturnType<typeof setTimeout>[] = [];

	function type(i: number) {
		let n = 0;
		const id = setInterval(() => {
			n++;
			typed[i] = lines[i].slice(0, n);
			if (n % 3 === 0) sound.tick();
			if (n < lines[i].length) return;
			clearInterval(id);
			done[i] = true;
		}, 24);
		timers.push(id);
	}

	function ask() {
		if (step === 2) return;
		step = 2;
		sound.thock();
		timers.push(setTimeout(() => type(1), 900));
	}

	onMount(() => {
		const io = new IntersectionObserver(
			([e]) => {
				if (!e.isIntersecting) return;
				io.disconnect();
				step = 1;
				timers.push(setTimeout(() => type(0), 1100));
			},
			{ threshold: 0.45 }
		);
		io.observe(host!);
		return () => {
			io.disconnect();
			timers.forEach(clearTimeout);
		};
	});
</script>

<div bind:this={host} class="w-full max-w-md">
	<svg viewBox="0 0 8 8" class="w-full overflow-hidden rounded-2xl shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]" role="img" aria-label="after e4 e5, bishop c4, knight c6, queen h5, knight f6 — white’s queen can take f7 with mate">
		<rect width="8" height="8" class="fill-haze/10" />
		{#each light as s}
			<rect x={s.x} y={s.y} width="1" height="1" class="fill-haze/25" />
		{/each}
		{#each [f6, g8] as s}
			<rect x={s.x - 0.5} y={s.y - 0.5} width="1" height="1" class="fill-glow/20 transition-opacity duration-1000 ease-calm {step === 2 ? 'opacity-0' : ''}" />
		{/each}
		<rect x={f7.x - 0.5} y={f7.y - 0.5} width="1" height="1" class="origin-center fill-glow/50 transition-opacity duration-1000 [transform-box:fill-box] {step === 1 && typed[0] ? 'animate-listen' : 'opacity-0'}" />
		<rect x={h5.x - 0.5} y={h5.y - 0.5} width="1" height="1" class="origin-center fill-glow/50 transition-opacity duration-1000 [transform-box:fill-box] {step === 2 && typed[1] ? 'animate-listen' : 'opacity-0'}" />
		{#each pieces as [id, p, s] (id)}
			{@const q = at(step === 2 && fix[id] ? fix[id] : s)}
			<image href="/pieces/gioco/{p}.svg" width="1" height="1" class="transition-transform duration-1000 ease-calm" style:transform="translate({q.x}px, {q.y}px)" />
		{/each}
		<g stroke-width="0.08" stroke-linecap="round" fill="none">
			<line x1={h5.x} y1={h5.y} x2={f7.x} y2={f7.y} pathLength="1" stroke-dasharray="1" stroke-dashoffset={step === 1 && typed[0] ? 0 : 1} class="stroke-glow transition-[stroke-dashoffset] duration-1400 ease-expo" />
			<line x1={c4.x} y1={c4.y} x2={f7.x} y2={f7.y} pathLength="1" stroke-dasharray="1" stroke-dashoffset={step >= 1 && typed[0] ? 0 : 1} class="stroke-glow transition-[stroke-dashoffset,opacity] delay-150 duration-1400 ease-expo {step === 2 ? 'opacity-30' : ''}" />
			<line x1={h5.x} y1={h5.y} x2={g6.x} y2={g6.y} pathLength="1" stroke-dasharray="1" stroke-dashoffset={step === 2 && typed[1] ? 0 : 1} class="stroke-haze/60 transition-[stroke-dashoffset] duration-1400 ease-expo" />
		</g>
	</svg>

	<div class="mt-6 flex min-h-56 flex-col gap-3 text-[15px] leading-relaxed" aria-live="polite">
		{#if step >= 1}
			<p class="max-w-[85%] self-end rounded-2xl rounded-br-md bg-haze/10 px-4 py-2.5 text-haze/85 animate-surface">why did i lose?</p>
			<div class="max-w-[94%] rounded-2xl rounded-bl-md border border-haze/10 bg-night/50 px-4 py-3 text-haze backdrop-blur-md animate-surface [animation-delay:0.5s]">
				<span class="mb-1 block font-calm-mono text-[11px] tracking-[0.16em] text-glow">e4</span>
				<span aria-hidden="true">{typed[0] || '…'}</span>
				{#if done[0]}<span class="sr-only">{lines[0]}</span>{/if}
			</div>
		{/if}
		{#if done[0] && step === 1}
			<button type="button" onclick={ask} class="mt-1 w-fit cursor-pointer self-end rounded-full border border-glow/40 px-4 py-2 text-haze/90 transition duration-500 ease-expo animate-surface hover:border-glow hover:bg-glow/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow">
				what should i have played?
			</button>
		{/if}
		{#if step === 2}
			<p class="max-w-[85%] self-end rounded-2xl rounded-br-md bg-haze/10 px-4 py-2.5 text-haze/85 animate-surface">what should i have played?</p>
			<div class="max-w-[94%] rounded-2xl rounded-bl-md border border-haze/10 bg-night/50 px-4 py-3 text-haze backdrop-blur-md animate-surface [animation-delay:0.5s]">
				<span class="mb-1 block font-calm-mono text-[11px] tracking-[0.16em] text-glow">e4</span>
				<span aria-hidden="true">{typed[1] || '…'}</span>
				{#if done[1]}<span class="sr-only">{lines[1]}</span>{/if}
			</div>
		{/if}
	</div>
</div>
