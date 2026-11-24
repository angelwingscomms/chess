// Fluid Speech Pro by FluidVoice Labs, CC BY 4.0: a fine-tune of NVIDIA Parakeet TDT 0.6B v3, int8 ONNX.
// Only strong devices start it (see worker.js): about 800 MB once, then cached, and about 1.5 GB of memory.
// In Chrome on a 2018 4-core laptop it hears 7 s of speech in about 9.5 s; worker.js drops it when it lags.
// Features come from the Canary excerpt (same NeMo 128-bin log-mel); decoding is greedy TDT.
const model_url = 'https://huggingface.co/FluidVoice-Labs/fluid-speech-pro-onnx/resolve/fa588e9f87f1b9ad0ca2e2d8f7eaf84dc3803581/';
const BLANK = 8192, MAX_SYMBOLS = 10;
let rt, mel, encoder, decoder, vocab;

async function load(runtime_url) {
  rt = runtime_url.endsWith('.mjs') ? await import(runtime_url) : (importScripts(runtime_url), self.ort);
  rt.env.wasm.wasmPaths = new URL('.', runtime_url).href;
  // threads need cross-origin isolation, which the app has; four make it about 1.6x faster
  rt.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency) : 1;
  ({ logMelSpectrogram: mel } = await import('./canary-aed.mjs'));
  const cache = await caches.open('fluid-speech-pro-v1').catch(() => undefined);
  async function bytes(name) {
    const url = model_url + name;
    let response = await cache?.match(url);
    if (!response) {
      response = await fetch(url, { credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('fluid download failed');
      try {
        await cache?.put(url, response.clone());
      } catch {}
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  const session = async name => rt.InferenceSession.create(await bytes(name), {
    executionProviders: ['wasm'],
    externalData: [{ path: name + '.data', data: await bytes(name + '.data') }],
  });
  // one at a time keeps the peak download memory to one model
  encoder = await session('encoder-model.int8.onnx');
  decoder = await session('decoder_joint-model.int8.onnx');
  vocab = [];
  for (const line of (new TextDecoder().decode(await bytes('vocab.txt'))).split('\n')) {
    const k = line.lastIndexOf(' ');
    if (k > 0) vocab[Number(line.slice(k + 1))] = line.slice(0, k);
  }
}

function argmax(x, from, to) {
  let best = from;
  for (let i = from + 1; i < to; i++) if (x[i] > x[best]) best = i;
  return best - from;
}

async function transcribe(pcm) {
  const m = mel(pcm, { nMels: 128, logEps: 2 ** -24 }); // NeMo's log guard
  if (!m.frameCount) return '';
  const enc = await encoder.run({
    audio_signal: new rt.Tensor('float32', m.features, [1, 128, m.frameCount]),
    length: new rt.Tensor('int64', BigInt64Array.of(BigInt(m.frameCount)), [1]),
  });
  const { data: e, dims: [, D, T] } = enc.outputs;
  const frames = Number(enc.encoded_lengths.data[0]);
  const frame = new Float32Array(D);
  let s1 = new rt.Tensor('float32', new Float32Array(2 * 640), [2, 1, 640]);
  let s2 = new rt.Tensor('float32', new Float32Array(2 * 640), [2, 1, 640]);
  const tokens = [];
  for (let t = 0, emitted = 0; t < frames;) {
    for (let d = 0; d < D; d++) frame[d] = e[d * T + t];
    const out = await decoder.run({
      encoder_outputs: new rt.Tensor('float32', frame.slice(), [1, D, 1]),
      targets: new rt.Tensor('int32', Int32Array.of(tokens.at(-1) ?? BLANK), [1, 1]),
      target_length: new rt.Tensor('int32', Int32Array.of(1), [1]),
      input_states_1: s1,
      input_states_2: s2,
    });
    const x = out.outputs.data;
    const token = argmax(x, 0, BLANK + 1);
    const step = argmax(x, BLANK + 1, x.length);
    if (token !== BLANK) {
      tokens.push(token);
      s1 = out.output_states_1;
      s2 = out.output_states_2;
      emitted++;
    }
    if (step > 0) [t, emitted] = [t + step, 0];
    else if (token === BLANK || emitted >= MAX_SYMBOLS) [t, emitted] = [t + 1, 0];
  }
  return tokens.map(k => vocab[k] ?? '').join('').replace(/▁/g, ' ').trim();
}

self.onmessage = async ({ data }) => {
  try {
    if (data.r) {
      await load(data.r);
      postMessage({ ready: true });
    } else {
      postMessage({ text: await transcribe(Float32Array.from(data.pcm, x => x / 32768)) });
    }
  } catch {
    postMessage({ failed: true });
  }
};
