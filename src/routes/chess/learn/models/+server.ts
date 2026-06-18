import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GROQ, OPENROUTER_KEY } from '$env/static/private';

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
		const prio = ['nex-agi/nex-n2-pro:free', 'deepseek/deepseek-v4-flash', 'gemma-4-26b-a4b-it', 'gemma-4-31b-it', 'openai/gpt-oss-120b', 'qwen/qwen3-32b', 'llama-3.3-70b-versatile'];
		models.sort((a, b) => {
			const pa = prio.indexOf(a.v), pb = prio.indexOf(b.v);
			return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
		});
		const first = models[0];
		if (first) first.r = true;
		const openrouter_model = { v: 'nex-agi/nex-n2-pro:free', l: 'Nex-N2-Pro', d: 'openrouter' };
		if (!models.find((m) => m.v === 'nex-agi/nex-n2-pro:free')) {
			models.unshift(openrouter_model);
			if (models[0]) models[0].r = true;
			if (first && first !== models[0]) first.r = false;
		}
		return json(models);
	} catch (e) {
		console.error('[models] fetch error:', e);
		// TODO: groq/compound and groq/compound-mini — paid models later
		const fallback = [
			{ v: 'nex-agi/nex-n2-pro:free', l: 'Nex-N2-Pro', d: 'openrouter', r: true },
			{ v: 'deepseek/deepseek-v4-flash', l: 'DeepSeek V4 Flash', d: 'openrouter' },
			{ v: 'gemma-4-26b-a4b-it', l: 'Gemma 4 26B', d: 'google' },
			{ v: 'gemma-4-31b-it', l: 'Gemma 4 31B', d: 'google' },
			{ v: 'openai/gpt-oss-120b', l: 'GPT-OSS 120B', d: 'groq' },
			{ v: 'qwen/qwen3-32b', l: 'Qwen3 32B', d: 'groq' },
			{ v: 'llama-3.3-70b-versatile', l: 'Llama 3.3 70B', d: 'meta' },
		];
		return json(fallback);
	}
};
