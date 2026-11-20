import { Chess } from 'chess.js';
import { check_position, type Check, type Color } from '$lib/util/chess/engine';
import { chances, move_accuracy } from '$lib/progress.svelte';

// the mistake watch: after each of the player's moves in a game, the chess computer compares the position before and after.
// a move that throws away a third of the player's winning chances (lichess's blunder line) gets a gentle warning;
// a sharp move that matches the computer's own choice gets a word of praise. every move's accuracy feeds the game's score.
// k: '' nothing to say, b a big mistake, g a great move. w the words, m the reply that punishes the mistake (uci)
export const wt = $state({ k: '' as '' | 'b' | 'g', w: '', m: '' });

const NAMES: Record<string, string> = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const looks = new Map<string, Promise<Check | null>>();
let acc: number[] = [];
let turn = 0;
let busy = false; // a check is still running, so its score is not in acc yet

// each position is checked once, on the coach's one warm worker
export function look(fen: string) {
	if (!looks.has(fen)) {
		looks.set(fen, check_position(fen, 700));
		if (looks.size > 60) looks.delete(looks.keys().next().value!);
	}
	return looks.get(fen)!;
}

// the mover's winning chances, -1 to 1
const value = (c: Check, me: Color) => (c.k ? ((c.k > 0) === (me === 'w') ? 1 : -1) : chances(me === 'w' ? c.s : -c.s));

function warning(after: string, reply: Check, me: Color) {
	if (reply.k && (reply.k > 0) !== (me === 'w')) return 'careful: that move lets the computer checkmate you.';
	try {
		const m = new Chess(after).move({ from: reply.m.slice(0, 2), to: reply.m.slice(2, 4), promotion: reply.m[4] });
		if (m.captured) return `careful: that move lets the computer take your ${NAMES[m.captured]} on ${m.to}.`;
	} catch {}
	return 'careful: that move gives the computer a big chance.';
}

export async function watch_move(m: { before: string; after: string; from: string; to: string; promotion?: string; san: string }, me: Color) {
	const id = ++turn;
	clear();
	busy = true;
	const [b, a] = await Promise.all([look(m.before), look(m.after)]);
	if (id !== turn) return;
	busy = false;
	if (!b || !a) return;
	const wb = value(b, me);
	const wa = value(a, me);
	acc.push(move_accuracy(wb, wa));
	// a game already lost by a lot gets no more warnings: they would only pile up
	if (wb - wa >= 0.3 && wb > -0.6) Object.assign(wt, { k: 'b', w: warning(m.after, a, me), m: a.m });
	else if (b.m === m.from + m.to + (m.promotion ?? '') && /[x+#]/.test(m.san) && wa > 0.2) Object.assign(wt, { k: 'g', w: m.san.endsWith('#') ? 'checkmate. beautiful.' : 'great move: it’s the one the computer would play.', m: '' });
}

export function clear() {
	Object.assign(wt, { k: '', w: '', m: '' });
}

// a take-back removes the last move's score too
export function undo_watch() {
	turn++;
	if (!busy) acc.pop();
	busy = false;
	clear();
}

// the game's accuracy, 0-100, and a clean start for the next game
export function end_watch() {
	const a = acc.length ? acc.reduce((x, y) => x + y, 0) / acc.length : 0;
	acc = [];
	turn++;
	clear();
	return a;
}
