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
const base = (w: number): S[] => [[w + 6, 84], [w + 8, 85, w + 8, 87, w + 8, 89], [w + 8, 92, w + 6, 93, w + 3, 93], [50, 93]];
const skirt = (x: number, y: number, w: number): S[] => [[x, y + 14, w - 2, 78, w + 6, 84]];
const d: Record<string, string> = {
	P: lathe(40, [[54, 40], ...skirt(55, 50, 62), ...base(62)]) + circ(50, 30, 11),
	R: lathe(16, [[56, 16], [56, 22], [62, 22], [62, 16], [69, 16], [69, 30], [69, 32, 67, 33, 63, 34], ...skirt(63, 52, 64), ...base(64)]),
	B: lathe(15, [[63, 24, 66, 38, 58, 50], [57, 51, 56, 52, 56, 53], ...skirt(56, 56, 62), ...base(62)]) + circ(50, 10, 4.2),
	Q: lathe(12, [[58, 28], [69, 15], [66, 32, 60, 44, 58, 52], ...skirt(58, 56, 64), ...base(64)]) + [[50, 12, 4.6], [69, 15.5, 4.2], [31, 15.5, 4.2]].map(([x, y, r]) => circ(x, y, r)).join(''),
	K: lathe(4, [[53, 4], [53, 9], [58, 9], [58, 14], [53, 14], [53, 20], [64, 18, 72, 23, 70, 33], [68, 41, 61, 47, 58, 52], ...skirt(58, 56, 64), ...base(64)]),
	N: T('M64 93L28 93C24 93 22 91 22 89C22 85 25 82 30 81C30 74 33 66 40 60C45 56 48 52 46 47C40 50 34 52 28 53C23 54 18 51 17 46C16 42 19 38 24 34C31 28 36 22 40 17L39 9L46 14C50 12 54 11 57 12L60 6L63 14C74 21 80 36 80 52C80 64 77 74 74 81C78 82 80 85 80 89C80 91 78 93 75 93Z')
};
// knight shade: back of the neck
const shade: Record<string, string> = { N: T('M60 14C72 22 78 38 78 52C78 64 75 74 72 81L62 81C66 70 68 58 66 44C64 30 60 22 56 16Z') };
const slit = T('M57 27L46 38');
const eye = T('M37 27C40 25 44 25 46 27C43 29 40 29 37 27Z');
const c = { w: ['#f8f4ec', '#d8cfc1', '#16131f'], b: ['#2a2638', '#1a1724', '#d9d0e6'] };
const out = 'static/pieces/e4';
mkdirSync(out, { recursive: true });
for (const [s, [f1, f2, k]] of Object.entries(c))
	for (const [p, path] of Object.entries(d)) {
		const sh = shade[p] ? `<path d="${shade[p]}" fill="${f2}"/>` : `<rect x="50" width="50" height="100" fill="${f2}" clip-path="url(#c)"/>`;
		const ey = p == 'N' ? `<path d="${eye}" fill="${k}"/>` : '';
		writeFileSync(`${out}/${s}${p}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><path d="${path}"/></clipPath><path d="${path}" stroke="${k}" stroke-width="4.4" stroke-linejoin="round"/><path d="${path}" fill="${f1}"/>${sh}${ey}${p == 'B' ? `<path d="${slit}" stroke="${k}" stroke-width="2.6" stroke-linecap="round"/>` : ''}</svg>`);
	}
