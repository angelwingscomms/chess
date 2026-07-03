import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GROQ, GEMINI, OPENROUTER_KEY, BYNARA_KEY } from '$env/static/private';
import { streamText, wrapLanguageModel, extractReasoningMiddleware, stepCountIs } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { calc_cost } from '$lib/util/ai/pricing';
import { deduct, TOKEN_RATE } from '$lib/server/token_balance';
import { NGN_USD } from '$lib/util/rates';
import { get_fen } from '$lib/util/chat/tools/get_fen';
import { evaluate_position } from '$lib/util/chat/tools/stockfish_analysis';

const groq = createGroq({ apiKey: GROQ });
const google = createGoogleGenerativeAI({ apiKey: GEMINI });
const openrouter = createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: OPENROUTER_KEY });
const bynara = createOpenAI({ baseURL: 'https://router.bynara.id/v1', apiKey: BYNARA_KEY });

const getModel = (m: string) => wrapLanguageModel({
	model: m.startsWith('gemini-') || m.startsWith('gemma-') ? google(m) : m.startsWith('bynara/') ? bynara(m.slice(7)) : m.startsWith('deepseek/') || m.startsWith('nex-agi/') ? openrouter(m) : groq(m),
	middleware: extractReasoningMiddleware({ tagName: 'think' }),
});

type Msg = { r: 'system' | 'user' | 'assistant'; c: string; d?: Data };
type Data = { f?: string; p?: string; u?: string; a?: string; h?: string; e?: string; t?: number };

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
		d.e && `evaluation: ${d.e}`,
		d.t !== undefined && `hint_think_time: ${d.t}s`,
	].filter(Boolean);

	return rows.length
		? `${msg.c}\n\n[board_context]\n${rows.join('\n')}\n[/board_context]`
		: msg.c;
}

function normalize_msg(v: any): Msg | null {
	const r = v?.r ?? v?.role;
	const c = text(v?.c ?? v?.content);
	if ((r !== 'system' && r !== 'user' && r !== 'assistant') || !c) return null;
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

	const sys_i = messages.findIndex((msg) => msg.r === 'system');
	const sys = sys_i >= 0 ? messages[sys_i].c : '';
	if (sys_i >= 0) messages.splice(sys_i, 1);

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
					tools: { get_fen, evaluate_position },
					stopWhen: stepCountIs(10),
				});
				for await (const part of result.fullStream) {
					if (request.signal.aborted) break;
					if (part.type === 'text-delta' && part.text) {
						wrote = true;
						controller.enqueue(event('text', { t: part.text }));
					}
				}
				if (!request.signal.aborted && wrote) {
					try {
						const u = await result.usage;
							if (u?.totalTokens != null) {
							const p = u.inputTokens ?? 0, c = u.outputTokens ?? 0;
							const cost = calc_cost(m, p, c);
							const cost_kobo = Math.round(cost * NGN_USD * 100 * TOKEN_RATE);
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
