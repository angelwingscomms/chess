#!/usr/bin/env node
// usage: node scripts/perf.mjs <metric> <route> [selector, css only] [key<=n | key>=n | key=v | key~s | key!~s ...]
// run `pnpm build` first: this serves the last build. phone = 360x800 at DPR 2, CPU 4x slower, real GPU.
//   idle, active  busy ms per second of main, cc, viz, gpu threads; fps, draws (field draws/s), forced (layout ms/s), dom, cw (field canvas width). active moves the pointer
//   bytes         gz bytes by type (js css font img doc engine other total) of requests started before load + 2 s; requests, third_party
//   engine        route = worker script url: startup, search (ms to depth 13), nps, nodes, best
//   field         ms per frame of the real make_field at 1080x2400
//   same          mean, p999, max pixel diff (0-255) between scripts/field/v1.ts and src/lib/landing/field.ts over 7 scenes
//   load          lighthouse 13.5.0 median: score fcp lcp tbt si tti
//   css           <route> <selector>, then the computed props named in the asserts
//   fonts         families (loaded font families), loaded
//   offline       sw (a service worker took control), ok (the board renders with the network off)
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright-core';

const [metric, route = '/', ...rest] = process.argv.slice(2);
const selector = metric === 'css' ? rest.shift() : '';
const asserts = rest;
const runs = +(process.env.PERF_RUNS || 3);
const chrome = process.env.CHROME_PATH || '/usr/bin/chromium';
// the real GPU: chrome no longer falls back to SwiftShader for WebGL (M139), so the field needs this
const gpu_flags = ['--enable-gpu', '--use-angle=gl-egl', '--ignore-gpu-blocklist'];
const phone = {
	viewport: { width: 360, height: 800 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true,
	userAgent: 'Mozilla/5.0 (Linux; Android 15; TECNO KM5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36'
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const round = (x) => Math.round(x * 10) / 10;

const free_port = () =>
	new Promise((ok) => {
		const s = createServer().listen(0, '127.0.0.1', () => {
			const { port } = s.address();
			s.close(() => ok(port));
		});
	});

// its own preview every time: a server started before a build serves the old file list
async function serve() {
	const port = await free_port();
	const p = spawn('pnpm', ['exec', 'vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { detached: true, stdio: 'ignore' });
	const stop = () => {
		try {
			process.kill(-p.pid, 'SIGTERM');
		} catch {}
	};
	process.on('exit', stop);
	const base = `http://127.0.0.1:${port}`;
	for (let i = 0; i < 240; i++) {
		try {
			if ((await fetch(base + '/robots.txt')).ok) return base;
		} catch {}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw Error('preview did not start in 120 s');
}

async function open(base, { gpu = true, throttle = 4, desktop = false } = {}) {
	const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new', ...(gpu ? gpu_flags : [])] });
	const ctx = await browser.newContext(desktop ? { viewport: { width: 1400, height: 900 } } : phone);
	await ctx.addInitScript(() => {
		try {
			localStorage.setItem('e4_tour_done', '1');
		} catch {}
		window.__frames = 0;
		window.__draws = 0;
		const tick = () => {
			window.__frames++;
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
		const draw = WebGLRenderingContext.prototype.drawArrays;
		WebGLRenderingContext.prototype.drawArrays = function (...a) {
			window.__draws++;
			return draw.apply(this, a);
		};
	});
	const page = await ctx.newPage();
	const cdp = await ctx.newCDPSession(page);
	if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
	return { browser, ctx, page, base };
}

async function need_gpu(page) {
	const r = await page.evaluate(() => {
		const gl = document.createElement('canvas').getContext('webgl');
		const d = gl?.getExtension('WEBGL_debug_renderer_info');
		return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '';
	});
	if (!r || /swiftshader/i.test(r)) {
		console.error(`no GPU WebGL (renderer: "${r}"): the field cannot run, so frame numbers would be wrong`);
		process.exit(2);
	}
	return r;
}

// per-second busy time of the threads that draw a frame, from a 5 s trace after an 8 s settle
async function frames(base, moving) {
	const out = [];
	for (let i = 0; i < runs; i++) {
		const { browser, page } = await open(base);
		await page.goto(base + route, { waitUntil: 'load', timeout: 120000 });
		const renderer = await need_gpu(page);
		await page.waitForTimeout(8000);
		const c0 = await page.evaluate(() => [window.__frames, window.__draws]);
		await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink', 'cc', 'gpu', 'viz'] });
		const t0 = Date.now();
		if (moving) for (let k = 0; Date.now() - t0 < 5000; k++) await page.mouse.move(40 + ((k * 23) % 280), 120 + ((k * 37) % 560), { steps: 2 });
		else await page.waitForTimeout(5000);
		const secs = (Date.now() - t0) / 1000;
		const c1 = await page.evaluate(() => [window.__frames, window.__draws]);
		const info = await page.evaluate(() => ({ dom: document.getElementsByTagName('*').length, cw: document.querySelector('canvas[data-on]')?.width ?? 0 }));
		const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents;
		await browser.close();
		const names = {};
		for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') names[`${e.pid}:${e.tid}`] = e.args.name;
		const busy = {};
		let forced = 0;
		for (const e of ev) {
			const n = names[`${e.pid}:${e.tid}`];
			if (e.ph !== 'X' || !e.dur || !n) continue;
			if (e.name === 'ThreadControllerImpl::RunTask' || e.name === 'RunTask') busy[n] = (busy[n] || 0) + e.dur;
			if (n === 'CrRendererMain' && e.name === 'Blink.ForcedStyleAndLayout.UpdateTime') forced += e.dur;
		}
		const per = (us = 0) => us / 1000 / secs;
		out.push({ fps: (c1[0] - c0[0]) / secs, draws: (c1[1] - c0[1]) / secs, main: per(busy.CrRendererMain), cc: per(busy.Compositor), viz: per(busy.VizCompositorThread), gpu: per(busy.CrGpuMain), forced: per(forced), ...info, renderer });
	}
	const r = {};
	for (const k of Object.keys(out[0])) r[k] = typeof out[0][k] === 'number' ? round(median(out.map((o) => o[k]))) : out[0][k];
	return r;
}

// gzip bytes of everything the first view fetches: requests started before load + 2 s
async function bytes(base) {
	const { browser, page } = await open(base, { gpu: true, throttle: 1 });
	const seen = [];
	let open_until = Infinity;
	page.on('response', async (res) => {
		if (Date.now() > open_until) return;
		const url = res.url();
		const type = res.request().resourceType();
		let body = Buffer.alloc(0);
		try {
			body = await res.body();
		} catch {}
		seen.push({ url, type, gz: body.length ? gzipSync(body, { level: 9 }).length : 0, own: url.startsWith(base) });
	});
	await page.goto(base + route, { waitUntil: 'load', timeout: 120000 });
	open_until = Date.now() + 2000;
	await page.waitForTimeout(4000);
	await browser.close();
	const r = { js_gz: 0, css_gz: 0, font_gz: 0, img_gz: 0, doc_gz: 0, engine_gz: 0, other_gz: 0, total_gz: 0, requests: seen.length, third_party: 0 };
	for (const s of seen) {
		const k = /stockfish|\/engine\//.test(s.url) ? 'engine' : { script: 'js', stylesheet: 'css', font: 'font', image: 'img', document: 'doc' }[s.type] ?? 'other';
		r[`${k}_gz`] += s.gz;
		r.total_gz += s.gz;
		if (!s.own && !s.url.startsWith('data:')) r.third_party++;
	}
	if (process.env.PERF_VERBOSE) for (const s of seen.sort((a, b) => b.gz - a.gz)) console.error(String(s.gz).padStart(8), s.type.padEnd(10), s.url.replace(base, ''));
	return r;
}

// a fixed search in a fresh worker; workers are not slowed by the CPU throttle, so none is set
async function engine(base) {
	const out = [];
	for (let i = 0; i < runs; i++) {
		const { browser, page } = await open(base, { gpu: false, throttle: 1 });
		await page.goto(base + '/robots.txt');
		out.push(
			await page.evaluate(
				(file) =>
					new Promise((ok, fail) => {
						const t0 = performance.now();
						let ready = 0;
						let go = 0;
						let last = '';
						const w = new Worker(file);
						w.onerror = (e) => fail(String(e.message));
						w.onmessage = ({ data }) => {
							const d = String(data);
							if (d === 'uciok') w.postMessage('isready');
							else if (d === 'readyok' && !ready) {
								ready = performance.now() - t0;
								go = performance.now();
								w.postMessage('position startpos moves e2e4 e7e5 g1f3 b8c6 f1b5');
								w.postMessage('go depth 13');
							} else if (d.startsWith('info depth')) last = d;
							else if (d.startsWith('bestmove')) {
								w.terminate();
								ok({ startup: ready, search: performance.now() - go, nps: +(last.match(/nps (\d+)/)?.[1] ?? 0), nodes: +(last.match(/nodes (\d+)/)?.[1] ?? 0), best: d.split(' ')[1] });
							}
						};
						w.postMessage('uci');
					}),
				route
			)
		);
		await browser.close();
	}
	return { startup: round(median(out.map((o) => o.startup))), search: round(median(out.map((o) => o.search))), nps: median(out.map((o) => o.nps)), nodes: out[0].nodes, best: out[0].best };
}

// the real make_field from src/lib/landing/field.ts, drawing a phone-sized 1080x2400 frame, synced by a 1 px read
async function field(base) {
	const src = stripTypeScriptTypes(readFileSync('src/lib/landing/field.ts', 'utf8')).replace(/^export /gm, '');
	const out = [];
	for (let i = 0; i < runs; i++) {
		const { browser, page } = await open(base, { gpu: true, throttle: 1, desktop: true });
		await need_gpu(page);
		await page.addScriptTag({ content: `${src}\nwindow.__make_field = make_field;` });
		out.push(
			await page.evaluate(() => {
				const c = document.createElement('canvas');
				// q is 0.8 with a fine pointer at dpr 1, so css 1350x3000 gives 1080x2400 pixels
				c.style.cssText = 'position:fixed;left:0;top:0;width:1350px;height:3000px';
				document.body.append(c);
				const f = window.__make_field(c);
				const gl = c.getContext('webgl');
				const px = new Uint8Array(4);
				const p = new Float32Array([0.11, 0.09, 0.2, 0.23, 0.19, 0.38, 0.45, 0.31, 0.47, 0.82, 0.55, 0.42, 0.05, 0.04, 0.07]);
				const frame = (t) => ({ t, b: 0.6, x: 675, y: 900, s: 1080, k: 0, m: 0, h: 0, l: 0, p, c: [675, 1500, 0.3], q: [4, 4, 0.5] });
				const time = (n) => {
					const t0 = performance.now();
					for (let k = 0; k < n; k++) {
						f.draw(frame(k / 60));
						gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
					}
					return (performance.now() - t0) / n;
				};
				time(10);
				return { ms: time(40), w: c.width, h: c.height };
			})
		);
		await browser.close();
	}
	return { ms: round(median(out.map((o) => o.ms))), w: out[0].w, h: out[0].h };
}

// the frozen field (scripts/field/v1.ts, 2026-10-06) against the current one: same frames, compared pixel by pixel (0-255)
async function same(base) {
	const load = (file, name) => `window.${name} = (() => { ${stripTypeScriptTypes(readFileSync(file, 'utf8')).replace(/^export /gm, '')}; return make_field; })();`;
	const { browser, page } = await open(base, { gpu: true, throttle: 1, desktop: true });
	await need_gpu(page);
	await page.addScriptTag({ content: `${load('scripts/field/v1.ts', '__ref')}\n${load('src/lib/landing/field.ts', '__cur')}` });
	const r = await page.evaluate(() => {
		const p = new Float32Array([0.11, 0.09, 0.2, 0.23, 0.19, 0.38, 0.45, 0.31, 0.47, 0.82, 0.55, 0.42, 0.05, 0.04, 0.07]);
		const board = { t: 12.3, b: 0.6, x: 337, y: 330, s: 560, k: 0, m: 0, h: 0, l: 0, p, c: [337, 1000, 0.3], q: [4, 4, 0.5] };
		const scenes = [
			board,
			{ ...board, l: 1, b: 0.1 },
			{ ...board, t: 40, x: 337, y: 900, s: 1950, k: 1, m: 1, c: [0, 0, 0], q: [0, 0, 0] },
			{ ...board, t: 75, y: 600, s: 900, k: 0.5, m: 0.6, b: 0.9 },
			{ ...board, h: 1 },
			{ ...board, t: 240, l: 0.5 },
			{ ...board, rip: 1 }
		];
		// one clock for both fields, so ripple ages match to the microsecond
		let clock = 1000;
		performance.now = () => clock;
		const make = (f) => {
			const c = document.createElement('canvas');
			c.style.cssText = 'position:fixed;left:0;top:0;width:675px;height:1500px';
			document.body.append(c);
			return { c, f: f(c), gl: c.getContext('webgl') };
		};
		const a = make(window.__ref);
		const b = make(window.__cur);
		if (a.c.width !== b.c.width || a.c.height !== b.c.height) return { mean: 255, p999: 255, max: 255, size: `${b.c.width}x${b.c.height} vs ${a.c.width}x${a.c.height}` };
		const n = a.c.width * a.c.height * 4;
		const pa = new Uint8Array(n);
		const pb = new Uint8Array(n);
		const hist = new Float64Array(256);
		let sum = 0;
		let count = 0;
		for (const s of scenes) {
			if (s.rip) {
				for (const x of [a, b]) x.f.ripple(200, 700, 1);
				clock += 800;
			}
			for (const [x, px] of [[a, pa], [b, pb]]) {
				x.f.draw(s);
				x.gl.readPixels(0, 0, x.c.width, x.c.height, x.gl.RGBA, x.gl.UNSIGNED_BYTE, px);
			}
			for (let i = 0; i < n; i++) {
				if (i % 4 === 3) continue;
				const d = Math.abs(pa[i] - pb[i]);
				hist[d]++;
				sum += d;
				count++;
			}
		}
		let max = 0;
		let p999 = -1;
		let acc = 0;
		for (let d = 0; d < 256; d++) {
			if (hist[d]) max = d;
			acc += hist[d];
			if (p999 < 0 && acc >= count * 0.999) p999 = d;
		}
		return { mean: sum / count, p999, max, size: `${a.c.width}x${a.c.height}`, scenes: scenes.length };
	});
	await browser.close();
	return { ...r, mean: Math.round(r.mean * 1000) / 1000 };
}

// lighthouse mobile defaults (simulated 4x CPU, 150 ms RTT, 1.6 Mbps), with the GPU so the field runs
async function load(base) {
	const dir = mkdtempSync(join(tmpdir(), 'e4-lh-'));
	const out = [];
	for (let i = 0; i < runs; i++) {
		const file = join(dir, `${i}.json`);
		const r = spawnSync('pnpm', ['dlx', 'lighthouse@13.5.0', base + route, '--quiet', '--only-categories=performance', '--output=json', `--output-path=${file}`, `--chrome-flags=--headless=new ${gpu_flags.join(' ')}`, '--max-wait-for-load=60000'], { env: { ...process.env, CHROME_PATH: chrome }, encoding: 'utf8', timeout: 240000 });
		if (r.status !== 0) throw Error(`lighthouse failed: ${r.stderr?.slice(-400)}`);
		const a = JSON.parse(readFileSync(file, 'utf8'));
		const v = (k) => a.audits[k].numericValue;
		out.push({ score: a.categories.performance.score * 100, fcp: v('first-contentful-paint'), lcp: v('largest-contentful-paint'), tbt: v('total-blocking-time'), si: v('speed-index'), tti: v('interactive') });
	}
	rmSync(dir, { recursive: true, force: true });
	const r = {};
	for (const k of Object.keys(out[0])) r[k] = Math.round(median(out.map((o) => o[k])));
	return r;
}

async function css(base) {
	const { browser, page } = await open(base, { throttle: 1 });
	await page.goto(base + route, { waitUntil: 'load', timeout: 120000 });
	await page.waitForSelector(selector, { state: 'attached', timeout: 30000 });
	await page.waitForTimeout(1500);
	const props = asserts.map((a) => a.split(/!?~|<=|>=|=/)[0]);
	const r = await page.evaluate(([sel, ps]) => {
		const cs = getComputedStyle(document.querySelector(sel));
		return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
	}, [selector, props]);
	await browser.close();
	return r;
}

async function fonts(base) {
	const { browser, page } = await open(base, { throttle: 1 });
	await page.goto(base + route, { waitUntil: 'load', timeout: 120000 });
	await page.waitForTimeout(4000);
	const r = await page.evaluate(() => {
		const f = [...new Set([...document.fonts].filter((x) => x.status === 'loaded').map((x) => x.family.replace(/"/g, '')))];
		return { families: f.join(','), loaded: f.length };
	});
	await browser.close();
	return r;
}

// a controlled page must still open with the network gone
async function offline(base) {
	const { browser, ctx, page } = await open(base, { throttle: 1 });
	await page.goto(base + route, { waitUntil: 'load', timeout: 120000 });
	const sw = await page.evaluate(() => ('serviceWorker' in navigator ? Promise.race([navigator.serviceWorker.ready.then(() => 1), new Promise((r) => setTimeout(() => r(0), 20000))]) : 0));
	await page.reload({ waitUntil: 'load' });
	await page.waitForTimeout(2000);
	await ctx.setOffline(true);
	let ok = 0;
	try {
		await page.reload({ waitUntil: 'load', timeout: 30000 });
		ok = (await page.waitForSelector('cg-board', { timeout: 15000 }).catch(() => null)) ? 1 : 0;
	} catch {}
	await browser.close();
	return { sw, ok };
}

function check(r) {
	let bad = 0;
	for (const a of asserts) {
		const m = a.match(/^([\w-]+)(<=|>=|!~|~|=)(.*)$/);
		if (!m) {
			console.error(`bad assert: ${a}`);
			bad++;
			continue;
		}
		const [, k, op, want] = m;
		const got = r[k];
		const pass = op === '<=' ? +got <= +want : op === '>=' ? +got >= +want : op === '~' ? String(got).includes(want) : op === '!~' ? !String(got).includes(want) : String(got).trim() === want;
		console.log(`${pass ? 'PASS' : 'FAIL'} ${k}${op}${want} (got ${got})`);
		if (!pass) bad++;
	}
	return bad;
}

const run = { idle: (b) => frames(b, false), active: (b) => frames(b, true), bytes, engine, field, same, load, css, fonts, offline }[metric];
if (!run) {
	console.error('metrics: idle active bytes engine field same load css fonts offline');
	process.exit(2);
}
// the field metrics draw on a blank page, so they need no server
const base = metric === 'field' || metric === 'same' ? '' : await serve();
const r = await run(base);
console.log(JSON.stringify({ metric, route, ...(selector && { selector }), ...r }));
process.exit(check(r) ? 1 : 0);
