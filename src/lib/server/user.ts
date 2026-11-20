import { env } from '$env/dynamic/private';
import type { User } from '$lib/types/user';

type Row = { i: string; e: string; n: string; p: string | null; a: number | null; d: number };

// accounts made before 2026-11-20 lived in the shared qdrant collection; the first login copies one into d1
async function old_id(email: string): Promise<string | null> {
	if (!env.QDRANT_URL) return null;
	try {
		const r = await fetch(`${env.QDRANT_URL}/collections/i/points/scroll`, {
			method: 'POST',
			headers: { 'api-key': env.QDRANT_KEY ?? '', 'content-type': 'application/json' },
			body: JSON.stringify({ filter: { must: [{ key: 's', match: { value: 'u' } }], should: [{ key: 'e', match: { value: email } }, { key: 'm', match: { value: email } }] }, limit: 1, with_payload: false, with_vector: false })
		});
		const id = r.ok ? (await r.json())?.result?.points?.[0]?.id : null;
		return typeof id === 'string' ? id : null;
	} catch {
		return null;
	}
}

// one account per email; d1 errors reach the caller, so a hiccup never makes a second account
export async function find_or_create_user(db: D1Database, name: string, picture: string | undefined, email: string): Promise<Row> {
	const e = email.trim().toLowerCase();
	const hit = await db.prepare('select i, e, n, p, a, d from u where e = ?').bind(e).first<Row>();
	if (hit) {
		if (hit.n !== name || hit.p !== (picture ?? null)) await db.prepare('update u set n = ?, p = ? where i = ?').bind(name, picture ?? null, hit.i).run();
		return { ...hit, n: name, p: picture ?? null };
	}
	const row: Row = { i: (await old_id(e)) ?? crypto.randomUUID(), e, n: name, p: picture ?? null, a: null, d: Date.now() };
	await db.prepare('insert into u (i, e, n, p, a, d) values (?, ?, ?, ?, ?, ?) on conflict (e) do nothing').bind(row.i, row.e, row.n, row.p, row.a, row.d).run();
	return (await db.prepare('select i, e, n, p, a, d from u where e = ?').bind(e).first<Row>())!;
}

export async function get_user(db: D1Database, id: string): Promise<User | null> {
	const r = await db.prepare('select n, p, e, a, d from u where i = ?').bind(id).first<{ n: string; p: string | null; e: string; a: number | null; d: number }>();
	return r && { s: 'u', n: r.n, p: r.p ?? undefined, m: r.e, a: r.a ?? undefined, d: r.d };
}

// a grown-up said yes to keeping this account's games and chats
export const allow = (db: D1Database, id: string) => db.prepare('update u set a = ? where i = ? and a is null').bind(Date.now(), id).run();

// deletes every saved game, every payment record and the account itself
export async function forget_user(db: D1Database, id: string) {
	await db.batch([db.prepare('delete from s where u = ?').bind(id), db.prepare('delete from p where u = ?').bind(id), db.prepare('delete from u where i = ?').bind(id)]);
}
