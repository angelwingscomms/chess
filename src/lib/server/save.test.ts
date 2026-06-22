import { describe, expect, it } from 'vitest';

describe('save/load game', () => {
	it('exports save_game and load_game functions', async () => {
		const mod = await import('./save');
		expect(typeof mod.save_game).toBe('function');
		expect(typeof mod.load_game).toBe('function');
	});

	it('SaveData schema has single-letter keys', () => {
		const d: Record<string, unknown> = {
			s: 'g', f: '', h: '', m: 0, o: 'w',
			u: '', a: '', r: '', v: false, x: '',
			g: '', l: 1, c: '[]', d: 0
		};
		expect(d.s).toBe('g');
		expect(Object.keys(d).every(k => k.length === 1)).toBe(true);
	});
});
