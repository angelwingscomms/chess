import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const VOICE_UUID = '819fcc57'; // Luma

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const text = body?.t?.trim();
	if (!text) {
		return json({ error: 'Missing text' }, { status: 400 });
	}

	const key = env.RESEMBLE_API_KEY;
	if (!key) {
		return json({ error: 'Resemble not configured' }, { status: 501 });
	}

	const res = await fetch('https://f.cluster.resemble.ai/synthesize', {
		method: 'POST',
		headers: {
			Authorization: key,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			voice_uuid: VOICE_UUID,
			data: text,
			output_format: 'mp3',
			sample_rate: 24000,
		}),
	});

	if (!res.ok) {
		const err = await res.text().catch(() => 'unknown');
		console.error('[tts] resemble error:', res.status, err);
		return json({ error: `TTS failed: ${res.status}` }, { status: 502 });
	}

	const data = await res.json();
	if (!data.success || !data.audio_content) {
		console.error('[tts] resemble api error:', data);
		return json({ error: 'TTS failed' }, { status: 502 });
	}

	const audio = Uint8Array.from(atob(data.audio_content), (c) => c.charCodeAt(0));

	return new Response(audio, {
		headers: {
			'Content-Type': 'audio/mpeg',
			'Content-Length': audio.byteLength.toString(),
		},
	});
};
