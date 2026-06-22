import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const text = body?.t?.trim();
	if (!text) {
		return json({ error: 'Missing text' }, { status: 400 });
	}

	const key = env.AZURE_SPEECH_KEY;
	const region = env.AZURE_SPEECH_REGION;
	if (!key || !region) {
		return json({ error: 'Azure Speech not configured' }, { status: 501 });
	}

	const ssml = `<speak version='1.0' xml:lang='en-US'>
		<voice name='en-US-JennyNeural'>${esc(text)}</voice>
	</speak>`;

	const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Ocp-Apim-Subscription-Key': key,
			'Content-Type': 'application/ssml+xml',
			'X-Microsoft-OutputFormat': 'riff-16khz-16bit-mono-pcm',
		},
		body: ssml,
	});

	if (!res.ok) {
		const err = await res.text().catch(() => 'unknown');
		console.error('[tts] azure error:', res.status, err);
		return json({ error: `Azure TTS failed: ${res.status}` }, { status: 502 });
	}

	const audio = await res.arrayBuffer();

	return new Response(audio, {
		headers: {
			'Content-Type': 'audio/wav',
			'Content-Length': audio.byteLength.toString(),
		},
	});
};

function esc(s: string) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
