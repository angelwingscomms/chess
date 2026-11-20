import { Chess } from 'chess.js';
import type { Check } from '$lib/util/chess/engine';
import { say_move } from '$lib/util/chess/words';

const side = (w: boolean) => (w ? 'white' : 'black');

function ahead(s: number) {
	const a = Math.abs(s);
	const w = side(s > 0);
	if (a < 60) return 'the game is about even';
	if (a < 150) return `${w} is a little better`;
	if (a < 350) return `${w} is better, about a pawn or two ahead`;
	if (a < 800) return `${w} is winning, about a piece ahead`;
	return `${w} is winning easily`;
}

// a move in words with the square it leaves, so the coach never needs a chess code and never mixes up two rooks
const say = (m: { from: string; san: string }) => (m.san.startsWith('O-O') ? say_move(m.san) : say_move(m.san).replace(/^(\w+) /, `$1 from ${m.from} `));

// the chess computer's check of a position, in the words a coach would read it in
export function check_words(fen: string, c: Check) {
	const g = new Chess(fen);
	const mover = g.turn() === 'w';
	const said: string[] = [];
	for (const u of c.pv.slice(0, 5)) {
		try {
			said.push(say(g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })));
		} catch {
			break;
		}
	}
	if (!said.length) return '';
	const [first, ...rest] = said;
	const then = rest.length ? ` then: ${rest.join('; ')}.` : '';
	const who = c.k ? `${side(c.k > 0)} can force checkmate in ${Math.abs(c.k)}` : ahead(c.s);
	return `${side(mover)} to move. best move: ${first}.${then} ${who}.`;
}
