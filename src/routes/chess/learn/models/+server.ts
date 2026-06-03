import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	try {
		const res = await fetch('https://api.groq.com/openai/v1/models', {
			headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
		});
		if (!res.ok) throw Error(`Groq API: ${res.status} ${res.statusText}`);
		const body = await res.json();
		const models = (body.data ?? [])
			.filter((m: any) => m.object === 'model' && m.id && !m.id.includes('whisper') && !m.id.includes('embedding'))
			.map((m: any) => ({ v: m.id, l: m.id.split('/').pop() ?? m.id, d: m.owned_by ?? '' }));
		return json(models);
	} catch (e) {
		console.error('[models] fetch error:', e);
		const fallback = [
			{ v: 'qwen/qwen3-32b', l: 'Qwen3 32B', d: 'groq' },
			{ v: 'llama-3.3-70b-versatile', l: 'Llama 3.3 70B', d: 'meta' },
		];
		return json(fallback);
	}
};
