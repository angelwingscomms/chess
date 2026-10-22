import { GEMINI } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GoogleGenAI, Modality } from '@google/genai';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (url.searchParams.get('u') === '1') return json({ k: '' });
	if (!locals.user?.id) return json({ error: 'Unauthorized' }, { status: 401 });

	const token = await new GoogleGenAI({
		apiKey: (env.GEMINI || GEMINI).trim(),
		httpOptions: { apiVersion: 'v1alpha', timeout: 10000 }
	}).authTokens.create({
		config: {
			uses: 1,
			lockAdditionalFields: [],
			expireTime: new Date(Date.now() + 1800000).toISOString(),
			newSessionExpireTime: new Date(Date.now() + 60000).toISOString(),
			liveConnectConstraints: {
				model: 'gemini-3.8-live',
				config: {
					responseModalities: [Modality.AUDIO],
					inputAudioTranscription: {},
					outputAudioTranscription: {}
				}
			}
		}
	});
	if (!token.name) return json({ error: 'voice authentication unavailable' }, { status: 503 });
	return json({ k: token.name }, { headers: { 'Cache-Control': 'no-store' } });
};
