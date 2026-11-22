// Builds the e4 piece set. Symmetric pieces are lathe profiles: we draw the
// right half top-to-bottom and mirror it. The right half gets a shade tone.
import { mkdirSync, writeFileSync } from 'node:fs';

type S = number[]; // [x,y] line, [c1x,c1y,c2x,c2y,x,y] cubic
const f = (n: number) => +n.toFixed(2);
const m = (x: number) => 100 - x;
const lathe = (top: number, h: S[]) => {
	const p = [[50, top], ...h.map((s) => s.slice(-2))];
	let d = `M50 ${top}`;
	for (const s of h) d += s.length == 2 ? `L${s.map(f).join(' ')}` : `C${s.map(f).join(' ')}`;
	for (let i = h.length - 1; i >= 0; i--) {
		const s = h[i], [x, y] = p[i];
		d += s.length == 2 ? `L${f(m(x))} ${f(y)}` : `C${f(m(s[2]))} ${f(s[3])} ${f(m(s[0]))} ${f(s[1])} ${f(m(x))} ${f(y)}`;
	}
	return d + 'Z';
};
const base = (y: number, w: number): S[] => [
	[w - 6, y], [w - 2, y, w - 2, y + 4, w - 4, y + 5], [w + 3, y + 9, w + 4, y + 12, w + 4, 89], [w + 4, 92, w + 2, 93, w - 1, 93], [50, 93]
];
const ball = (cy: number, r: number, ny: number, nx: number): S[] => {
	const k = r * 0.5523;
	return [[50 + k, cy - r, 50 + r, cy - k, 50 + r, cy], [50 + r, cy + r * 0.6, nx + 3, ny - 1, nx, ny]];
};
const circ = (x: number, y: number, r: number) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const d: Record<string, string> = {
	P: lathe(18, [...ball(29, 11, 41, 55), [62, 42, 63, 45, 56, 46.5], [57, 60, 60, 70, 68, 76], ...base(76, 74)]),
	R: lathe(14, [[57, 14], [57, 20], [62, 20], [62, 14], [70, 14], [70, 27], [70, 30, 67, 31, 63, 32], [63, 50, 64, 64, 69, 72], ...base(72, 75)]),
	B: lathe(5, [...ball(10, 5, 15, 52), [64, 24, 66, 34, 62, 44], [60, 50, 56, 52, 56, 53], [63, 54, 63, 58, 56, 59], [56, 66, 60, 72, 67, 76], ...base(76, 74)]),
	Q: lathe(10, [[55, 24], [60, 11], [64, 25], [71, 15], [68, 30, 63, 42, 61, 49], [60, 51, 58, 52, 58, 52], [65, 53, 65, 58, 58, 59], [58, 66, 62, 72, 69, 76], ...base(76, 76)]) + [[50, 8, 4.2], [60, 9.5, 3.4], [40, 9.5, 3.4], [71, 13.5, 3.4], [29, 13.5, 3.4]].map(([x, y, r]) => circ(x, y, r)).join(''),
	K: lathe(4, [[53, 4], [53, 9], [58, 9], [58, 14], [53, 14], [53, 20], [64, 18, 74, 22, 72, 32], [70, 40, 64, 46, 62, 50], [60, 52, 58, 52, 58, 52], [65, 53, 65, 58, 58, 59], [58, 66, 62, 72, 69, 76], ...base(76, 76)]),
	N: 'M64 93L28 93C24 93 22 91 22 89C22 85 25 82 30 81C30 74 33 66 40 60C45 56 48 52 46 47C40 50 34 52 28 53C23 54 18 51 17 46C16 42 19 38 24 34C31 28 36 22 40 17L39 9L46 14C50 12 54 11 57 12L60 6L63 14C74 21 80 36 80 52C80 64 77 74 74 81C78 82 80 85 80 89C80 91 78 93 75 93Z'
};
// knight shade: back of the neck
const shade: Record<string, string> = { N: 'M60 14C72 22 78 38 78 52C78 64 75 74 72 81L62 81C66 70 68 58 66 44C64 30 60 22 56 16Z' };
const slit = 'M57 27L46 38';
const eye = 'M37 27C40 25 44 25 46 27C43 29 40 29 37 27Z';
const c = { w: ['#f8f4ec', '#d8cfc1', '#16131f'], b: ['#2a2638', '#1a1724', '#d9d0e6'] };
const out = 'static/pieces/e4';
mkdirSync(out, { recursive: true });
for (const [s, [f1, f2, k]] of Object.entries(c))
	for (const [p, path] of Object.entries(d)) {
		const sh = shade[p] ? `<path d="${shade[p]}" fill="${f2}"/>` : `<rect x="50" width="50" height="100" fill="${f2}" clip-path="url(#c)"/>`;
		const ey = p == 'N' ? `<path d="${eye}" fill="${k}"/>` : '';
		writeFileSync(`${out}/${s}${p}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><path d="${path}"/></clipPath><path d="${path}" stroke="${k}" stroke-width="4.4" stroke-linejoin="round"/><path d="${path}" fill="${f1}"/>${sh}${ey}${p == 'B' ? `<path d="${slit}" stroke="${k}" stroke-width="2.6" stroke-linecap="round"/>` : ''}</svg>`);
	}
