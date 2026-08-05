import { createReadStream, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BAND_TOP = 2500;
const OPENING_TOP = 200;

export function point_id(s) {
	let n = 0;
	for (const ch of s) n = n * 62 + B62.indexOf(ch);
	return n;
}

export function rating_band(r) {
	if (r < 1200) return 'rating_beginner';
	if (r < 1500) return 'rating_easy';
	if (r < 1800) return 'rating_intermediate';
	if (r < 2100) return 'rating_advanced';
	if (r < 2400) return 'rating_expert';
	return 'rating_master';
}

export function tags(themes, openings, rating, popularity, fen) {
	const t = new Set(themes ? themes.split(' ') : []);
	if (openings) for (const o of openings.split(' ')) t.add(o);
	t.add(rating_band(rating));
	t.add(fen.split(' ')[1] === 'w' ? 'solve_black' : 'solve_white');
	if (popularity >= 90) t.add('popular');
	return [...t];
}

export function cutoff(hist, k) {
	let n = 0;
	for (let v = 100; v >= -100; v--) {
		n += hist[v] ?? 0;
		if (n >= k) return v;
	}
	return -100;
}

async function stream(csv, fn) {
	const rl = createInterface({ input: createReadStream(csv), crlfDelay: Infinity });
	for await (const line of rl) {
		if (line.startsWith('PuzzleId,')) continue;
		fn(line);
	}
}

function escape(s) {
	return s.replaceAll("'", "''");
}

function writer(dir, prefix) {
	let buf = [];
	let rows = 0;
	let files = 0;
	let stmts = 0;
	function flush() {
		if (!buf.length) return;
		writeFileSync(`${dir}/${prefix}_${String(files).padStart(3, '0')}.sql`, buf.join('\n') + '\n');
		buf = [];
		files++;
	}
	return {
		push(sql) {
			buf.push(sql);
			stmts++;
			if (stmts === 200) flush();
		},
		flush,
		rows(n) {
			rows += n;
			if (rows >= 50000) {
				flush();
				rows = 0;
			}
		}
	};
}

async function main() {
	const csv = process.argv[2] || `${process.env.HOME}/Downloads/lichess_db_puzzle.csv`;
	const dir = 'scripts/out';
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });

	writeFileSync(
		`${dir}/00_schema.sql`,
		'create table if not exists puz (i integer primary key, f text not null, m text not null, r integer not null, v integer not null, t text not null);\n' +
			'create table if not exists puz_t (t text not null, i integer not null, primary key (t, i)) without rowid;\n' +
			'create index if not exists puz_rv on puz(r, v);\n'
	);
	writeFileSync(`${dir}/90_analyze.sql`, 'analyze;\n');

	const h = {};
	const oh = {};
	let total = 0;

	await stream(csv, (line) => {
		const c = line.split(',');
		total++;
		const themes = c[7];
		const openings = c[9];
		const band = rating_band(Number(c[3]));
		const pop = Number(c[5]);
		if (themes) {
			for (const t of themes.split(' ')) {
				if (!t) continue;
				const k = t + '|' + band;
				(h[k] ??= {})[pop] = (h[k][pop] ?? 0) + 1;
			}
		} else {
			const k = '_none|' + band;
			(h[k] ??= {})[pop] = (h[k][pop] ?? 0) + 1;
		}
		if (openings) {
			for (const o of openings.split(' ')) {
				if (!o) continue;
				(oh[o] ??= {})[pop] = (oh[o][pop] ?? 0) + 1;
			}
		}
	});
	for (const [k, hist] of Object.entries(h)) h[k] = cutoff(hist, BAND_TOP);
	for (const [o, hist] of Object.entries(oh)) oh[o] = cutoff(hist, OPENING_TOP);

	const puz = writer(dir, '10_puz');
	const tags_w = writer(dir, '20_tag');
	let kept = 0;

	await stream(csv, (line) => {
		const c = line.split(',');
		const i = point_id(c[0]);
		const fen = c[1];
		const moves = c[2];
		const r = Number(c[3]);
		const v = Number(c[5]);
		const themes = c[7];
		const openings = c[9];
		const tlist = tags(themes, openings, r, v, fen);
		const band = rating_band(r);
		let keep = false;
		if (themes) {
			for (const t of themes.split(' ')) {
				if (t && v >= h[t + '|' + band]) {
					keep = true;
					break;
				}
			}
		} else if (v >= h['_none|' + band]) {
			keep = true;
		}
		if (!keep && openings) {
			for (const o of openings.split(' ')) {
				if (o && v >= oh[o]) {
					keep = true;
					break;
				}
			}
		}
		if (!keep) return;
		kept++;
		const f = escape(fen);
		const m = escape(moves);
		const t = escape(tlist.join(' '));
		puz.push(
			`insert or replace into puz (i,f,m,r,v,t) values (${i},'${f}','${m}',${r},${v},'${t}');`
		);
		for (const tg of tlist) {
			tags_w.push(`insert or replace into puz_t (t,i) values ('${escape(tg)}',${i});`);
		}
		puz.rows(1);
		tags_w.rows(1);
	});
	puz.flush();
	tags_w.flush();
	console.log(`kept ${kept} of ${total}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
