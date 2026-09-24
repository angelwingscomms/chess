import { createHash } from 'node:crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';
import { left_ol, OPENAI_LIVE_TRIAL_S, settle_ol, used_ol, utc_day, type Ol } from '$lib/util/voice/openai_live';

const C = 'i';
const ZV: number[] = new Array(4096).fill(0);
const local = new Map<string, Ol>();
let q: QdrantClient | null = null;

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

function pid(user_id: string): string {
	const h = createHash('sha1').update('ol:' + user_id).digest('hex');
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function empty(): Ol {
	return { n: 0, d: 0, i: '', t: 0 };
}

async function read(user_id: string): Promise<Ol> {
	const id = pid(user_id);
	try {
		const r = await client().retrieve(C, { ids: [id] });
		const p = r[0]?.payload;
		return {
			n: Number(p?.n) || 0,
			d: Number(p?.d) || 0,
			i: typeof p?.i === 'string' ? p.i : '',
			t: Number(p?.t) || 0,
		};
	} catch {
		return local.get(user_id) || empty();
	}
}

async function write(user_id: string, rec: Ol): Promise<void> {
	const id = pid(user_id);
	local.set(user_id, rec);
	try {
		await client().upsert(C, { points: [{ id, vector: { i: ZV }, payload: { s: 'ol', u: user_id, ...rec } }] });
	} catch {}
}

export async function peek_openai_live_trial(user_id: string) {
	const now = Math.floor(Date.now() / 1000);
	const rec = await read(user_id);
	return { left: left_ol(rec, now, utc_day()), rec };
}

export async function open_openai_live_trial(user_id: string, session_id: string) {
	const now = Math.floor(Date.now() / 1000);
	const day = utc_day();
	const rec = await read(user_id);
	const settled = settle_ol(rec, now, day);
	if (settled.n >= OPENAI_LIVE_TRIAL_S) {
		await write(user_id, settled);
		return { ok: false as const, left: 0, prev: rec.i };
	}
	await write(user_id, { n: settled.n, d: day, i: session_id, t: now });
	return { ok: true as const, left: OPENAI_LIVE_TRIAL_S - settled.n, prev: rec.i };
}

export async function note_openai_live_trial(user_id: string, session_id: string, seconds: number) {
	const now = Math.floor(Date.now() / 1000);
	const day = utc_day();
	const rec = await read(user_id);
	const extra = rec.i === session_id ? Math.max(0, seconds) : 0;
	const used = used_ol(rec, now, day, extra);
	if (used >= OPENAI_LIVE_TRIAL_S) {
		const i = rec.i || session_id;
		await write(user_id, { n: OPENAI_LIVE_TRIAL_S, d: day, i: '', t: 0 });
		return { left: 0, stop: true, i };
	}
	return { left: OPENAI_LIVE_TRIAL_S - used, stop: false, i: rec.i || session_id };
}

export async function close_openai_live_trial(user_id: string, session_id: string, seconds: number) {
	const now = Math.floor(Date.now() / 1000);
	const day = utc_day();
	const rec = await read(user_id);
	const extra = !rec.i || rec.i === session_id ? Math.max(0, seconds) : 0;
	const n = used_ol(rec, now, day, extra);
	const same = !rec.i || rec.i === session_id;
	await write(user_id, { n, d: day, i: same ? '' : rec.i, t: same ? 0 : rec.t });
	const left = OPENAI_LIVE_TRIAL_S - n;
	return { left, stop: left <= 0, i: same ? session_id : rec.i };
}

export function is_live_id(id: string) {
	return /^[A-Za-z0-9_-]{6,128}$/.test(id);
}

export async function hangup_openai_live(id: string, key: string) {
	if (!key || !is_live_id(id)) return;
	try {
		await fetch(`https://api.openai.com/v1/live/sessions/${encodeURIComponent(id)}/hangup`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${key}` },
		});
	} catch {}
}
