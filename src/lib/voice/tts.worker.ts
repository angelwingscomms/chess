// text to speech: Leokani TTS (4.5M, int8) on ONNX Runtime Web, 24 kHz. ported from pilotspan's browser voice.
// text → espeak phonemes → kokoro symbols → ids → magnitude and phase → inverse stft. audio streams back per clause.
import { speech, type Ort } from './speech_files';

// inverse stft as in the model author's leokani_onnx.py: periodic hann, 1024-point inverse fft, hop 300, 362 pad
const N = 1024,
	HOP = 300,
	PAD = 362;
const WIN = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
const REV = Uint16Array.from({ length: N }, (_, i) => {
	let n = i,
		r = 0;
	for (let b = 0; b < 10; b++) {
		r = (r << 1) | (n & 1);
		n >>= 1;
	}
	return r;
});
const COS = Float64Array.from({ length: N / 2 }, (_, i) => Math.cos((2 * Math.PI * i) / N));
const SIN = Float64Array.from({ length: N / 2 }, (_, i) => Math.sin((2 * Math.PI * i) / N));
function waveform(mag: Float32Array, phase: Float32Array, frames: number) {
	const size = (frames - 1) * HOP + N,
		y = new Float64Array(size),
		env = new Float64Array(size);
	const re = new Float64Array(N),
		im = new Float64Array(N);
	for (let f = 0; f < frames; f++) {
		for (let k = 0; k <= N / 2; k++) {
			const x = k * frames + f,
				r = mag[x] * Math.cos(phase[x]),
				v = mag[x] * Math.sin(phase[x]);
			re[REV[k]] = r;
			im[REV[k]] = v;
			if (k > 0 && k < N / 2) {
				re[REV[N - k]] = r;
				im[REV[N - k]] = -v;
			}
		}
		for (let len = 2; len <= N; len *= 2) {
			const half = len / 2,
				step = N / len;
			for (let s = 0; s < N; s += len)
				for (let k = 0; k < half; k++) {
					const a = s + k,
						b = a + half,
						c = COS[k * step],
						n = SIN[k * step];
					const r = re[b] * c - im[b] * n,
						v = re[b] * n + im[b] * c;
					re[b] = re[a] - r;
					im[b] = im[a] - v;
					re[a] += r;
					im[a] += v;
				}
		}
		for (let i = 0; i < N; i++) {
			y[f * HOP + i] += (re[i] / N) * WIN[i];
			env[f * HOP + i] += WIN[i] * WIN[i];
		}
	}
	return Float32Array.from(
		y.subarray(PAD, size - PAD),
		(v, i) => v / Math.max(env[i + PAD], 1e-11)
	);
}

const MAPS = [
	['ʔˌn̩', 'tn'],
	['ʔn̩', 'tn'],
	['ʔn', 'tn'],
	['ʔ', 't'],
	['aɪ', 'I'],
	['aʊ', 'W'],
	['dʒ', 'ʤ'],
	['eɪ', 'A'],
	['e', 'A'],
	['tʃ', 'ʧ'],
	['ɔɪ', 'Y'],
	['əl', 'ᵊl'],
	['ʲo', 'jo'],
	['ʲə', 'jə'],
	['ʲ', ''],
	['ɚ', 'əɹ'],
	['r', 'ɹ'],
	['x', 'k'],
	['ç', 'k'],
	['ɐ', 'ə'],
	['ɬ', 'l'],
	['̃', '']
];
function kokoro(ipa: string) {
	for (const [a, b] of MAPS) ipa = ipa.split(a).join(b);
	return ipa
		.replace(/(\S)̩/g, 'ᵊ$1')
		.replace(/̩/g, '')
		.replace(/oʊ/g, 'O')
		.replace(/ɜːɹ|ɜː/g, 'ɜɹ')
		.replace(/ɪə/g, 'iə')
		.replace(/ː/g, '')
		.replace(/o/g, 'ɔ')
		.trim();
}
// clauses, so the first audio comes after a few words, not after the whole answer
function clauses(text: string) {
	const out: string[] = [];
	let words: string[] = [];
	for (const w of text.split(/\s+/).filter(Boolean)) {
		words.push(w);
		const end =
			/[!?;:]$/.test(w) ||
			(/\.$/.test(w) && !/^(dr|mr|mrs|ms|st|vs|etc|e\.g|i\.e|no|jr|sr|mt)\.$/i.test(w)) ||
			(/,$/.test(w) && words.length >= 12);
		if (end && words.length >= (out.length ? 1 : 3)) {
			out.push(words.join(' '));
			words = [];
		}
	}
	if (words.length) out.push(words.join(' '));
	return out.filter((s) => /[\p{L}\p{N}]/u.test(s));
}
// the model takes at most 400 ids; cut long runs at the comma or space nearest the middle
function* split_ids(ids: number[], vocab: Record<string, number>): Generator<number[]> {
	if (!ids.length) return;
	if (ids.length <= 400) return yield ids;
	const mid = ids.length / 2;
	for (const mark of [vocab[','], vocab[' ']]) {
		let cut = -1;
		for (let i = 0; i < ids.length - 1; i++)
			if (ids[i] === mark && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
		if (cut >= 0) {
			yield* split_ids(ids.slice(0, cut + 1), vocab);
			return yield* split_ids(ids.slice(cut + 1), vocab);
		}
	}
	yield* split_ids(ids.slice(0, Math.floor(mid)), vocab);
	yield* split_ids(ids.slice(Math.floor(mid)), vocab);
}

type Engine = {
	ort: Ort;
	s: Awaited<ReturnType<Ort['InferenceSession']['create']>>;
	vocab: Record<string, number>;
	phonemize: (s: string, lang: string) => Promise<string[]>;
};
// loads on the first message, as in stt.worker.ts
let engine: Promise<Engine> | undefined;
const load = async (): Promise<Engine> => {
	const [ort, model, config, { phonemize }] = await Promise.all([
		speech.ort(),
		speech.bytes('leokani-tts-int8.onnx'),
		speech.bytes('config.json'),
		import(/* @vite-ignore */ speech.base + 'phonemizer.js')
	]);
	const s = await ort.InferenceSession.create(model, {
		executionProviders: ['wasm'],
		graphOptimizationLevel: 'all'
	});
	return { ort, s, phonemize, vocab: JSON.parse(new TextDecoder().decode(config)).vocab };
};

// i job id, t text to say; c cancels job c; a text-free message only warms the engine
let cancelled = 0;
let queue = Promise.resolve();
self.onmessage = ({ data }: MessageEvent<{ i?: number; t?: string; c?: number }>) => {
	if (data.c) return void (cancelled = Math.max(cancelled, data.c));
	engine ??= load();
	const { i = 0, t = '' } = data;
	queue = queue.then(async () => {
		try {
			const { ort, s, vocab, phonemize } = await engine!;
			for (const clause of clauses(t)) {
				const ps =
					kokoro((await phonemize(clause, 'en-us')).join(' ')) +
					(clause.match(/[,;:.!?…]$/)?.[0] ?? '');
				const ids = [...ps].map((c) => vocab[c]).filter((id) => id !== undefined);
				for (const run of split_ids(ids, vocab)) {
					if (i <= cancelled) return;
					const padded = [0, ...run, 0];
					const out = await s.run({
						ids: new ort.Tensor('int64', BigInt64Array.from(padded, BigInt), [1, padded.length]),
						speed: new ort.Tensor('float32', Float32Array.of(1), [1])
					});
					if (i <= cancelled) return;
					const [mag, phase] = s.outputNames.map((n) => out[n]);
					const a = waveform(mag.data, phase.data, mag.dims.at(-1)!);
					self.postMessage({ i, a }, { transfer: [a.buffer] });
				}
			}
			if (i) self.postMessage({ i, d: 1 });
		} catch (e) {
			engine = undefined;
			self.postMessage({ i, e: (e as Error).message });
		}
	});
};
