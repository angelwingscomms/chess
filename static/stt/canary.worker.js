// Canary-180M Flash by NVIDIA, CC BY 4.0. ONNX export by istupakov.
const model_url = 'https://huggingface.co/istupakov/canary-180m-flash-onnx/resolve/92c2231a4e2b2524277fea759be967d2e6edfc49/';
let model;

async function load(runtime_url) {
  const ort = runtime_url.endsWith('.mjs')
    ? await import(runtime_url)
    : (importScripts(runtime_url), self.ort);
  ort.env.wasm.wasmPaths = new URL('.', runtime_url).href;
  ort.env.wasm.numThreads = 1;
  const { bind_ort, NemoAedModel, parseVocabulary } = await import('./canary-aed.mjs');
  bind_ort(ort);
  const cache = await caches.open('canary-180m-flash-v1').catch(() => undefined);
  async function asset(name) {
    const url = model_url + name;
    const hit = await cache?.match(url);
    if (hit) return hit;
    const response = await fetch(url, { credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('canary download failed');
    if (cache) {
      try {
        await cache.put(url, response.clone());
      } catch {}
    }
    return response;
  }
  const [encoder, decoder, vocab] = await Promise.all([
    asset('encoder-model.int8.onnx'), asset('decoder-model.int8.onnx'), asset('vocab.txt')
  ]);
  const session = async response => ort.InferenceSession.create(
    new Uint8Array(await response.arrayBuffer()), { executionProviders: ['wasm'] }
  );
  model = new NemoAedModel({
    config: { features_size: 128 },
    tokens: parseVocabulary(await vocab.text()),
    encoderSession: await session(encoder),
    decoderSession: await session(decoder),
  });
}

self.onmessage = async ({ data }) => {
  try {
    if (data.r) {
      await load(data.r);
      postMessage({ ready: true });
    } else {
      const pcm = Float32Array.from(data.pcm, x => x / 32768);
      const { text } = await model.transcribeSamples(pcm, 16000);
      postMessage({ text });
    }
  } catch {
    postMessage({ failed: true });
  }
};
