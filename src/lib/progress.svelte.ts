import { browser } from '$app/environment';

// what a player has done, kept on the device and, with an account, in d1 (u.g) so every device sees it.
// r puzzle level (elo-like, never shown as a number), n puzzles tried, y solved first time, c solved in a row, b best run,
// s days in a row played, t last day played (yyyy-mm-dd), g recent games: d when, w 'w' won, 'l' lost, 'd' draw, a accuracy 0-100, l level,
// l lesson levels solved (stage-index ids), v their review schedule: id -> [box, day it is due again, counted in days since 1970]
export type Game = { d: number; w: 'w' | 'l' | 'd'; a: number; l: number };
export type Progress = { r: number; n: number; y: number; c: number; b: number; s: number; t: string; g: Game[]; l: string[]; v: Record<string, [number, number]> };

const KEY = 'e4_progress';
const fresh = (): Progress => ({ r: 800, n: 0, y: 0, c: 0, b: 0, s: 0, t: '', g: [], l: [], v: {} });

export const pg = $state<Progress>(fresh());
let synced = false;
let timer: ReturnType<typeof setTimeout> | undefined;

const day = (d = new Date()) => d.toISOString().slice(0, 10);

function store() {
	try {
		localStorage.setItem(KEY, JSON.stringify(pg));
	} catch {}
	if (!synced) return;
	clearTimeout(timer);
	timer = setTimeout(() => void fetch('/api/progress', { method: 'PUT', body: JSON.stringify(pg), keepalive: true }).catch(() => {}), 1500);
}

const weight = (p: Progress) => p.n + p.g.length * 3 + (p.l?.length ?? 0);

// the device's record first, then the account's when it holds more
export async function load_progress(account: boolean) {
	if (!browser) return;
	try {
		Object.assign(pg, fresh(), JSON.parse(localStorage.getItem(KEY) ?? '{}'));
		// lessons used to keep their own list
		if (!pg.l.length) pg.l = JSON.parse(localStorage.getItem('e4_lessons') ?? '[]');
	} catch {}
	if (!account) return;
	const a: Progress | null = await fetch('/api/progress').then((r) => (r.ok ? r.json() : null)).catch(() => null);
	synced = true;
	if (a && weight(a) > weight(pg)) {
		// lessons solved on either side are kept, with the further review box
		const { l, v } = pg;
		Object.assign(pg, fresh(), a);
		pg.l = [...new Set([...pg.l, ...l])];
		for (const [id, x] of Object.entries(v)) if (!pg.v[id] || pg.v[id][0] < x[0]) pg.v[id] = x;
		store();
	} else if (weight(pg)) store();
}

// played today: the run of days grows by one, or starts again after a gap
function today() {
	const t = day();
	if (pg.t === t) return;
	pg.s = pg.t === day(new Date(Date.now() - 864e5)) ? pg.s + 1 : 1;
	pg.t = t;
}

// a puzzle counts as solved only when found first time with no hint; the level moves like a chess rating,
// faster while there are few results, so a new player reaches their level within about ten puzzles
export function puzzle_done(solved: boolean, rating: number) {
	today();
	const k = pg.n < 10 ? 80 : pg.n < 30 ? 40 : 20;
	const expect = 1 / (1 + 10 ** ((rating - pg.r) / 400));
	pg.r = Math.round(Math.min(2800, Math.max(400, pg.r + k * ((solved ? 1 : 0) - expect))));
	pg.n++;
	if (solved) {
		pg.y++;
		pg.c++;
		pg.b = Math.max(pg.b, pg.c);
	} else pg.c = 0;
	store();
}

export function game_done(w: Game['w'], a: number, l: number) {
	today();
	pg.g = [{ d: Date.now(), w, a: Math.round(a), l }, ...pg.g].slice(0, 50);
	store();
}

// days until a lesson level comes back for review, by box: each clean review moves it one box further
const GAPS = [1, 3, 7, 16, 35, 90];
export const today_n = () => Math.floor(Date.now() / 864e5);

// r: solved during a review. a clean solve (no miss, no hint) there moves the level up a box, a messy one sends it back to the first
export function lesson_done(id: string, clean: boolean, r: boolean) {
	today();
	if (!pg.l.includes(id)) pg.l = [...pg.l, id];
	const was = pg.v[id]?.[0] ?? -1;
	const box = r ? (clean ? Math.min(was + 1, GAPS.length - 1) : 0) : Math.max(was, 0);
	pg.v = { ...pg.v, [id]: [box, today_n() + GAPS[box]] };
	store();
}

// the quick check: levels a player proved they know start further along
export function lessons_known(ids: string[]) {
	const v = { ...pg.v };
	for (const id of ids) v[id] ??= [1, today_n() + GAPS[1]];
	pg.l = [...new Set([...pg.l, ...ids])];
	pg.v = v;
	store();
}

export const due = () => Object.entries(pg.v).filter(([id, [, d]]) => d <= today_n() && pg.l.includes(id)).sort((a, b) => a[1][1] - b[1][1]).map(([id]) => id);

// winning chances from one side, -1 to 1, from centipawns (lichess's curve)
export const chances = (cp: number) => 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;

// one move's accuracy, 0-100, from how much of the mover's winning chances it threw away (lichess's formula)
export const move_accuracy = (before: number, after: number) => Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * Math.max(0, (before - after) * 50)) - 3.1669));
