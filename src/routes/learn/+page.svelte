<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Chessground } from 'svelte-chessground';
	import { Chess } from 'chess.js';
	import type { Key } from 'chessground/types';
	import type { Config } from 'chessground/config';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { calm, use_ambient } from '$lib/landing/calm.svelte';
	import { PARTS, STAGES, cleared, free_moves, hint, level_id, mate_in_one, parse, play, right } from '$lib/learn/lessons';

	let board = $state<Chessground>();
	let slot = $state<HTMLDivElement>();
	let si = $state(0);
	let li = $state(0);
	let done = $state<string[]>([]);
	let moves = $state(0);
	let got = $state<string[]>([]);
	let status = $state<'' | 'won' | 'wrong'>('');
	let oops = $state('');
	let me = $state<'white' | 'black'>('white');
	let pieces = new Map<string, string>();
	let rules: Chess | null = null;
	let step = 0;
	let misses = 0;
	let timer: ReturnType<typeof setTimeout>;
	let held = '';
	let sel = '';

	const stage = $derived(STAGES[si]);
	const level = $derived(stage.l[li]);
	const free = $derived(level.g === 's' || level.g === 'c');
	const last = $derived(si === STAGES.length - 1 && li === stage.l.length - 1);
	const mate_at = STAGES.findIndex((s) => s.k === 'mate');
	const part_end = $derived(si > mate_at && li === stage.l.length - 1 && STAGES[si + 1]?.p !== stage.p);
	const won_text = $derived(
		level.w ??
			(level.g === 'k' ? 'yes! that’s check.' : level.g === 'm' ? 'checkmate! you won.' : level.g === 'e' ? 'safe! your king is out of check.' : moves <= (level.b ?? 0) ? `perfect! ${moves} moves, the best way.` : `done in ${moves} moves. the best is ${level.b}.`)
	);

	const COL = ['col-start-1', 'col-start-2', 'col-start-3', 'col-start-4', 'col-start-5', 'col-start-6', 'col-start-7', 'col-start-8'];
	const ROW = ['row-start-1', 'row-start-2', 'row-start-3', 'row-start-4', 'row-start-5', 'row-start-6', 'row-start-7', 'row-start-8'];
	const btn = 'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-6 transition duration-500 ease-expo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow';
	const ghost = `${btn} border border-haze/20 bg-haze/5 text-haze hover:border-glow/60 hover:bg-glow/10`;

	function dests() {
		const m = new Map<Key, Key[]>();
		if (!rules) {
			for (const [q, p] of pieces) if (p[0] === 'w') m.set(q as Key, free_moves(pieces, q) as Key[]);
		} else for (const mv of rules.moves({ verbose: true })) m.set(mv.from as Key, [...(m.get(mv.from as Key) ?? []), mv.to as Key]);
		return m;
	}

	// draws the rules' position; the player may move only on their turn
	function show(extra: Config = {}) {
		const turn = rules!.turn() === 'w' ? 'white' : 'black';
		board!.set({ fen: rules!.fen(), turnColor: turn, check: rules!.inCheck() ? turn : false, movable: { color: me, dests: turn === me ? dests() : new Map() }, ...extra });
	}

	function start() {
		if (!board) return;
		clearTimeout(timer);
		moves = 0;
		got = [];
		status = '';
		step = 0;
		sel = '';
		board.setAutoShapes([]);
		if (free) {
			pieces = parse(level.f);
			rules = null;
			me = 'white';
			board.set({ fen: level.f, orientation: 'white', turnColor: 'white', lastMove: undefined, check: false, movable: { color: 'white', dests: dests() } });
		} else {
			rules = new Chess(level.f);
			me = rules.turn() === 'w' ? 'white' : 'black';
			show({ orientation: me, lastMove: undefined });
		}
		if (misses > 1) point();
	}

	// after two misses, an arrow shows the way
	function point() {
		const m = rules && hint(level, rules, step);
		if (!m) return;
		board!.getState().drawable.brushes.glow ??= { key: 'gw', color: '#e9a47c', opacity: 0.9, lineWidth: 11 };
		board!.setAutoShapes([{ orig: m.slice(0, 2) as Key, dest: m.slice(2, 4) as Key, brush: 'glow' }]);
	}

	function shake(q: string) {
		calm.sound.nope();
		requestAnimationFrame(() => {
			const el = [...slot!.querySelectorAll('piece')].find((p) => (p as unknown as { cgKey?: string }).cgKey === q);
			el?.animate([{ translate: '0 0' }, { translate: '-8% 0' }, { translate: '7% 0' }, { translate: '-5% 0' }, { translate: '3% 0' }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' });
		});
	}

	function win() {
		status = 'won';
		misses = 0;
		calm.sound.chord();
		board!.set({ movable: { color: undefined, dests: new Map() } });
		const id = level_id(stage.k, li);
		if (!done.includes(id)) {
			done = [...done, id];
			try {
				localStorage.setItem('e4_lessons', JSON.stringify(done));
			} catch {}
		}
	}

	function back(fen: string) {
		rules = new Chess(fen);
		status = '';
		show({ lastMove: undefined });
		if (misses > 1) point();
	}

	function wrong(before: string, dest: Key) {
		status = 'wrong';
		misses++;
		oops = rules!.isStalemate() ? 'stalemate! the other side can’t move, but it isn’t in check, so it’s only a draw. try again.' : level.g === 'd' ? 'that doesn’t stop it. watch, then try again.' : 'not quite. try again.';
		shake(dest);
		board!.set({ movable: { color: undefined, dests: new Map() } });
		const mate = level.g === 'd' && mate_in_one(rules!);
		if (!mate) timer = setTimeout(() => back(before), 1100);
		else
			timer = setTimeout(() => {
				rules!.move(mate);
				calm.sound.thock(1.4);
				show({ lastMove: [mate.from, mate.to], movable: { color: undefined, dests: new Map() } });
				timer = setTimeout(() => back(before), 2000);
			}, 700);
	}

	function moved(orig: Key, dest: Key) {
		moves++;
		board!.setAutoShapes([]);
		if (level.s?.includes(dest) && !got.includes(dest)) {
			got = [...got, dest];
			calm.sound.chime(4 + got.length * 2, 0.8);
		}
		if (!rules) {
			const took = pieces.get(dest)?.[0] === 'b';
			const promote = pieces.get(orig) === 'wP' && dest[1] === '8';
			pieces = play(pieces, orig, dest);
			if (promote) board!.setPieces(new Map([[dest, { role: 'queen', color: 'white', promoted: true }]]));
			calm.sound.thock(took ? 1.4 : 1);
			if (cleared(level, pieces, new Set(got))) return win();
			board!.set({ turnColor: 'white', movable: { color: 'white', dests: dests() } });
			return;
		}
		const before = rules.fen();
		const m = rules.move({ from: orig, to: dest, promotion: 'q' });
		calm.sound.thock(m.captured ? 1.4 : 1);
		show();
		if (!right(level, rules, step, orig + dest)) return wrong(before, dest);
		if (rules.isCheckmate() || !level.a || step === level.a.length - 1) return win();
		const r = level.a[step + 1];
		step += 2;
		timer = setTimeout(() => {
			const k = rules!.move({ from: r.slice(0, 2), to: r.slice(2, 4), promotion: 'q' });
			calm.sound.thock(k.captured ? 1.4 : 1);
			show({ lastMove: [k.from, k.to] });
		}, 700);
	}

	function open(i: number) {
		si = i;
		li = Math.max(0, STAGES[i].l.findIndex((_, j) => !done.includes(level_id(STAGES[i].k, j))));
	}

	function next() {
		if (li < stage.l.length - 1) li++;
		else if (si < STAGES.length - 1) {
			si++;
			li = 0;
		}
	}

	function square_at(e: PointerEvent) {
		const r = slot!.getBoundingClientRect();
		const c = Math.floor(((e.clientX - r.left) / r.width) * 8);
		const w = Math.floor(((e.clientY - r.top) / r.height) * 8);
		if (c < 0 || c > 7 || w < 0 || w > 7) return '';
		return me === 'white' ? 'abcdefgh'[c] + (8 - w) : 'abcdefgh'[7 - c] + (w + 1);
	}

	// a piece sent where it can't go gives a little shake
	function down(e: PointerEvent) {
		// the board moves when the text above it changes length, so let chessground measure it again
		board?.getState().dom.bounds.clear();
		const q = square_at(e);
		const d = board?.getState().movable.dests;
		if (!q || !d || status === 'won') return;
		const own = d.has(q as Key);
		if (sel && q !== sel && !own && !d.get(sel as Key)?.includes(q as Key)) shake(sel);
		held = own ? q : '';
		sel = own && q !== sel ? q : '';
	}

	function up(e: PointerEvent) {
		const q = square_at(e);
		const d = board?.getState().movable.dests;
		if (held && q && q !== held && d && !d.get(held as Key)?.includes(q as Key) && status !== 'won') shake(held);
		if (held && q && q !== held) sel = '';
		held = '';
	}

	$effect(() => {
		void si;
		void li;
		void board;
		untrack(() => {
			misses = 0;
			start();
		});
	});

	onMount(() => {
		try {
			done = JSON.parse(localStorage.getItem('e4_lessons') ?? '[]');
		} catch {}
		const first = STAGES.findIndex((s) => s.l.some((_, i) => !done.includes(level_id(s.k, i))));
		if (first >= 0) open(first);
		calm.no_ripples = true;
		const stop = use_ambient(() => slot);
		return () => {
			clearTimeout(timer);
			calm.no_ripples = false;
			stop();
		};
	});
</script>

<Seo meta={{ t: 'lessons — e4', d: 'short chess lessons made for first-timers: how every piece moves, check and checkmate, then tricks like forks and pins, famous checkmates and how to start a game.' }} />

<main class="calm relative z-10 grid min-h-svh content-start gap-6 px-[6vw] pt-24 pb-16 font-calm font-light text-haze lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-14 lg:gap-y-8">
	<header class="lg:col-start-1 lg:row-start-1 lg:self-end">
		<p class="font-calm-mono text-xs tracking-[0.16em] text-mist">{stage.p} · {si + 1} of {STAGES.length}</p>
		{#key si}
			<h1 class="mt-4 text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] font-extralight tracking-[-0.04em] animate-surface">{stage.t}</h1>
			<p class="mt-4 max-w-md text-lg leading-relaxed text-haze/70 animate-surface [animation-delay:0.15s]">{stage.d}</p>
		{/key}
	</header>

	<div class="flex flex-col items-center lg:col-start-2 lg:row-span-2 lg:row-start-1">
		<div bind:this={slot} class="relative aspect-square w-[min(88vw,calc(100svh-19rem))] lg:w-[min(42vw,calc(100svh-10rem))]" role="presentation" onpointerdown={down} onpointerup={up}>
			<Chessground bind:this={board} class="cg-default-style board-themed" config={{ orientation: 'white', coordinates: false, animation: { enabled: true, duration: 260 }, highlight: { lastMove: true, check: true }, premovable: { enabled: false }, drawable: { enabled: false }, movable: { free: false, color: 'white', showDests: true, events: { after: moved } } }} />
			<div class="pointer-events-none absolute inset-0 z-10 grid grid-cols-8 grid-rows-8" aria-hidden="true">
				{#each level.s ?? [] as q (q + si + li)}
					{@const f = q.charCodeAt(0) - 97}
					<span class="grid place-items-center text-[min(7vw,2.6rem)] text-glow drop-shadow-[0_0_14px_rgba(233,164,124,0.9)] transition duration-500 ease-expo {COL[me === 'white' ? f : 7 - f]} {ROW[me === 'white' ? 8 - +q[1] : +q[1] - 1]} {got.includes(q) ? 'scale-150 opacity-0' : 'motion-safe:animate-twinkle'}">✦</span>
				{/each}
			</div>
		</div>
	</div>

	<section class="lg:col-start-1 lg:row-start-2 lg:self-start" aria-live="polite">
		<div class="max-w-md rounded-3xl border border-haze/10 bg-night/40 p-5 backdrop-blur-xl">
			<p class="font-calm-mono text-xs tracking-[0.16em] text-mist">level {li + 1} of {stage.l.length}{free ? ` · ${moves} ${moves === 1 ? 'move' : 'moves'}` : ''}</p>
			<p class="mt-3 text-lg leading-relaxed {status === 'won' ? 'text-glow' : status === 'wrong' ? 'text-[#e78686]' : 'text-haze'}">
				{status === 'won' ? won_text : status === 'wrong' ? oops : level.t}
			</p>
			<div class="mt-5 flex flex-wrap items-center gap-3">
				{#if status === 'won' && last}
					<a href="/i?play=first" class="{btn} bg-glow shadow-[0_0_40px_-10px_rgba(233,164,124,0.7)]"><span class="text-night">play a game →</span></a>
				{:else if status === 'won'}
					<button class="{btn} bg-glow text-night shadow-[0_0_40px_-10px_rgba(233,164,124,0.7)]" onclick={next}>next →</button>
					{#if part_end}
						<a href="/i?play=first" class={ghost}><span class="text-haze">play a game</span></a>
					{/if}
				{/if}
				<button class={ghost} onclick={start}>start over</button>
			</div>
		</div>
	</section>

	<nav class="grid gap-x-10 gap-y-7 pt-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4 lg:pt-10" aria-label="lessons">
		{#each PARTS as p (p)}
			<section>
				<h2 class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">{p}</h2>
				<ul class="mt-3 flex flex-wrap gap-2">
					{#each STAGES as s, i (s.k)}
						{#if s.p === p}
							{@const n = s.l.filter((_, j) => done.includes(level_id(s.k, j))).length}
							<li>
								<button
									class="flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm transition duration-300 ease-expo focus-visible:outline-2 focus-visible:outline-glow {i === si ? 'border-glow/70 bg-glow/10 text-glow' : 'border-haze/12 text-haze/80 hover:border-haze/30'}"
									aria-current={i === si ? 'step' : undefined}
									onclick={() => {
										open(i);
										scrollTo({ top: 0, behavior: 'smooth' });
									}}
								>
									<img src="/pieces/gioco/{s.i}.svg" alt="" class="size-6" />
									{s.t}
									<span class="font-calm-mono text-[11px] text-mist">{n === s.l.length ? '✓' : `${n}/${s.l.length}`}</span>
								</button>
							</li>
						{/if}
					{/each}
				</ul>
			</section>
		{/each}
	</nav>
</main>
