import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const config = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8');

describe('svelte config for chess deps', () => {
	it('compiles old chess packages without runes on Windows and POSIX paths', () => {
		expect(config).toContain('legacy_svelte_dep');
		expect(config).toContain('filename.replaceAll(\'\\\\\', \'/\')');
		expect(config).toContain('svelte-chess');
		expect(config).toContain('svelte-chessground');
		expect(config).toContain('return { runes: false, compatibility: { componentApi: 4 } };');
	});
});
