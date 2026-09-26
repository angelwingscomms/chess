<script lang="ts">
	import { onMount } from 'svelte';
	import { Chessground } from 'svelte-chessground';
	import { Chess } from 'chess.js';
	import type { Key } from 'chessground/types';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { calm, use_ambient } from '$lib/landing/calm.svelte';
	import { STAGES, cleared, free_moves, level_id, parse, play } from '$lib/learn/lessons';

	let board = $state<Chessground>();
	let slot = $state<HTMLDivElement>();
	let si = $state(0);
	let li = $state(0);
	let done = $state<string[]>([]);
	let moves = $state(0);
	let got = $state<string[]>([]);
	let status = $state<'' | 'won' | 'wrong'>('');
	let pieces = new Map<string, string>();
	let rules: Chess | null = null;
	let held = '';
	let sel = '';

	const stage = $derived(STAGES[si]);
	const level = $derived(stage.l[li]);
	const free = $derived(level.g === 's' || level.g === 'c');
	const last = $derived(si === STAGES.length - 1 && li === stage.l.length - 1);
	const won_text = $derived(
		level.g === 'k' ? 'yes! that’s check.' : level.g === 'm' ? 'checkmate! you won.' : level.g === 'e' ? 'safe! your king is out of check.' : moves <= level.b ? `perfect! ${moves} moves, the best way.` : `done in ${moves} moves. the best is ${level.b}.`
	);

	const COL = ['col-start-1', 'col-start-2', 'col-start-3', 'col-start-4', 'col-start-5', 'col-start-6', 'col-start-7', 'col-start-8'];
	const ROW = ['row-start-1', 'row-start-2', 'row-start-3', 'row-start-4', 'row-start-5', 'row-start-6', 'row-start-7', 'row-start-8'];
	const btn = 'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-6 transition duration-500 ease-expo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow';

	function dests() {
		const m = new Map<Key, Key[]>();
		if (free) {
			for (const [q, p] of pieces) if (p[0] === 'w') m.set(q as Key, free_moves(pieces, q) as Key[]);
		} else for (const mv of rules!.moves({ verbose: true })) m.set(mv.from as Key, [...(m.get(mv.from as Key) ?? []), mv.to as Key]);
		return m;
	}

	function start() {
		if (!board) return;
		moves = 0;
		got = [];
		status = '';
		sel = '';
		if (free) {
			pieces = parse(level.f);
			rules = null;
		} else rules = new Chess(level.f);
		board.set({ fen: level.f.split(' ')[0], turnColor: 'white', lastMove: undefined, check: rules?.inCheck() ? 'white' : false, movable: { color: 'white', dests: dests() } });
	}

	function center(q: string) {
		const r = slot!.getBoundingClientRect();
		return [r.left + ((q.charCodeAt(0) - 97 + 0.5) / 8) * r.width, r.top + ((8.5 - +q[1]) / 8) * r.height];
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

	function moved(orig: Key, dest: Key) {
		moves++;
		if (rules) {
			const m = rules.move({ from: orig, to: dest, promotion: 'q' });
			calm.sound.thock(m.captured ? 1.4 : 1);
			board!.set({ check: rules.inCheck() ? 'black' : false });
			if (level.g === 'e' || (level.g === 'k' && rules.inCheck()) || (level.g === 'm' && rules.isCheckmate())) return win();
			status = 'wrong';
			shake(dest);
			setTimeout(start, 1100);
			return;
		}
		const took = pieces.get(dest)?.[0] === 'b';
		const promote = pieces.get(orig) === 'wP' && dest[1] === '8';
		pieces = play(pieces, orig, dest);
		if (promote) board!.setPieces(new Map([[dest, { role: 'queen', color: 'white', promoted: true }]]));
		calm.sound.thock(took ? 1.4 : 1);
		if (level.s?.includes(dest) && !got.includes(dest)) {
			got = [...got, dest];
			calm.sound.chime(4 + got.length * 2, 0.8);
			const [x, y] = center(dest);
			calm.ripple(x, y, 0.9);
		}
		if (cleared(level, pieces, new Set(got))) return win();
		board!.set({ turnColor: 'white', movable: { color: 'white', dests: dests() } });
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
		return c >= 0 && c < 8 && w >= 0 && w < 8 ? 'abcdefgh'[c] + (8 - w) : '';
	}

	// a piece sent where it can't go gives a little shake
	function down(e: PointerEvent) {
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
		start();
	});

	onMount(() => {
		try {
			done = JSON.parse(localStorage.getItem('e4_lessons') ?? '[]');
		} catch {}
		const first = STAGES.findIndex((s) => s.l.some((_, i) => !done.includes(level_id(s.k, i))));
		if (first >= 0) open(first);
		start();
		return use_ambient(() => slot);
	});
</script>

<Seo meta={{ t: 'lessons — e4', d: 'learn how every chess piece moves, then check and checkmate, in short lessons made for first-timers.' }} />

<main class="calm relative z-10 grid min-h-svh content-start gap-6 px-[6vw] pt-24 pb-12 font-calm font-light text-haze lg:grid-cols-[minmax(0,1fr)_auto] lg:content-center lg:gap-x-14 lg:gap-y-8">
	<header class="lg:col-start-1">
		<p class="font-calm-mono text-xs tracking-[0.16em] text-mist">lessons · {si + 1} of {STAGES.length}</p>
		{#key si}
			<h1 class="mt-4 text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] font-extralight tracking-[-0.04em] animate-surface">{stage.t}</h1>
			<p class="mt-4 max-w-md text-lg leading-relaxed text-haze/70 animate-surface [animation-delay:0.15s]">{stage.d}</p>
		{/key}
	</header>

	<div class="flex flex-col items-center lg:col-start-2 lg:row-span-3 lg:row-start-1">
		<div bind:this={slot} class="relative aspect-square w-[min(88vw,calc(100svh-19rem))] lg:w-[min(42vw,calc(100svh-10rem))]" role="presentation" onpointerdown={down} onpointerup={up}>
			<Chessground bind:this={board} class="cg-default-style board-themed" config={{ orientation: 'white', coordinates: false, animation: { enabled: true, duration: 260 }, highlight: { lastMove: true, check: true }, premovable: { enabled: false }, drawable: { enabled: false }, movable: { free: false, color: 'white', showDests: true, events: { after: moved } } }} />
			<div class="pointer-events-none absolute inset-0 z-10 grid grid-cols-8 grid-rows-8" aria-hidden="true">
				{#each level.s ?? [] as q (q + si + li)}
					<span class="grid place-items-center text-[min(5vw,2.4rem)] text-glow drop-shadow-[0_0_14px_rgba(233,164,124,0.9)] transition duration-500 ease-expo {COL[q.charCodeAt(0) - 97]} {ROW[8 - +q[1]]} {got.includes(q) ? 'scale-150 opacity-0' : 'motion-safe:animate-listen'}">✦</span>
				{/each}
			</div>
		</div>
	</div>

	<section class="lg:col-start-1" aria-live="polite">
		<div class="max-w-md rounded-3xl border border-haze/10 bg-night/40 p-5 backdrop-blur-xl">
			<p class="font-calm-mono text-xs tracking-[0.16em] text-mist">level {li + 1} of {stage.l.length}{free ? ` · ${moves} ${moves === 1 ? 'move' : 'moves'}` : ''}</p>
			<p class="mt-3 text-lg leading-relaxed {status === 'won' ? 'text-glow' : status === 'wrong' ? 'text-[#e78686]' : 'text-haze'}">
				{status === 'won' ? won_text : status === 'wrong' ? 'not quite. try again.' : level.t}
			</p>
			<div class="mt-5 flex flex-wrap items-center gap-3">
				{#if status === 'won' && last}
					<a href="/i?play=first" class="{btn} bg-glow shadow-[0_0_40px_-10px_rgba(233,164,124,0.7)]"><span class="text-night">play your first game →</span></a>
				{:else if status === 'won'}
					<button class="{btn} bg-glow text-night shadow-[0_0_40px_-10px_rgba(233,164,124,0.7)]" onclick={next}>next →</button>
				{/if}
				<button class="{btn} border border-haze/20 bg-haze/5 text-haze hover:border-glow/60 hover:bg-glow/10" onclick={start}>start over</button>
			</div>
		</div>
	</section>

	<nav class="lg:col-start-1" aria-label="lessons">
		<ul class="flex max-w-xl flex-wrap gap-2">
			{#each STAGES as s, i (s.k)}
				{@const n = s.l.filter((_, j) => done.includes(level_id(s.k, j))).length}
				<li>
					<button
						class="flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm transition duration-300 ease-expo focus-visible:outline-2 focus-visible:outline-glow {i === si ? 'border-glow/70 bg-glow/10 text-glow' : 'border-haze/12 text-haze/80 hover:border-haze/30'}"
						aria-current={i === si ? 'step' : undefined}
						onclick={() => open(i)}
					>
						<img src="/pieces/gioco/{s.i}.svg" alt="" class="size-6" />
						{s.t}
						<span class="font-calm-mono text-[11px] text-mist">{n === s.l.length ? '✓' : `${n}/${s.l.length}`}</span>
					</button>
				</li>
			{/each}
		</ul>
	</nav>
</main>
