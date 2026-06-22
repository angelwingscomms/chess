import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GROQ } from '$env/static/private';
import { experimental_transcribe as transcribe } from 'ai';
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({ apiKey: GROQ });

export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData().catch(() => null);
	const file = form?.get('audio');
	if (!file || typeof file === 'string') {
		return json({ error: 'Missing audio file' }, { status: 400 });
	}

	const buf = await file.arrayBuffer();

	try {
		const { text } = await transcribe({
			model: groq.transcription('whisper-large-v3-turbo'),
			audio: buf,
		});
		return json({ text });
	} catch (e) {
		console.error('[stt] transcribe error:', e);
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
};
