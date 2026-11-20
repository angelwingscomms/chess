// checks lesson levels with stockfish: good moves a level would refuse, and computer replies far from the best.
// run: node scripts/check_lessons.ts [stage key]. teaching levels (castling, the opening) flag harmless alternatives.
import { spawn } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { STAGES } from '../src/lib/learn/lessons.ts';

// the engine is an old commonjs file, and this package is esm, so it runs from a copy named .cjs
const dir = mkdtempSync(join(tmpdir(), 'sf-'));
const eng = new URL('../static/engine/10/', import.meta.url).pathname;
copyFileSync(eng + 'stockfish.js', join(dir, 'sf.cjs'));
copyFileSync(eng + 'stockfish.wasm', join(dir, 'stockfish.wasm'));
const sf = spawn('node', [join(dir, 'sf.cjs')]);
let buf = '';
let wait: ((s: string) => void) | null = null;
let acc: string[] = [];
sf.stdout.on('data', (d) => {
	buf += d;
	let i;
	while ((i = buf.indexOf('\n')) >= 0) {
		const line = buf.slice(0, i).trim();
		buf = buf.slice(i + 1);
		acc.push(line);
		if (line.startsWith('bestmove') && wait) {
			const w = wait;
			wait = null;
			w(acc.join('\n'));
			acc = [];
		}
	}
});
const send = (s: string) => sf.stdin.write(s + '\n');
send('uci');
send('setoption name MultiPV value 8');

// score from the side to move, in centipawns; mate = 100000 - plies
async function analyse(fen: string, depth = 14) {
	acc = [];
	send('ucinewgame');
	send('position fen ' + fen);
	send('go depth ' + depth);
	const out = await new Promise<string>((r) => (wait = r));
	const best = new Map<string, number>();
	for (const l of out.split('\n')) {
		const m = l.match(/ multipv (\d+) score (cp|mate) (-?\d+).* pv (\S+)/);
		if (!m || !l.includes(` depth ${depth} `)) continue;
		const v = m[2] === 'cp' ? +m[3] : +m[3] > 0 ? 100000 - +m[3] : -100000 - +m[3];
		best.set(m[4].slice(0, 4), v);
	}
	return new Map([...best].sort((a, b) => b[1] - a[1]));
}

const only = process.argv[2];
const problems: string[] = [];
for (const t of STAGES) {
	if (only && t.k !== only) continue;
	for (const [i, l] of t.l.entries()) {
		const id = `${t.k}-${i}`;
		if (l.g === 's' || l.g === 'c' || l.g === 'k' || l.g === 'e') continue;
		const c = new Chess(l.f);
		const steps = l.a ?? [''];
		for (let s = 0; s < steps.length; s += 2) {
			const scores = await analyse(c.fen());
			const top = Math.max(...scores.values());
			const ok = steps[s] ? steps[s].split('|') : [];
			if (ok.length) {
				const okv = Math.min(...ok.map((m) => scores.get(m) ?? -Infinity));
				const rejected = [...scores].filter(([m, v]) => !ok.includes(m) && v >= okv - 60 && v > -500);
				if (rejected.length) problems.push(`${id} step ${s}: also good ${rejected.map(([m, v]) => `${m}(${v})`).join(' ')}; asked ${ok.map((m) => `${m}(${scores.get(m)})`).join(' ')}`);
				if (okv < top - 150) problems.push(`${id} step ${s}: asked move weaker than best ${[...scores][0].join(':')}; asked ${okv}`);
			} else if (l.g === 'm') {
				if (top < 99990) problems.push(`${id}: no mate in one (${top})`);
			}
			if (!steps[s]) break;
			const u = ok[0];
			c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: 'q' });
			if (s + 1 < steps.length) {
				const r = steps[s + 1];
				const sc = await analyse(c.fen());
				const rtop = Math.max(...sc.values());
				const rv = sc.get(r);
				if (rv === undefined || rv < rtop - 100) problems.push(`${id} reply ${r}: ${rv} vs best ${[...sc][0].join(':')}`);
				c.move({ from: r.slice(0, 2), to: r.slice(2, 4), promotion: 'q' });
			}
		}
	}
}
console.log(problems.join('\n') || 'all good');
sf.kill();
rmSync(dir, { recursive: true });
