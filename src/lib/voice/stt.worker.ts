// speech to text: NeMo Conformer-small CTC, 4-bit weights, on ONNX Runtime Web. 16 kHz pcm in, lowercase text out.
// features are kaldi log-mel (25 ms povey window, 10 ms hop, 80 bins) normalised per bin, as the model was measured.
import { speech, type Ort } from './speech_files';

const FRAME = 400,
	HOP = 160,
	NFFT = 512,
	BINS = 80,
	PREEMPH = 0.97,
	FLOOR = 1.1920928955078125e-7;
const WINDOW = Float64Array.from(
	{ length: FRAME },
	(_, i) => (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1))) ** 0.85
);
const mel = (hz: number) => 1127 * Math.log(1 + hz / 700);
const FILTERS = Array.from({ length: BINS }, (_, b) => {
	const low = mel(20),
		d = (mel(8000) - low) / (BINS + 1);
	const l = low + b * d,
		c = l + d,
		r = c + d;
	const row = new Float64Array(NFFT / 2);
	for (let i = 0; i < row.length; i++) {
		const m = mel((16000 / NFFT) * i);
		if (m > l && m < r) row[i] = m <= c ? (m - l) / (c - l) : (r - m) / (r - c);
	}
	return row;
});
const REV = new Uint16Array(NFFT);
for (let i = 1; i < NFFT; i++) REV[i] = (REV[i >> 1] >> 1) | (i & 1 ? NFFT >> 1 : 0);
const COS = Float64Array.from({ length: NFFT / 2 }, (_, i) => Math.cos((-2 * Math.PI * i) / NFFT));
const SIN = Float64Array.from({ length: NFFT / 2 }, (_, i) => Math.sin((-2 * Math.PI * i) / NFFT));

function power_spectrum(x: Float64Array, out: Float64Array) {
	const re = new Float64Array(NFFT),
		im = new Float64Array(NFFT);
	for (let i = 0; i < NFFT; i++) re[REV[i]] = x[i];
	for (let size = 2; size <= NFFT; size <<= 1) {
		const half = size >> 1,
			step = NFFT / size;
		for (let s = 0; s < NFFT; s += size)
			for (let k = 0; k < half; k++) {
				const a = s + k,
					b = a + half,
					c = COS[k * step],
					n = SIN[k * step];
				const tr = re[b] * c - im[b] * n,
					ti = re[b] * n + im[b] * c;
				re[b] = re[a] - tr;
				im[b] = im[a] - ti;
				re[a] += tr;
				im[a] += ti;
			}
	}
	for (let i = 0; i <= NFFT / 2; i++) out[i] = re[i] * re[i] + im[i] * im[i];
}

// [bin][frame] flat, plus the frame count
function log_mel(pcm: Int16Array) {
	const N = pcm.length,
		T = Math.floor((N + HOP / 2) / HOP);
	const feat = new Float64Array(T * BINS),
		w = new Float64Array(NFFT),
		pw = new Float64Array(NFFT / 2 + 1);
	for (let t = 0; t < T; t++) {
		const start = t * HOP + HOP / 2 - FRAME / 2;
		let mean = 0;
		for (let i = 0; i < FRAME; i++) {
			// reflect at both ends (snip_edges false)
			let s = start + i;
			while (s < 0 || s >= N) s = s < 0 ? -s - 1 : 2 * N - 1 - s;
			w[i] = pcm[s];
			mean += w[i];
		}
		mean /= FRAME;
		for (let i = FRAME - 1; i >= 1; i--) w[i] = w[i] - mean - PREEMPH * (w[i - 1] - mean);
		w[0] = (w[0] - mean) * (1 - PREEMPH);
		for (let i = 0; i < FRAME; i++) w[i] *= WINDOW[i];
		w.fill(0, FRAME);
		power_spectrum(w, pw);
		for (let b = 0; b < BINS; b++) {
			let e = 0;
			for (let i = 0; i < NFFT / 2; i++) e += FILTERS[b][i] * pw[i];
			feat[t * BINS + b] = Math.log(Math.max(e, FLOOR));
		}
	}
	const out = new Float32Array(BINS * T);
	for (let b = 0; b < BINS; b++) {
		let mean = 0,
			v = 0;
		for (let t = 0; t < T; t++) mean += feat[t * BINS + b];
		mean /= T;
		for (let t = 0; t < T; t++) v += (feat[t * BINS + b] - mean) ** 2;
		const sd = Math.sqrt(v / T) + 1e-5;
		for (let t = 0; t < T; t++) out[b * T + t] = (feat[t * BINS + b] - mean) / sd;
	}
	return { f: out, t: T };
}

// loads on the first message: a top-level await in a module worker delays onmessage, and early messages are lost
let engine:
	| Promise<{ ort: Ort; s: Awaited<ReturnType<Ort['InferenceSession']['create']>>; v: string[] }>
	| undefined;
type Upgrade = ((pcm: Int16Array) => Promise<string | undefined>) & { stop(): void };
// bigger models take over once downloaded: Canary-180M everywhere, Fluid Speech Pro on strong devices only
let canary: Upgrade | undefined;
let fluid: Upgrade | undefined;
const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
const strong = (nav.deviceMemory ?? 0) >= 8 && navigator.hardwareConcurrency >= 8 && !nav.connection?.saveData;
const load = async () => {
	const [ort, model, tokens] = await Promise.all([
		speech.ort(),
		speech.bytes('conformer-small-w4g32.onnx'),
		speech.bytes('tokens.txt')
	]);
	const v: string[] = [];
	for (const line of new TextDecoder().decode(tokens).split('\n')) {
		const k = line.lastIndexOf(' ');
		if (k > 0) v[Number(line.slice(k + 1))] = line.slice(0, k);
	}
	const s = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
	const upgrade = new URL('/stt/upgrade.mjs', self.location.origin).href;
	void import(/* @vite-ignore */ upgrade)
		.then(({ start_upgrade }) => {
			canary = start_upgrade('./canary.worker.js', speech.base + 'ort.wasm.min.mjs');
			if (strong) fluid = start_upgrade('./fluid.worker.js', speech.base + 'ort.wasm.min.mjs', 90_000);
		})
		.catch(() => {});
	return { ort, v, s };
};

let queue = Promise.resolve();
self.onmessage = ({ data }: MessageEvent<{ i: number; pcm?: Int16Array }>) => {
	engine ??= load();
	queue = queue.then(async () => {
		try {
			const { ort, s, v } = await engine!;
			if (!data.pcm?.length) return self.postMessage({ i: data.i, t: '' });
			if (fluid) {
				const start = performance.now();
				const text_fluid = await fluid(data.pcm);
				// Fluid must keep up: a segment that takes longer than it lasts sends this device back to Canary
				if (performance.now() - start > data.pcm.length / 16) {
					fluid.stop();
					fluid = undefined;
				}
				if (text_fluid !== undefined) return self.postMessage({ i: data.i, t: text_fluid });
			}
			const text_canary = await canary?.(data.pcm);
			if (text_canary !== undefined) return self.postMessage({ i: data.i, t: text_canary });
			const { f, t } = log_mel(data.pcm);
			const out = await s.run({
				audio_signal: new ort.Tensor('float32', f, [1, BINS, t]),
				length: new ort.Tensor('int64', BigInt64Array.of(BigInt(t)), [1])
			});
			const { data: x, dims } = out[s.outputNames[0]];
			const [, frames, size] = dims;
			// greedy ctc: best token per frame, repeats and blanks (the last token) dropped
			let text = '',
				prev = -1;
			for (let j = 0; j < frames; j++) {
				let best = 0;
				for (let k = 1; k < size; k++) if (x[j * size + k] > x[j * size + best]) best = k;
				if (best !== prev && best !== size - 1) text += v[best] ?? '';
				prev = best;
			}
			self.postMessage({ i: data.i, t: text.replace(/▁/g, ' ').trim() });
		} catch (e) {
			engine = undefined;
			self.postMessage({ i: data.i, e: (e as Error).message });
		}
	});
};
