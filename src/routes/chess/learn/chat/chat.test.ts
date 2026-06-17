import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const route = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '+server.ts'), 'utf8');

describe('/chess/learn/chat route', () => {
	it('uses AI SDK streamText with Groq and Google', () => {
		expect(route).toContain("{ createGroq } from '@ai-sdk/groq'");
		expect(route).toContain("{ createGoogleGenerativeAI } from '@ai-sdk/google'");
		expect(route).toContain('GROQ');
		expect(route).toContain('GEMINI');
		expect(route).toContain('streamText');
		expect(route).toContain('textStream');
		expect(route).toContain("event('text'");
		expect(route).toContain('system: sys');
		expect(route).toContain("m.startsWith('gemini-') || m.startsWith('gemma-') ? google(m) : groq(m)");
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
