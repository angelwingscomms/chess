// t title, d description, s sections: [heading, text, code?]
export type info_page = { t: string; d: string; s: [string, string, string?][] };

const repo = 'https://github.com/angelwingscomms/chess';

export const info: Record<string, info_page> = {
	about: {
		t: 'About e4',
		d: 'e4 is a free chess coach on the web that explains every move in plain words and talks with you out loud.',
		s: [
			['What e4 is', 'e4 is a chess coach that lives in your browser. You play a friendly computer, and after every move the coach tells you, in plain words, what happened and why it matters. You can ask it questions by typing or by talking out loud, and it answers the same way. There is nothing to download and you can start without an account.'],
			['Who it is for', 'e4 is built for people who are new to chess or coming back to it: kids, parents, and adults who know how the pieces move but not what to do next. It never shows ratings or scores, because the goal is to understand the game, not to be judged by it.'],
			['How it works', 'The computer you play is Stockfish, the open-source chess engine, running on your own device. The coach uses large language models to turn engine lines into short explanations. Puzzles come from a library of about a million positions tagged by theme, so you can practise forks, pins and mates at your own level.'],
			['Who makes it', `e4 is made by the angelwingscomms team. The source code is public at ${repo}. Questions and fixes are welcome there.`]
		]
	},
	contact: {
		t: 'Contact e4',
		d: 'How to reach the people who make e4, report a bug, or ask about your account or a payment.',
		s: [
			['Report a bug or ask a question', `Open an issue at ${repo}/issues. Say what you did, what you expected, and what happened instead. A screenshot and the browser you use help a lot. Every issue is read, and you will get an answer there.`],
			['Account and payments', 'If a payment went through but your balance did not change, open an issue with the date, the amount and the last four digits of the payment reference. Never post your card number, password or full email address in a public issue; we will ask for anything private through a safe channel.'],
			['Agents and developers', 'The public API, its rules and examples are on the developers page at /developers. The machine-readable summary for AI agents is at /llms.txt and the OpenAPI description is at /openapi.json.'],
			['Corrections', 'If the coach explained a move wrong, tell us the position (the FEN shown in the game menu) and what it said. Wrong explanations are the most useful reports we get, because they make the coach better for everyone.']
		]
	},
	privacy: {
		t: 'Privacy at e4',
		d: 'What e4 stores about you, why, who it is shared with, and how to have it deleted.',
		s: [
			['Without an account', 'You can play, solve puzzles and talk with the coach without signing in. Your settings and progress are kept in your own browser (local storage) and are not sent to us. We do not use advertising or tracking cookies.'],
			['With an account', 'If you sign in with Google, we receive your name, email address and profile picture from Google. We keep them with your token balance and your saved games (the board, the moves and your chat with the coach) so you can pick up where you left off on any device. A session cookie keeps you signed in.'],
			['The coach and voice', 'When you ask the coach something, your message and the current position are sent to the AI model provider that answers it (Google Gemini, Groq or OpenAI). When you use voice, your audio is streamed to Google or OpenAI to be understood and answered. These providers process the data to give you the answer; we do not sell it to anyone.'],
			['Payments', 'Tokens are bought through Paystack. Your card details go straight to Paystack and never reach our servers; we only receive a confirmation and the amount paid.'],
			['Deleting your data', `To have your account and saved games deleted, open an issue at ${repo}/issues asking for deletion without posting your email address, and we will arrange it privately. Clearing your browser storage removes everything kept on your device.`]
		]
	},
	developers: {
		t: 'e4 for developers and agents',
		d: 'Public API, OpenAPI description, error format and usage rules for building on e4 or calling it from an AI agent.',
		s: [
			['When to use e4', 'Use e4 when a person wants to learn chess, practise a tactic, or get a chess position explained in plain words. For agents, the public API finds training puzzles by theme and rating, so you can hand a learner the right exercise and link them to e4 to play it.'],
			['Quickstart', 'The API needs no key and no account. Send a JSON body to the puzzle search endpoint. All tags in t must match, at least one tag in any must match, and n caps the result count (1 to 30, default 5).', `curl -s https://chess.apexlinks.org/api/puzzles \\
  -H 'content-type: application/json' \\
  -d '{"t":["fork"],"r_min":800,"r_max":1200,"n":3}'`],
			['Reference', 'The full machine-readable description is the OpenAPI 3.1 document at /openapi.json. Every operation has an operationId, a description, typed parameters and response schemas, so it can be loaded directly as tools for function calling. A summary for language models is at /llms.txt.'],
			['Errors', 'Every API error is JSON with a stable shape. Unknown API paths return 404 with code, message and hint fields. The puzzle search returns 400 with an error message when the body is invalid, and 500 if the search itself fails; in both cases puzzles is an empty list, so callers can always read it.', `{"code":"not_found","message":"No API route at /api/x.","hint":"See /openapi.json for the public endpoints."}`],
			['Authentication and limits', 'The public API is read-only and anonymous. Account features (saved games, voice, payments) use a session cookie from Google sign-in and are not part of the public API. Please keep automated use gentle: no more than one request a second per client. There is no sandbox, because nothing in the public API changes data.'],
			['Versioning', 'The API is version 1.0.0. Breaking changes will get a new version in /openapi.json and a note on this page before the old shape is removed.']
		]
	}
};
