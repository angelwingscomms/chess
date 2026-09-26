<script lang="ts">
	import { onMount } from 'svelte';
	import { Chess, type Square } from 'chess.js';
	import { calm, set_feel, ui } from '$lib/landing/calm.svelte';
	import type { Board3d, Look } from '$lib/board3d/scene';
	import { get_learn_state } from './learn_context.svelte';
	import { pz } from './puzzle.svelte';
	import { cam } from './view.svelte';

	let { shown = true }: { shown?: boolean } = $props();
	const s = get_learn_state();
	const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	const FILES = 'abcdefgh';
	const NAMES: Record<string, string> = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
	const nm = (q: number) => (FILES[q % 8] + ((q >> 3) + 1)) as Square;
	const idx = (n: string) => FILES.indexOf(n[0]) + (+n[1] - 1) * 8;

	let canvas = $state<HTMLCanvasElement>();
	let b3 = $state.raw<Board3d | null>(null);
	let sel = $state(-1);
	let promo = $state<{ from: Square; to: Square; c: string } | null>(null);
	let risen = $state(false);
	let cursor = $state('cursor-grab');

	const game = $derived(new Chess(s.fen));
	const moves = $derived(sel >= 0 ? game.moves({ square: nm(sel), verbose: true }) : []);

	function movable(q: number) {
		const p = game.get(nm(q));
		if (!p || !s.ready || s.gameOver || promo || p.color !== game.turn()) return false;
		const e = s.engine?.getColor?.();
		if (e === p.color || e === 'both') return false;
		return !pz.on || pz.p?.f.split(' ')[1] === p.color;
	}

	function play(from: Square, to: Square, promotion?: string) {
		try {
			s.chessRef?.move({ from, to, promotion } as unknown as string);
		} catch {}
	}

	function attempt(from: number, to: number) {
		const opts = game.moves({ square: nm(from), verbose: true }).filter((m) => m.to === nm(to));
		if (!opts.length) return false;
		sel = -1;
		if (opts[0].promotion) promo = { from: opts[0].from, to: opts[0].to, c: opts[0].color };
		else {
			b3?.drop();
			play(opts[0].from, opts[0].to);
		}
		return true;
	}

	function cancel_promo() {
		promo = null;
		b3?.drop();
	}

	$effect(() => {
		b3?.set_fen(s.fen);
		sel = -1;
		promo = null;
	});

	$effect(() => {
		b3?.set_side(s.orientation);
	});

	$effect(() => {
		if (!b3 || !shown || risen) return;
		const t = setTimeout(() => (risen = true), 450);
		return () => clearTimeout(t);
	});

	$effect(() => {
		if (b3 && risen && cam.v && !cam.out) b3.aim(cam.v);
	});

	$effect(() => {
		if (!cam.out) return;
		const done = () => {
			cam.out = false;
			set_feel('flat', true);
		};
		if (!b3) return done();
		b3.aim('t');
		const a = setTimeout(() => (cam.on = false), still ? 0 : 650);
		const b = setTimeout(done, still ? 0 : 1300);
		return () => {
			clearTimeout(a);
			clearTimeout(b);
		};
	});

	$effect(() => {
		if (!b3) return;
		void s.history.length;
		let last: number[] | undefined;
		try {
			const h = s.chessRef?.getHistory({ verbose: true }) as unknown as { from: string; to: string }[];
			const m = h?.[h.length - 1];
			if (m) last = [idx(m.from), idx(m.to)];
		} catch {}
		const king = game.inCheck() ? game.board().flat().find((p) => p?.type === 'k' && p.color === game.turn()) : undefined;
		const hint = s.show_hints && !s.hint_loading ? s.hints[s.hint_index]?.move : '';
		b3.marks({
			l: last,
			s: sel >= 0 ? sel : undefined,
			d: s.show_dests ? [...new Set(moves.filter((m) => !m.captured).map((m) => idx(m.to)))] : [],
			c: s.show_dests ? [...new Set(moves.filter((m) => m.captured).map((m) => idx(m.to)))] : [],
			k: king ? idx(king.square) : undefined,
			h: hint ? [idx(hint.slice(0, 2)), idx(hint.slice(2, 4))] : undefined
		});
	});

	onMount(() => {
		if (ui.flat) return;
		const el = canvas!;
		let dead = false;
		let ro: ResizeObserver | undefined;
		const ptrs = new Map<number, { x: number; y: number }>();
		let mode: '' | 'drag' | 'orbit' | 'pinch' = '';
		let start = { x: 0, y: 0, q: -1, moved: false, was: false };
		let prev = { x: 0, y: 0 };
		let spread = 0;
		let turn = 0;
		let over = -1;

		const note = (q: number, v: number) => ui.notes && calm.sound.chime((q % 8) + (q >> 3), v);

		const down = (e: PointerEvent) => {
			if (!b3 || promo || e.button > 0) return;
			el.setPointerCapture(e.pointerId);
			ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
			calm.arm();
			if (ptrs.size === 2) {
				const [a, b] = [...ptrs.values()];
				spread = Math.hypot(a.x - b.x, a.y - b.y);
				turn = Math.atan2(b.y - a.y, b.x - a.x);
				if (mode === 'drag') b3.drop();
				mode = 'pinch';
				return;
			}
			if (ptrs.size > 2) return;
			prev = { x: e.clientX, y: e.clientY };
			const q = b3.pick(e.clientX, e.clientY);
			start = { x: e.clientX, y: e.clientY, q, moved: false, was: q >= 0 && q === sel };
			if (sel >= 0 && q >= 0 && attempt(sel, q)) {
				mode = '';
				return;
			}
			if (q >= 0 && movable(q)) {
				sel = q;
				mode = 'drag';
				return;
			}
			if (sel >= 0 && q >= 0) {
				b3.shake(sel);
				calm.sound.nope();
			}
			sel = -1;
			mode = 'orbit';
		};

		const move = (e: PointerEvent) => {
			if (!b3) return;
			const pt = ptrs.get(e.pointerId);
			if (pt) {
				pt.x = e.clientX;
				pt.y = e.clientY;
			}
			if (mode === 'pinch') {
				if (ptrs.size < 2) return;
				const [a, b] = [...ptrs.values()];
				const d = Math.hypot(a.x - b.x, a.y - b.y);
				const ang = Math.atan2(b.y - a.y, b.x - a.x);
				if (spread && d) b3.zoom_by(spread / d);
				b3.orbit(-(((ang - turn + Math.PI * 3) % (Math.PI * 2)) - Math.PI) / 0.008, 0);
				spread = d;
				turn = ang;
				cam.v = '';
				return;
			}
			const far = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6;
			if (mode === 'drag') {
				if (!start.moved && far) {
					start.moved = true;
					b3.lift(start.q);
					cursor = 'cursor-grabbing';
				}
				if (start.moved) b3.drag_to(e.clientX, e.clientY);
				return;
			}
			if (mode === 'orbit') {
				if (!start.moved && far) {
					start.moved = true;
					cam.v = '';
					cursor = 'cursor-grabbing';
				}
				if (start.moved) b3.orbit(e.clientX - prev.x, e.clientY - prev.y);
				prev = { x: e.clientX, y: e.clientY };
				return;
			}
			if (e.pointerType !== 'mouse') return;
			const q = b3.pick(e.clientX, e.clientY);
			b3.hover(q);
			cursor = q >= 0 && (movable(q) || moves.some((m) => m.to === nm(q))) ? 'cursor-pointer' : 'cursor-grab';
			if (q !== over && q >= 0) note(q, 0.4);
			over = q;
		};

		const up = (e: PointerEvent) => {
			ptrs.delete(e.pointerId);
			if (!b3) return;
			if (mode === 'pinch') {
				if (!ptrs.size) mode = '';
				return;
			}
			if (mode === 'drag' && start.moved) {
				const to = b3.drop(true);
				if (to < 0 || to === start.q || !attempt(start.q, to)) {
					b3.drop();
					if (to >= 0 && to !== start.q) {
						b3.shake(start.q);
						calm.sound.nope();
					}
				}
			} else if (mode && !start.moved && start.q >= 0) {
				if (start.was) sel = -1;
				note(start.q, 0.7);
				if (ui.ripples) b3.ripple(start.q);
			}
			mode = '';
			cursor = 'cursor-grab';
		};

		const leave = () => {
			b3?.hover(-1);
			over = -1;
		};

		const wheel = (e: WheelEvent) => {
			if (!b3) return;
			e.preventDefault();
			b3.zoom_by(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0011)));
		};

		const lost = () => {
			if (dead) return;
			b3?.dispose();
			b3 = null;
			cam.on = false;
			cam.gl = false;
		};

		const feed = (l: Look) => {
			if (calm.view) l.p.set(calm.view.p);
			l.b = calm.lung;
			l.l = ui.living ? 1 : 0;
		};

		Promise.all([import('$lib/board3d/scene'), import('$lib/board3d/pieces').then((m) => m.load_pieces())]).then(([{ make_board3d }, geos]) => {
			if (dead) return;
			const made = make_board3d(el, still, feed, geos);
			if (!made) return lost();
			made.set_side(s.orientation, true);
			b3 = made;
			cam.on = true;
			calm.board_ripple = (to) => made.ripple(idx(to));
			ro = new ResizeObserver(() => made.resize());
			ro.observe(el);
		}, lost);

		el.addEventListener('pointerdown', down);
		el.addEventListener('pointermove', move);
		el.addEventListener('pointerup', up);
		el.addEventListener('pointercancel', up);
		el.addEventListener('pointerleave', leave);
		el.addEventListener('wheel', wheel, { passive: false });
		el.addEventListener('contextmenu', (e) => e.preventDefault());
		el.addEventListener('webglcontextlost', lost);

		return () => {
			dead = true;
			ro?.disconnect();
			b3?.dispose();
			b3 = null;
			cam.on = false;
			calm.board_ripple = null;
		};
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && promo && cancel_promo()} />

<canvas
	bind:this={canvas}
	data-quiet
	aria-label="3d chess board. drag a piece to move it. drag the space around it to turn the board."
	class="absolute inset-[-12%] z-[1] size-[124%] touch-none outline-none select-none mask-x-from-93% mask-y-from-93% transition-opacity duration-700 ease-calm {cursor} {b3 && shown && cam.on ? '' : 'pointer-events-none opacity-0'}"
></canvas>

{#if promo}
	<div class="absolute inset-0 z-[2] grid place-items-center" role="presentation" onclick={(e) => e.target === e.currentTarget && cancel_promo()}>
		<div role="dialog" aria-label="your pawn made it across. pick what it becomes" class="flex gap-1.5 rounded-full border border-haze/15 bg-deep/90 p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-surface">
			{#each ['q', 'r', 'b', 'n'] as k}
				<button
					aria-label="turn your pawn into a {NAMES[k]}"
					class="grid size-14 cursor-pointer place-items-center rounded-full transition duration-300 ease-expo hover:bg-glow/15 focus-visible:outline-2 focus-visible:outline-glow"
					onclick={() => {
						const p = promo!;
						promo = null;
						play(p.from, p.to, k);
					}}
				>
					<img src="/pieces/gioco/{promo.c}{k.toUpperCase()}.svg" alt="" class="size-11" />
				</button>
			{/each}
			<button aria-label="cancel" class="grid size-14 cursor-pointer place-items-center rounded-full font-calm-mono text-xs text-mist transition hover:bg-haze/10" onclick={cancel_promo}>esc</button>
		</div>
	</div>
{/if}
