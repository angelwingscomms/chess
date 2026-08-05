import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const p = ['K', 'Q', 'R', 'B', 'N', 'P'];

describe('/chess/learn piece svgs', () => {
	it('uses flat fills instead of gradients', () => {
		for (const c of ['w', 'b']) {
			for (const i of p) {
				const s = readFileSync(resolve(process.cwd(), `static/pieces/gioco/${c}${i}.svg`), 'utf8');

				expect(s).not.toContain('<linearGradient');
				expect(s).not.toContain('url(#');
			}
		}
	});

	it('keeps white pieces on the old medium dark shade', () => {
		for (const i of p) {
			expect(readFileSync(resolve(process.cwd(), `static/pieces/gioco/w${i}.svg`), 'utf8')).toMatch(
				/fill(="|:)#d9c8b5/
			);
		}
	});
});
