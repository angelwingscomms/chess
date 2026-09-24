export type Puzzle = {
	f: string; // fen, the side to move solves it
	r: number; // rating
	t: string; // theme, in words
};

export const puzzles: Puzzle[] = [
	{ f: '2r2rk1/1p2ppbp/p2p2p1/3N3q/1Pn5/P5P1/1B1QPPKP/R4R2 w - - 0 19', r: 1463, t: 'fork' },
	{ f: '7b/4k2p/3N1ppP/2pPp3/2P1P1Q1/1q4N1/1rn2PK1/5R2 b - - 0 37', r: 953, t: 'pin' },
	{ f: '1Q6/5p1k/6p1/7p/PK5P/6P1/4q3/8 b - - 0 49', r: 1077, t: 'skewer' },
	{ f: '4rk1r/1QR2pp1/3p4/1B1Nn1p1/4P1q1/P7/1P3PPP/5RK1 b - - 2 25', r: 1322, t: 'mate in 2' },
	{ f: 'rn3rk1/pbq2ppp/1p2p3/2bn4/4N3/5NP1/PPQ1PPBP/R1BR2K1 b - - 3 12', r: 1364, t: 'discovered attack' },
	{ f: 'r3r2k/p5p1/4p2p/2PpPp1Q/7R/2P1P1R1/1q4PP/6K1 w - - 0 28', r: 1198, t: 'sacrifice' },
	{ f: '8/p4N2/5kp1/4p1Q1/7K/1B5P/PP6/5rq1 b - - 8 42', r: 1186, t: 'deflection' },
	{ f: '5rk1/pp4pp/2p1p1n1/2q1P1B1/6Q1/8/PPP2PPP/3R2K1 b - - 1 18', r: 928, t: 'back rank mate' },
	{ f: '3r3k/p5bp/2n2q2/1ppN4/5r2/2P2N1P/PPQ1RRP1/6K1 b - - 4 30', r: 1078, t: 'hanging piece' },
	{ f: 'r4rk1/1p2bppp/3p4/3Qp3/p1N2P2/7n/PP2B1PP/2R3RK b - - 0 23', r: 923, t: 'smothered mate' },
	{ f: 'R5Q1/8/3r4/5P2/1k6/2ppP3/p7/2K5 b - - 1 60', r: 1273, t: 'promotion' },
	{ f: '8/1p6/3k2p1/PB1n2p1/1P2K3/5P2/8/8 b - - 0 41', r: 1282, t: 'endgame' }
];

export function parse_fen(fen: string) {
	const [rows, turn] = fen.split(' ');
	const flip = turn === 'b';
	const out: { x: number; y: number; c: string }[] = [];
	rows.split('/').forEach((row, y) => {
		let x = 0;
		for (const ch of row) {
			if (ch >= '1' && ch <= '8') {
				x += +ch;
				continue;
			}
			out.push({ x: flip ? 7 - x : x, y: flip ? 7 - y : y, c: (ch < 'a' ? 'w' : 'b') + ch.toUpperCase() });
			x++;
		}
	});
	return out;
}
