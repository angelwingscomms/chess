// the models the coach may answer with, all on groq; the server refuses any other. v id, l label
export const MODELS = [
	{ v: 'openai/gpt-oss-120b', l: 'clever' },
	{ v: 'openai/gpt-oss-20b', l: 'quick' }
];

export const pick_model = (m: unknown) => MODELS.find((o) => o.v === m)?.v ?? MODELS[0].v;
