import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createGroq } from '@ai-sdk/groq';
import { extractReasoningMiddleware, stepCountIs, streamText, tool, wrapLanguageModel } from 'ai';
import { Chess } from 'chess.js';
import { z } from 'zod';
import { board_note, read_messages } from '$lib/coach/context';
import { pick_model } from '$lib/coach/models';
import { coach_prompt } from '$lib/coach/prompts';
import { calc_cost } from '$lib/util/ai/pricing';
import { make_find_puzzles } from '$lib/util/chat/tools/find_puzzles';
import { over_limit } from '$lib/server/limit';
import { guard } from '$lib/coach/guard';

const enc = new TextEncoder();
const event = (name: string, data: object) => enc.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
const SORRY = 'the coach couldn’t answer just now. try again in a moment.';

const set_state = tool({
	description: 'Set the board to any position using a FEN string. Use this when the user asks you to set up a specific position, puzzle, or famous game position. Only use this tool when the user explicitly asks you to, or when you suggest showing a position and they agree.',
	inputSchema: z.object({ fen: z.string().describe('The FEN string of the position to load.') }),
	execute: async ({ fen }) => {
		try {
			return { valid: true, fen: new Chess(fen.trim()).fen() };
		} catch {
			return { valid: false, error: 'Invalid FEN' };
		}
	}
});

const undo_move = tool({
	description: 'Take back the last move the player made, plus the computer reply to it if it has played. Use this for any request to undo or take back a move, instead of set_state.',
	inputSchema: z.object({}),
	execute: async () => ({ undone: true })
});

// body: x the conversation, m model, b how the coach helps ('a' or 's'), v 1 when spoken aloud
export const POST: RequestHandler = async ({ request, platform }) => {
	if (await over_limit(platform, 'c', request)) return json({ error: 'slow down a little, then ask again.' }, { status: 429 });
	const body = await request.json().catch(() => null);
	const messages = read_messages(body?.x);
	if (!messages.length) return json({ error: 'nothing to answer yet.' }, { status: 400 });
	const m = pick_model(body?.m);
	const groq = createGroq({ apiKey: env.GROQ });

	const stream = new ReadableStream({
		async start(controller) {
			let wrote = false;
			let acted = false;
			let found: { f: string }[] = [];
			const stop = new AbortController();
			request.signal.addEventListener('abort', () => stop.abort());
			// the safety check runs beside the coach; the coach's words wait for it, so nothing unsafe is ever shown
			const checked = guard(groq, messages.findLast((x) => x.r === 'user')!.c, stop.signal);
			let ok: boolean | undefined;
			const send = async (b: Uint8Array) => {
				if (ok === undefined) {
					const no = await checked;
					ok = !no;
					if (no) {
						stop.abort();
						wrote = true;
						controller.enqueue(event('text', { t: no }));
					}
				}
				if (ok) controller.enqueue(b);
			};
			try {
				const result = streamText({
					abortSignal: stop.signal,
					model: wrapLanguageModel({ model: groq(m), middleware: extractReasoningMiddleware({ tagName: 'think' }) }),
					system: coach_prompt(body?.b === 's' ? 's' : 'a', body?.v === 1),
					messages: messages.map((x) => ({ role: x.r, content: x.r === 'user' ? board_note(x.c, x.d) : x.c })),
					// the board rides along with every message, so the coach needs no tool to read it
					tools: { find_puzzles: make_find_puzzles(platform!.env.PUZ), set_state, undo_move },
					stopWhen: stepCountIs(4)
				});
				for await (const part of result.fullStream) {
					if (stop.signal.aborted) break;
					if (part.type === 'error') throw part.error;
					if (part.type === 'text-delta' && part.text) {
						await send(event('text', { t: part.text }));
						if (ok) wrote = true;
					}
					if (part.type === 'tool-result') {
						const out = part.output as { puzzles?: { f: string }[]; valid?: boolean; fen?: string };
						if (part.toolName === 'find_puzzles') found = [...(out?.puzzles ?? []), ...found];
						if (part.toolName === 'undo_move') {
							acted = true;
							await send(event('undo', {}));
						}
						if (part.toolName === 'set_state' && out?.valid && out.fen) {
							const key = out.fen.split(' ').slice(0, 4).join(' ');
							const puzzle = found.find((z) => z.f.split(' ').slice(0, 4).join(' ') === key);
							acted = true;
							await send(event('board', puzzle ? { f: out.fen, p: puzzle } : { f: out.fen }));
						}
					}
				}
				if (!stop.signal.aborted && wrote) {
					const u = await result.totalUsage;
					const p = u?.inputTokens ?? 0;
					const c = u?.outputTokens ?? 0;
					controller.enqueue(event('usage', { p, c, t: p + c, cost: calc_cost(m, p, c) }));
				}
				if (!request.signal.aborted && !wrote && !acted) controller.enqueue(event('error', { e: SORRY }));
			} catch (e) {
				if (stop.signal.aborted && !request.signal.aborted) return; // the guard answered instead
				console.error('[chat]', m, e instanceof Error ? e.message : e);
				if (!request.signal.aborted && !wrote) controller.enqueue(event('error', { e: SORRY }));
			} finally {
				if (!request.signal.aborted) controller.close();
			}
		}
	});

	return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' } });
};
