// text to speech: Kitten TTS 2 Pico (7.2M, int4, voice Eleanor) on ONNX Runtime Web, 24 kHz.
// text → espeak phonemes → misaki symbols → ids → model (ids, style row, speed → waveform, durations). audio streams back per clause.
import { speech, type Ort } from './speech_files';

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
const END = 10;
// as the model author's runtime: cut the end token's frames (and the start's after the first piece), 5 ms fades
function trim(w: Float32Array, dur: BigInt64Array, keep_start: boolean) {
	let total = 0;
	for (const d of dur) total += Number(d);
	const spf = Math.max(1, Math.round(w.length / Math.max(total, 1)));
	const lead = keep_start ? 0 : Math.max(0, Number(dur[0]) - 1) * spf;
	const tail = Math.max(0, Number(dur[dur.length - 1]) - 1) * spf;
	let o = w;
	if (lead + tail + spf < w.length) o = w.subarray(lead, w.length - tail);
	const a = Float32Array.from(o, (v) => Math.max(-1, Math.min(1, v)));
	const f = Math.min(120, a.length >> 3);
	for (let k = 0; k < f; k++) {
		a[k] *= k / f;
		a[a.length - 1 - k] *= k / f;
	}
	return a;
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
	style: Float32Array;
	phonemize: (s: string, lang: string) => Promise<string[]>;
};
// loads on the first message, as in stt.worker.ts
let engine: Promise<Engine> | undefined;
const load = async (): Promise<Engine> => {
	const [ort, model, config, voice, { phonemize }] = await Promise.all([
		speech.ort(),
		speech.bytes('kitten-pico-en-int4.onnx'),
		speech.bytes('kitten.json'),
		speech.bytes('kitten-eleanor.f32'),
		import(/* @vite-ignore */ speech.base + 'phonemizer.js')
	]);
	const s = await ort.InferenceSession.create(model, {
		executionProviders: ['wasm'],
		graphOptimizationLevel: 'all'
	});
	return {
		ort,
		s,
		phonemize,
		vocab: JSON.parse(new TextDecoder().decode(config)),
		style: new Float32Array(voice.buffer, voice.byteOffset, voice.byteLength / 4)
	};
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
			const { ort, s, vocab, style, phonemize } = await engine!;
			let first = true;
			for (const clause of clauses(t)) {
				const ps =
					kokoro((await phonemize(clause, 'en-us')).join(' ')) +
					(clause.match(/[,;:.!?…]$/)?.[0] ?? '');
				const ids = [...ps].map((c) => vocab[c]).filter((id) => id !== undefined);
				for (const run of split_ids(ids, vocab)) {
					if (i <= cancelled) return;
					const ids2 = [0, ...run, END, 0];
					const row = Math.min(ids2.length - 1, 509) * 256;
					const out = await s.run({
						input_ids: new ort.Tensor('int64', BigInt64Array.from(ids2, BigInt), [1, ids2.length]),
						style: new ort.Tensor('float32', style.slice(row, row + 256), [1, 256]),
						speed: new ort.Tensor('float32', Float32Array.of(1), [1])
					});
					if (i <= cancelled) return;
					const [wav, dur] = s.outputNames.map((n) => out[n]);
					const a = trim(wav.data, dur.data as unknown as BigInt64Array, first);
					first = false;
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
