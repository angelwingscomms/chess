<script lang="ts">
	import { onMount } from 'svelte';

	let { on_tap }: { on_tap?: () => void } = $props();

	let svg = $state<SVGSVGElement>();
	let paths = $state<SVGPathElement[]>([]);
	let near = -1;
	let burst = 0;

	onMount(() => {
		const motion = matchMedia('(prefers-reduced-motion: no-preference)').matches;
		const t0 = performance.now();
		let raf = 0;
		let seen = false;
		const draw = (now: number) => {
			const t = (now - t0) / 1000;
			burst *= 0.965;
			paths.forEach((p, k) => {
				let d = '';
				for (let i = 0; i <= 96; i++) {
					const x = i / 96;
					const lift = near < 0 ? 0 : Math.exp(-((x - near) ** 2) / 0.012) * 0.45;
					const amp = (0.22 + 0.1 * Math.sin(t * 0.5 + k * 2) + lift + burst) * Math.sin(Math.PI * x) ** 2;
					const y = 60 + 52 * amp * Math.sin(x * (10 + k * 4) + t * (1.1 + k * 0.4) + k * 1.7);
					d += `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${y.toFixed(1)}`;
				}
				p.setAttribute('d', d);
			});
			raf = seen && motion ? requestAnimationFrame(draw) : 0;
		};
		const io = new IntersectionObserver(([e]) => {
			seen = e.isIntersecting;
			if (seen && !raf) raf = requestAnimationFrame(draw);
		});
		io.observe(svg!);
		draw(t0);
		return () => {
			io.disconnect();
			cancelAnimationFrame(raf);
		};
	});
</script>

<button
	type="button"
	aria-label="say hello to the coach"
	class="block w-full cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-glow"
	onclick={() => {
		burst = 0.55;
		on_tap?.();
	}}
	onpointermove={(e) => {
		const r = svg!.getBoundingClientRect();
		near = (e.clientX - r.left) / r.width;
	}}
	onpointerleave={() => (near = -1)}
>
	<svg bind:this={svg} viewBox="0 0 1000 120" preserveAspectRatio="none" class="h-28 w-full overflow-visible sm:h-36" aria-hidden="true">
		{#each ['stroke-haze/50', 'stroke-glow/70', 'stroke-mist/40'] as c, k}
			<path bind:this={paths[k]} fill="none" stroke-width="1.25" vector-effect="non-scaling-stroke" class={c} />
		{/each}
	</svg>
</button>
