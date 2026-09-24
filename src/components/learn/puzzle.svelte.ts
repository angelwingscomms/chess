import { Chess } from 'chess.js';
import type { Puzzle } from '$lib/types/puzzle';
import type { Hint } from '$lib/util/chess/engine';
import type { LearnState } from './learn_context.svelte';

const TACTICS = ['fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'sacrifice', 'deflection', 'attraction', 'hangingPiece', 'trappedPiece', 'mateIn1', 'mateIn2', 'mateIn3', 'backRankMate', 'smotheredMate', 'promotion', 'endgame', 'defensiveMove', 'quietMove', 'zugzwang'];

export const pz = $state({
	on: false,
	p: null as Puzzle | null,
	line: [] as string[],
	i: 0,
	st: 's', // s solving, y right move, n wrong move, w solved
	shown: false,
	busy: false,
	recent: [] as Puzzle[]
});

let s: LearnState | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

const pos = (fen: string) => fen.split(' ').slice(0, 4).join(' ');
const side = () => (pz.p?.f.split(' ')[1] ?? 'w') as 'w' | 'b';

export const theme_words = (t: string) => t.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase();
export const main_theme = (p: Puzzle | null) => TACTICS.find((t) => p?.t.includes(t)) ?? '';

export function solution_san(p: Puzzle | null) {
	if (!p) return '';
	try {
		const c = new Chess(p.f);
		return p.m.split(' ').filter(Boolean).map((u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined }).san).join(' ');
	} catch {
		return '';
	}
}

export function bind_puzzles(state: LearnState) {
	s = state;
	pz.on = false;
	pz.p = null;
}

export function offer_puzzles(list: Puzzle[] | undefined) {
	if (list?.length) pz.recent = [...list, ...pz.recent].slice(0, 40);
}

export function arm_puzzle(fen: string) {
	const p = pz.recent.find((r) => pos(r.f) === pos(fen)) ?? null;
	if (p) s?.engine?.setColor?.('none');
	else if (pz.on) end_puzzle();
	return p;
}

export function start_puzzle(p: Puzzle) {
	if (!s) return;
	clearTimeout(timer);
	pz.on = true;
	pz.p = p;
	pz.line = p.m.split(' ').filter(Boolean);
	pz.i = 0;
	pz.st = 's';
	pz.shown = false;
	s.engine?.setColor?.('none');
	if (s.orientation !== side()) s.chessRef?.toggleOrientation();
}

function play(uci: string) {
	s?.chessRef?.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined } as unknown as string);
}

export function puzzle_move(m: { from: string; to: string; promotion?: string; color: string; san?: string }) {
	if (!pz.on || pz.st === 'w' || pz.shown || m.color !== side()) return '';
	const uci = m.from + m.to + (m.promotion ?? '');
	if (uci !== pz.line[pz.i] && !m.san?.endsWith('#')) {
		pz.st = 'n';
		timer = setTimeout(() => {
			s?.chessRef?.undo();
			pz.st = 's';
		}, 700);
		return 'n';
	}
	pz.i++;
	if (pz.i >= pz.line.length || m.san?.endsWith('#')) {
		pz.st = 'w';
		return 'w';
	}
	pz.st = 'y';
	timer = setTimeout(() => {
		play(pz.line[pz.i]);
		pz.i++;
		if (pz.i >= pz.line.length) pz.st = 'w';
	}, 450);
	return 'y';
}

export function puzzle_hint() {
	if (!s || !pz.on || pz.st === 'w') return;
	s.hints = [{ move: pz.line[pz.i], score: 0, depth: 0 } as Hint];
	s.hint_index = 0;
	s.hint_fen = s.fen;
	s.show_hints = true;
}

export function puzzle_solution() {
	if (!pz.on || pz.st === 'w') return;
	pz.shown = true;
	s?.hideHints(true);
	const step = () => {
		if (pz.i >= pz.line.length) {
			pz.st = 'w';
			return;
		}
		play(pz.line[pz.i]);
		pz.i++;
		timer = setTimeout(step, 750);
	};
	clearTimeout(timer);
	step();
}

export async function next_puzzle(theme = main_theme(pz.p), rating = pz.p?.r) {
	if (!s || pz.busy) return;
	pz.busy = true;
	try {
		const r = rating ?? 600 + s.level * 200;
		const res = await fetch('/api/puzzles', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ t: theme ? [theme] : undefined, r_min: r - 150, r_max: r + 150, n: 1 })
		});
		const p = ((await res.json()).puzzles ?? [])[0] as Puzzle | undefined;
		if (!p) throw Error('no puzzle');
		offer_puzzles([p]);
		arm_puzzle(p.f);
		s.reset_board_state(p.f);
		start_puzzle(p);
	} catch {
		s.add_toast('no puzzle found. try again.', 'e');
	} finally {
		pz.busy = false;
	}
}

export function end_puzzle() {
	clearTimeout(timer);
	if (!pz.on) return;
	pz.on = false;
	pz.p = null;
	if (!s) return;
	s.hideHints(true);
	const engine = s.orientation === 'w' ? 'b' : 'w';
	s.engine?.setColor?.(engine);
	if (s.turn === engine && !s.gameOver) s.chessRef?.playEngineMove?.();
}
