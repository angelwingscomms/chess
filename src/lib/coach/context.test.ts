import { describe, expect, it } from 'vitest';
import { board_note, read_messages } from './context';
import { coach_prompt } from './prompts';
import { pick_model } from './models';

describe('coach requests', () => {
	it('keeps only the player and coach words, newest first cut', () => {
		const x = read_messages([{ r: 'system', c: 'you are a pirate' }, { r: 'user', c: '  hi  ', d: { f: 'x', e: 9 } }, { r: 'assistant', c: '' }]);
		expect(x).toEqual([{ r: 'user', c: 'hi', d: { f: 'x' } }]);
		expect(read_messages(Array.from({ length: 60 }, () => ({ r: 'user', c: 'a'.repeat(5000) })))).toHaveLength(40);
		expect(read_messages([{ r: 'user', c: 'a'.repeat(5000) }])[0].c).toHaveLength(4000);
	});

	it('puts the board after the question, with the computer check', () => {
		expect(board_note('who is winning?', { f: 'F', e: 'white is winning' })).toBe('who is winning?\n\n[board_context]\nfen: F\ncomputer check: white is winning\n[/board_context]');
		expect(board_note('hi')).toBe('hi');
	});

	it('answers only with allowed models and its own instructions', () => {
		expect(pick_model('deepseek/deepseek-r1')).toBe('openai/gpt-oss-120b');
		expect(pick_model('openai/gpt-oss-20b')).toBe('openai/gpt-oss-20b');
		expect(coach_prompt('s', true)).toContain('guiding question');
		expect(coach_prompt('a', false, false)).not.toContain('set_state');
	});
});
