// Builds the e4 piece set. Symmetric pieces are lathe profiles: we draw the
// right half top-to-bottom and mirror it, then stretch wide and squat (T).
// Round parts are circles added after T so they stay round.
import { mkdirSync, writeFileSync } from 'node:fs';

type S = number[]; // [x,y] line, [c1x,c1y,c2x,c2y,x,y] cubic
const f = (n: number) => +n.toFixed(2);
const tx = (x: number) => f(50 + (x - 50) * 1.16);
const ty = (y: number) => f(93 - (93 - y) * 0.84);
const T = (d: string) => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `${tx(+x)} ${ty(+y)}`);
const lathe = (top: number, h: S[]) => {
	const p = [[50, top], ...h.map((s) => s.slice(-2))];
	let d = `M50 ${top}`;
	for (const s of h) d += s.length == 2 ? `L${s.join(' ')}` : `C${s.join(' ')}`;
	for (let i = h.length - 1; i >= 0; i--) {
		const s = h[i], [x, y] = p[i];
		d += s.length == 2 ? `L${100 - x} ${y}` : `C${100 - s[2]} ${s[3]} ${100 - s[0]} ${s[1]} ${100 - x} ${y}`;
	}
	return T(d + 'Z');
};
const circ = (x: number, y: number, r: number) => `M${tx(x) - r} ${ty(y)}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0Z`;
// one concave flare from neck (x,y) to a thin rounded lip at half-width w
const flare = (x: number, y: number, w: number): S[] => [[x, y + (88 - y) * 0.6, w - 8, 88, w, 88], [w + 3, 88, w + 3, 93, w, 93], [50, 93]];
const d: Record<string, string> = {
	P: lathe(46, [[56.5, 46], [56.5, 49], ...flare(56.5, 49, 66)]) + circ(50, 36, 11.5),
	R: lathe(16, [[56, 16], [56, 22], [62, 22], [62, 16], [69, 16], [69, 30], [69, 32, 67, 33, 64, 35], [63, 62], ...flare(63, 62, 70)]),
	B: lathe(19, [[61, 24, 65, 37, 60, 48], [58, 50, 56, 52, 56, 54], ...flare(56, 54, 67)]) + circ(50, 14, 4.2),
	Q: lathe(13, [[58, 27], [68, 17], [68, 34, 61, 50, 59, 61], ...flare(59, 61, 70)]) + [[50, 12, 4.6], [68, 15.5, 4.2], [32, 15.5, 4.2]].map(([x, y, r]) => circ(x, y, r)).join(''),
	K: lathe(4, [[53, 4], [53, 9], [58, 9], [58, 14], [53, 14], [53, 22], [60, 22, 67, 23, 68, 27], [68, 36, 62, 50, 60, 60], ...flare(60, 60, 70)]),
	// drawn in final space: slim arched neck, small head, one ear
	N: 'M56 24C58 27 59 30 60 32C68 37 74 48 74 60C74 71 71 79 70 84C73 85 74 87 74 90C74 92.5 73 93 70 93L30 93C27 93 26 92.5 26 90C26 87 27 85 30 84C31 77 35 71 42 67C48 64 52 60 50 56C44 58 36 61 30 61C24 61 22 57 23 53C25 48 36 40 44 36C48 34 51 32 52 30C53 28 54 25 56 24Z'
};
// knight shade: back of the neck
const shade: Record<string, string> = { N: 'M60 32C68 37 74 48 74 60C74 71 71 79 70 84L63 84C64 77 66 69 66 60C66 49 62 41 57 36Z' };
const slit = T('M57 30L46 41');
const c = { w: ['#f8f4ec', '#d8cfc1', '#16131f'], b: ['#2a2638', '#1a1724', '#d9d0e6'] };
const out = 'static/pieces/e4';
mkdirSync(out, { recursive: true });
for (const [s, [f1, f2, k]] of Object.entries(c))
	for (const [p, path] of Object.entries(d)) {
		const sh = shade[p] ? `<path d="${shade[p]}" fill="${f2}"/>` : `<rect x="50" width="50" height="100" fill="${f2}" clip-path="url(#c)"/>`;
		writeFileSync(`${out}/${s}${p}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><path d="${path}"/></clipPath><path d="${path}" stroke="${k}" stroke-width="4.4" stroke-linejoin="round"/><path d="${path}" fill="${f1}"/>${sh}${p == 'B' ? `<path d="${slit}" stroke="${k}" stroke-width="2.6" stroke-linecap="round"/>` : ''}</svg>`);
	}
