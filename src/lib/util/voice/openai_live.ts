export const OPENAI_LIVE_USD_PER_MIN = 0.05;
export const OPENAI_LIVE_TRIAL_S = 180;

export const openai_voice_options = [
	{ v: 'marin', l: 'marin', d: 'default' },
	{ v: 'alloy', l: 'alloy', d: 'neutral' },
	{ v: 'ash', l: 'ash', d: 'calm' },
	{ v: 'ballad', l: 'ballad', d: 'warm' },
	{ v: 'beacon', l: 'beacon', d: 'filipino' },
	{ v: 'bossa', l: 'bossa', d: 'brazilian' },
	{ v: 'cedar', l: 'cedar', d: 'steady' },
	{ v: 'cinder', l: 'cinder', d: 'southern' },
	{ v: 'coral', l: 'coral', d: 'bright' },
	{ v: 'delta', l: 'delta', d: 'southern' },
	{ v: 'echo', l: 'echo', d: 'clear' },
	{ v: 'gleam', l: 'gleam', d: 'north american' },
	{ v: 'meridian', l: 'meridian', d: 'north american' },
	{ v: 'quartz', l: 'quartz', d: 'australian' },
	{ v: 'ripple', l: 'ripple', d: 'australian' },
	{ v: 'sage', l: 'sage', d: 'even' },
	{ v: 'shimmer', l: 'shimmer', d: 'soft' },
	{ v: 'stone', l: 'stone', d: 'irish' },
	{ v: 'tempo', l: 'tempo', d: 'brazilian' },
	{ v: 'verse', l: 'verse', d: 'expressive' },
	{ v: 'vesper', l: 'vesper', d: 'british' },
	{ v: 'willow', l: 'willow', d: 'irish' },
];

export function is_openai_voice(v: string) {
	return openai_voice_options.some((o) => o.v === v);
}

export function calc_openai_live_cost(seconds: number) {
	return (Math.max(0, seconds) / 60) * OPENAI_LIVE_USD_PER_MIN;
}

export type Ol = { n: number; d: number; i: string; t: number };

export function utc_day(ms = Date.now()) {
	return Math.floor(ms / 86400000);
}

export function used_ol(rec: Ol, now: number, day: number, extra = 0) {
	const add = Math.max(0, extra);
	if (rec.d !== day) return Math.min(OPENAI_LIVE_TRIAL_S, add);
	const open = rec.i && rec.t > 0 ? Math.max(0, now - rec.t) : 0;
	return Math.min(OPENAI_LIVE_TRIAL_S, rec.n + Math.max(open, add));
}

export function left_ol(rec: Ol, now: number, day: number, extra = 0) {
	return OPENAI_LIVE_TRIAL_S - used_ol(rec, now, day, extra);
}

export function settle_ol(rec: Ol, now: number, day: number): Ol {
	return { n: used_ol(rec, now, day), d: day, i: '', t: 0 };
}
