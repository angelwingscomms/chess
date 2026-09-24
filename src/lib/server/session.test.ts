import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { COOKIE_DOMAIN: '.beeeproject.com' } }));

describe('session cookie', () => {
	it('bakes the shared domain from wrangler vars, host-only in dev', async () => {
		const wr = readFileSync(resolve(process.cwd(), 'wrangler.toml'), 'utf8');
		expect(wr).toContain('COOKIE_DOMAIN = ".beeeproject.com"');
		const { SESSION_COOKIE } = await import('./session');
		expect(SESSION_COOKIE).toMatchObject({ path: '/', httpOnly: true, sameSite: 'lax', maxAge: 604800 });
		expect(Object.keys(SESSION_COOKIE).includes('domain')).toBe(false);
	});

	it('shares the cookie on beee hosts and stays host-only on apexlinks', async () => {
		const { session_cookie } = await import('./session');
		expect(session_cookie('e4.beeeproject.com').domain).toBe('.beeeproject.com');
		expect(session_cookie('beeeproject.com').domain).toBe('.beeeproject.com');
		expect(session_cookie('e4.apexlinks.org').domain).toBeUndefined();
		expect(session_cookie('chess.apexlinks.org').domain).toBeUndefined();
	});

	it('keeps the token payload shape beee decodes', async () => {
		const { encode_session, decode_session } = await import('./session');
		const t = await encode_session({ id: 'u1', name: 'N', picture: 'P', email: 'a@b.com' });
		const d = await decode_session(t);
		expect(d?.user).toMatchObject({ id: 'u1', name: 'N', picture: 'P', email: 'a@b.com' });
	});
});
