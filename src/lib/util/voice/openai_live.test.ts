import { describe, expect, it } from 'vitest';
import { calc_openai_live_cost, is_openai_voice, left_ol, live_sdp, openai_voice_options, OPENAI_LIVE_TRIAL_S, settle_ol, used_ol, utc_day } from './openai_live';

describe('openai live helpers', () => {
	it('prices ninety seconds at five cents a minute', () => {
		expect(calc_openai_live_cost(90)).toBeCloseTo(0.075, 6);
	});

	it('treats negative seconds as zero', () => {
		expect(calc_openai_live_cost(-8)).toBe(0);
	});

	it('knows marin and rejects gemini voice names', () => {
		expect(is_openai_voice('marin')).toBe(true);
		expect(is_openai_voice('Kore')).toBe(false);
		expect(openai_voice_options[0].v).toBe('marin');
	});

	it('gives three free minutes each utc day', () => {
		expect(OPENAI_LIVE_TRIAL_S).toBe(180);
		const day = utc_day(1_704_067_200_000);
		const rec = { n: 60, d: day, i: 'live_1', t: 1_000 };
		expect(used_ol(rec, 1_090, day)).toBe(150);
		expect(left_ol(rec, 1_090, day)).toBe(30);
		expect(used_ol(rec, 1_090, day, 200)).toBe(180);
		expect(used_ol(rec, 1_090, day + 1)).toBe(0);
		expect(settle_ol(rec, 1_090, day)).toEqual({ n: 150, d: day, i: '', t: 0 });
	});

	it('keeps the last newline on an sdp offer', () => {
		const offer = 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0';
		expect(live_sdp(offer)).toBe('v=0\no=- 0 0 IN IP4 127.0.0.1\ns=-\nt=0 0\n');
		expect(live_sdp('')).toBe('');
	});
});
