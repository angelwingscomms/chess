import type { Chess } from 'chess.js';

export type Level = {
	f: string; // board: piece placement for star and capture levels, a full fen for the rest
	g: 's' | 'c' | 'k' | 'e' | 'm' | 'x' | 'd' | 'v'; // goal: s = collect stars, c = capture everything, k = give check, e = escape check, m = checkmate, x = play the moves in a, d = stop a checkmate, v = leave nothing to take
	s?: string[]; // stars: to collect, or just to point at
	a?: string[]; // moves to find, taking turns with the computer's replies; 'e2e4|d2d4' allows either
	t: string; // what to do, in plain words
	w?: string; // what to say after a win
	b?: number; // fewest moves, for star and capture levels
};

export type Stage = {
	k: string; // id
	p: string; // part of the course
	t: string; // title
	d: string; // what it teaches, in plain words
	i: string; // piece on its card, e.g. wR
	l: Level[];
};

export const STAGES: Stage[] = [
	{
		k: 'rook',
		p: 'the pieces',
		t: 'the rook',
		d: 'the rook slides in straight lines: up, down or sideways, as far as it likes.',
		i: 'wR',
		l: [
			{ f: '8/8/8/8/8/8/8/R7', g: 's', s: ['a8', 'h8'], t: 'move the rook to each star.', b: 2 },
			{ f: '8/8/8/8/8/2R5/8/8', g: 's', s: ['c7', 'g7', 'g2', 'b2'], t: 'grab all four stars.', b: 4 },
			{ f: '8/8/8/8/P7/8/8/R2P4', g: 's', s: ['a3', 'c3', 'c8', 'h8'], t: 'your own pieces are in the way. find a path around them.', b: 4 },
			{ f: '8/2P5/8/8/8/8/6P1/1R6', g: 's', s: ['b7', 'h7', 'h1'], t: 'three stars, and your pawns stand in the way.', b: 4 },
			{ f: '8/1n6/8/8/8/1p3b2/8/1R6', g: 'c', t: 'take every black piece with your rook. they won’t move.', b: 4 }
		]
	},
	{
		k: 'bishop',
		p: 'the pieces',
		t: 'the bishop',
		d: 'the bishop slides on the diagonals, and always stays on the same colour.',
		i: 'wB',
		l: [
			{ f: '8/8/8/8/8/8/8/2B5', g: 's', s: ['e3', 'h6'], t: 'move the bishop to each star, along the diagonals.', b: 2 },
			{ f: '8/8/8/8/8/8/8/5B2', g: 's', s: ['b5', 'e8', 'h5'], t: 'grab all three stars.', b: 3 },
			{ f: '8/8/8/8/8/8/8/2B5', g: 's', s: ['a3', 'd6', 'h2'], t: 'every star is on a dark square. a bishop never leaves its colour.', b: 3 },
			{ f: '8/8/8/8/8/8/1P1P4/2B5', g: 's', s: ['g5'], t: 'your bishop is stuck behind its own pawns. move a pawn to let it out, then grab the star.', b: 2 },
			{ f: '5r2/8/1p6/8/3n4/8/8/6B1', g: 'c', t: 'take all three black pieces with your bishop.', b: 4 }
		]
	},
	{
		k: 'queen',
		p: 'the pieces',
		t: 'the queen',
		d: 'the strongest piece: it moves like a rook and a bishop together.',
		i: 'wQ',
		l: [
			{ f: '8/8/8/8/8/8/8/3Q4', g: 's', s: ['d8', 'a5', 'e1'], t: 'straight lines and diagonals. grab the stars.', b: 3 },
			{ f: '8/8/8/8/8/8/8/Q7', g: 's', s: ['h8', 'h1', 'a8', 'd5'], t: 'four stars. can you do it in four moves?', b: 4 },
			{ f: '8/8/8/8/3Q4/8/8/8', g: 's', s: ['a7', 'g7', 'g1', 'a1'], t: 'a big square. four stars, four moves.', b: 4 },
			{ f: '1r6/8/8/4n3/8/8/1p6/Q7', g: 'c', t: 'take all three black pieces. she can go any way.', b: 3 },
			{ f: '8/8/2P5/8/8/2P5/8/Q7', g: 's', s: ['h8', 'c8', 'h1'], t: 'your pawns block some paths. find the quickest way.', b: 3 }
		]
	},
	{
		k: 'king',
		p: 'the pieces',
		t: 'the king',
		d: 'the most important piece. it steps one square in any direction.',
		i: 'wK',
		l: [
			{ f: '8/8/8/8/8/8/8/4K3', g: 's', s: ['e2', 'f3', 'g3'], t: 'one step at a time. collect the stars.', b: 3 },
			{ f: '8/8/8/8/4K3/8/8/8', g: 's', s: ['d5', 'd6', 'e7', 'f6'], t: 'diagonal steps count too.', b: 4 },
			{ f: '8/8/8/3p4/2p5/3K4/8/8', g: 'c', t: 'the king can take too, one step at a time. take both pawns.', b: 2 },
			{ f: '8/8/8/8/8/8/8/7K', g: 's', s: ['g2', 'f3', 'f4', 'e5', 'e6'], t: 'walk your king up the board, one star at a time.', b: 5 },
			{ f: '8/8/8/2p1p3/8/3K4/8/8', g: 'c', t: 'take both pawns with your king. which way is quickest?', b: 4 }
		]
	},
	{
		k: 'knight',
		p: 'the pieces',
		t: 'the knight',
		d: 'the knight jumps in an L: two squares one way, then one to the side. it can hop over pieces.',
		i: 'wN',
		l: [
			{ f: '8/8/8/8/8/8/8/1N6', g: 's', s: ['c3', 'd5'], t: 'jump to each star in an L shape.', b: 2 },
			{ f: '8/8/8/8/8/8/8/6N1', g: 's', s: ['f3', 'e5', 'g6', 'h8'], t: 'four jumps to the corner.', b: 4 },
			{ f: '8/8/8/8/8/8/PPPP4/1N6', g: 's', s: ['c3', 'b5', 'd6'], t: 'the knight jumps right over the pawns.', b: 3 },
			{ f: '1p6/3p4/8/4p3/8/5N2/8/8', g: 'c', t: 'take all three pawns, jumping from one to the next.', b: 3 },
			{ f: '8/8/8/8/3N4/8/8/8', g: 's', s: ['d5'], t: 'the square right next to a knight is the hardest to reach. find a way.', b: 3 }
		]
	},
	{
		k: 'pawn',
		p: 'the pieces',
		t: 'the pawn',
		d: 'the pawn walks one square forward (two on its first move) and takes pieces one square diagonally forward.',
		i: 'wP',
		l: [
			{ f: '8/8/8/8/8/8/4P3/8', g: 's', s: ['e4', 'e5'], t: 'on its first move, a pawn may step two squares.', b: 2 },
			{ f: '8/8/8/3p4/8/4p3/3P4/8', g: 'c', t: 'pawns take diagonally. take both black pawns.', b: 3 },
			{ f: '8/8/P7/8/8/8/8/8', g: 's', s: ['a8', 'h1'], t: 'reach the far side and your pawn turns into a queen! then use her to grab the last star.', b: 3 },
			{ f: '8/8/8/1p6/2p5/3p4/4P3/8', g: 'c', t: 'take all three pawns, always one square diagonally forward.', b: 3 },
			{ f: '8/8/8/3pp3/4P3/8/8/8', g: 's', s: ['d6'], t: 'a pawn can’t move onto a piece in front of it. take to get around.', b: 2 }
		]
	},
	{
		k: 'capture',
		p: 'the rules',
		t: 'taking pieces',
		d: 'land on an enemy piece to take it off the board.',
		i: 'wN',
		l: [
			{ f: '8/8/n4b2/8/8/8/5p2/R7', g: 'c', t: 'take all the black pieces with your rook. they won’t move.', b: 3 },
			{ f: '8/3r4/8/8/1n4n1/8/8/3Q4', g: 'c', t: 'now with your queen. three moves, three pieces.', b: 3 },
			{ f: 'p7/8/2r5/8/4n3/8/8/7B', g: 'c', t: 'now with your bishop, along the diagonal.', b: 3 },
			{ f: '8/8/4r3/2b5/8/1q6/8/N7', g: 'c', t: 'the knight takes too. jump from piece to piece.', b: 3 },
			{ f: '8/1p6/8/8/5n2/8/8/R4B2', g: 'c', t: 'two pieces this time. take everything in as few moves as you can.', b: 4 }
		]
	},
	{
		k: 'check',
		p: 'the rules',
		t: 'check',
		d: 'attacking the king is called check. the other side must fix it right away.',
		i: 'wR',
		l: [
			{ f: '4k3/8/8/8/8/8/8/R5K1 w - - 0 1', g: 'k', t: 'put the black king in check with your rook.' },
			{ f: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1', g: 'k', t: 'now give check with your queen. there are a few ways.' },
			{ f: '4k3/8/8/8/8/8/8/4KB2 w - - 0 1', g: 'k', t: 'give check with your bishop, along a diagonal.' },
			{ f: '4k3/8/8/8/4N3/8/8/4K3 w - - 0 1', g: 'k', t: 'give check with your knight. remember its L-shaped jump.' },
			{ f: '8/8/3k4/8/4P3/8/8/4K3 w - - 0 1', g: 'k', t: 'even a pawn can give check. it attacks diagonally forward.' }
		]
	},
	{
		k: 'escape',
		p: 'the rules',
		t: 'out of check',
		d: 'when your king is in check, you must save it: move it, block the attack, or take the attacker.',
		i: 'wK',
		l: [
			{ f: '4r1k1/8/8/8/8/8/5PPP/4K3 w - - 0 1', g: 'e', t: 'your king is in check from the rook. move it to a safe square.' },
			{ f: '4r1k1/8/8/8/2B5/8/8/4K3 w - - 0 1', g: 'e', t: 'check again! this time you can also block it with your bishop.' },
			{ f: 'k7/8/8/8/8/8/4r3/4K3 w - - 0 1', g: 'e', t: 'the rook is right next to your king and nobody guards it. take it!' },
			{ f: 'k7/8/8/8/8/5n2/8/4K3 w - - 0 1', g: 'e', t: 'a knight gives check. you can’t block a knight, because it jumps. move your king to a safe square.' },
			{ f: 'k7/8/8/b7/8/1N6/8/4K3 w - - 0 1', g: 'e', t: 'check from far away! you can move, or block, or take the bishop with your knight. find a way out.', w: 'out of check! taking the attacker is often best, because then it’s gone for good.' }
		]
	},
	{
		k: 'mate',
		p: 'the rules',
		t: 'checkmate',
		d: 'check with no way out. that wins the game!',
		i: 'wQ',
		l: [
			{ f: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', g: 'm', t: 'the black king is stuck behind its pawns. checkmate it in one move.' },
			{ f: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', g: 'm', t: 'your king helps. find the checkmate with your queen.' },
			{ f: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', g: 'm', t: 'the famous four-move checkmate. find it!' },
			{ f: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', g: 'm', t: 'your king guards the squares in front of the black king. checkmate it with your rook.' },
			{ f: '6k1/8/6K1/8/8/8/8/Q7 w - - 0 1', g: 'm', t: 'the black king is on the edge. checkmate it with your queen.' }
		]
	},
	{
		k: 'castle',
		p: 'the rules',
		t: 'castling',
		d: 'a special move that keeps your king safe: the king and a rook move at the same time.',
		i: 'wK',
		l: [
			{ f: '4k3/8/8/8/8/8/5PPP/4K2R w K - 0 1', g: 'x', a: ['e1g1'], s: ['g1'], t: 'move your king two squares toward the rook, onto the star. the rook jumps over it.', w: 'that’s castling! your king hides in the corner behind its pawns, and the rook is ready to play.' },
			{ f: '4k3/8/8/8/8/8/PPP5/R3K3 w Q - 0 1', g: 'x', a: ['e1c1'], s: ['c1'], t: 'you can castle on the other side too. the king still moves two squares.', w: 'castled! on this side the rook travels one square further.' },
			{ f: '4k3/8/8/8/2b5/8/8/R3K2R w KQ - 0 1', g: 'x', a: ['e1c1'], t: 'your king may not castle across a square the enemy attacks. the black bishop guards one side, so castle the other way.', w: 'right! the bishop watched the short side, so the long side was the only way.' },
			{ f: '4k3/8/8/8/8/4r3/8/R3K2R w KQ - 0 1', g: 'e', t: 'you’re in check, and you may never castle out of check. move your king out of the rook’s line.', w: 'right! castling is not allowed while you’re in check.' },
			{ f: '4k3/8/8/8/8/8/5PPP/4KB1R w K - 0 1', g: 'x', a: ['f1e2|f1d3|f1c4|f1b5|f1a6', 'e8d8', 'e1g1'], t: 'your bishop is in the way. move it out, then castle.', w: 'castled! bring your knights and bishops out first, then tuck your king away.' }
		]
	},
	{
		k: 'passant',
		p: 'the rules',
		t: 'en passant',
		d: 'a special pawn capture: when an enemy pawn jumps two squares and lands beside yours, you can take it as if it had moved one.',
		i: 'wP',
		l: [
			{ f: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', g: 'x', a: ['e5d6'], s: ['d6'], t: 'the black pawn just jumped two squares and landed beside yours. take it by moving diagonally onto the star.', w: 'that’s en passant, french for “in passing”. you can only do it right after the jump.' },
			{ f: '4k3/8/8/1pP5/8/8/8/4K3 w - b6 0 2', g: 'x', a: ['c5b6'], t: 'it happened again! take the pawn in passing.', w: 'en passant! the pawn beside yours is gone.' },
			{ f: '4k3/8/8/2pPp3/8/8/8/4K3 w - e6 0 2', g: 'x', a: ['d5e6'], t: 'two black pawns stand beside yours, but only one just jumped two squares. take that one in passing.', w: 'right! the other pawn moved long ago, so it can’t be taken in passing.' },
			{ f: '4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1', g: 'x', a: ['d4e3'], t: 'you play black now. the white pawn just jumped beside yours. take it in passing!', w: 'en passant works for black too.' },
			{ f: '8/5K2/7p/5kpP/8/8/8/8 w - g6 0 67', g: 'x', a: ['h5g6'], t: 'the black pawn jumped two squares, right past yours. take it in passing, and your pawn is free to run!', w: 'en passant! now nothing stops your pawn.' }
		]
	},
	{
		k: 'stalemate',
		p: 'the rules',
		t: 'stalemate',
		d: 'if the side to move has no legal move but is not in check, the game is a draw: nobody wins.',
		i: 'wK',
		l: [
			{ f: 'k7/2K5/8/8/8/8/8/6Q1 w - - 0 1', g: 'm', t: 'checkmate with your queen. careful: if black can’t move but isn’t in check, it’s stalemate, only a draw.', w: 'checkmate! and you didn’t fall into the stalemate trap.' },
			{ f: '7k/R7/6K1/8/8/8/8/8 w - - 0 1', g: 'm', t: 'now checkmate with your rook, and watch out for stalemate again.', w: 'checkmate! your rook took the back row while your king blocked the escape.' },
			{ f: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', g: 'm', t: 'one queen move is checkmate. another leaves black with no moves at all: stalemate. find the checkmate.', w: 'checkmate! the king was in check and had nowhere to go.' },
			{ f: '7k/5K2/8/8/8/8/8/6R1 w - - 0 1', g: 'm', t: 'your king boxes black in. now give check with the rook, and don’t just take away the last squares.', w: 'checkmate, not stalemate. well done!' },
			{ f: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', g: 'm', t: 'checkmate with your queen. give check, so it isn’t stalemate.', w: 'checkmate! check is what makes it a win.' }
		]
	},
	{
		k: 'points',
		p: 'pieces and points',
		t: 'points',
		d: 'each piece is worth points: pawn 1, knight 3, bishop 3, rook 5, queen 9. the king can never be taken.',
		i: 'wQ',
		l: [
			{ f: '4k3/8/8/1r3p2/3N4/8/8/4K3 w - - 0 1', g: 'x', a: ['d4b5'], t: 'your knight can take a pawn or a rook. take the one worth more points.', w: 'a rook is worth 5 points, a pawn only 1. good choice!' },
			{ f: '4k3/8/8/3q1n2/4P3/8/8/4K3 w - - 0 1', g: 'x', a: ['e4d5'], t: 'your pawn is worth only 1 point, but it can take big pieces too. which one should it take?', w: 'your 1-point pawn took the 9-point queen. what a trade!' },
			{ f: '6k1/pp3pp1/2n1r2p/8/3N4/7P/PP3PP1/3R2K1 w - - 0 1', g: 'x', a: ['d4e6'], t: 'both black pieces are guarded, so your knight will be taken back. a knight is worth 3. which trade wins you more?', w: 'you gave 3 points and got 5. that’s a good trade!' },
			{ f: '4k3/r5n1/8/8/3B4/8/8/4K3 w - - 0 1', g: 'x', a: ['d4a7'], t: 'your bishop can take a knight or a rook. which is worth more?', w: 'a rook is worth 5, a knight 3. you took the bigger one!' },
			{ f: '3qk3/8/8/8/8/8/8/3RK3 w - - 0 1', g: 'x', a: ['d1d8'], t: 'the black queen is guarded by its king. if your rook takes her, the king takes your rook. is that a good trade? then do it.', w: 'yes! you gave 5 points and got 9.' }
		]
	},
	{
		k: 'free',
		p: 'pieces and points',
		t: 'free pieces',
		d: 'a piece with no guard can be taken for free. before you take, check if your piece can be taken back.',
		i: 'wN',
		l: [
			{ f: '4k3/3n4/8/8/8/8/3R3b/4K3 w - - 0 1', g: 'x', a: ['d2h2'], t: 'one black piece is guarded by its king, the other has no guard at all. take the free one!', w: 'free points! the knight was guarded, so your rook would have been taken back.' },
			{ f: '4k3/8/4p3/3p4/n7/8/8/3QK3 w - - 0 1', g: 'x', a: ['d1a4'], t: 'your queen can take a pawn or a knight. one of them is a trap: if she takes it, she gets taken back.', w: 'smart! the pawn was guarded, but the knight was free.' },
			{ f: '4k3/7n/2p5/1r6/8/3Q4/8/4K3 w - - 0 1', g: 'x', a: ['d3h7'], t: 'your queen can take the rook or the knight. the rook is guarded by a pawn. which one is free?', w: 'the knight was free. taking the rook would lose your 9-point queen for 5.' },
			{ f: '4k2r/8/p7/8/8/R6n/8/4K3 w - - 0 1', g: 'x', a: ['a3a6'], t: 'the knight looks free, but a piece far away guards it. look again, and take what’s really free.', w: 'well spotted! the rook in the corner was guarding the knight.' },
			{ f: '4k3/5p2/n7/8/2B5/8/8/4K3 w - - 0 1', g: 'x', a: ['c4a6'], t: 'your bishop can take a pawn or a knight. which one has no guard?', w: 'free! the pawn had the king guarding it.' }
		]
	},
	{
		k: 'safe',
		p: 'pieces and points',
		t: 'stay safe',
		d: 'before every move, look at what the other side is attacking. don’t leave pieces where they can be taken.',
		i: 'wB',
		l: [
			{ f: '4k3/8/1b3n2/4p3/3Q4/8/8/4K3 w - - 0 1', g: 'v', t: 'your queen is under attack! move her to a square where nothing can take her.', w: 'safe! looking at what the other side attacks is a great habit.' },
			{ f: 'r3k3/ppp2ppp/8/3p4/2B5/5N2/PPP2PPP/R5K1 w q - 0 1', g: 'v', t: 'one of your pieces is in danger. find it, and move it somewhere safe.', w: 'you spotted it! always ask: what is the other side attacking?' },
			{ f: '4k3/8/8/3p4/2N5/8/8/4K3 w - - 0 1', g: 'v', t: 'a pawn attacks your knight! jump it to a square where nothing can take it.', w: 'safe! even a little pawn can take a big piece.' },
			{ f: '4k3/8/8/8/8/2b5/8/R5K1 w - - 0 1', g: 'v', t: 'the bishop attacks your rook from far away. find the rook a safe square.', w: 'safe! long-range pieces are easy to miss, so always look along the lines.' },
			{ f: '4k3/8/8/8/2n5/8/3Q4/4K3 w - - 0 1', g: 'v', t: 'a knight sneaks up on your queen. find her a safe square. knight jumps are tricky to see!', w: 'safe! knights attack in funny shapes, so check their jumps.' }
		]
	},
	{
		k: 'fork',
		p: 'tricks',
		t: 'the fork',
		d: 'a fork is when one piece attacks two at once. the other side can only save one of them.',
		i: 'wN',
		l: [
			{ f: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', g: 'x', a: ['d5c7', 'e8e7', 'c7a8'], t: 'your knight can attack the king and the rook at the same time. find the square, then take the rook!', w: 'a fork! the king had to run, so the rook was yours.' },
			{ f: '3q3k/6pp/8/6N1/8/8/5PPP/6K1 w - - 0 1', g: 'x', a: ['g5f7', 'h8g8', 'f7d8'], t: 'the royal fork: attack the king and the queen together with your knight, then take the queen!', w: 'the king had to move, so the queen was yours.' },
			{ f: '6k1/5ppp/2n1r3/8/3P4/7P/5PPK/8 w - - 0 1', g: 'x', a: ['d4d5', 'e6e8', 'd5c6'], t: 'even a pawn can fork! push your pawn to attack two black pieces at once.', w: 'the rook ran away, and your pawn took the knight.' },
			{ f: '6k1/p5pp/8/6r1/8/7P/5PP1/3Q2K1 w - - 0 1', g: 'x', a: ['d1d8', 'g8f7', 'd8g5'], t: 'the queen is great at forks. give check and attack the rook at the same time.', w: 'check and attack! the king had to move, and the rook fell.' },
			{ f: '8/8/8/1nk5/p3K3/8/Q7/8 b - - 3 58', g: 'x', a: ['b5c3', 'e4f4', 'c3a2'], t: 'you play black. jump your knight to check the king and attack the queen at once.', w: 'a royal fork! the king had to move, and the queen was yours.' },
			{ f: '8/8/5k1r/7P/6PK/7N/8/8 w - - 1 66', g: 'x', a: ['g4g5', 'f6f7', 'g5h6'], t: 'push a pawn to check the king and attack the rook at the same time.', w: 'a pawn fork! the king moved, and your pawn took the rook.' },
			{ f: '8/8/2k5/8/8/1KPB4/8/7r w - - 2 67', g: 'x', a: ['d3e4', 'c6c7', 'e4h1'], t: 'your bishop can check the king and attack the rook in one move. find it!', w: 'a bishop fork! the rook in the corner was yours.' }
		]
	},
	{
		k: 'pin',
		p: 'tricks',
		t: 'the pin',
		d: 'a pinned piece can’t move, because moving it would leave something more valuable behind it in danger, like its king.',
		i: 'wB',
		l: [
			{ f: '4k3/pp3ppp/2n5/1B6/3P4/8/PP3PPP/4K3 w - - 0 1', g: 'x', a: ['d4d5'], t: 'the black knight is pinned by your bishop: if it moved, the black king would be in check. attack it with a pawn!', w: 'the knight is stuck. next move your pawn takes it, and it can’t run away.' },
			{ f: '4k3/3q1ppp/8/8/P7/8/5PPP/4KB2 w - - 0 1', g: 'x', a: ['f1b5', 'd7b5', 'a4b5'], t: 'pin the black queen to her king with your bishop. then she can’t get away!', w: 'the queen was pinned, so all she could do was take your bishop, and your pawn took her.' },
			{ f: '4k3/4n3/8/Q2r4/8/8/8/4R1K1 w - - 0 1', g: 'x', a: ['a5d5'], t: 'the black rook looks guarded by the knight. but your rook pins the knight to its king, so it can’t take back. take the rook!', w: 'the pinned knight could only watch. a pinned piece is a bad guard.' },
			{ f: '8/8/6p1/2n3kp/8/6K1/8/R7 w - - 4 71', g: 'x', a: ['a1a5', 'g5f6', 'a5c5'], t: 'put your rook on the line of the knight and the king behind it. then the knight can’t run.', w: 'the pinned knight couldn’t move, so your rook took it.' },
			{ f: '8/4k1QK/5r2/8/8/8/8/8 b - - 4 67', g: 'x', a: ['f6f7', 'h7g8', 'f7g7'], t: 'you play black. the white queen checks your king. block with your rook, and the queen is pinned to her own king!', w: 'the queen couldn’t leave her king, so your rook took her. your king guarded the rook.' },
			{ f: '6k1/4p1b1/7p/8/5R2/6K1/8/8 b - - 2 43', g: 'x', a: ['g7e5', 'g3f3', 'e5f4'], t: 'you play black. pin the white rook to its king with your bishop.', w: 'the rook couldn’t get out of the way without leaving its king in check. it was yours.' }
		]
	},
	{
		k: 'skewer',
		p: 'tricks',
		t: 'the skewer',
		d: 'attack a big piece, like the king. when it steps away, take the piece hiding behind it.',
		i: 'wR',
		l: [
			{ f: '8/8/8/3k3q/8/8/8/R1K5 w - - 0 1', g: 'x', a: ['a1a5', 'd5e4', 'a5h5'], t: 'give check with your rook so the black queen is behind the king. when the king moves, take her!', w: 'a skewer! the king stepped aside, and the queen behind it was yours.' },
			{ f: '6r1/8/8/3k4/8/8/8/3BK3 w - - 0 1', g: 'x', a: ['d1b3', 'd5e5', 'b3g8'], t: 'now skewer with your bishop: give check, and grab what’s behind the king.', w: 'another skewer! the rook was hiding behind the king.' },
			{ f: '8/8/8/8/6RK/r4k2/8/8 w - - 5 66', g: 'x', a: ['g4g3', 'f3e4', 'g3a3'], t: 'check the king with your rook along its row, with the black rook behind it.', w: 'a rook skewer! the king moved, and the rook behind it fell.' },
			{ f: '8/R7/8/8/1k6/8/3K4/1q6 w - - 6 71', g: 'x', a: ['a7b7', 'b4c5', 'b7b1'], t: 'the black queen stands on the same line as her king. check the king, and take what’s behind it.', w: 'a skewer won the queen!' },
			{ f: '8/8/8/8/kr6/2K2R2/8/8 b - - 4 64', g: 'x', a: ['b4b3', 'c3d4', 'b3f3'], t: 'you play black. skewer the white king and rook with your rook.', w: 'the king stepped away, and the rook behind it was yours.' }
		]
	},
	{
		k: 'discover',
		p: 'tricks',
		t: 'discovered attack',
		d: 'move one piece out of the way, and the piece behind it suddenly attacks. two attacks at once!',
		i: 'wB',
		l: [
			{ f: '4k3/8/8/8/2q1N3/8/8/4R1K1 w - - 0 1', g: 'x', a: ['e4d6|e4d2', 'e8d7', 'd6c4|d2c4'], t: 'your knight is blocking your rook. move the knight so it attacks the queen, and your rook gives check at the same time!', w: 'a discovered attack! black had to save the king, so the queen was yours.' },
			{ f: '2k4r/8/4n3/8/3P4/8/KB6/8 w - - 0 1', g: 'x', a: ['d4d5', 'h8h7', 'd5e6'], t: 'push your pawn: it attacks the knight, and it opens a path for your bishop to attack the rook.', w: 'two attacks with one move! the rook ran, so your pawn took the knight.' },
			{ f: '8/8/7p/3RPk1r/1K6/8/8/8 w - - 3 51', g: 'x', a: ['e5e6', 'f5e6', 'd5h5'], t: 'your pawn stands between your rook and the black king. push it: your rook gives check, and it sees the black rook too.', w: 'the king had to deal with the check, and the rook was yours.' },
			{ f: '8/8/8/8/8/2rk1K2/8/1R6 b - - 12 77', g: 'x', a: ['d3c2', 'f3e4', 'c2b1'], t: 'you play black. your king blocks your own rook. step it aside so your rook gives check, and your king attacks the white rook.', w: 'a discovered check! white had to answer it, so your king took the rook.' },
			{ f: '8/8/8/6k1/5rpR/8/6PK/8 b - - 0 52', g: 'x', a: ['g4g3', 'h2g3', 'f4h4'], t: 'you play black. push your pawn with check. it also opens the line from your rook to the white rook.', w: 'check and a hidden attack! the king took the pawn, and you took the rook.' }
		]
	},
	{
		k: 'backrow',
		p: 'famous checkmates',
		t: 'back-row checkmate',
		d: 'a king stuck behind its own pawns can be checkmated on the back row.',
		i: 'wR',
		l: [
			{ f: '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1', g: 'm', t: 'the black king is boxed in by its own pawns. checkmate it on the back row with your queen.', w: 'back-row checkmate! the king’s own pawns blocked its escape.' },
			{ f: '2r3k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1', g: 'm', a: ['d2d8', 'c8d8', 'd1d8'], t: 'the black rook guards the back row. use one rook to pull it away, then checkmate with the other!', w: 'the guard was pulled away, and the back row was open. checkmate!' },
			{ f: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', g: 'm', t: 'the king has no way out behind its pawns. checkmate it with your rook.' },
			{ f: 'k7/pp1r1p1R/8/8/8/8/5PPK/8 w - - 1 42', g: 'm', a: ['h7h8', 'd7d8', 'h8d8'], t: 'check on the back row. if black blocks, take the blocker with checkmate.', w: 'the blocker fell, and the back row was yours. checkmate!' },
			{ f: '8/8/6pk/r3p3/4R3/6P1/6PP/7K b - - 1 38', g: 'm', a: ['a5a1', 'e4e1', 'a1e1'], t: 'you play black. the white king is stuck behind its pawns. attack the back row!', w: 'checkmate! the rook that blocked was taken, and nothing else could help.' },
			{ f: '7k/4q1pp/8/pQ6/8/8/6P1/5K2 w - - 0 46', g: 'm', a: ['b5b8', 'e7d8', 'b8d8'], t: 'your queen can reach the back row with check. if the black queen blocks, take her with checkmate.', w: 'the queen blocked, and lost, and so did black. checkmate!' }
		]
	},
	{
		k: 'kiss',
		p: 'famous checkmates',
		t: 'queen and king',
		d: 'the queen can checkmate right next to the king, when your own king guards her.',
		i: 'wQ',
		l: [
			{ f: '4k3/8/4K3/8/1Q6/8/8/8 w - - 0 1', g: 'm', t: 'bring your queen right up to the black king, where your king can guard her.', w: 'checkmate! the black king couldn’t take your queen, because your king guarded her.' },
			{ f: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', g: 'm', t: 'one more: queen and king, working together.', w: 'checkmate! you’ve got the hang of it.' },
			{ f: '8/8/8/8/8/5K2/7Q/5k2 w - - 0 1', g: 'm', t: 'the black king is on the bottom edge. bring your queen next to it, where your king guards her.', w: 'checkmate! the queen and king worked as a team.' },
			{ f: '8/8/8/8/8/2K5/6Q1/k7 w - - 0 1', g: 'm', t: 'the black king is stuck in the corner. find the square next to it that your king guards.', w: 'checkmate in the corner!' },
			{ f: 'k7/8/1K6/8/8/8/8/4Q3 w - - 0 1', g: 'm', t: 'your king guards the squares in front of the black king. checkmate with your queen.', w: 'checkmate! the king is a great helper.' }
		]
	},
	{
		k: 'ladder',
		p: 'famous checkmates',
		t: 'two rooks',
		d: 'two rooks work like a ladder: one guards a row so the king can’t come back, the other gives check.',
		i: 'wR',
		l: [
			{ f: '3k4/R7/8/8/8/8/8/1R4K1 w - - 0 1', g: 'm', t: 'one rook already guards the row in front of the king. checkmate with the other one!', w: 'checkmate! one rook guarded the row, the other gave check.' },
			{ f: '8/4k3/R7/8/8/8/8/1R4K1 w - - 0 1', g: 'm', a: ['b1b7', 'e7d8', 'a6a8'], t: 'climb the ladder: check with one rook to push the king to the edge, then checkmate with the other.', w: 'the ladder checkmate! step by step, the rooks pushed the king to the edge.' },
			{ f: 'k7/7R/8/8/8/8/8/4K1R1 w - - 0 1', g: 'm', t: 'one rook guards the row next to the king. checkmate with the other!', w: 'checkmate! a two-rook ladder.' },
			{ f: '4k1r1/8/8/8/8/8/7r/K7 b - - 0 1', g: 'm', t: 'you play black now. your rooks can make the ladder too. checkmate the white king.', w: 'checkmate! the ladder works for black just the same.' },
			{ f: '6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1', g: 'm', a: ['a2a7|b1b7', 'g8f8', 'b1b8|a2a8'], t: 'first put one rook on the row in front of the king, then check with the other.', w: 'the ladder checkmate! first block the escape, then check.' }
		]
	},
	{
		k: 'smother',
		p: 'famous checkmates',
		t: 'smothered checkmate',
		d: '“smothered” means covered up: when a king is boxed in by its own pieces, a knight alone can checkmate it.',
		i: 'wN',
		l: [
			{ f: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', g: 'm', t: 'the black king is surrounded by its own pieces. find the knight move that checkmates it!', w: 'smothered checkmate! the king had nowhere to go.' },
			{ f: '5r1k/6pp/7N/3Q4/8/8/6PP/6K1 w - - 0 1', g: 'm', a: ['d5g8', 'f8g8', 'h6f7'], t: 'a famous trick: give your queen away to box the king in, then checkmate with your knight.', w: 'the rook had to take your queen, and that blocked its own king. what a finish!' },
			{ f: 'kr6/pp6/4N3/8/7b/4p3/PPR5/1K6 w - - 0 38', g: 'm', t: 'the black king is boxed in by its own rook and pawns, in the other corner. one knight jump wins.', w: 'smothered checkmate, on the other side of the board!' },
			{ f: '8/6pk/4R2p/1P6/4p3/7n/6PP/6RK b - - 0 32', g: 'm', t: 'you play black. the white king is boxed in by its own rook and pawns. checkmate it with your knight.', w: 'smothered! the king’s own pieces trapped it.' },
			{ f: '3Q4/5ppk/7p/5r2/P5n1/8/P3N1PP/7K b - - 4 33', g: 'm', a: ['f5f1', 'e2g1', 'g4f2'], t: 'you play black. check with your rook first. when the knight blocks, the king is smothered.', w: 'the white knight blocked its own king’s last square. checkmate!' }
		]
	},
	{
		k: 'start',
		p: 'starting a game',
		t: 'a good start',
		d: 'three steps for every game: put a pawn in the center, bring out your knights and bishops, then castle.',
		i: 'wP',
		l: [
			{ f: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', g: 'x', a: ['e2e4|d2d4'], s: ['d4', 'e4', 'd5', 'e5'], t: 'the four squares in the middle (the stars) are the center. pieces there reach the most squares. push a pawn two steps into the center!', w: 'a strong start! your pawn holds the center and opens a path for your queen and a bishop.' },
			{ f: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', g: 'x', a: ['g1f3|b1c3'], t: 'now bring out a knight. knights work best near the center, not at the edge.', w: 'good! your knight is out and watching the center.' },
			{ f: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', g: 'x', a: ['f1c4|f1b5|f1e2|f1d3'], t: 'bring out a bishop, so nothing stands between your king and the rook.', w: 'nice! knight and bishop are out, and your king is ready to castle.' },
			{ f: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', g: 'x', a: ['e1g1'], t: 'the path is clear. castle to tuck your king away safely!', w: 'a perfect start: a pawn in the center, pieces out, king safe. strong players begin like this.' },
			{ f: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', g: 'x', a: ['e7e5|d7d5|c7c5|e7e6|c7c6|d7d6'], t: 'now you play black. white pushed a pawn to the center. answer with a pawn move that fights for the center too.', w: 'good answer! both sides now have a say in the center.' },
			{ f: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', g: 'x', a: ['d2d3|b1c3'], t: 'the black knight attacks your center pawn, and nothing guards it. guard it with a pawn or a knight.', w: 'guarded! before every move, check that your pieces are safe.' }
		]
	},
	{
		k: 'trick',
		p: 'starting a game',
		t: 'the four-move trick',
		d: 'a famous trap: the queen and bishop team up against the weak pawn next to the king. here’s how to stop it.',
		i: 'wQ',
		l: [
			{ f: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', g: 'd', t: 'you play black now. white’s queen and bishop both aim at the pawn next to your king. if the queen takes it, that’s checkmate. stop it!', w: 'safe! the trick won’t work now.' },
			{ f: 'rnbqk1nr/pppp1ppp/8/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3', g: 'd', t: 'white tries the same trick from another side. stop it again!', w: 'well defended! now this trap will never catch you.' },
			{ f: 'r1bqkbnr/pppp1p1p/2n3p1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 4', g: 'd', t: 'white’s queen came back to aim at the same pawn from another square. stop the trick again.', w: 'safe again! a knight on f6 also blocks the queen’s path.' },
			{ f: 'rnb1k1nr/pppp1ppp/8/2b1p3/2B1P2q/2N5/PPPP1PPP/R1BQK1NR w KQkq - 3 4', g: 'd', t: 'now you’re white. black’s queen and bishop both aim at the pawn next to your king. stop the checkmate!', w: 'safe! now you know this trick from both sides.' }
		]
	},
	{
		k: 'race',
		p: 'the endgame',
		t: 'race to a queen',
		d: 'the endgame is the end of a game, when only a few pieces are left. then a pawn that reaches the far side and becomes a queen often wins.',
		i: 'wP',
		l: [
			{ f: '8/8/8/1P4k1/8/8/8/K7 w - - 0 1', g: 'x', a: ['b5b6', 'g5f6', 'b6b7', 'f6e7', 'b7b8'], t: 'the black king is too far away to catch your pawn. push it all the way!', w: 'a brand new queen! now checkmate is only a matter of time.' },
			{ f: '8/8/8/5k2/P5P1/8/8/7K w - - 0 1', g: 'x', a: ['a4a5', 'f5g4', 'a5a6', 'g4f5', 'a6a7', 'f5e6', 'a7a8'], t: 'the black king is close to one of your pawns, but far from the other. race with the pawn it can’t catch!', w: 'the far pawn won the race. a pawn far from the enemy king is very strong.' },
			{ f: '8/1K6/8/8/P6p/6k1/8/8 b - - 1 56', g: 'x', a: ['h4h3', 'a4a5', 'h3h2', 'a5a6', 'h2h1'], t: 'you play black. your pawn is closer to the far side than white’s. race!', w: 'a new queen for black, one move ahead!' },
			{ f: '8/8/8/8/P4k2/8/8/7K b - - 0 1', g: 'x', a: ['f4e4|f4e5'], t: 'you play black. can your king catch the white pawn? picture a box from the pawn to the far side, as wide as it is tall. step into that box!', w: 'inside the box, your king catches the pawn in time. this trick is called the rule of the square.' }
		]
	},
	{
		k: 'opposition',
		p: 'the endgame',
		t: 'the opposition',
		d: 'kings may never stand side by side. when they face each other with one square between, the side that must move has to step aside. winning that face-off is called taking the opposition.',
		i: 'wK',
		l: [
			{ f: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', g: 'x', a: ['e3d4|e3e4|e3f4'], t: 'with a king and a pawn against a king, the king leads the way. walk your king forward, ahead of your pawn.', w: 'the king goes first and clears the road for the pawn.' },
			{ f: '8/8/4k3/8/8/5K2/4P3/8 w - - 0 1', g: 'x', a: ['f3e4|f3f4'], t: 'pushing the pawn now lets the black king block it. bring your king forward first.', w: 'king first, pawn second. that’s how this ending is won.' },
			{ f: '4k3/8/8/4K3/4P3/8/8/8 b - - 0 1', g: 'x', a: ['e8e7'], t: 'you play black. step your king to face the white king, with one square between them. then white has to step aside.', w: 'you took the opposition! white can’t get past now, so it’s a draw.' },
			{ f: '3k4/8/8/3K4/3P4/8/8/8 b - - 0 1', g: 'x', a: ['d8d7'], t: 'you play black again. only one move saves the game. face the white king!', w: 'the opposition again! any other move lets the white king through.' },
			{ f: '8/4k3/8/4K3/8/4P3/8/8 w - - 0 1', g: 'x', a: ['e3e4|e5d5|e5f5'], t: 'the kings face each other and it’s your move. push your pawn one step, so black has to move first, or step your king past diagonally.', w: 'now black must give way, and your king gets through.' },
			{ f: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', g: 'x', a: ['e6d6|e6f6'], t: 'your king stands in front of the pawn, so the pawn can’t move. step beside its path, but stay close.', w: 'the pawn can march now, and your king guards its way.' }
		]
	}
];

export const PARTS = [...new Set(STAGES.map((s) => s.p))];

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

// the first move of a shortest way to finish a star or capture level
export function free_hint(l: Level, board: Map<string, string>, got: string[]) {
	let frontier = [{ b: board, g: new Set(got), first: '' }];
	const seen = new Set<string>();
	for (let n = 0; n < 8 && frontier.length; n++) {
		const next: typeof frontier = [];
		for (const st of frontier)
			for (const [q, p] of st.b)
				if (p[0] === 'w')
					for (const to of free_moves(st.b, q)) {
						const b = play(st.b, q, to);
						const g = new Set(st.g);
						if (l.s?.includes(to)) g.add(to);
						const first = st.first || q + to;
						if (cleared(l, b, g)) return first;
						const key = [...b].sort().join() + [...g].sort().join();
						if (seen.has(key)) continue;
						seen.add(key);
						next.push({ b, g, first });
					}
		frontier = next;
	}
}

export function mate_in_one(c: Chess) {
	return c.moves({ verbose: true }).find((m) => {
		c.move(m);
		const y = c.isCheckmate();
		c.undo();
		return y;
	});
}

// c is the board right after the player's move, given as from + to (e2e4)
export function right(l: Level, c: Chess, step: number, move: string) {
	if (c.isCheckmate()) return true;
	if (l.a) return l.a[step].split('|').includes(move);
	if (l.g === 'k') return c.inCheck();
	if (l.g === 'd') return !mate_in_one(c);
	if (l.g === 'v') return !c.moves({ verbose: true }).some((m) => m.captured);
	return l.g === 'e';
}

// a move that does what the level asks, to show after two misses
export function hint(l: Level, c: Chess, step: number) {
	const legal = c.moves({ verbose: true });
	if (l.a) return l.a[step].split('|').find((u) => legal.some((m) => m.from + m.to === u));
	for (const m of legal) {
		c.move(m);
		const ok = right(l, c, step, m.from + m.to);
		c.undo();
		if (ok) return m.from + m.to;
	}
}
