// what the coach is told about the board, sent with each question instead of in the instructions
export type ChatData = {
	f?: string; // fen
	b?: string; // every piece and its square, in words
	p?: string; // the moves so far
	u?: string; // the player's last move
	a?: string; // the computer's last move
	n?: string; // a note on the computer's last move, when it was a deliberate easy-level mistake
	h?: string; // the hint being explained
	e?: string; // the chess computer's check of the position, in words
	l?: string; // the lesson the player is doing
};

export type Msg = { r: 'user' | 'assistant'; c: string; d?: ChatData };

const MAX_MSGS = 40;
const MAX_CHARS = 4000;

export function board_note(c: string, d: ChatData = {}) {
	const rows = [
		d.l && `lesson: ${d.l}`,
		d.f && `fen: ${d.f}`,
		d.b && `pieces: ${d.b}`,
		d.p && `move_history: ${d.p}`,
		d.u && `last_user_move: ${d.u}`,
		d.a && `last_ai_move: ${d.a}`,
		d.n && `computer_note: ${d.n}`,
		d.h && `hint: ${d.h}`,
		d.e && `computer check: ${d.e}`
	].filter(Boolean);
	return rows.length ? `${c}\n\n[board_context]\n${rows.join('\n')}\n[/board_context]` : c;
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

// only the player's and the coach's own words, the newest few, each kept short
export function read_messages(raw: unknown): Msg[] {
	if (!Array.isArray(raw)) return [];
	const out: Msg[] = [];
	for (const v of raw.slice(-MAX_MSGS)) {
		const r = v?.r;
		const c = clip(v?.c, MAX_CHARS);
		if ((r !== 'user' && r !== 'assistant') || !c) continue;
		const d = v?.d && typeof v.d === 'object' ? (Object.fromEntries(Object.entries(v.d).map(([k, x]) => [k, clip(x, MAX_CHARS)]).filter(([, x]) => x)) as ChatData) : undefined;
		out.push({ r, c, d });
	}
	return out;
}
