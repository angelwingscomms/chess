import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';

const TOKEN_RATE = 1;
const C = 'i';
const local = new Map<string, number>();
let q: QdrantClient | null = null;

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY });
	return q;
}

export async function credit(_event: unknown, user_id: string, amount_kobo: number): Promise<number> {
	const t = Math.floor(amount_kobo / TOKEN_RATE);
	try {
		const r = await client().retrieve(C, { ids: [user_id] });
		const cur = (r[0]?.payload?.t as number) || 0;
		const n = cur + t;
		await client().upsert(C, { points: [{ id: user_id, payload: { t: n, u: user_id } }] });
		return n;
	} catch {
		const cur = local.get(user_id) || 0;
		const n = cur + t;
		local.set(user_id, n);
		return n;
	}
}

export async function get_balance(_event: unknown, user_id: string): Promise<number> {
	try {
		const r = await client().retrieve(C, { ids: [user_id] });
		return (r[0]?.payload?.t as number) || 0;
	} catch {
		return local.get(user_id) || 0;
	}
}

export async function deduct(_event: unknown, user_id: string, amount: number): Promise<number> {
	try {
		const r = await client().retrieve(C, { ids: [user_id] });
		const cur = (r[0]?.payload?.t as number) || 0;
		const n = Math.max(0, cur - amount);
		await client().upsert(C, { points: [{ id: user_id, payload: { t: n, u: user_id } }] });
		return n;
	} catch {
		const cur = local.get(user_id) || 0;
		const n = Math.max(0, cur - amount);
		local.set(user_id, n);
		return n;
	}
}

export function tokens_per_kobo(): number {
	return TOKEN_RATE;
}
