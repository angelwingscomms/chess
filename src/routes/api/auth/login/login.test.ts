import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';

const store = new Map<string, any>();

vi.mock('$env/static/private', () => ({ QDRANT_URL: 'http://x', QDRANT_KEY: 'k', SECRET: 'test-secret' }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));

vi.mock('@qdrant/js-client-rest', () => {
	return {
		QdrantClient: class {
			async scroll(_c: string, { filter, limit = 1 }: any) {
				const must = filter?.must ?? [];
				const rows = [...store.values()].filter((r) =>
					must.every((m: any) => r[m.key] === m.match?.value)
				);
				return { points: rows.slice(0, limit).map((r) => ({ id: r.i, payload: r })) };
			}
		}
	};
});

beforeEach(() => store.clear());

const req = (email: string, password: string) => ({ json: async () => ({ email, password }) });

async function call(email: string, password: string, cookies = { set: vi.fn() }) {
	const { POST } = await import('./+server');
	const res = await POST({ request: req(email, password), cookies } as any);
	return { res, cookies };
}

describe('POST /api/auth/login', () => {
	it('rejects a wrong password with 401', async () => {
		store.set('u1', { s: 'u', e: 'a@b.com', p: bcrypt.hashSync('pass', 10), n: 'N', i: 'u1' });
		const { res } = await call('a@b.com', 'x');
		expect(res.status).toBe(401);
		expect((await res.json()).error).toBe('Invalid email or password');
	});

	it('sets the session cookie with SESSION_COOKIE on success', async () => {
		store.set('u1', { s: 'u', e: 'a@b.com', p: bcrypt.hashSync('pass', 10), n: 'N', i: 'u1' });
		const { SESSION_COOKIE } = await import('$lib/server/session');
		const { res, cookies } = await call('a@b.com', 'pass');
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.user.id).toBe('u1');
		expect(cookies.set).toHaveBeenCalledWith('session', expect.any(String), SESSION_COOKIE);
	});
});

describe('login page', () => {
	it('has an email/password form and keeps the Google link', () => {
		const page = readFileSync(resolve(process.cwd(), 'src/routes/login/+page.svelte'), 'utf8');
		expect(page).toContain('type="password"');
		expect(page).toContain('/api/auth/login');
		expect(page).toContain('Sign in with Google');
	});
});
