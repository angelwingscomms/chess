import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';
import Sqids from 'sqids';
import type { User } from '$lib/types/user';

const C = 'i';
const local = new Map<string, User>();
let q: QdrantClient | null = null;
const sqids = new Sqids({ minLength: 6 });

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

function pid(id: string): string {
	return 'u_' + id;
}

export async function save_user(
	_event: unknown,
	id: string,
	name: string,
	picture?: string,
	email?: string,
	// affiliate_code?: string
): Promise<void> {
	const u: User = {
		s: 'u',
		n: name,
		p: picture,
		m: email,
		d: Date.now()
	};
	try {
		console.log('[USER] save_user - checking existing record for', pid(id));
		const r = await client().retrieve(C, { ids: [pid(id)] });
		const cur = r[0]?.payload as Record<string, unknown> | undefined;
		if (cur?.s === 'u') {
			console.log('[USER] existing user found, preserving metadata');
			u.d = (cur.d as number) || u.d;
			if (cur.c) u.c = cur.c as string;
			if (cur.r) u.r = cur.r as string[];
		} else {
			u.c = sqids.encode([Math.floor(Date.now() / 1000), Math.floor(Math.random() * 9000) + 1000]);
			console.log('[USER] new user, referral code:', u.c);
		}
		console.log('[USER] upserting to qdrant...');
		await client().upsert(C, { points: [{ id: pid(id), payload: u as unknown as Record<string, unknown> }] });
		console.log('[USER] qdrant upsert success');
	} catch (e) {
		console.log('[USER] qdrant error, falling back to local map:', String(e));
		local.set(pid(id), u);
	}
}

export async function get_user(_event: unknown, id: string): Promise<User | null> {
	try {
		const r = await client().retrieve(C, { ids: [pid(id)] });
		const u = r[0]?.payload as Record<string, unknown> | undefined;
		if (u?.s === 'u') {
			return {
				s: 'u',
				n: u.n as string,
				p: u.p as string | undefined,
				m: u.m as string | undefined,
				c: u.c as string | undefined,
				r: u.r as string[] | undefined,
				d: u.d as number
			};
		}
		return null;
	} catch {
		return local.get(pid(id)) || null;
	}
}
