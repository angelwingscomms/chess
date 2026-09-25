const NAMES: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };

// "Nxf7+" → "knight takes on f7, check", so people who don't read chess codes still follow
export function say_move(san: string) {
	if (!san) return '';
	const end = san.endsWith('#') ? ', checkmate' : san.endsWith('+') ? ', check' : '';
	const m = san.replace(/[+#!?]/g, '');
	if (m.startsWith('O-O-O')) return 'castle to the queen’s side' + end;
	if (m.startsWith('O-O')) return 'castle to the king’s side' + end;
	const piece = NAMES[m[0]] ?? 'pawn';
	const [, to, promo] = m.match(/([a-h][1-8])(?:=([QRBN]))?$/) ?? [];
	const how = m.includes('x') ? ' takes on ' : ' to ';
	return piece + how + (to ?? m) + (promo ? `, becomes a ${NAMES[promo]}` : '') + end;
}
