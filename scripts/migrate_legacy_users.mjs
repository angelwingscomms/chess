// Idempotent: moves legacy 'u_' prefixed user points to unprefixed ids and
// backfills e (and pic) on legacy m-only records in Qdrant collection 'i'.
import { QdrantClient } from '@qdrant/js-client-rest';

export function plan_migration(points) {
	const upserts = [];
	const deletes = [];
	const payloads = [];
	for (const p of points) {
		const id = p.id;
		const pl = p.payload || {};
		if (typeof id === 'string' && id.startsWith('u_')) {
			upserts.push({ id: id.slice(2), payload: pl });
			deletes.push(id);
		}
		if (pl.s === 'u' && !pl.e && typeof pl.m === 'string') {
			const patch = { e: pl.m };
			if (typeof pl.p === 'string' && !pl.p.startsWith('$2') && !pl.pic) patch.pic = pl.p;
			payloads.push({ id, payload: patch });
		}
	}
	return { upserts, deletes, payloads };
}

async function main() {
	const q = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_KEY, checkCompatibility: false });
	let offset;
	const all = [];
	do {
		const res = await q.scroll('i', { limit: 1000, with_payload: true, with_vector: false, offset });
		all.push(...res.points);
		offset = res.next_page_offset ?? undefined;
	} while (offset);
	const plan = plan_migration(all.map((p) => ({ id: p.id, payload: p.payload })));
	for (const pt of plan.upserts) await q.upsert('i', { points: [pt] });
	for (const id of plan.deletes) await q.delete('i', { points: [id], wait: true });
	for (const p of plan.payloads) await q.setPayload('i', { points: [p.id], payload: p.payload, wait: true });
	console.log(JSON.stringify({ moved: plan.upserts.length, backfilled: plan.payloads.length }));
}

const is_main = process.argv[1] && process.argv[1].endsWith('migrate_legacy_users.mjs');
if (is_main) main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });