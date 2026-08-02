import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cb = readFileSync(resolve(process.cwd(), 'src/routes/google/+server.ts'), 'utf8');

describe('google callback', () => {
	it('resolves the canonical email-keyed user, not Google sub', () => {
		expect(cb).toContain('find_or_create_user');
		expect(cb).toContain('encode_session({ id: uid');
		expect(cb).not.toContain('encode_session({ id: guser.sub');
		expect(cb).not.toContain('save_user');
	});
});
