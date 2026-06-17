import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GROQ, GEMINI } from '$env/static/private';
import { streamText, wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const groq = createGroq({ apiKey: GROQ });
const google = createGoogleGenerativeAI({ apiKey: GEMINI });

const getModel = (m: string) => wrapLanguageModel({
	model: m.includes('/') ? groq(m) : google(m),
	middleware: extractReasoningMiddleware({ tagName: 'think' }),
});

type Msg = { r: 'user' | 'assistant'; c: string; d?: Data };
type Data = { f?: string; p?: string; u?: string; a?: string; h?: string };

const sys = 'You are a concise chess coach. Use the supplied board context when present.';
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

export const POST: RequestHandler = async ({ request }) => {
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
