// Builds the e4 piece set: flat angled silhouettes, cutouts via evenodd.
import { mkdirSync, writeFileSync } from 'node:fs';

const plinth = 'M22 90L78 90L78 85L73 80L27 80L22 85Z';
const band = 'M32 67L68 67L70 75L30 75Z';
const d: Record<string, string> = {
	P: 'M45 18L55 18L62 25L62 35L55 42L45 42L38 35L38 25Z M44 47L56 47L66 75L34 75Z',
	R: 'M28 16L38 16L38 23L45 23L45 16L55 16L55 23L62 23L62 16L72 16L72 32L28 32Z M33 37L67 37L70 75L30 75Z',
	B: 'M50 5L55 10L50 15L45 10Z M50 19L64 37L64 52L56 62L44 62L36 52L36 37Z M56 29L60 33L48 45L44 41Z ' + band,
	N: 'M50 9L57 21L65 30L70 44L70 75L30 75L34 62L46 50L38 49L26 54L18 48L18 42L36 24L44 21Z M38 33L48 29L47 32L39 35Z',
	Q: 'M22 22L34 40L37 14L45 36L50 8L55 36L63 14L66 40L78 22L70 62L30 62Z ' + band,
	K: 'M47 4L53 4L53 10L59 10L59 16L53 16L53 22L47 22L47 16L41 16L41 10L47 10Z M26 27L74 27L66 62L34 62Z ' + band
};
const c = { w: ['#f6f3ee', '#14121f'], b: ['#1b1926', '#ece7f1'] };
const out = 'static/pieces/e4';
mkdirSync(out, { recursive: true });
for (const [s, [f, k]] of Object.entries(c))
	for (const [p, path] of Object.entries(d))
		writeFileSync(`${out}/${s}${p}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${path} ${plinth}" fill="${f}" fill-rule="evenodd" stroke="${k}" stroke-width="2.4" stroke-linejoin="miter"/></svg>`);
