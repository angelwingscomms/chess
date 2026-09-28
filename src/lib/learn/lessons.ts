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
			{ f: '8/8/8/8/P7/8/8/R2P4', g: 's', s: ['a3', 'c3', 'c8', 'h8'], t: 'your own pieces are in the way. find a path around them.', b: 4 }
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
			{ f: '8/8/8/8/8/8/8/2B5', g: 's', s: ['a3', 'd6', 'h2'], t: 'every star is on a dark square. a bishop never leaves its colour.', b: 3 }
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
			{ f: '8/8/8/8/8/8/8/Q7', g: 's', s: ['h8', 'h1', 'a8', 'd5'], t: 'four stars. can you do it in four moves?', b: 4 }
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
			{ f: '8/8/8/8/4K3/8/8/8', g: 's', s: ['d5', 'd6', 'e7', 'f6'], t: 'diagonal steps count too.', b: 4 }
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
			{ f: '8/8/8/8/8/8/PPPP4/1N6', g: 's', s: ['c3', 'b5', 'd6'], t: 'the knight jumps right over the pawns.', b: 3 }
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
			{ f: '8/8/P7/8/8/8/8/8', g: 's', s: ['a8', 'h1'], t: 'reach the far side and your pawn turns into a queen! then use her to grab the last star.', b: 3 }
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
			{ f: '8/3r4/8/8/1n4n1/8/8/3Q4', g: 'c', t: 'now with your queen. three moves, three pieces.', b: 3 }
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
			{ f: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1', g: 'k', t: 'now give check with your queen. there are a few ways.' }
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
			{ f: 'k7/8/8/8/8/8/4r3/4K3 w - - 0 1', g: 'e', t: 'the rook is right next to your king and nobody guards it. take it!' }
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
			{ f: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', g: 'm', t: 'the famous four-move checkmate. find it!' }
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
			{ f: '4k3/8/8/8/2b5/8/8/R3K2R w KQ - 0 1', g: 'x', a: ['e1c1'], t: 'your king may not castle across a square the enemy attacks. the black bishop guards one side, so castle the other way.', w: 'right! the bishop watched the short side, so the long side was the only way.' }
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
			{ f: '4k3/8/8/1pP5/8/8/8/4K3 w - b6 0 2', g: 'x', a: ['c5b6'], t: 'it happened again! take the pawn in passing.', w: 'en passant! the pawn beside yours is gone.' }
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
			{ f: '7k/R7/6K1/8/8/8/8/8 w - - 0 1', g: 'm', t: 'now checkmate with your rook, and watch out for stalemate again.', w: 'checkmate! your rook took the back row while your king blocked the escape.' }
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
			{ f: '6k1/pp3pp1/2n1r2p/8/3N4/7P/PP3PP1/3R2K1 w - - 0 1', g: 'x', a: ['d4e6'], t: 'both black pieces are guarded, so your knight will be taken back. a knight is worth 3. which trade wins you more?', w: 'you gave 3 points and got 5. that’s a good trade!' }
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
			{ f: '4k3/8/4p3/3p4/n7/8/8/3QK3 w - - 0 1', g: 'x', a: ['d1a4'], t: 'your queen can take a pawn or a knight. one of them is a trap: if she takes it, she gets taken back.', w: 'smart! the pawn was guarded, but the knight was free.' }
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
			{ f: 'r3k3/ppp2ppp/8/3p4/2B5/5N2/PPP2PPP/R5K1 w q - 0 1', g: 'v', t: 'one of your pieces is in danger. find it, and move it somewhere safe.', w: 'you spotted it! always ask: what is the other side attacking?' }
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
			{ f: '6k1/p5pp/8/6r1/8/7P/5PP1/3Q2K1 w - - 0 1', g: 'x', a: ['d1d8', 'g8f7', 'd8g5'], t: 'the queen is great at forks. give check and attack the rook at the same time.', w: 'check and attack! the king had to move, and the rook fell.' }
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
			{ f: '4k3/3q1ppp/8/8/P7/8/5PPP/4KB2 w - - 0 1', g: 'x', a: ['f1b5', 'd7b5', 'a4b5'], t: 'pin the black queen to her king with your bishop. then she can’t get away!', w: 'the queen was pinned, so all she could do was take your bishop, and your pawn took her.' }
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
			{ f: '6r1/8/8/3k4/8/8/8/3BK3 w - - 0 1', g: 'x', a: ['d1b3', 'd5e5', 'b3g8'], t: 'now skewer with your bishop: give check, and grab what’s behind the king.', w: 'another skewer! the rook was hiding behind the king.' }
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
			{ f: '2k4r/8/4n3/8/3P4/8/KB6/8 w - - 0 1', g: 'x', a: ['d4d5', 'h8h7', 'd5e6'], t: 'push your pawn: it attacks the knight, and it opens a path for your bishop to attack the rook.', w: 'two attacks with one move! the rook ran, so your pawn took the knight.' }
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
			{ f: '2r3k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1', g: 'm', a: ['d2d8', 'c8d8', 'd1d8'], t: 'the black rook guards the back row. use one rook to pull it away, then checkmate with the other!', w: 'the guard was pulled away, and the back row was open. checkmate!' }
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
			{ f: '5r1k/6pp/7N/3Q4/8/8/6PP/6K1 w - - 0 1', g: 'm', a: ['d5g8', 'f8g8', 'h6f7'], t: 'a famous trick: give your queen away to box the king in, then checkmate with your knight.', w: 'the rook had to take your queen, and that blocked its own king. what a finish!' }
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
			{ f: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', g: 'm', t: 'one more: queen and king, working together.', w: 'checkmate! you’ve got the hang of it.' }
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
			{ f: '8/4k3/R7/8/8/8/8/1R4K1 w - - 0 1', g: 'm', a: ['b1b7', 'e7d8', 'a6a8'], t: 'climb the ladder: check with one rook to push the king to the edge, then checkmate with the other.', w: 'the ladder checkmate! step by step, the rooks pushed the king to the edge.' }
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
			{ f: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', g: 'x', a: ['e1g1'], t: 'the path is clear. castle to tuck your king away safely!', w: 'a perfect start: a pawn in the center, pieces out, king safe. strong players begin like this.' }
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
			{ f: 'rnbqk1nr/pppp1ppp/8/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3', g: 'd', t: 'white tries the same trick from another side. stop it again!', w: 'well defended! now this trap will never catch you.' }
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
			{ f: '8/8/8/5k2/P5P1/8/8/7K w - - 0 1', g: 'x', a: ['a4a5', 'f5g4', 'a5a6', 'g4f5', 'a6a7', 'f5e6', 'a7a8'], t: 'the black king is close to one of your pawns, but far from the other. race with the pawn it can’t catch!', w: 'the far pawn won the race. a pawn far from the enemy king is very strong.' }
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
	if (l.a) return l.a[step].split('|')[0];
	for (const m of c.moves({ verbose: true })) {
		c.move(m);
		const ok = right(l, c, step, m.from + m.to);
		c.undo();
		if (ok) return m.from + m.to;
	}
}
