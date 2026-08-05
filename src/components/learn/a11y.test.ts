import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = resolve(process.cwd(), 'src/components/learn');

describe('learn icon buttons', () => {
	it('gives every titled control a matching aria-label', () => {
		for (const f of readdirSync(dir).filter((n) => n.endsWith('.svelte'))) {
			const src = readFileSync(resolve(dir, f), 'utf8');
			for (const [, label] of src.matchAll(/title="([^"]+)"/g)) {
				expect(src, `${f}: title="${label}" has no aria-label`).toContain(`aria-label="${label}"`);
			}
		}
	});
});
