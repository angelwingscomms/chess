import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { SECRET: 'test-secret' } }));

describe('session token', () => {
	it('round-trips the user and the grown-up yes', async () => {
		const { encode_session, decode_session } = await import('./session');
		const t = await encode_session({ id: 'u1', name: 'N', picture: 'P', email: 'a@b.com', a: true });
		expect(await decode_session(t)).toMatchObject({ id: 'u1', name: 'N', picture: 'P', email: 'a@b.com', a: true });
	});

	it('refuses a token whose payload was changed', async () => {
		const { encode_session, decode_session } = await import('./session');
		const [, sig] = (await encode_session({ id: 'u1', name: 'N' })).split('.');
		const forged = btoa(JSON.stringify({ u: 'u2', n: 'N', a: 1, e: Date.now() + 1e6 })).replace(/=+$/, '');
		expect(await decode_session(`${forged}.${sig}`)).toBeNull();
	});
});
