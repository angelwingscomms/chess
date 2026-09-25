<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
	import { calm, palettes, use_scene } from '$lib/landing/calm.svelte';
	import WhyDemo from '$components/landing/WhyDemo.svelte';
	import PuzzleRiver from '$components/landing/PuzzleRiver.svelte';
	import Wave from '$components/landing/Wave.svelte';

	const shards = [
		[-64, -40, -24],
		[-22, -72, 14],
		[18, -58, -10],
		[46, -24, 22],
		[70, 12, -16],
		[34, 64, 30],
		[88, 46, -26],
		[120, -8, 18],
		[140, 60, 36]
	];
	const sound = calm.sound;

	let hero_slot = $state<HTMLDivElement>();
	let end_slot = $state<HTMLDivElement>();
	let num = $state<HTMLSpanElement>();
	let sections = $state<HTMLElement[]>([]);
	let leaving = $state(false);
	let play: (e: MouseEvent) => void = () => {};
	const mini = import('$components/landing/Mini.svelte');
	const board_w = 'w-[min(86vw,calc(100svh-16rem))] lg:w-[min(34vw,calc(100svh-21rem))]';

	function go(e: MouseEvent) {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		calm.arm();
		leaving = true;
		setTimeout(() => {
			calm.handoff = 'glide';
			goto('/i');
		}, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 450);
	}

	const first = $derived((page.data.user?.name ?? '').split(' ')[0].toLowerCase());
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	const mix = (a: number, b: number, t: number) => a + (b - a) * t;
	const smooth = (t: number) => t * t * (3 - 2 * t);
	const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

	function reveal(node: HTMLElement) {
		const items = node.querySelectorAll<HTMLElement>('[data-r]');
		if (node.getBoundingClientRect().top < innerHeight * 0.9) return;
		items.forEach((i) => (i.dataset.s = 'a'));
		const io = new IntersectionObserver(
			([e]) => {
				if (!e.isIntersecting) return;
				items.forEach((i) => (i.dataset.s = 'i'));
				io.disconnect();
			},
			{ rootMargin: '0px 0px -14% 0px' }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}

	function magnet(node: HTMLElement) {
		if (!matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
		const btn = node.firstElementChild as HTMLElement;
		const move = (e: PointerEvent) => {
			const r = node.getBoundingClientRect();
			btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
		};
		const leave = () => (btn.style.transform = '');
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerleave', leave);
		return {
			destroy() {
				node.removeEventListener('pointermove', move);
				node.removeEventListener('pointerleave', leave);
			}
		};
	}

	onMount(() => {
		const motion = matchMedia('(prefers-reduced-motion: no-preference)').matches;
		const shard_els = num ? ([...num.children] as HTMLElement[]) : [];
		const pal = new Float32Array(15);

		let sy = scrollY;
		let vw = innerWidth;
		let vh = innerHeight;
		let tops: number[] = [];
		let sect = 0;
		let move_t0 = 0;
		let hr = { left: 0, top: 0, width: 0, height: 0, bottom: 0 };
		let landed = false;

		const measure = () => {
			vw = innerWidth;
			vh = innerHeight;
			tops = sections.map((s) => s.getBoundingClientRect().top + scrollY);
		};
		const ro = new ResizeObserver(measure);
		ro.observe(document.body);
		measure();

		const stop = use_scene((now, dt) => {
			const target = scrollY;
			sy = motion ? sy + (target - sy) * (1 - Math.exp(-4 * dt)) : target;
			const lag = target - sy;
			// the slot is swapped for the live board once it loads, so keep the last rect meanwhile
			if (hero_slot) hr = hero_slot.getBoundingClientRect();
			const er = end_slot!.getBoundingClientRect();
			// the board stays a playable board until it scrolls up past the middle of the screen
			const a = motion ? smooth(clamp((vh * 0.5 - hr.bottom) / (vh * 0.6))) : hr.bottom < vh * 0.3 ? 1 : 0;
			const b = motion ? smooth(clamp((vh - er.top - lag) / (vh * 0.7))) : er.top < vh * 0.5 ? 1 : 0;
			const sunk = [vw / 2, vh * 0.6, Math.max(vw, vh) * 1.3];
			const x = b > 0 ? mix(sunk[0], er.left + er.width / 2, b) : mix(hr.left + hr.width / 2, sunk[0], a);
			const y = b > 0 ? mix(sunk[1], er.top + lag + er.height / 2, b) : mix(hr.top + lag * a + hr.height / 2, sunk[1], a);
			const s = b > 0 ? mix(sunk[2], er.width, b) : mix(hr.width, sunk[2], a);
			const k = b > 0 ? 1 - b : a;
			const m = b > 0 ? 1 - b : Math.min(1, a * 1.25);

			let rank = 2;
			if (move_t0) {
				const p = motion ? clamp((now - move_t0) / 900) : 1;
				rank = 2 + 2 * ease(p);
				if (p >= 1 && !landed) {
					landed = true;
					sound.thock();
					sound.chord();
					calm.ripple(x - s / 2 + 4.5 * (s / 8), y - s / 2 + 4.5 * (s / 8), 1.6);
					leaving = true;
					setTimeout(
						() => {
							calm.handoff = 'e4';
							goto('/i');
						},
						motion ? 450 : 100
					);
				}
			}
			const glow = b > 0 ? b * b : clamp(1 - a * 2.5);

			const mid = sy + vh / 2;
			let i = 0;
			while (i < tops.length - 1 && tops[i + 1] <= mid) i++;
			const next = Math.min(i + 1, palettes.length - 1);
			const span = (tops[i + 1] ?? tops[i] + vh) - tops[i];
			const w = next > i ? smooth(clamp(((mid - tops[i]) / span - 0.65) / 0.35)) : 0;
			for (let j = 0; j < 15; j++) pal[j] = mix(palettes[i][j], palettes[next][j], w);
			if (i !== sect) {
				sect = i;
				if (i > 0) sound.bowl(i + 3);
			}

			if (num && shard_els.length) {
				const d = motion ? clamp((vh * 0.62 - num.getBoundingClientRect().top - lag) / (vh * 0.3)) : 0;
				shard_els.forEach((el, j) => {
					const [dx, dy, r] = shards[j];
					el.style.transform = d ? `translate3d(${dx * d}px, ${dy * d}px, 0) rotate(${r * d}deg)` : '';
					el.style.opacity = String(1 - d);
				});
			}

			const lit = b > 0 ? [4, rank, glow] : [calm.lit.c, calm.lit.r, Math.exp(-(now - calm.lit.t) / 900) * 0.9];
			return { x, y, s, k, m, p: pal, q: lit, w: b > 0 ? glow : 0, r: rank, f: 0, h: 0 };
		});

		play = (e: MouseEvent) => {
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			if (move_t0) return;
			calm.arm();
			sound.thock();
			move_t0 = performance.now();
		};

		return () => {
			stop();
			ro.disconnect();
		};
	});
</script>

<Seo meta={{ t: 'e4 — learn chess with an ai coach', d: 'learn chess from your first move with an ai coach that explains every move in plain words and talks with you out loud. free to start, no account needed.' }} />
<JsonLd data={{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'e4', applicationCategory: 'GameApplication', operatingSystem: 'Web', description: 'learn chess from your first move with an ai coach that explains every move in plain words, a friendly computer to play, and a million puzzles', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }} />


<main class="calm relative z-10 font-calm font-light text-haze transition-opacity duration-700 ease-calm {leaving ? 'opacity-0' : ''}">
	<section bind:this={sections[0]} class="relative grid min-h-svh items-center gap-10 px-[7vw] pt-24 pb-24 lg:grid-cols-[1fr_1fr] lg:gap-12">
		<div>
			<p class="font-calm-mono text-xs tracking-[0.16em] text-mist animate-surface">{first ? `welcome back, ${first}.` : 'e4 · your ai chess coach'}</p>
			<h1 class="mt-6 text-[clamp(3.8rem,8.4vw,8.4rem)] leading-[0.92] font-extralight tracking-[-0.05em] lg:mt-8">
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span class="block animate-rise [animation-delay:0.2s]">learn chess.</span></span>
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span class="block text-glow animate-rise [animation-delay:0.38s]">just ask.</span></span>
			</h1>
			<p class="mt-6 max-w-md text-lg leading-relaxed text-haze/70 animate-surface [animation-delay:0.9s] lg:mt-10">an ai coach that plays with you, explains every move in plain words, and talks with you out loud. never played? perfect.</p>
			<div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 animate-surface [animation-delay:1.2s] lg:mt-12">
				<a href="/i" onclick={go} class="group inline-flex items-center gap-3 rounded-full border border-haze/20 bg-haze/5 px-7 py-3.5 text-haze backdrop-blur-md transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow">
					start playing
					<span aria-hidden="true" class="transition-transform duration-500 ease-expo group-hover:translate-x-1">→</span>
				</a>
				<span class="font-calm-mono text-xs tracking-[0.14em] text-mist">free · start without an account</span>
			</div>
		</div>
		<div class="flex flex-col items-center">
			{#await mini}
				<div bind:this={hero_slot} class="aspect-square {board_w}"></div>
				<div class="mt-4 h-56 rounded-3xl border border-haze/10 bg-night/40 backdrop-blur-xl {board_w}"></div>
			{:then { default: Mini }}
				<Mini bind:slot={hero_slot} size={board_w} />
			{/await}
		</div>
		<div aria-hidden="true" class="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 sm:flex">
			<span class="font-calm-mono text-[11px] tracking-[0.2em] text-mist/70">scroll</span>
			<span class="block h-10 w-px bg-haze/40 animate-cue"></span>
		</div>
	</section>

	<section bind:this={sections[1]} class="relative flex min-h-svh flex-col justify-center px-[7vw] py-[22svh]">
		<div use:reveal>
			<p data-r class="font-calm-mono text-xs tracking-[0.16em] text-mist transition duration-1400 ease-expo data-[s=a]:opacity-0">01 — new to chess?</p>
			<h2 class="mt-10 text-[clamp(2.6rem,6.6vw,6.8rem)] leading-[1.02] font-extralight tracking-[-0.04em]">
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block transition-transform duration-1400 ease-expo data-[s=a]:translate-y-[110%]">you don’t need</span></span>
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block transition-transform delay-100 duration-1400 ease-expo data-[s=a]:translate-y-[110%]">a <span bind:this={num} class="inline-block whitespace-nowrap text-mist">{#each [...'rulebook.'] as ch}<span class="inline-block">{ch}</span>{/each}</span></span></span>
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block text-haze/55 transition-transform delay-200 duration-1400 ease-expo data-[s=a]:translate-y-[110%]">you need someone</span></span>
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block transition-transform delay-300 duration-1400 ease-expo data-[s=a]:translate-y-[110%]">to show you.</span></span>
			</h2>
			<p data-r class="mt-16 max-w-sm text-lg leading-relaxed text-haze/70 transition delay-500 duration-1400 ease-expo data-[s=a]:translate-y-6 data-[s=a]:opacity-0">tap any piece and it shows where it can go. ask why, and get an answer that makes sense.</p>
		</div>
	</section>

	<section bind:this={sections[2]} class="relative grid min-h-svh items-center gap-16 px-[7vw] py-[18svh] lg:grid-cols-2">
		<div use:reveal>
			<p data-r class="font-calm-mono text-xs tracking-[0.16em] text-mist transition duration-1400 ease-expo data-[s=a]:opacity-0">02 — the why</p>
			<h2 class="mt-10 text-[clamp(2.6rem,6.6vw,6.8rem)] leading-[1.02] font-extralight tracking-[-0.04em]">
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block transition-transform duration-1400 ease-expo data-[s=a]:translate-y-[110%]">lost in four moves?</span></span>
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block text-glow transition-transform delay-100 duration-1400 ease-expo data-[s=a]:translate-y-[110%]">ask why.</span></span>
			</h2>
			<p data-r class="mt-12 max-w-sm text-lg leading-relaxed text-haze/70 transition delay-300 duration-1400 ease-expo data-[s=a]:translate-y-6 data-[s=a]:opacity-0">your coach explains any move in one breath, in words you already know.</p>
		</div>
		<div class="flex justify-center lg:justify-end">
			<WhyDemo {sound} />
		</div>
	</section>

	<section bind:this={sections[3]} class="relative flex min-h-svh flex-col justify-center px-[7vw] py-[22svh]">
		<div use:reveal class="max-w-4xl">
			<p data-r class="font-calm-mono text-xs tracking-[0.16em] text-mist transition duration-1400 ease-expo data-[s=a]:opacity-0">03 — it waits</p>
			<h2 class="mt-10 text-[clamp(2.6rem,6.6vw,6.8rem)] leading-[1.02] font-extralight tracking-[-0.04em]">
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block transition-transform duration-1400 ease-expo data-[s=a]:translate-y-[110%]">it never plays</span></span>
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block transition-transform delay-100 duration-1400 ease-expo data-[s=a]:translate-y-[110%]">for you.</span></span>
			</h2>
			<p data-r class="mt-12 max-w-md text-lg leading-relaxed text-haze/70 transition delay-300 duration-1400 ease-expo data-[s=a]:translate-y-6 data-[s=a]:opacity-0">no hints until you ask. want to work it out yourself? switch it to questions, and it gives you clues instead of answers.</p>
			<p data-r class="mt-8 font-calm-mono text-xs tracking-[0.16em] text-glow/80 transition delay-500 duration-1400 ease-expo data-[s=a]:opacity-0">yes, it’s ai. the patient kind.</p>
		</div>
		<div use:reveal class="mt-[16svh] grid items-center gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
			<div>
				<h3 data-r class="text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.05] font-extralight tracking-[-0.03em] transition duration-1400 ease-expo data-[s=a]:translate-y-6 data-[s=a]:opacity-0">talk to it, out loud.</h3>
				<p data-r class="mt-6 max-w-sm text-lg leading-relaxed text-haze/70 transition delay-200 duration-1400 ease-expo data-[s=a]:translate-y-6 data-[s=a]:opacity-0">ask while you play. it listens and answers, like a friend sitting next to you.</p>
			</div>
			<div data-r class="transition delay-300 duration-2000 ease-expo data-[s=a]:opacity-0">
				<Wave
					on_tap={() => {
						sound.chime(7, 0.6);
						setTimeout(() => sound.chime(9, 0.5), 160);
					}}
				/>
			</div>
		</div>
	</section>

	<section bind:this={sections[4]} class="relative flex min-h-svh flex-col justify-center py-[20svh]">
		<div use:reveal class="px-[7vw]">
			<p data-r class="font-calm-mono text-xs tracking-[0.16em] text-mist transition duration-1400 ease-expo data-[s=a]:opacity-0">04 — practice</p>
			<h2 class="mt-10 text-[clamp(2.6rem,6.6vw,6.8rem)] leading-[1.02] font-extralight tracking-[-0.04em]">
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block transition-transform duration-1400 ease-expo data-[s=a]:translate-y-[110%]">a million puzzles.</span></span>
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block text-haze/55 transition-transform delay-100 duration-1400 ease-expo data-[s=a]:translate-y-[110%]">one at your level.</span></span>
			</h2>
			<p data-r class="mt-12 max-w-md text-lg leading-relaxed text-haze/70 transition delay-300 duration-1400 ease-expo data-[s=a]:translate-y-6 data-[s=a]:opacity-0">tiny challenges where you find the winning move. ask for an easy one, and it’s on your board.</p>
		</div>
		<div use:reveal class="mt-[12svh]">
			<div data-r class="transition duration-2000 ease-expo data-[s=a]:translate-y-10 data-[s=a]:opacity-0">
				<PuzzleRiver on_hover={() => sound.chime(5 + Math.floor(Math.random() * 7), 0.35)} />
			</div>
		</div>
	</section>

	<section bind:this={sections[5]} class="relative flex min-h-svh flex-col items-center px-[7vw] pt-[22svh] pb-16 text-center">
		<div use:reveal class="flex flex-col items-center">
			<p data-r class="font-calm-mono text-xs tracking-[0.16em] text-mist transition duration-1400 ease-expo data-[s=a]:opacity-0">05 — your move</p>
			<h2 class="mt-10 text-[clamp(2.6rem,6.6vw,6.8rem)] leading-[1.02] font-extralight tracking-[-0.04em]">
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block transition-transform duration-1400 ease-expo data-[s=a]:translate-y-[110%]">every game starts</span></span>
				<span class="-mb-[0.14em] block overflow-hidden pb-[0.14em]"><span data-r class="block transition-transform delay-100 duration-1400 ease-expo data-[s=a]:translate-y-[110%]">with one move.</span></span>
			</h2>
			<p data-r class="mt-8 max-w-sm text-lg leading-relaxed text-haze/70 transition delay-300 duration-1400 ease-expo data-[s=a]:translate-y-6 data-[s=a]:opacity-0">e4 is the most famous first move in chess. yours is next.</p>
		</div>
		<div bind:this={end_slot} class="mt-[8svh] aspect-square w-[min(80vw,48svh)]"></div>
		<div use:magnet class="mt-8 p-6">
			<a href="/i" onclick={(e) => play(e)} class="group relative inline-flex overflow-hidden rounded-full bg-glow px-12 py-5 text-xl font-normal text-night shadow-[0_0_80px_-10px_rgba(233,164,124,0.6)] transition duration-700 ease-expo hover:shadow-[0_0_120px_-10px_rgba(233,164,124,0.9)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow">
				<span class="block text-night transition-transform duration-500 ease-expo group-hover:-translate-y-[160%]">start playing</span>
				<span aria-hidden="true" class="absolute inset-0 grid translate-y-[160%] place-items-center font-calm-mono text-lg text-night transition-transform duration-500 ease-expo group-hover:translate-y-0">your move</span>
			</a>
		</div>
		<p class="mt-4 font-calm-mono text-xs tracking-[0.14em] text-mist">free · nothing to download · start without an account</p>
		<footer class="mt-auto flex w-full flex-wrap justify-between gap-4 pt-[10svh] font-calm-mono text-[11px] tracking-[0.14em] text-mist/70">
			<span>e4 — every move, explained.</span>
			<span>© {new Date().getFullYear()}</span>
		</footer>
	</section>
</main>

