// a session: one game and the chat about it
export type Sess = {
	i: string; // id
	t: string; // title, from the game
	p: string; // preview: the first thing the player asked
	f: string; // board position (fen), for the little board
	d: number; // last change, ms
	b?: string; // body: board and chat, json
};

// search words, cut to their root so "forks", "castling" and "pinned" find "fork", "castle" and "pin"
export const words = (q: string) =>
	q
		.toLowerCase()
		.split(/\s+/)
		.filter((w) => w.length > 1)
		.slice(0, 5)
		.map((w) => (w.length > 4 ? w.replace(/(ing|ed|es|s|e)$/, '').replace(/(.)\1$/, '$1') : w));
