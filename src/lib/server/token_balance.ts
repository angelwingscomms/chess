import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';

const TOKEN_RATE = 1;
const C = 'i';
const local = new Map<string, number>();
let q: QdrantClient | null = null;

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

const ZV: number[] = new Array(3072).fill(0);

async function read_bal(user_id: string): Promise<number> {
	try {
		const r = await client().retrieve(C, { ids: [user_id] });
		return (r[0]?.payload?.t as number) || 0;
	} catch {
		return local.get(user_id) || 0;
	}
}

async function write_bal(user_id: string, n: number): Promise<void> {
	local.set(user_id, n);
	await client().upsert(C, { points: [{ id: user_id, vector: ZV, payload: { t: n, u: user_id } }] });
}

export async function credit(_event: unknown, user_id: string, amount_kobo: number): Promise<number> {
	const t = Math.floor(amount_kobo / TOKEN_RATE);
	const cur = await read_bal(user_id);
	const n = cur + t;
	await write_bal(user_id, n);
	return n;
}

export async function get_balance(_event: unknown, user_id: string): Promise<number> {
	return read_bal(user_id);
}

export async function deduct(_event: unknown, user_id: string, amount: number): Promise<number> {
	const cur = await read_bal(user_id);
	const n = Math.max(0, cur - amount);
	await write_bal(user_id, n);
	return n;
}


