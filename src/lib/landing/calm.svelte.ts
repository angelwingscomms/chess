import { rgb } from './field';
import { make_sound } from './sound';

export type View = {
	x: number; // board center x, css px
	y: number; // board center y, css px
	s: number; // board side, css px
	k: number; // tilt, 0 flat to 1 lying back
	m: number; // melt, 0 crisp squares to 1 liquid
	p: Float32Array; // palette c0 c1 c2 c3 bg
	q: number[]; // lit square: column from left 0-7, row from bottom 1-8, strength
	w: number; // pawn overlay opacity
	r: number; // pawn overlay row from bottom, on the e-file
	f: number; // 1 when black sits at the bottom
	h: number; // board squares hidden, 0 shown to 1 gone (the 3d board takes over)
};

export type Scene = (now: number, dt: number) => View;

const dark = [
	['#1c1832', '#3b3060', '#74507a', '#d08c6c', '#0c0b13'],
	['#0e1126', '#1d2348', '#322e60', '#5d4d80', '#07070e'],
	['#0b1e25', '#11404a', '#2b6c6a', '#8cb5a5', '#051014'],
	['#0a1820', '#173141', '#2a5062', '#6d95a4', '#050c11'],
	['#15182b', '#2c2d56', '#554f82', '#ab91bb', '#0a0a15'],
	['#2a1c28', '#5b3944', '#ad6a5c', '#f2bb8e', '#130d12']
].map((p) => new Float32Array(p.flatMap(rgb)));

// the same six moods on paper, one for one
const light = [
	['#d9cfea', '#b9abd6', '#ecdcd6', '#fbe9dc', '#f7f2ec'],
	['#d3d8ee', '#b6bde3', '#d9d2ee', '#ece7f6', '#f3f3f8'],
	['#cfe3de', '#a9cfc6', '#d6e8df', '#eef5ee', '#f1f5f0'],
	['#cfdfe8', '#a9c4d4', '#cfdde6', '#e6eef2', '#f0f4f6'],
	['#d6d3ea', '#bbb4de', '#d9cde6', '#efe4f2', '#f5f2f8'],
	['#ecd5d3', '#dcb4ae', '#f1d0bf', '#fbe6d2', '#f8f0ea']
].map((p) => new Float32Array(p.flatMap(rgb)));

// what scenes read: moves from dark to light with the theme
export const palettes = dark.map((p) => p.slice());

export function set_look(t: number) {
	palettes.forEach((p, i) => {
		for (let j = 0; j < 15; j++) p[j] = dark[i][j] + (light[i][j] - dark[i][j]) * t;
	});
}

export const ui = $state({ sound: false, ripples: false, notes: false, living: false, flat: true });

type Feel = 'ripples' | 'notes' | 'living' | 'flat';

export function set_feel(k: Feel, v: boolean) {
	ui[k] = v;
	try {
		localStorage.setItem(`e4_${k}`, v ? '1' : '0');
	} catch {}
}

export function load_feel() {
	for (const k of ['ripples', 'notes', 'living', 'flat'] as Feel[]) {
		try {
			const v = localStorage.getItem(`e4_${k}`);
			ui[k] = k === 'flat' ? v !== '0' : v === '1';
		} catch {}
	}
}

export const calm = {
	sound: make_sound(),
	scene: null as Scene | null,
	view: null as View | null,
	from: null as View | null,
	t0: 0,
	phase: 0,
	lung: 0.5,
	look: 0, // theme, 0 dark to 1 light
	app: false,
	handoff: '' as '' | 'glide' | 'e4',
	quiet: false,
	lit: { c: 0, r: 0, t: 0 },
	ripple: (_x: number, _y: number, _a?: number) => {},
	board_ripple: null as ((to: string) => void) | null,
	arm: () => {},
	wake: () => {}
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function mix_view(a: View, b: View, t: number): View {
	const p = new Float32Array(15);
	for (let i = 0; i < 15; i++) p[i] = mix(a.p[i], b.p[i], t);
	return {
		x: mix(a.x, b.x, t),
		y: mix(a.y, b.y, t),
		s: mix(a.s, b.s, t),
		k: mix(a.k, b.k, t),
		m: mix(a.m, b.m, t),
		p,
		q: b.q,
		w: mix(a.w, b.w, t),
		r: mix(a.r, b.r, t),
		f: b.f,
		h: mix(a.h, b.h, t)
	};
}

export function use_scene(fn: Scene) {
	if (calm.view) {
		calm.from = { ...calm.view, p: calm.view.p.slice() };
		calm.t0 = performance.now();
	}
	calm.scene = fn;
	calm.wake();
	return () => {
		if (calm.scene === fn) calm.scene = null;
	};
}

// quiet pages: the board sits in a slot when there is one, otherwise it melts into the background
export function use_ambient(slot: () => HTMLElement | undefined = () => undefined) {
	const p = palettes[0];
	return use_scene(() => {
		const r = slot()?.getBoundingClientRect();
		const base = { p, q: [0, 0, 0], w: 0, r: 4, f: 0, h: 0 };
		if (r?.width) return { ...base, x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width, k: 0, m: 0 };
		return { ...base, x: innerWidth / 2, y: innerHeight * 0.6, s: Math.max(innerWidth, innerHeight) * 1.3, k: 1, m: 1 };
	});
}

export function take_handoff() {
	const h = calm.handoff;
	calm.handoff = '';
	return h;
}

export function square_xy(v: View, col: number, row_top: number) {
	const sq = v.s / 8;
	return [v.x - v.s / 2 + (col + 0.5) * sq, v.y - v.s / 2 + (row_top + 0.5) * sq];
}

export function play_move(m: { to: string; san?: string; captured?: string }) {
	const v = calm.view;
	if (!v) return;
	const file = m.to.charCodeAt(0) - 97;
	const rank = +m.to[1];
	const col = v.f ? 7 - file : file;
	const row_top = v.f ? rank - 1 : 8 - rank;
	calm.lit = { c: col, r: 8 - row_top, t: performance.now() };
	calm.wake();
	if (calm.quiet) {
		calm.quiet = false;
		return;
	}
	if (!calm.app || ui.ripples) {
		const [x, y] = square_xy(v, col, row_top);
		if (calm.board_ripple) calm.board_ripple(m.to);
		else calm.ripple(x, y, m.captured ? 1.2 : 0.7);
	}
	calm.sound.thock(m.captured ? 1.4 : 1);
	if (m.san?.includes('#')) calm.sound.chord();
	else if (m.san?.includes('+')) calm.sound.bowl(2);
}
