import { createHash } from 'node:crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';

const TOKEN_RATE = 1;
const C = 'i';
const local = new Map<string, number>();
let q: QdrantClient | null = null;

/** Deterministic UUID v5-style from a string — valid Qdrant point ID. */
function id_to_uuid(s: string): string {
	const h = createHash('sha1').update(s).digest('hex');
	return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

const ZV: number[] = new Array(3072).fill(0);

async function read_bal(user_id: string): Promise<number> {
	const pid = id_to_uuid(user_id);
	try {
		const r = await client().retrieve(C, { ids: [pid] });
		return (r[0]?.payload?.t as number) || 0;
	} catch {
		return local.get(user_id) || 0;
	}
}

async function write_bal(user_id: string, n: number): Promise<void> {
	const pid = id_to_uuid(user_id);
	local.set(user_id, n);
	await client().upsert(C, { points: [{ id: pid, vector: ZV, payload: { t: n, u: user_id } }] });
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


