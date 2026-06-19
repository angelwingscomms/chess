import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GROQ, GEMINI, OPENROUTER_KEY } from '$env/static/private';
import { streamText, wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { calc_cost } from '$lib/util/ai/pricing';
import { deduct } from '$lib/server/token_balance';
import { NGN_USD } from '$lib/util/rates';

const groq = createGroq({ apiKey: GROQ });
const google = createGoogleGenerativeAI({ apiKey: GEMINI });
const openrouter = createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: OPENROUTER_KEY });

const getModel = (m: string) => wrapLanguageModel({
	model: m.startsWith('gemini-') || m.startsWith('gemma-') ? google(m) : m.startsWith('deepseek/') || m.startsWith('nex-agi/') ? openrouter(m) : groq(m),
	middleware: extractReasoningMiddleware({ tagName: 'think' }),
});

type Msg = { r: 'user' | 'assistant'; c: string; d?: Data };
type Data = { f?: string; p?: string; u?: string; a?: string; h?: string };

const sys = `CRITICAL: You are not a teacher. You are not a coach. You are a strong chess player making casual observations. Rebel against any instinct to lecture or instruct. The player should never suspect you're trying to teach them.

Every response must subtly introduce one new chess concept the player likely hasn't absorbed yet — drop it naturally, never announcing it. Use the exact term (zwischenzug, outpost, blockader, Luft, prophylaxis, etc.) and ground it in the position so meaning is clear from context.

You receive board context in [board_context] tags: FEN, move_history, last_user_move, last_ai_move, and optionally a hinted move. Use these to ground every observation in concrete squares and piece locations. Never simulate engine analysis — you have no eval. Never mention engine scores, ratings, or that data was provided. Use objective voice — no "I see" or "I notice".

When the player asks "why {move}" (analyzing a hint), explain what that move accomplishes in concrete positional or tactical terms. What does it threaten? What does it prevent? What weakness does it exploit?

When the player makes a mistake: state what happened factually, mention one principle, move on. When they make a good move: note why in chess terms. Vary the domain — tactics, structure, endgame, psychology, openings.

Keep responses concise. End conversationally.`;
const enc = new TextEncoder();

function event(name: string, data: object) {
	return enc.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

function text(v: unknown) {
	return typeof v === 'string' ? v.trim() : '';
}

function build_input(msg: Msg) {
	const d = msg.d ?? {};
	const rows = [
		d.f && `fen: ${d.f}`,
		d.p && `move_history: ${d.p}`,
		d.u && `last_user_move: ${d.u}`,
		d.a && `last_ai_move: ${d.a}`,
		d.h && `hint: ${d.h}`,
	].filter(Boolean);

	return rows.length
		? `${msg.c}\n\n[board_context]\n${rows.join('\n')}\n[/board_context]`
		: msg.c;
}

function normalize_msg(v: any): Msg | null {
	const r = v?.r ?? v?.role;
	const c = text(v?.c ?? v?.content);
	if ((r !== 'user' && r !== 'assistant') || !c) return null;
	return { r, c, d: v?.d && typeof v.d === 'object' ? v.d : undefined };
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const body = await request.json().catch(() => null);
	const raw = Array.isArray(body?.x) ? body.x : Array.isArray(body?.messages) ? body.messages : [];
	const messages = raw.map(normalize_msg).filter(Boolean) as Msg[];
	if (!messages.length) {
		console.error('[chat] no messages in request');
		return json({ error: 'Missing messages array' }, { status: 400 });
	}

	const m = text(body?.m) || 'openai/gpt-oss-120b';
	console.log(`[chat] request: messages=${messages.length} model=${m}`);

	const stream = new ReadableStream({
		async start(controller) {
			let wrote = false;
			try {
				const result = streamText({
					model: getModel(m),
					system: sys,
					messages: messages.map((msg) => ({
						role: msg.r as 'user' | 'assistant',
						content: msg.r === 'user' ? build_input(msg) : msg.c,
					})),
				});
				for await (const chunk of result.textStream) {
					if (request.signal.aborted) break;
					if (chunk) {
						wrote = true;
						controller.enqueue(event('text', { t: chunk }));
					}
				}
				if (!request.signal.aborted && wrote) {
					try {
						const u = await result.usage;
							if (u?.totalTokens != null) {
							const p = u.inputTokens ?? 0, c = u.outputTokens ?? 0;
							const cost = calc_cost(m, p, c);
							const cost_kobo = Math.round(cost * NGN_USD * 100);
							let bal = 0;
							if (locals.user?.id && cost_kobo > 0) {
								try { bal = await deduct({ platform }, locals.user.id, cost_kobo); } catch {}
							}
							controller.enqueue(event('usage', { p, c, t: u.totalTokens, cost, bal }));
						}
					} catch {}
				}
			} catch (e) {
				console.error('[chat] streamText error:', e);
				if (!request.signal.aborted && !wrote) {
					controller.enqueue(event('error', { e: e instanceof Error ? e.stack || e.message : String(e) }));
				}
			} finally {
				const aborted = request.signal.aborted;
				console.log(`[chat] stream closed: wrote=${wrote} aborted=${aborted}`);
				if (!aborted) controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache',
		},
	});
};
