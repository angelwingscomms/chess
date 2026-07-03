type PricingEntry = {
	i: number;
	o: number;
	audio_i?: number;
	audio_o?: number;
	image_i?: number;
	video_i?: number;
};

type TokenDetail = { modality: string; tokenCount: number };

const PRICING: Record<string, PricingEntry> = {
	'nex-agi/nex-n2-pro:free': { i: 0, o: 0 },
	'deepseek/deepseek-v4-flash': { i: 0.10, o: 0.20 },
	'bynara/mimo-v2.5-pro-free': { i: 0, o: 0 },
	'gemma-4-26b-a4b-it': { i: 0.06, o: 0.33 },
	'gemma-4-31b-it': { i: 0.12, o: 0.36 },
	'openai/gpt-oss-120b': { i: 0.15, o: 0.60 },
	'qwen/qwen3-32b': { i: 0.29, o: 0.59 },
	'llama-3.3-70b-versatile': { i: 0.59, o: 0.79 },
	'gemini-3.1-flash-live-preview': {
		i: 0.75,
		o: 4.50,
		audio_i: 3.00,
		audio_o: 12.00,
		image_i: 1.00,
		video_i: 1.00,
	},
};

function modality_rate(p: PricingEntry, modality: string, dir: 'i' | 'o'): number {
	if (dir === 'i') {
		switch (modality) {
			case 'AUDIO': return p.audio_i ?? p.i;
			case 'IMAGE': return p.image_i ?? p.i;
			case 'VIDEO': return p.video_i ?? p.i;
			default: return p.i;
		}
	}
	switch (modality) {
		case 'AUDIO': return p.audio_o ?? p.o;
		default: return p.o;
	}
}

export function calc_cost(
	m: string,
	input_t: number,
	output_t: number,
	input_details?: TokenDetail[],
	output_details?: TokenDetail[],
): number {
	const p = PRICING[m];
	if (!p) return 0;

	let cost = 0;

	if (input_details?.length) {
		for (const d of input_details) {
			cost += (d.tokenCount / 1_000_000) * modality_rate(p, d.modality, 'i');
		}
	} else {
		cost += (input_t / 1_000_000) * p.i;
	}

	if (output_details?.length) {
		for (const d of output_details) {
			cost += (d.tokenCount / 1_000_000) * modality_rate(p, d.modality, 'o');
		}
	} else {
		cost += (output_t / 1_000_000) * p.o;
	}

	return cost;
}
