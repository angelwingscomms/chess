import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GROQ } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const text = body?.t?.trim();
	if (!text) {
		return json({ error: 'Missing text' }, { status: 400 });
	}

	const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${GROQ}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: 'canopylabs/orpheus-v1-english',
			input: text,
			voice: 'austin',
			response_format: 'wav',
		}),
	});

	if (!res.ok) {
		const err = await res.text().catch(() => 'unknown');
		console.error('[tts] groq error:', res.status, err);
		return json({ error: `TTS failed: ${res.status}` }, { status: 502 });
	}

	const audio = await res.arrayBuffer();

	return new Response(audio, {
		headers: {
			'Content-Type': 'audio/wav',
			'Content-Length': audio.byteLength.toString(),
		},
	});
};
