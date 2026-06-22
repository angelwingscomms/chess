import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const text = body?.t?.trim();
	if (!text) {
		return json({ error: 'Missing text' }, { status: 400 });
	}

	const key = env.ELEVENLABS_API_KEY;
	if (!key) {
		return json({ error: 'ElevenLabs not configured' }, { status: 501 });
	}

	const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
		method: 'POST',
		headers: {
			'xi-api-key': key,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			text,
			model_id: 'eleven_flash_v2_5',
		}),
	});

	if (!res.ok) {
		const err = await res.text().catch(() => 'unknown');
		console.error('[tts] elevenlabs error:', res.status, err);
		return json({ error: `TTS failed: ${res.status}` }, { status: 502 });
	}

	const audio = await res.arrayBuffer();

	return new Response(audio, {
		headers: {
			'Content-Type': 'audio/mpeg',
			'Content-Length': audio.byteLength.toString(),
		},
	});
};
