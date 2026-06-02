import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const route = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '+server.ts'), 'utf8');

describe('/chess/learn/chat route', () => {
	it('uses Gemini interactions with server-side history', () => {
		expect(route).toContain('ai.interactions.create');
		expect(route).toContain('previous_interaction_id');
		expect(route).toContain('interaction.completed');
		expect(route).toContain('interaction.complete');
		expect(route).toContain('chunk.type');
		expect(route).toContain("event('interaction'");
		expect(route).toContain('system_instruction: sys');
		expect(route).toContain("gen_config.thinking_level = 'high'");
	});

	it('keeps chess context in user input instead of the system prompt', () => {
		expect(route).toContain('function build_input');
		expect(route).toContain('[board_context]');
		expect(route).toContain('fen:');
		expect(route).toContain('move_history:');
		expect(route).toContain('last_user_move:');
		expect(route).toContain('last_ai_move:');
		expect(route).toContain('hint:');
		expect(route).toContain('Use the supplied board context when present.');
		expect(route).not.toContain('Position (FEN)');
	});
});
