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
};

export type Scene = (now: number, dt: number) => View;

export const palettes = [
	['#1c1832', '#3b3060', '#74507a', '#d08c6c', '#0c0b13'],
	['#0e1126', '#1d2348', '#322e60', '#5d4d80', '#07070e'],
	['#0b1e25', '#11404a', '#2b6c6a', '#8cb5a5', '#051014'],
	['#0a1820', '#173141', '#2a5062', '#6d95a4', '#050c11'],
	['#15182b', '#2c2d56', '#554f82', '#ab91bb', '#0a0a15'],
	['#2a1c28', '#5b3944', '#ad6a5c', '#f2bb8e', '#130d12']
].map((p) => new Float32Array(p.flatMap(rgb)));

export const ui = $state({ sound: false });

export const calm = {
	sound: make_sound(),
	scene: null as Scene | null,
	view: null as View | null,
	from: null as View | null,
	t0: 0,
	phase: 0,
	handoff: false,
	quiet: false,
	lit: { c: 0, r: 0, t: 0 },
	ripple: (_x: number, _y: number, _a?: number) => {},
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
		f: b.f
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

export function take_handoff() {
	const h = calm.handoff;
	calm.handoff = false;
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
	if (calm.quiet) {
		calm.quiet = false;
		return;
	}
	const [x, y] = square_xy(v, col, row_top);
	calm.ripple(x, y, m.captured ? 1.2 : 0.7);
	calm.sound.thock();
	calm.sound.chime(col + 7 - row_top, 0.6);
	if (m.captured) calm.sound.drop();
	if (m.san?.includes('#')) calm.sound.chord();
	else if (m.san?.includes('+')) calm.sound.bowl(2);
}
