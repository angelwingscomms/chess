import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';
import type { User } from '$lib/types/user';

const C = 'i';
const local = new Map<string, User>();
let q: QdrantClient | null = null;

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

async function find_by(field: 'e' | 'm', value: string): Promise<{ i: string; pl: Record<string, unknown> } | null> {
	try {
		const r = await client().scroll(C, {
			filter: { must: [{ key: 's', match: { value: 'u' } }, { key: field, match: { value } }] },
			limit: 1,
			with_payload: true,
			with_vector: false
		});
		const p = r.points?.[0];
		if (!p) return null;
		const pl = p.payload as Record<string, unknown>;
		if (pl.s !== 'u') return null;
		return { i: p.id as string, pl };
	} catch {
		return null;
	}
}

export async function find_or_create_user(name: string, picture: string | undefined, email: string): Promise<string> {
	const by_e = await find_by('e', email);
	if (by_e) return by_e.i;
	const by_m = await find_by('m', email);
	if (by_m) {
		try {
			await client().setPayload(C, { points: [by_m.i], payload: { e: email }, wait: true });
		} catch {}
		return by_m.i;
	}
	const id = crypto.randomUUID();
	const u: Record<string, unknown> = { s: 'u', e: email, n: name, m: email, d: Date.now() };
	if (picture) u.pic = picture;
	const ZV: number[] = new Array(4096).fill(0);
	try {
		await client().upsert(C, { points: [{ id, vector: ZV, payload: u }] });
	} catch {
		local.set(id, u as unknown as User);
	}
	return id;
}

export async function get_user(id: string): Promise<User | null> {
	try {
		const r = await client().retrieve(C, { ids: [id] });
		const pl = r[0]?.payload as Record<string, unknown> | undefined;
		if (pl?.s !== 'u') return null;
		const raw_c = pl.c;
		return {
			s: 'u',
			n: (pl.n as string) || '',
			p: (pl.pic as string) || (pl.p as string),
			m: (pl.m as string) || (pl.e as string),
			c: typeof raw_c === 'string' ? (raw_c as string) : undefined,
			r: pl.r as string[] | undefined,
			d: (pl.d as number) || 0
		};
	} catch {
		return local.get(id) || null;
	}
}

export async function find_login_user(email: string): Promise<{ i: string; n?: string; pic?: string; hash?: string } | null> {
	const by_e = await find_by('e', email);
	const hit = by_e || (await find_by('m', email));
	if (!hit) return null;
	const raw_p = hit.pl.p;
	const hash = typeof raw_p === 'string' && raw_p.startsWith('$2') ? (raw_p as string) : undefined;
	return {
		i: hit.i,
		n: (hit.pl.n as string) || undefined,
		pic: (hit.pl.pic as string) || (hit.pl.p as string) || undefined,
		hash
	};
}
