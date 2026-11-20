// groq's list prices in usd per million tokens, in and out; only used to show what the coach used
const PRICING: Record<string, { i: number; o: number }> = {
	'openai/gpt-oss-120b': { i: 0.15, o: 0.6 },
	'openai/gpt-oss-20b': { i: 0.075, o: 0.3 }
};

export function calc_cost(m: string, input_t: number, output_t: number): number {
	const p = PRICING[m];
	return p ? (input_t * p.i + output_t * p.o) / 1_000_000 : 0;
}
