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
			// TODO: groq/compound and groq/compound-mini — paid models later
			.filter((m: any) => m.object === 'model' && m.id && !m.id.includes('whisper') && !m.id.includes('embedding') && !m.id.includes('orpheus') && !m.id.includes('prompt-guard') && !m.id.includes('compound'))
			.map((m: any) => ({ v: m.id, l: m.id.split('/').pop() ?? m.id, d: m.owned_by ?? '' }));
		const prio = ['openai/gpt-oss-120b', 'qwen/qwen3-32b', 'llama-3.3-70b-instruct'];
		models.sort((a, b) => {
			const pa = prio.indexOf(a.v), pb = prio.indexOf(b.v);
			return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
		});
		const first = models[0];
		if (first) first.r = true;
		return json(models);
	} catch (e) {
		console.error('[models] fetch error:', e);
		// TODO: groq/compound and groq/compound-mini — paid models later
		const fallback = [
			{ v: 'openai/gpt-oss-120b', l: 'GPT-OSS 120B', d: 'groq', r: true },
			{ v: 'qwen/qwen3-32b', l: 'Qwen3 32B', d: 'groq' },
			{ v: 'llama-3.3-70b-instruct', l: 'Llama 3.3 70B', d: 'meta' },
		];
		return json(fallback);
	}
};
