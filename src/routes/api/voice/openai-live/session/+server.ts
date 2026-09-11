import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { is_openai_voice } from '$lib/util/voice/openai_live';

const LIVE = 'https://api.openai.com/v1/live/sessions';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	const sdp = typeof body?.s === 'string' ? body.s.trim() : '';
	const voice = typeof body?.v === 'string' ? body.v.trim() : 'marin';
	const vibe = body?.b === 'assistant' ? 'assistant' : 'socratic';
	const user_key = typeof body?.k === 'string' ? body.k.trim() : '';
	if (!sdp) return json({ error: 'missing sdp' }, { status: 400 });
	if (!is_openai_voice(voice)) return json({ error: 'unknown voice' }, { status: 400 });

	const key = user_key || env.OPENAI_KEY || '';
	if (!key) return json({ error: 'openai live needs an openai key' }, { status: 503 });
	if (!user_key && !locals.user?.id) {
		return json({ error: 'login or paste an openai key to use paid voice' }, { status: 401 });
	}

	const sys = vibe === 'assistant'
		? 'You are a chess coach helping the user win. Keep replies to 1-3 spoken sentences. Plain language. Never mention engines or scores. Never suggest a move unless the user asks. If you need the board, a hint, a puzzle, or to change the position, delegate to the app. After a result comes back, say the useful facts in your own words.'
		: 'You are a chess trainer who asks short questions so the user thinks. Keep replies to 1-3 spoken sentences. Never give answers. Never mention engines or scores. If you need the board, a hint, a puzzle, or to change the position, delegate to the app. After a result comes back, ask the next question.';

	const res = await fetch(LIVE, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			session: {
				model: 'gpt-live-1',
				instructions: sys,
				audio: { output: { voice } },
				delegation: { type: 'client' },
			},
			transport: { type: 'webrtc', sdp },
		}),
	});

	const text = await res.text();
	if (!res.ok) {
		console.error('[openai-live] create failed', res.status, text.slice(0, 400));
		return json({ error: 'live session create failed' }, { status: 502 });
	}

	let out: any;
	try { out = JSON.parse(text); } catch {
		return json({ error: 'bad live session response' }, { status: 502 });
	}
	const answer = out?.transport?.sdp;
	const id = out?.session?.id;
	if (typeof answer !== 'string' || !answer || typeof id !== 'string') {
		return json({ error: 'live session missing sdp' }, { status: 502 });
	}
	return json({ i: id, s: answer }, { status: 201 });
};
