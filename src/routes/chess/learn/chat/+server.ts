import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GEMINI } from '$env/static/private';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

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

function build_steps(messages: Msg[]) {
	return messages.map((m) => ({
		type: m.r === 'assistant' ? 'model_output' : 'user_input',
		content: [{ type: 'text', text: m.r === 'user' ? build_input(m) : m.c }],
	}));
}

function build_contents(messages: Msg[]) {
	return messages.map((m) => ({
		role: m.r === 'assistant' ? 'model' : 'user',
		parts: [{ text: m.r === 'user' ? build_input(m) : m.c }],
	}));
}

async function stream_fallback(controller: ReadableStreamDefaultController, request: Request, ai: GoogleGenAI, messages: Msg[], m: string) {
	const response = await ai.models.generateContentStream({
		model: m,
		contents: build_contents(messages),
		config: {
			systemInstruction: { parts: [{ text: sys }] },
			thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
		},
	});
	for await (const chunk of response) {
		if (request.signal.aborted) break;
		if (chunk.text) controller.enqueue(event('text', { t: chunk.text }));
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const raw = Array.isArray(body?.x) ? body.x : Array.isArray(body?.messages) ? body.messages : [];
	const messages = raw.map(normalize_msg).filter(Boolean) as Msg[];
	if (!messages.length) {
		console.error('[chat] no messages in request');
		return json({ error: 'Missing messages array' }, { status: 400 });
	}

	const i = text(body?.i);
	const m = text(body?.m) || 'gemini-3.5-flash';
	console.log(`[chat] request: messages=${messages.length} model=${m} interaction_id=${i ? i.slice(0, 16) + '…' : 'none'}`);

	const last = messages.findLast((msg) => msg.r === 'user');
	if (!last) {
		console.error('[chat] no user message found');
		return json({ error: 'Missing user message' }, { status: 400 });
	}

	const ai = new GoogleGenAI({ apiKey: GEMINI });
	console.log(`[chat] last user msg: ${last.c.slice(0, 80)}`);
	const stream = new ReadableStream({
		async start(controller) {
			let wrote = false;
			try {
				const input_type = i ? 'single (last user msg)' : 'steps (full history)';
				console.log(`[chat] calling ai.interactions.create: model=${m} input_type=${input_type} prev_id=${i ? i.slice(0, 16) + '…' : 'none'}`);
				const response = await ai.interactions.create({
					model: m,
					input: i ? build_input(last) : build_steps(messages) as any,
					previous_interaction_id: i || undefined,
					stream: true,
					system_instruction: sys,
					generation_config: { thinking_level: 'high' },
				}, { signal: request.signal });
				for await (const chunk of response) {
					if (request.signal.aborted) break;
					const event_type = chunk.event_type ?? chunk.type;
					console.log(`[chat] gemini event: ${event_type}`);
					if (event_type === 'step.delta' && chunk.delta.type === 'text') {
						wrote = true;
						controller.enqueue(event('text', { t: chunk.delta.text }));
					}
					if (event_type === 'interaction.completed' || event_type === 'interaction.complete') {
						const id = chunk.interaction?.id;
						console.log(`[chat] interaction completed: id=${id ? id.slice(0, 16) + '…' : 'unknown'}`);
						controller.enqueue(event('interaction', { i: id }));
					}
				}
			} catch (e) {
				console.error('[chat] interactions api error:', e);
				if (!request.signal.aborted) {
					if (!wrote) {
						console.log('[chat] falling back to generateContentStream');
						try {
							await stream_fallback(controller, request, ai, messages, m);
							console.log('[chat] fallback succeeded');
						} catch (fallback) {
							console.error('[chat] fallback error:', fallback);
							controller.enqueue(event('error', { e: fallback instanceof Error ? fallback.stack || fallback.message : String(fallback) }));
						}
					} else {
						controller.enqueue(event('error', { e: e instanceof Error ? e.stack || e.message : String(e) }));
					}
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
