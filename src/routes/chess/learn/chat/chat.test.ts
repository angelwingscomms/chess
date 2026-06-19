import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const route = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '+server.ts'), 'utf8');

describe('/chess/learn/chat route', () => {
	it('uses AI SDK streamText with Groq, Google, and OpenRouter', () => {
		expect(route).toContain("{ createGroq } from '@ai-sdk/groq'");
		expect(route).toContain("{ createGoogleGenerativeAI } from '@ai-sdk/google'");
		expect(route).toContain("{ createOpenAI } from '@ai-sdk/openai'");
		expect(route).toContain('GROQ');
		expect(route).toContain('GEMINI');
		expect(route).toContain('OPENROUTER_KEY');
		expect(route).toContain('streamText');
		expect(route).toContain('textStream');
		expect(route).toContain("event('text'");
		expect(route).toContain('system: sys');
		expect(route).toContain("m.startsWith('deepseek/')");
	});

	it('imports calc_cost, deduct, NGN_USD and deducts balance on usage', () => {
		expect(route).toContain("import { calc_cost } from '$lib/util/ai/pricing'");
		expect(route).toContain("import { deduct } from '$lib/server/token_balance'");
		expect(route).toContain("import { NGN_USD } from '$lib/util/rates'");
		expect(route).toContain('const cost = calc_cost(m, p, c)');
		expect(route).toContain('cost_kobo');
		expect(route).toContain('bal');
	});

	it('keeps chess context in user input instead of the system prompt', () => {
		expect(route).toContain('function build_input');
		expect(route).toContain('[board_context]');
		expect(route).toContain('fen:');
		expect(route).toContain('move_history:');
		expect(route).toContain('last_user_move:');
		expect(route).toContain('last_ai_move:');
		expect(route).toContain('hint:');
		expect(route).toContain('CRITICAL: You are not a teacher');
		expect(route).not.toContain('Position (FEN)');
	});
});
