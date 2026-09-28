import { Chess } from 'chess.js';
import type { Key } from 'chessground/types';
import type { Config } from 'chessground/config';
import type { Chessground } from 'svelte-chessground';
import { calm, play_move } from '$lib/landing/calm.svelte';
import { say_move } from '$lib/util/chess/words';
import { STAGES, cleared, free_hint, free_moves, hint, level_id, mate_in_one, parse, play, right } from '$lib/learn/lessons';
import type { ChatData } from './types';
import type { LearnState } from './learn_context.svelte';

export const ls = $state({
	on: false,
	list: false,
	si: 0,
	li: 0,
	done: [] as string[],
	moves: 0,
	got: [] as string[],
	st: '', // '' solving, w solved, n wrong move
	oops: '',
	miss: '',
	me: 'white' as 'white' | 'black',
	pos: ''
});

let s: LearnState | null = null;
let board: Chessground | null = null;
let el: HTMLElement | null = null;
let pieces = new Map<string, string>();
let rules: Chess | null = null;
let step = 0;
let misses = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let said = '';
let held = '';
let sel = '';

const NAMES: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const MATE = STAGES.findIndex((t) => t.k === 'mate');

export const stage = () => STAGES[ls.si];
export const level = () => stage().l[ls.li];
export const free = () => level().g === 's' || level().g === 'c';
export const last = () => ls.si === STAGES.length - 1 && ls.li === stage().l.length - 1;
export const part_end = () => ls.si > MATE && ls.li === stage().l.length - 1 && STAGES[ls.si + 1]?.p !== stage().p;

export function won_text() {
	const l = level();
	if (l.w) return l.w;
	if (l.g === 'k') return 'yes! that’s check.';
	if (l.g === 'm') return 'checkmate! you won.';
	if (l.g === 'e') return 'safe! your king is out of check.';
	return ls.moves <= (l.b ?? 0) ? `perfect! ${ls.moves} moves, the best way.` : `done in ${ls.moves} moves. the best is ${l.b}.`;
}

export function bind_lessons(state: LearnState) {
	s = state;
	ls.on = false;
	ls.list = false;
	try {
		ls.done = JSON.parse(localStorage.getItem('e4_lessons') ?? '[]');
	} catch {}
}

export function bind_lesson_board(b: Chessground, e: HTMLElement) {
	board = b;
	el = e;
	start();
	return () => {
		clearTimeout(timer);
		board = null;
		el = null;
	};
}

export function open_lessons() {
	ls.on = true;
	go(Math.max(0, STAGES.findIndex((t) => t.l.some((_, i) => !ls.done.includes(level_id(t.k, i))))));
}

export function close_lessons() {
	clearTimeout(timer);
	ls.on = false;
	ls.list = false;
}

export const toggle_lessons = () => (ls.on ? close_lessons() : open_lessons());

// a topic opens at its first unfinished level
export function go(i: number) {
	ls.si = i;
	ls.li = Math.max(0, STAGES[i].l.findIndex((_, j) => !ls.done.includes(level_id(STAGES[i].k, j))));
	ls.list = false;
	misses = 0;
	start();
	intro();
}

export function next() {
	if (last()) return close_lessons();
	if (ls.li < stage().l.length - 1) {
		ls.li++;
		misses = 0;
		start();
	} else go(ls.si + 1);
}

// the coach opens each topic with its idea, in the chat, once
function intro() {
	const t = stage();
	const text = `**${t.t}**: ${t.d}`;
	if (!s || said === t.k || s.chat_messages.at(-1)?.content === text) return;
	said = t.k;
	s.chat_messages = [...s.chat_messages, { role: 'assistant', content: text }];
}

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
	ls.pos = rules!.fen();
	board!.set({ fen: ls.pos, turnColor: turn, check: rules!.inCheck() ? turn : false, movable: { color: ls.me, dests: turn === ls.me ? dests() : new Map() }, ...extra });
}

export function start() {
	clearTimeout(timer);
	const l = level();
	ls.moves = 0;
	ls.got = [];
	ls.st = '';
	ls.miss = '';
	step = 0;
	sel = '';
	if (free()) {
		pieces = parse(l.f);
		rules = null;
		ls.me = 'white';
		ls.pos = l.f;
	} else {
		rules = new Chess(l.f);
		ls.me = rules.turn() === 'w' ? 'white' : 'black';
	}
	if (!board) return;
	board.setAutoShapes([]);
	if (rules) show({ orientation: ls.me, lastMove: undefined });
	else board.set({ fen: l.f, orientation: 'white', turnColor: 'white', lastMove: undefined, check: false, movable: { color: 'white', dests: dests() } });
	if (misses > 1) point();
}

function answer() {
	return rules ? hint(level(), rules, step) : free_hint(level(), pieces, ls.got);
}

// an arrow shows the way: on request, or after two misses
export function point() {
	const m = ls.st === '' && answer();
	if (!m || !board) return;
	board.getState().drawable.brushes.glow ??= { key: 'gw', color: '#e9a47c', opacity: 0.9, lineWidth: 11 };
	board.setAutoShapes([{ orig: m.slice(0, 2) as Key, dest: m.slice(2, 4) as Key, brush: 'glow' }]);
}

function shake(q: string) {
	calm.sound.nope();
	requestAnimationFrame(() => {
		const p = [...(el?.querySelectorAll('piece') ?? [])].find((x) => (x as unknown as { cgKey?: string }).cgKey === q);
		p?.animate([{ translate: '0 0' }, { translate: '-8% 0' }, { translate: '7% 0' }, { translate: '-5% 0' }, { translate: '3% 0' }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' });
	});
}

function win(mate = false) {
	ls.st = 'w';
	misses = 0;
	if (!mate) calm.sound.chord();
	board!.set({ movable: { color: undefined, dests: new Map() } });
	const id = level_id(stage().k, ls.li);
	if (ls.done.includes(id)) return;
	ls.done = [...ls.done, id];
	try {
		localStorage.setItem('e4_lessons', JSON.stringify(ls.done));
	} catch {}
}

function back(fen: string) {
	rules = new Chess(fen);
	ls.st = '';
	show({ lastMove: undefined });
	if (misses > 1) point();
}

function wrong(before: string, dest: Key, san: string) {
	ls.st = 'n';
	ls.miss = say_move(san);
	misses++;
	ls.oops = rules!.isStalemate() ? 'stalemate! the other side can’t move, but it isn’t in check, so it’s only a draw. try again.' : level().g === 'd' ? 'that doesn’t stop it. watch, then try again.' : 'not quite. try again.';
	shake(dest);
	board!.set({ movable: { color: undefined, dests: new Map() } });
	const mate = level().g === 'd' && mate_in_one(rules!);
	if (!mate) timer = setTimeout(() => back(before), 1100);
	else
		timer = setTimeout(() => {
			rules!.move(mate);
			calm.sound.thock(1.4);
			show({ lastMove: [mate.from, mate.to], movable: { color: undefined, dests: new Map() } });
			timer = setTimeout(() => back(before), 2000);
		}, 700);
}

export function moved(orig: Key, dest: Key) {
	const l = level();
	ls.moves++;
	board!.setAutoShapes([]);
	if (l.s?.includes(dest) && !ls.got.includes(dest)) {
		ls.got = [...ls.got, dest];
		calm.sound.chime(4 + ls.got.length * 2, 0.8);
	}
	if (!rules) {
		const took = pieces.get(dest)?.[0] === 'b';
		const promote = pieces.get(orig) === 'wP' && dest[1] === '8';
		pieces = play(pieces, orig, dest);
		ls.pos = [...pieces].map(([q, p]) => p + q).join(' ');
		if (promote) board!.setPieces(new Map([[dest, { role: 'queen', color: 'white', promoted: true }]]));
		play_move({ to: dest, captured: took ? 'x' : undefined });
		if (cleared(l, pieces, new Set(ls.got))) return win();
		board!.set({ turnColor: 'white', movable: { color: 'white', dests: dests() } });
		return;
	}
	const before = rules.fen();
	const m = rules.move({ from: orig, to: dest, promotion: 'q' });
	play_move(m);
	show();
	if (!right(l, rules, step, orig + dest)) return wrong(before, dest, m.san);
	if (rules.isCheckmate() || !l.a || step === l.a.length - 1) return win(rules.isCheckmate());
	const r = l.a[step + 1];
	step += 2;
	timer = setTimeout(() => {
		const k = rules!.move({ from: r.slice(0, 2), to: r.slice(2, 4), promotion: 'q' });
		play_move(k);
		show({ lastMove: [k.from, k.to] });
	}, 700);
}

function square_at(e: PointerEvent) {
	const r = el!.getBoundingClientRect();
	const c = Math.floor(((e.clientX - r.left) / r.width) * 8);
	const w = Math.floor(((e.clientY - r.top) / r.height) * 8);
	if (c < 0 || c > 7 || w < 0 || w > 7) return '';
	return ls.me === 'white' ? 'abcdefgh'[c] + (8 - w) : 'abcdefgh'[7 - c] + (w + 1);
}

// a piece sent where it can't go gives a little shake
export function down(e: PointerEvent) {
	// the board moves when the text around it changes, so let chessground measure it again
	board?.getState().dom.bounds.clear();
	const q = square_at(e);
	const d = board?.getState().movable.dests;
	if (!q || !d || ls.st === 'w') return;
	const own = d.has(q as Key);
	if (sel && q !== sel && !own && !d.get(sel as Key)?.includes(q as Key)) shake(sel);
	held = own ? q : '';
	sel = own && q !== sel ? q : '';
}

export function up(e: PointerEvent) {
	const q = square_at(e);
	const d = board?.getState().movable.dests;
	if (held && q && q !== held && d && !d.get(held as Key)?.includes(q as Key) && ls.st !== 'w') shake(held);
	if (held && q && q !== held) sel = '';
	held = '';
}

function pieces_words() {
	const side: Record<string, string[]> = { w: [], b: [] };
	if (rules) for (const row of rules.board()) for (const p of row) if (p) side[p.color].push(`${NAMES[p.type]} ${p.square}`);
	if (!rules) for (const [q, p] of pieces) side[p[0]].push(`${NAMES[p[1].toLowerCase()]} ${q}`);
	return `white: ${side.w.join(', ') || 'nothing'}. black: ${side.b.join(', ') || 'nothing'}.`;
}

function answer_words() {
	const m = answer();
	if (!m) return '';
	if (!rules) return `move the ${NAMES[pieces.get(m.slice(0, 2))![1].toLowerCase()]} from ${m.slice(0, 2)} to ${m.slice(2, 4)}`;
	try {
		return say_move(new Chess(rules.fen()).move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: 'q' }).san);
	} catch {
		return m;
	}
}

// what the coach needs to know about the lesson, in words
export function lesson_words() {
	const t = stage();
	const l = level();
	return [
		`the player is doing a lesson, not playing a game. topic: ${t.t}. ${t.d}`,
		`level ${ls.li + 1} of ${t.l.length}. the task: ${l.t}`,
		l.s && (l.g === 's' ? `stars to collect: ${l.s.filter((q) => !ls.got.includes(q)).join(', ') || 'none left'}` : `stars mark: ${l.s.join(', ')}`),
		free() ? `only white moves here, and the black pieces never move. moves used: ${ls.moves}, fewest possible: ${l.b}` : `the player is ${ls.me}`,
		ls.st === 'w' ? 'they just solved it' : ls.miss && `their last wrong try: ${ls.miss}`,
		ls.st === '' && `the answer: ${answer_words()}`
	]
		.filter(Boolean)
		.join('. ');
}

export function lesson_data(): ChatData {
	return { l: lesson_words(), b: pieces_words(), ...(rules && { f: rules.fen() }) };
}

export function lesson_voice() {
	return `lesson: ${lesson_words()}. pieces: ${pieces_words()}`;
}

export function lesson_suggestions() {
	const more = `tell me more about ${stage().t}`;
	if (ls.st === 'w') return ['why does that work?', more];
	if (ls.miss) return ['why was that wrong?', 'give me a hint'];
	return ['give me a hint', more];
}
