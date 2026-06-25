const PRICING: Record<string, { i: number; o: number }> = {
	'nex-agi/nex-n2-pro:free': { i: 0, o: 0 },
	'deepseek/deepseek-v4-flash': { i: 0.10, o: 0.20 },
	'bynara/mimo-v2.5-pro-free': { i: 0, o: 0 },
	'gemma-4-26b-a4b-it': { i: 0.06, o: 0.33 },
	'gemma-4-31b-it': { i: 0.12, o: 0.36 },
	'openai/gpt-oss-120b': { i: 0.15, o: 0.60 },
	'qwen/qwen3-32b': { i: 0.29, o: 0.59 },
	'llama-3.3-70b-versatile': { i: 0.59, o: 0.79 },
};

export function calc_cost(m: string, input_t: number, output_t: number): number {
	const p = PRICING[m];
	if (!p) return 0;
	return (input_t / 1_000_000) * p.i + (output_t / 1_000_000) * p.o;
}
