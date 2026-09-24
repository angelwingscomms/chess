<script lang="ts">
	import { onMount } from 'svelte';
	import { make_field } from '$lib/landing/field';
	import { calm, load_feel, mix_view, square_xy, ui } from '$lib/landing/calm.svelte';

	let canvas = $state<HTMLCanvasElement>();
	let pawn = $state<HTMLImageElement>();

	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
	const quiet = 'a,button,input,textarea,select,label,[role=button],[data-quiet]';

	onMount(() => {
		const motion = matchMedia('(prefers-reduced-motion: no-preference)').matches;
		const html = document.documentElement;
		const field = make_field(canvas!);
		html.classList.add('calm-html');
		if (field) canvas!.dataset.on = '';
		calm.view = null;
		calm.from = null;
		ui.sound = calm.sound.pref() === '1';
		load_feel();

		let raf = 0;
		let prev = performance.now();
		let clock = 0;
		let psy = scrollY;
		let vel = 0;
		let px = innerWidth / 2;
		let py = innerHeight / 2;
		let cx = px;
		let cy = py;
		let cs = 0;
		let lit = 0;
		let cell = -1;
		let pw = 0;
		let lv = ui.living ? 1 : 0;
		let armed = false;
		let hover: Element | null = null;
		let down = { x: 0, y: 0, t: 0 };

		const wake = () => {
			if (!raf) raf = requestAnimationFrame(frame);
		};
		calm.wake = wake;
		const ro = new ResizeObserver(wake);
		ro.observe(document.body);
		calm.ripple = (x, y, a = 1) => {
			if (motion) field?.ripple(x, y, a);
			wake();
		};
		calm.arm = () => {
			if (armed) return;
			armed = true;
			if (calm.sound.pref() !== '0') {
				calm.sound.set(true);
				ui.sound = true;
			}
		};

		const hit = (x: number, y: number) => {
			const v = calm.view;
			if (!v || v.k > 0.04 || v.m > 0.04) return -1;
			const sq = v.s / 8;
			const c = Math.floor((x - v.x + v.s / 2) / sq);
			const r = Math.floor((y - v.y + v.s / 2) / sq);
			return c >= 0 && c < 8 && r >= 0 && r < 8 ? r * 8 + c : -1;
		};
		const touch = (x: number, y: number, v: number) => {
			const c = hit(x, y);
			const rip = !calm.app || ui.ripples;
			if (c >= 0) {
				if (!calm.app || ui.notes) calm.sound.chime((c % 8) + 7 - Math.floor(c / 8), v);
				const [mx, my] = square_xy(calm.view!, c % 8, Math.floor(c / 8));
				if (rip) calm.ripple(mx, my, v);
			} else if (v >= 1 && rip) {
				calm.sound.drop();
				calm.ripple(x, y, 0.8);
			}
		};

		function frame(now: number) {
			raf = 0;
			const dt = Math.min((now - prev) / 1000, 0.1);
			prev = now;
			vel += ((scrollY - psy) / Math.max(dt, 0.001) - vel) * (1 - Math.exp(-3 * dt));
			psy = scrollY;
			clock += motion ? dt * (1 + Math.min(Math.abs(vel) / 1400, 2)) : 0;

			const cyc = ((now / 1000) % 16) / 4;
			const ph = Math.floor(cyc);
			calm.phase = ph;
			const lung = !motion ? 0.6 : ph === 0 ? ease(cyc - ph) : ph === 1 ? 1 : ph === 2 ? 1 - ease(cyc - ph) : 0;

			let v = calm.scene ? calm.scene(now, dt) : calm.view;
			if (v && calm.from) {
				const p = motion ? clamp((now - calm.t0) / 1100) : 1;
				v = mix_view(calm.from, v, ease(p));
				if (p >= 1) calm.from = null;
			}
			if (v) {
				calm.view = v;
				pw += (v.w - pw) * (1 - Math.exp(-8 * dt));
				const [x, y] = square_xy(v, 4, 8 - v.r);
				pawn!.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${(v.s / 8) * 0.8 / 64})`;
				pawn!.style.opacity = String(pw * clamp(1 - v.k * 12));
				cx += (px - cx) * (1 - Math.exp(-6 * dt));
				cy += (py - cy) * (1 - Math.exp(-6 * dt));
				cs += ((now - lit < 1600 ? 1 : lit ? 0.3 : 0) - cs) * (1 - Math.exp(-3 * dt));
				lv += ((ui.living ? 1 : 0) - lv) * (motion ? 1 - Math.exp(-4 * dt) : 1);
				field?.draw({ t: clock, b: lung, x: v.x, y: v.y, s: v.s, k: v.k, m: v.m, l: lv, p: v.p, c: [cx, cy, cs], q: v.q });
			}
			if (motion || calm.from) raf = requestAnimationFrame(frame);
		}

		const on_move = (e: PointerEvent) => {
			px = e.clientX;
			py = e.clientY;
			if (e.pointerType !== 'mouse') return wake();
			lit = performance.now();
			const c = hit(px, py);
			if (c !== cell) {
				cell = c;
				if (c >= 0) touch(px, py, 0.4);
			}
			wake();
		};
		const on_over = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse') return;
			const el = (e.target as Element).closest?.('a,button,[role=button]') ?? null;
			if (el && el !== hover) calm.sound.tick();
			hover = el;
		};
		const on_down = (e: PointerEvent) => {
			const t = e.target as Element;
			if (t.closest('[data-sound]')) return;
			calm.arm();
			down = { x: e.clientX, y: e.clientY, t: performance.now() };
			if (e.pointerType === 'mouse' && (hit(e.clientX, e.clientY) >= 0 || !t.closest(quiet))) touch(e.clientX, e.clientY, 1);
			wake();
		};
		const on_up = (e: PointerEvent) => {
			if (e.pointerType === 'mouse') return;
			if (hit(e.clientX, e.clientY) < 0 && (e.target as Element).closest(quiet)) return;
			if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10 || performance.now() - down.t > 400) return;
			px = cx = e.clientX;
			py = cy = e.clientY;
			lit = performance.now();
			touch(e.clientX, e.clientY, 1);
			wake();
		};
		const on_resize = () => {
			field?.resize();
			wake();
		};

		addEventListener('scroll', wake, { passive: true });
		addEventListener('resize', on_resize);
		addEventListener('pointermove', on_move, { passive: true });
		addEventListener('pointerover', on_over, { passive: true });
		addEventListener('pointerdown', on_down, { passive: true });
		addEventListener('pointerup', on_up, { passive: true });
		addEventListener('keydown', calm.arm, { once: true });
		wake();

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			calm.wake = () => {};
			removeEventListener('scroll', wake);
			removeEventListener('resize', on_resize);
			removeEventListener('pointermove', on_move);
			removeEventListener('pointerover', on_over);
			removeEventListener('pointerdown', on_down);
			removeEventListener('pointerup', on_up);
			removeEventListener('keydown', calm.arm);
			html.classList.remove('calm-html');
			calm.sound.pause();
			calm.view = null;
			calm.scene = null;
		};
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@200..500&family=Geist+Mono:wght@400&display=swap" />
	<meta name="theme-color" content="#0c0b13" />
</svelte:head>

<div aria-hidden="true" class="fixed inset-0 bg-night bg-radial-[at_70%_35%] from-dusk to-night to-70%"></div>
<canvas bind:this={canvas} aria-hidden="true" class="pointer-events-none fixed inset-x-0 top-0 h-lvh w-full opacity-0 transition-opacity duration-2000 ease-calm data-[on]:opacity-100"></canvas>
<img bind:this={pawn} src="/pieces/gioco/wP.svg" alt="" aria-hidden="true" class="pointer-events-none fixed top-0 left-0 z-[5] size-16 opacity-0 drop-shadow-[0_0_24px_rgba(233,164,124,0.55)]" />

