// the speech models and the onnx runtime they share live in static/speech/1, cached for a year (_headers),
// so only the first call downloads them.
export type Tensor = { data: Float32Array; dims: number[] };
export type Ort = {
	env: { wasm: { wasmPaths: string; numThreads: number } };
	Tensor: new (type: string, data: Float32Array | BigInt64Array, dims: number[]) => unknown;
	InferenceSession: {
		create(
			model: Uint8Array,
			o: { executionProviders: string[]; graphOptimizationLevel?: string }
		): Promise<{
			outputNames: string[];
			run(i: Record<string, unknown>): Promise<Record<string, Tensor>>;
		}>;
	};
};

// the server renders pages that import this, and has no location
const base = typeof location === 'undefined' ? '/speech/1/' : new URL('/speech/1/', location.origin).href;

export const speech = {
	base,
	async bytes(name: string) {
		const r = await fetch(base + name);
		if (!r.ok) throw new Error(`could not load ${name}`);
		return new Uint8Array(await r.arrayBuffer());
	},
	async ort() {
		const ort = (await import(/* @vite-ignore */ base + 'ort.wasm.min.mjs')) as Ort;
		ort.env.wasm.wasmPaths = base;
		// one thread: more would start their own workers, and one already runs well under real time
		ort.env.wasm.numThreads = 1;
		return ort;
	}
};

// every file a call loads, with its size, so the first download can show how far along it is
const FILES: [string, number][] = [
	['ort.wasm.min.mjs', 53725],
	['ort-wasm-simd-threaded.mjs', 24738],
	['ort-wasm-simd-threaded.wasm', 14848852],
	['conformer-small-w4g32.onnx', 16109529],
	['tokens.txt', 11611],
	['leokani-tts-int8.onnx', 5143956],
	['config.json', 2461],
	['phonemizer.js', 1322380]
];

// warms the http cache with every file, calling on(0..1) as bytes arrive; cached files take no time
export async function prefetch(on: (f: number) => void) {
	const all = FILES.reduce((a, [, n]) => a + n, 0);
	let got = 0;
	for (const [name, n] of FILES) {
		const r = await fetch(base + name);
		if (!r.ok || !r.body) throw new Error(`could not load ${name}`);
		const reader = r.body.getReader();
		let seen = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			seen += value.length;
			on(Math.min(1, (got + Math.min(seen, n)) / all));
		}
		got += n;
	}
	on(1);
}
