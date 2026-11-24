// t title, d description, s sections: [heading, text, code?]
export type info_page = { t: string; d: string; s: [string, string, string?][] };

const repo = 'https://github.com/angelwingscomms/chess';

export const info: Record<string, info_page> = {
	about: {
		t: 'about e4',
		d: 'e4 is a free chess coach on the web: play a friendly computer, then ask why any move works, by typing or out loud.',
		s: [
			['what e4 is', 'e4 is a chess coach that lives in your browser. you play a friendly computer, and whenever you ask, the coach tells you in plain words what happened and why it matters. you can ask by typing or by talking out loud, and it answers the same way. there is nothing to install, and you can start without an account.'],
			['who it is for', 'e4 is built for people who are new to chess or coming back to it: kids, parents, and adults who know how the pieces move but not what to do next. it never shows ratings or scores, because the goal is to understand the game, not to be judged by it.'],
			['how it works', 'the computer you play is stockfish, the open-source chess engine, running on your own device. before the coach answers a question about your game, stockfish checks the position, and a language model turns that check into a short answer in plain words. when you talk out loud, the listening and the speaking happen on your own device too: your voice never leaves it, only the words. puzzles come from about a million real games on lichess, sorted by theme.'],
			['credits', 'chess engine: stockfish (gpl 3). 3d pieces: chess set by riley queen on poly haven (cc0). puzzles: the lichess puzzle database (cc0). listening: nvidia nemo conformer (cc by 4.0). speaking: kitten tts 2 pico by kittenml (apache 2.0) with espeak-ng (gpl 3), on onnx runtime web (mit).'],
			['who makes it', `e4 is made by angelwingscomms. the source code is public at ${repo}, and questions and fixes are welcome there.`]
		]
	},
	contact: {
		t: 'contact e4',
		d: 'how to report a bug, correct the coach, or delete your account.',
		s: [
			['report a bug or ask a question', `open an issue at ${repo}/issues. say what you did, what you expected, and what happened instead. a screenshot and the browser you use help a lot. every issue is read and answered there.`],
			['correct the coach', 'if the coach explained a move wrong, open an issue with the position and what it said. wrong explanations are the most useful reports we get, because they make the coach better for everyone.'],
			['your account', 'to delete your account and every saved game, sign in, open your account at the top right and tap delete. it happens at once, and you never need to post anything in public.'],
			['agents and developers', 'the public api, its rules and examples are on the developers page at /developers. the summary for ai agents is at /llms.txt and the openapi description is at /openapi.json.']
		]
	},
	privacy: {
		t: 'privacy at e4',
		d: 'what e4 keeps, where your words go, and how to delete everything.',
		s: [
			['without an account', 'you can play, solve puzzles, take lessons and talk with the coach without signing in. your games, settings and progress stay in your own browser. there is no advertising and no tracking.'],
			['what you ask the coach', 'when you ask the coach something, your message and the position on the board pass through e4’s server, on cloudflare, to groq, which runs the language model that writes the answer, under its own privacy policy. without an account, e4 keeps no copy of your messages.'],
			['talking out loud', 'when you talk to the coach, the listening and the speaking happen on your own device. your voice never leaves it: only the words it heard go to the coach, like a typed question. the voice files download once and stay in your browser.'],
			['with an account', 'if you sign in with google, we receive your name, email address and profile picture. we keep them, and your progress, with your saved games, which hold the board, the moves and your chat with the coach, so you can pick up where you left off on any device. a session cookie keeps you signed in.'],
			['kids', 'e4 is made for learners of every age, and kids can play, learn and talk with the coach without an account. an account keeps games only after a grown-up says yes: when someone signs in, e4 asks first, and a player under 18 needs a parent or guardian to tap yes. a parent or guardian can delete the account and everything in it at any time. the coach talks only about chess, and every message is checked by a safety model first; if a child says something that sounds unsafe, the coach tells them to talk to a trusted adult.'],
			['deleting your data', 'signed in: open your account at the top right and tap delete, and your account and every saved game go at once. without an account: clear this site’s data in your browser settings.']
		]
	},
	developers: {
		t: 'e4 for developers and agents',
		d: 'the public api, its openapi description, errors and limits, for building on e4 or calling it from an ai agent.',
		s: [
			['when to use e4', 'use e4 when a person wants to learn chess, practise a tactic, or get a chess position explained in plain words. for agents, the public api finds training puzzles by theme and rating, so you can hand a learner the right exercise and link them to e4 to play it.'],
			['quickstart', 'the api needs no key and no account. send a json body to the puzzle search endpoint. all tags in t must match, at least one tag in any must match, and n caps the result count (1 to 30, default 5).', `curl -s https://chess.apexlinks.org/api/puzzles \\
  -H 'content-type: application/json' \\
  -d '{"t":["fork"],"r_min":800,"r_max":1200,"n":3}'`],
			['reference', 'the full machine-readable description is the openapi 3.1 document at /openapi.json. every operation has an operationId, a description, typed parameters and response schemas, so it can be loaded directly as tools for function calling. a summary for language models is at /llms.txt.'],
			['errors', 'every api error is json with a stable shape. unknown api paths return 404 with code, message and hint fields. the puzzle search returns 400 when the body is invalid, 429 when a caller sends too much, and 500 if the search itself fails; in each case puzzles is an empty list, so callers can always read it.', `{"code":"not_found","message":"No API route at /api/x.","hint":"See /openapi.json for the public endpoints."}`],
			['authentication and limits', 'the public api is read-only and anonymous. account features use a session cookie from google sign-in and are not part of the public api. each address gets about 60 requests a minute; past that the search answers 429 until the minute is up. there is no sandbox, because nothing in the public api changes data.'],
			['versioning', 'the api is version 1.0.0. breaking changes will get a new version in /openapi.json and a note on this page before the old shape is removed.']
		]
	}
};
