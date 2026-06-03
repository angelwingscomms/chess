import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GROQ } from '$env/static/private';

export const GET: RequestHandler = async () => {
	try {
		const res = await fetch('https://api.groq.com/openai/v1/models', {
			headers: { Authorization: `Bearer ${GROQ}` },
		});
		if (!res.ok) throw Error(`Groq API: ${res.status} ${res.statusText}`);
		const body = await res.json();
		const models: { v: string; l: string; d: string; r?: boolean }[] = (body.data ?? [])
			.filter((m: any) => m.object === 'model' && m.id && !m.id.includes('whisper') && !m.id.includes('embedding') && !m.id.includes('orpheus') && !m.id.includes('prompt-guard'))
			.map((m: any) => ({ v: m.id, l: m.id.split('/').pop() ?? m.id, d: m.owned_by ?? '' }));
		models.sort((a, b) => {
			if (a.v === 'qwen/qwen3-32b') return -1;
			if (b.v === 'qwen/qwen3-32b') return 1;
			return 0;
		});
		const first = models[0];
		if (first) first.r = true;
		return json(models);
	} catch (e) {
		console.error('[models] fetch error:', e);
		const fallback = [
			{ v: 'qwen/qwen3-32b', l: 'Qwen3 32B', d: 'groq', r: true },
			{ v: 'llama-3.3-70b-versatile', l: 'Llama 3.3 70B', d: 'meta' },
		];
		return json(fallback);
	}
};
