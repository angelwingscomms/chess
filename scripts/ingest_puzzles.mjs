import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { QdrantClient } from '@qdrant/js-client-rest';
import 'dotenv/config';

const CSV = process.argv[2] || `${process.env.HOME}/Downloads/lichess_db_puzzle.csv`;
const C = 'puz';
const BATCH = 1000;

const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function point_id(s) {
	let n = 0;
	for (const ch of s) n = n * 62 + B62.indexOf(ch);
	return n;
}

function rating_band(r) {
	if (r < 1200) return 'rating_beginner';
	if (r < 1500) return 'rating_easy';
	if (r < 1800) return 'rating_intermediate';
	if (r < 2100) return 'rating_advanced';
	if (r < 2400) return 'rating_expert';
	return 'rating_master';
}

function tags(themes, openings, rating, popularity, fen) {
	const t = new Set(themes ? themes.split(' ') : []);
	if (openings) for (const o of openings.split(' ')) t.add(o);
	t.add(rating_band(rating));
	t.add(fen.split(' ')[1] === 'w' ? 'solve_black' : 'solve_white');
	if (popularity >= 90) t.add('popular');
	return [...t];
}

const q = new QdrantClient({
	url: process.env.QDRANT_URL,
	apiKey: process.env.QDRANT_KEY,
	checkCompatibility: false,
});

async function ensure() {
	const { collections } = await q.getCollections();
	if (collections.some((c) => c.name === C)) return;
	await q.createCollection(C, { vectors: {}, on_disk_payload: true });
	await q.createPayloadIndex(C, { field_name: 't', field_schema: 'keyword', wait: true });
	await q.createPayloadIndex(C, { field_name: 'r', field_schema: 'integer', wait: true });
	await q.createPayloadIndex(C, { field_name: 'v', field_schema: 'integer', wait: true });
	console.log(`created collection ${C}`);
}

async function flush(points, tries = 0) {
	try {
		await q.upsert(C, { points, wait: false });
	} catch (e) {
		if (tries >= 5) throw e;
		await new Promise((r) => setTimeout(r, 2000 * 2 ** tries));
		return flush(points, tries + 1);
	}
}

await ensure();

const skip = Number(process.env.SKIP || 0);
let n = 0;
let batch = [];
const started = Date.now();

const rl = createInterface({ input: createReadStream(CSV), crlfDelay: Infinity });
for await (const line of rl) {
	if (!line || line.startsWith('PuzzleId,')) continue;
	n++;
	if (n <= skip) continue;
	const [id, f, m, rating, , popularity, , themes, u, openings] = line.split(',');
	const r = +rating;
	const v = +popularity;
	batch.push({
		id: point_id(id),
		vector: {},
		payload: { p: id, f, m, r, v, u, t: tags(themes, openings, r, v, f) },
	});
	if (batch.length >= BATCH) {
		await flush(batch);
		batch = [];
		if (n % 100000 === 0) {
			const rate = Math.round(n / ((Date.now() - started) / 1000));
			console.log(`${n} rows | ${rate}/s`);
		}
	}
}
if (batch.length) await flush(batch);

console.log(`done: ${n} rows in ${Math.round((Date.now() - started) / 1000)}s`);
console.log(`points_count: ${(await q.getCollection(C)).points_count}`);
