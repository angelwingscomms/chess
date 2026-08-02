import { describe, expect, it, vi, beforeEach } from 'vitest';

const store = new Map<string, any>();

vi.mock('$env/static/private', () => ({ QDRANT_URL: 'http://x', QDRANT_KEY: 'k' }));

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
			async retrieve(_c: string, { ids }: any) {
				return ids.map((id: string) => ({ id, payload: store.get(id) ?? null })).filter((p: any) => p.payload);
			}
			async upsert(_c: string, { points }: any) {
				for (const p of points) store.set(p.id, { ...p.payload, i: p.id });
				return {};
			}
			async setPayload(_c: string, { points, payload }: any) {
				for (const id of points) store.set(id, { ...store.get(id), ...payload, i: id });
				return {};
			}
		}
	};
});

beforeEach(() => store.clear());

describe('email-keyed user store', () => {
	it('creates a user keyed by email with pic not p', async () => {
		const { find_or_create_user } = await import('./user');
		const id = await find_or_create_user('N', 'P', 'a@b.com');
		expect(id).toMatch(/^[0-9a-f-]{36}$/);
		const u = store.get(id);
		expect(u).toMatchObject({ s: 'u', e: 'a@b.com', n: 'N', m: 'a@b.com', pic: 'P' });
		expect(u.p).toBeUndefined();
	});

	it('returns the same id for the same email and never overwrites it', async () => {
		const { find_or_create_user } = await import('./user');
		const a = await find_or_create_user('N', 'P', 'a@b.com');
		const b = await find_or_create_user('Other', undefined, 'a@b.com');
		expect(b).toBe(a);
		expect(store.get(a).n).toBe('N');
	});

	it('adopts a legacy m-keyed record and backfills e', async () => {
		store.set('legacy', { s: 'u', m: 'a@b.com', p: 'http://pic', i: 'legacy' });
		const { find_or_create_user } = await import('./user');
		const id = await find_or_create_user('N', 'P', 'a@b.com');
		expect(id).toBe('legacy');
		expect(store.get('legacy').e).toBe('a@b.com');
	});

	it('get_user reads picture from pic or p and email from e or m', async () => {
		store.set('x', { s: 'u', e: 'e@x.com', pic: 'PIC', n: 'N', i: 'x' });
		store.set('y', { s: 'u', m: 'm@y.com', p: 'OLDPIC', n: 'M', i: 'y' });
		const { get_user } = await import('./user');
		expect((await get_user('x'))?.p).toBe('PIC');
		expect((await get_user('x'))?.m).toBe('e@x.com');
		expect((await get_user('y'))?.p).toBe('OLDPIC');
		expect((await get_user('y'))?.m).toBe('m@y.com');
	});

	it('find_login_user treats only a bcrypt hash as a password', async () => {
		store.set('h', { s: 'u', e: 'h@x.com', p: '$2b$10$abcdefghijklmnopqrstuv', i: 'h' });
		store.set('pic', { s: 'u', e: 'pic@x.com', p: 'http://pic.url', i: 'pic' });
		const { find_login_user } = await import('./user');
		expect((await find_login_user('h@x.com'))?.hash).toBe('$2b$10$abcdefghijklmnopqrstuv');
		expect((await find_login_user('pic@x.com'))?.hash).toBeUndefined();
		expect((await find_login_user('nope@x.com'))).toBeNull();
	});
});
