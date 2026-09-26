export type Level = {
	f: string; // board: piece placement for star and capture levels, a full fen for the rest
	g: 's' | 'c' | 'k' | 'e' | 'm'; // goal: s = collect stars, c = capture everything, k = give check, e = escape check, m = checkmate
	s?: string[]; // stars to collect
	t: string; // what to do, in plain words
	b: number; // fewest moves it can be done in
};

export type Stage = {
	k: string; // id
	t: string; // title
	d: string; // what it teaches, in plain words
	i: string; // piece on its card, e.g. wR
	l: Level[];
};

export const STAGES: Stage[] = [
	{
		k: 'rook',
		t: 'the rook',
		d: 'the rook slides in straight lines: up, down or sideways, as far as it likes.',
		i: 'wR',
		l: [
			{ f: '8/8/8/8/8/8/8/R7', g: 's', s: ['a8', 'h8'], t: 'move the rook to each star.', b: 2 },
			{ f: '8/8/8/8/8/2R5/8/8', g: 's', s: ['c7', 'g7', 'g2', 'b2'], t: 'grab all four stars.', b: 4 },
			{ f: '8/8/8/8/P7/8/8/R2P4', g: 's', s: ['a3', 'c3', 'c8', 'h8'], t: 'your own pieces are in the way. find a path around them.', b: 4 }
		]
	},
	{
		k: 'bishop',
		t: 'the bishop',
		d: 'the bishop slides on the diagonals, and always stays on the same colour.',
		i: 'wB',
		l: [
			{ f: '8/8/8/8/8/8/8/2B5', g: 's', s: ['e3', 'h6'], t: 'move the bishop to each star, along the diagonals.', b: 2 },
			{ f: '8/8/8/8/8/8/8/5B2', g: 's', s: ['b5', 'e8', 'h5'], t: 'grab all three stars.', b: 3 },
			{ f: '8/8/8/8/8/8/8/2B5', g: 's', s: ['a3', 'd6', 'h2'], t: 'every star is on a dark square. a bishop never leaves its colour.', b: 3 }
		]
	},
	{
		k: 'queen',
		t: 'the queen',
		d: 'the strongest piece: it moves like a rook and a bishop together.',
		i: 'wQ',
		l: [
			{ f: '8/8/8/8/8/8/8/3Q4', g: 's', s: ['d8', 'a5', 'e1'], t: 'straight lines and diagonals. grab the stars.', b: 3 },
			{ f: '8/8/8/8/8/8/8/Q7', g: 's', s: ['h8', 'h1', 'a8', 'd5'], t: 'four stars. can you do it in four moves?', b: 4 }
		]
	},
	{
		k: 'king',
		t: 'the king',
		d: 'the most important piece. it steps one square in any direction.',
		i: 'wK',
		l: [
			{ f: '8/8/8/8/8/8/8/4K3', g: 's', s: ['e2', 'f3', 'g3'], t: 'one step at a time. collect the stars.', b: 3 },
			{ f: '8/8/8/8/4K3/8/8/8', g: 's', s: ['d5', 'd6', 'e7', 'f6'], t: 'diagonal steps count too.', b: 4 }
		]
	},
	{
		k: 'knight',
		t: 'the knight',
		d: 'the knight jumps in an L: two squares one way, then one to the side. it can hop over pieces.',
		i: 'wN',
		l: [
			{ f: '8/8/8/8/8/8/8/1N6', g: 's', s: ['c3', 'd5'], t: 'jump to each star in an L shape.', b: 2 },
			{ f: '8/8/8/8/8/8/8/6N1', g: 's', s: ['f3', 'e5', 'g6', 'h8'], t: 'four jumps to the corner.', b: 4 },
			{ f: '8/8/8/8/8/8/PPPP4/1N6', g: 's', s: ['c3', 'b5', 'd6'], t: 'the knight jumps right over the pawns.', b: 3 }
		]
	},
	{
		k: 'pawn',
		t: 'the pawn',
		d: 'the pawn walks one square forward (two on its first move) and takes pieces one square diagonally forward.',
		i: 'wP',
		l: [
			{ f: '8/8/8/8/8/8/4P3/8', g: 's', s: ['e4', 'e5'], t: 'on its first move, a pawn may step two squares.', b: 2 },
			{ f: '8/8/8/3p4/8/4p3/3P4/8', g: 'c', t: 'pawns take diagonally. take both black pawns.', b: 3 },
			{ f: '8/8/P7/8/8/8/8/8', g: 's', s: ['a8', 'h1'], t: 'reach the far side and your pawn turns into a queen! then use her to grab the last star.', b: 3 }
		]
	},
	{
		k: 'capture',
		t: 'taking pieces',
		d: 'land on an enemy piece to take it off the board.',
		i: 'wN',
		l: [
			{ f: '8/8/n4b2/8/8/8/5p2/R7', g: 'c', t: 'take all the black pieces with your rook. they won’t move.', b: 3 },
			{ f: '8/3r4/8/8/1n4n1/8/8/3Q4', g: 'c', t: 'now with your queen. three moves, three pieces.', b: 3 }
		]
	},
	{
		k: 'check',
		t: 'check',
		d: 'attacking the king is called check. the other side must fix it right away.',
		i: 'wR',
		l: [
			{ f: '4k3/8/8/8/8/8/8/R5K1 w - - 0 1', g: 'k', t: 'put the black king in check with your rook.', b: 1 },
			{ f: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1', g: 'k', t: 'now give check with your queen. there are a few ways.', b: 1 }
		]
	},
	{
		k: 'escape',
		t: 'out of check',
		d: 'when your king is in check, you must save it: move it, block the attack, or take the attacker.',
		i: 'wK',
		l: [
			{ f: '4r1k1/8/8/8/8/8/5PPP/4K3 w - - 0 1', g: 'e', t: 'your king is in check from the rook. move it to a safe square.', b: 1 },
			{ f: '4r1k1/8/8/8/2B5/8/8/4K3 w - - 0 1', g: 'e', t: 'check again! this time you can also block it with your bishop.', b: 1 },
			{ f: 'k7/8/8/8/8/8/4r3/4K3 w - - 0 1', g: 'e', t: 'the rook is right next to your king and nobody guards it. take it!', b: 1 }
		]
	},
	{
		k: 'mate',
		t: 'checkmate',
		d: 'check with no way out. that wins the game!',
		i: 'wQ',
		l: [
			{ f: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', g: 'm', t: 'the black king is stuck behind its pawns. checkmate it in one move.', b: 1 },
			{ f: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', g: 'm', t: 'your king helps. find the checkmate with your queen.', b: 1 },
			{ f: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', g: 'm', t: 'the famous four-move checkmate. find it!', b: 1 }
		]
	}
];

export const level_id = (k: string, i: number) => `${k}-${i}`;

// star and capture levels: only white moves, black pieces just stand there, and there is no king to protect
export function parse(f: string) {
	const out = new Map<string, string>();
	f.split('/').forEach((row, i) => {
		let c = 0;
		for (const ch of row) {
			if (ch >= '1' && ch <= '8') c += +ch;
			else out.set('abcdefgh'[c++] + (8 - i), (ch < 'a' ? 'w' : 'b') + ch.toUpperCase());
		}
	});
	return out;
}

const LINES: Record<string, number[][]> = {
	R: [[1, 0], [-1, 0], [0, 1], [0, -1]],
	B: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
	Q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
};
const STEPS: Record<string, number[][]> = {
	K: LINES.Q,
	N: [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
};

export function free_moves(board: Map<string, string>, from: string) {
	const p = board.get(from);
	if (!p || p[0] !== 'w') return [];
	const f = from.charCodeAt(0) - 97;
	const r = +from[1];
	const at = (x: number, y: number) => (x >= 0 && x < 8 && y >= 1 && y <= 8 ? 'abcdefgh'[x] + y : '');
	const out: string[] = [];
	const land = (q: string) => {
		const o = board.get(q);
		if (!o) out.push(q);
		else if (o[0] === 'b') out.push(q);
		return !o;
	};
	if (LINES[p[1]])
		for (const [dx, dy] of LINES[p[1]])
			for (let k = 1; ; k++) {
				const q = at(f + dx * k, r + dy * k);
				if (!q || !land(q)) break;
			}
	if (STEPS[p[1]])
		for (const [dx, dy] of STEPS[p[1]]) {
			const q = at(f + dx, r + dy);
			if (q) land(q);
		}
	if (p[1] === 'P') {
		const one = at(f, r + 1);
		if (one && !board.get(one)) {
			out.push(one);
			const two = at(f, r + 2);
			if (r === 2 && two && !board.get(two)) out.push(two);
		}
		for (const dx of [-1, 1]) {
			const q = at(f + dx, r + 1);
			if (q && board.get(q)?.[0] === 'b') out.push(q);
		}
	}
	return out;
}

export function play(board: Map<string, string>, from: string, to: string) {
	const next = new Map(board);
	const p = next.get(from)!;
	next.delete(from);
	next.set(to, p === 'wP' && to[1] === '8' ? 'wQ' : p);
	return next;
}

export function cleared(l: Level, board: Map<string, string>, got: Set<string>) {
	return l.g === 's' ? got.size === (l.s?.length ?? 0) : ![...board.values()].some((p) => p[0] === 'b');
}
