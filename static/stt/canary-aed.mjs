/*! Canary AED excerpt from onnx-asr-web 0.1.3 (SanderGi/onnx-asr-web).
MIT License

Copyright (c) 2026 Alexander Metzger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
let ort;
const bind_ort = (runtime) => {
  ort = runtime;
};
var RIFF = 1380533830;
var WAVE = 1463899717;
var FMT = 1718449184;
var DATA = 1684108385;
function readChunkId(view, offset) {
  return view.getUint32(offset, false);
}
function parseFmtChunk(view, offset) {
  const audioFormat = view.getUint16(offset + 8, true);
  const channels = view.getUint16(offset + 10, true);
  const sampleRate = view.getUint32(offset + 12, true);
  const bitsPerSample = view.getUint16(offset + 22, true);
  return { audioFormat, channels, sampleRate, bitsPerSample };
}
function decodePcm(view, offset, byteLength, fmt) {
  const { audioFormat, channels, bitsPerSample } = fmt;
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = byteLength / bytesPerSample;
  const frameCount = totalSamples / channels;
  const mono = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let acc = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const sampleOffset = offset + (frame * channels + channel) * bytesPerSample;
      let value;
      if (audioFormat === 1 && bitsPerSample === 16) {
        value = view.getInt16(sampleOffset, true) / 32768;
      } else if (audioFormat === 1 && bitsPerSample === 32) {
        value = view.getInt32(sampleOffset, true) / 2147483648;
      } else if (audioFormat === 3 && bitsPerSample === 32) {
        value = view.getFloat32(sampleOffset, true);
      } else {
        throw new Error(
          `Unsupported WAV format: audioFormat=${audioFormat}, bitsPerSample=${bitsPerSample}`
        );
      }
      acc += value;
    }
    mono[frame] = acc / channels;
  }
  return mono;
}
function decodeWav(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (readChunkId(view, 0) !== RIFF || readChunkId(view, 8) !== WAVE) {
    throw new Error("Invalid WAV file header.");
  }
  let offset = 12;
  let fmt = null;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= view.byteLength) {
    const chunkId = readChunkId(view, offset);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === FMT) {
      fmt = parseFmtChunk(view, offset);
    } else if (chunkId === DATA) {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize + chunkSize % 2;
  }
  if (!fmt) {
    throw new Error("WAV file is missing fmt chunk.");
  }
  if (dataOffset < 0) {
    throw new Error("WAV file is missing data chunk.");
  }
  const samples = decodePcm(view, dataOffset, dataSize, fmt);
  return {
    sampleRate: fmt.sampleRate,
    samples
  };
}
function resampleLinear(samples, inputRate, outputRate) {
  if (inputRate === outputRate) {
    return samples;
  }
  const ratio = inputRate / outputRate;
  const outLength = Math.max(1, Math.floor(samples.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const srcPos = i * ratio;
    const left = Math.floor(srcPos);
    const right = Math.min(left + 1, samples.length - 1);
    const alpha = srcPos - left;
    out[i] = samples[left] * (1 - alpha) + samples[right] * alpha;
  }
  return out;
}
function int64TensorValues(values) {
  return BigInt64Array.from(values.map((value) => BigInt(value)));
}
function readScalarInt(tensor) {
  if (!tensor || !tensor.data || tensor.data.length === 0) {
    throw new Error("Expected scalar tensor with data.");
  }
  const value = tensor.data[0];
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "number") {
    return value;
  }
  throw new Error(`Expected numeric scalar tensor, received ${typeof value}.`);
}
function firstExistingInputName(session, candidates, fallbackIndex) {
  for (const name of candidates) {
    if (session.inputNames.includes(name)) {
      return name;
    }
  }
  return session.inputNames[fallbackIndex];
}
function intTensor(type, values, dims) {
  if (type === "int64") {
    return new ort.Tensor("int64", int64TensorValues(values), dims);
  }
  return new ort.Tensor("int32", Int32Array.from(values), dims);
}
function ensureOutput(session, outputMap, index) {
  const name = session.outputNames[index];
  const tensor = outputMap[name];
  if (!tensor) {
    throw new Error(`Missing output tensor at index ${index} (${name}).`);
  }
  return tensor;
}
function hzToMel(hz) {
  return 2595 * Math.log10(1 + hz / 700);
}
function melToHz(mel) {
  return 700 * (10 ** (mel / 2595) - 1);
}
function buildHannWindow(length) {
  const window = new Float32Array(length);
  if (length === 1) {
    window[0] = 1;
    return window;
  }
  for (let i = 0; i < length; i += 1) {
    window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (length - 1));
  }
  return window;
}
function buildMelFilterBank({ sampleRate, nFft, nMels, fMin, fMax }) {
  const nFreqs = Math.floor(nFft / 2) + 1;
  const bank = Array.from({ length: nMels }, () => new Float32Array(nFreqs));
  const melMin = hzToMel(fMin);
  const melMax = hzToMel(fMax);
  const melPoints = new Float32Array(nMels + 2);
  for (let i = 0; i < melPoints.length; i += 1) {
    melPoints[i] = melMin + (melMax - melMin) * i / (nMels + 1);
  }
  const hzPoints = Array.from(melPoints, melToHz);
  const bin = hzPoints.map((hz) => Math.floor((nFft + 1) * hz / sampleRate));
  for (let m = 1; m <= nMels; m += 1) {
    const left = bin[m - 1];
    const center = bin[m];
    const right = bin[m + 1];
    for (let k = left; k < center; k += 1) {
      if (k >= 0 && k < nFreqs && center > left) {
        bank[m - 1][k] = (k - left) / (center - left);
      }
    }
    for (let k = center; k < right; k += 1) {
      if (k >= 0 && k < nFreqs && right > center) {
        bank[m - 1][k] = (right - k) / (right - center);
      }
    }
  }
  return bank;
}
function powerSpectrum(frame, nFft) {
  const bins = Math.floor(nFft / 2) + 1;
  const out = new Float32Array(bins);
  for (let k = 0; k < bins; k += 1) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < nFft; n += 1) {
      const sample = frame[n] ?? 0;
      const angle = 2 * Math.PI * k * n / nFft;
      real += sample * Math.cos(angle);
      imag -= sample * Math.sin(angle);
    }
    out[k] = real * real + imag * imag;
  }
  return out;
}
function logMelSpectrogram(samples, options = {}) {
  const sampleRate = options.sampleRate ?? 16e3;
  const nMels = options.nMels ?? 80;
  const nFft = options.nFft ?? 512;
  const winLength = options.winLength ?? 400;
  const hopLength = options.hopLength ?? 160;
  const fMin = options.fMin ?? 0;
  const fMax = options.fMax ?? sampleRate / 2;
  const logEps = options.logEps ?? 1e-10;
  const preemphasis = options.preemphasis ?? 0.97;
  const normalize2 = options.normalize ?? true;
  if (preemphasis > 0) {
    const emphasized = new Float32Array(samples.length);
    if (samples.length > 0) {
      emphasized[0] = samples[0];
    }
    for (let i = 1; i < samples.length; i += 1) {
      emphasized[i] = samples[i] - preemphasis * samples[i - 1];
    }
    samples = emphasized;
  }
  if (samples.length < winLength) {
    const padded = new Float32Array(winLength);
    padded.set(samples, 0);
    samples = padded;
  }
  const frameCount = 1 + Math.floor((samples.length - winLength) / hopLength);
  const frameWindow = buildHannWindow(winLength);
  const melBank = buildMelFilterBank({ sampleRate, nFft, nMels, fMin, fMax });
  const features = new Float32Array(nMels * frameCount);
  const fftFrame = new Float32Array(nFft);
  for (let t = 0; t < frameCount; t += 1) {
    const start = t * hopLength;
    fftFrame.fill(0);
    for (let i = 0; i < winLength; i += 1) {
      fftFrame[i] = samples[start + i] * frameWindow[i];
    }
    const spectrum = powerSpectrum(fftFrame, nFft);
    for (let m = 0; m < nMels; m += 1) {
      const filter = melBank[m];
      let energy = 0;
      for (let k = 0; k < spectrum.length; k += 1) {
        energy += spectrum[k] * filter[k];
      }
      features[m * frameCount + t] = Math.log(Math.max(logEps, energy));
    }
  }
  if (normalize2) {
    for (let m = 0; m < nMels; m += 1) {
      const offset = m * frameCount;
      let mean = 0;
      for (let t = 0; t < frameCount; t += 1) {
        mean += features[offset + t];
      }
      mean /= frameCount;
      let variance = 0;
      for (let t = 0; t < frameCount; t += 1) {
        const delta = features[offset + t] - mean;
        variance += delta * delta;
      }
      const std = Math.sqrt(variance / frameCount) + 1e-5;
      for (let t = 0; t < frameCount; t += 1) {
        features[offset + t] = (features[offset + t] - mean) / std;
      }
    }
  }
  return {
    features,
    frameCount,
    nMels
  };
}
var EncoderModel = class {
  constructor(session, options = {}) {
    this.session = session;
    this.options = options;
    this.audioSignalName = firstExistingInputName(session, ["audio_signal", "features", "waveforms"], 0);
    this.lengthName = firstExistingInputName(session, ["length", "features_lens", "waveforms_lens"], 1);
    this.audioMetadata = session.inputMetadata.find((item) => item.name === this.audioSignalName);
    this.lengthMetadata = session.inputMetadata.find((item) => item.name === this.lengthName);
  }
  prepareInputsFromWaveform(samples) {
    const inputRank = this.audioMetadata?.shape?.length ?? 2;
    if (inputRank === 2) {
      const audioTensor2 = new ort.Tensor("float32", samples, [1, samples.length]);
      const lengthType2 = this.lengthMetadata?.type ?? "int64";
      const lengthTensor2 = intTensor(lengthType2, [samples.length], [1]);
      return { signal: audioTensor2, length: lengthTensor2 };
    }
    if (inputRank !== 3) {
      throw new Error(`Unsupported encoder input rank ${inputRank} for '${this.audioSignalName}'.`);
    }
    const nMelsFromShape = this.audioMetadata?.shape?.[1];
    const fe = this.options.config?.feature_extraction_params;
    const configNels = this.options.config?.features_size ?? fe?.n_mels;
    const nMels = typeof nMelsFromShape === "number" && Number.isFinite(nMelsFromShape) ? nMelsFromShape : configNels ?? 80;
    const isGigaam = this.options.config?.model_type === "gigaam";
    const sampleRate = this.options.sampleRate ?? fe?.sample_rate ?? 16e3;
    const nFft = fe?.n_fft ?? 512;
    const winLength = fe?.window_size ? Math.round(Number(fe.window_size) * sampleRate) : 400;
    const hopLength = fe?.window_stride ? Math.round(Number(fe.window_stride) * sampleRate) : 160;
    const mel = logMelSpectrogram(samples, {
      sampleRate,
      nMels,
      nFft,
      winLength,
      hopLength,
      preemphasis: fe?.preemphasis_coefficient ?? (isGigaam ? 0 : 0.97),
      normalize: !isGigaam
    });
    const audioTensor = new ort.Tensor("float32", mel.features, [1, mel.nMels, mel.frameCount]);
    const lengthType = this.lengthMetadata?.type ?? "int64";
    const lengthTensor = intTensor(lengthType, [mel.frameCount], [1]);
    return { signal: audioTensor, length: lengthTensor };
  }
  async run(processedSignalTensor, processedLengthTensor) {
    const outputs = await this.session.run({
      [this.audioSignalName]: processedSignalTensor,
      [this.lengthName]: processedLengthTensor
    });
    const encoded = ensureOutput(this.session, outputs, 0);
    const encodedLength = ensureOutput(this.session, outputs, 1);
    if (encoded.dims.length === 3 && encoded.dims[0] === 1) {
      return {
        encodedData: encoded.data,
        encodedDims: encoded.dims,
        encodedLayout: "BCT",
        encodedLength: readScalarInt(encodedLength)
      };
    }
    throw new Error(
      `Unexpected encoder output shape: [${encoded.dims.join(", ")}]. Expected [1, C, T].`
    );
  }
};
function parseVocabulary(vocabularyText) {
  const lines = vocabularyText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const indexed = lines.every((line) => /^(.*)\s+(\d+)$/.test(line));
  if (indexed) {
    const parsed = lines.map((line) => {
      const match = line.match(/^(.*)\s+(\d+)$/);
      if (!match) {
        throw new Error(`Invalid indexed vocabulary line: ${line}`);
      }
      return { token: match[1], id: Number(match[2]) };
    });
    const maxId = parsed.reduce((acc, item) => Math.max(acc, item.id), 0);
    const tokens = new Array(maxId + 1);
    for (const item of parsed) {
      tokens[item.id] = item.token;
    }
    return tokens;
  }
  return lines;
}
function isControlToken(token) {
  return Boolean(token && token.startsWith("<") && token.endsWith(">"));
}
function decodeTokenPiece(token) {
  return token.split("\u2581").join(" ");
}
function tensorValueToNumber2(value) {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return value;
}
function decodeText(tokens, tokenIds) {
  return tokenIds.map((tokenId) => tokens[tokenId]).filter((token) => token && !isControlToken(token)).map((token) => decodeTokenPiece(token)).join("").trim();
}
function intTensorFor2(type, values, dims) {
  if (type === "int64") {
    return new ort.Tensor("int64", BigInt64Array.from(values.map((x) => BigInt(x))), dims);
  }
  return new ort.Tensor("int32", Int32Array.from(values), dims);
}
function zerosTensor(type, shape) {
  const size = shape.reduce((acc, value) => acc * value, 1);
  if (type === "float32") {
    return new ort.Tensor("float32", new Float32Array(size), shape);
  }
  if (type === "float16") {
    return new ort.Tensor("float16", new Uint16Array(size), shape);
  }
  throw new Error(`Unsupported tensor init type '${type}'.`);
}
function argmaxSlice(data, start, length) {
  let bestIndex = 0;
  let bestValue = -Infinity;
  for (let i = 0; i < length; i += 1) {
    const value = tensorValueToNumber2(data[start + i]);
    if (value > bestValue) {
      bestValue = value;
      bestIndex = i;
    }
  }
  return bestIndex;
}
var NemoAedModel = class {
  constructor({ config, tokens, encoderSession, decoderSession }) {
    this.config = config;
    this.tokens = tokens;
    this.tokenToId = /* @__PURE__ */ new Map();
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token != null && !this.tokenToId.has(token)) {
        this.tokenToId.set(token, i);
      }
    }
    this.encoderSession = encoderSession;
    this.decoderSession = decoderSession;
    this.encoderHelper = new EncoderModel(encoderSession, { config, sampleRate: 16e3 });
    this.sampleRate = 16e3;
    this.maxSequenceLength = config?.max_sequence_length ?? 1024;
    this.encoderOutputEmbeddingsName = encoderSession.outputNames.includes("encoder_embeddings") ? "encoder_embeddings" : encoderSession.outputNames[0];
    this.encoderOutputMaskName = encoderSession.outputNames.includes("encoder_mask") ? "encoder_mask" : encoderSession.outputNames[1];
    this.decoderInputIdName = decoderSession.inputNames.includes("input_ids") ? "input_ids" : decoderSession.inputNames[0];
    this.decoderEncoderEmbeddingsName = decoderSession.inputNames.includes("encoder_embeddings") ? "encoder_embeddings" : decoderSession.inputNames[1];
    this.decoderEncoderMaskName = decoderSession.inputNames.includes("encoder_mask") ? "encoder_mask" : decoderSession.inputNames[2];
    this.decoderMemsName = decoderSession.inputNames.includes("decoder_mems") ? "decoder_mems" : decoderSession.inputNames[3];
    const inputIdMeta = decoderSession.inputMetadata.find(
      (meta) => meta.name === this.decoderInputIdName
    );
    this.decoderInputIdType = inputIdMeta?.type ?? "int32";
    const memMeta = decoderSession.inputMetadata.find(
      (meta) => meta.name === this.decoderMemsName
    );
    if (!memMeta) {
      throw new Error("Decoder input metadata for decoder_mems is missing.");
    }
    this.decoderMemsType = memMeta.type ?? "float32";
    this.decoderMemsShapeTemplate = memMeta.shape ?? [1, 1, 0, 1];
    this.logitsName = decoderSession.outputNames.includes("logits") ? "logits" : decoderSession.outputNames[0];
    this.decoderHiddenStatesName = decoderSession.outputNames.includes("decoder_hidden_states") ? "decoder_hidden_states" : decoderSession.outputNames[1];
  }
  canaryPrefix(options = {}) {
    const fallbackLanguage = options.language ?? "en";
    const targetLanguage = options.targetLanguage ?? "en";
    const pnc = options.pnc ?? "yes";
    const values = [
      "<|startofcontext|>",
      "<|startoftranscript|>",
      "<|emo:undefined|>",
      `<|${fallbackLanguage}|>`,
      `<|${targetLanguage}|>`,
      pnc === "yes" ? "<|pnc|>" : "<|nopnc|>",
      "<|noitn|>",
      "<|notimestamp|>",
      "<|nodiarize|>"
    ];
    return values.map((token) => {
      const id = this.tokenToId.get(token);
      if (id == null) {
        throw new Error(`Required Canary token not found in vocab: ${token}`);
      }
      return id;
    });
  }
  initialMems(batchSize) {
    const shape = this.decoderMemsShapeTemplate.map((dim, index) => {
      if (typeof dim === "number") {
        return dim;
      }
      if (index === 1) {
        return batchSize;
      }
      if (index === 2) {
        return 0;
      }
      return 1;
    });
    return zerosTensor(this.decoderMemsType, shape);
  }
  async transcribeSamples(samples, sampleRate = this.sampleRate, options = {}) {
    let prepared = samples;
    if (!(prepared instanceof Float32Array)) {
      prepared = Float32Array.from(prepared);
    }
    if (sampleRate !== this.sampleRate) {
      prepared = resampleLinear(prepared, sampleRate, this.sampleRate);
    }
    const encoderInputs = this.encoderHelper.prepareInputsFromWaveform(prepared);
    const encoderOutputs = await this.encoderSession.run({
      [this.encoderHelper.audioSignalName]: encoderInputs.signal,
      [this.encoderHelper.lengthName]: encoderInputs.length
    });
    const encoderEmbeddings = encoderOutputs[this.encoderOutputEmbeddingsName];
    const encoderMask = encoderOutputs[this.encoderOutputMaskName];
    if (!encoderEmbeddings || !encoderMask) {
      throw new Error("Canary encoder outputs are missing required tensors.");
    }
    const prefix = this.canaryPrefix(options);
    const batchTokens = [prefix.slice()];
    const prefixLength = batchTokens[0].length;
    const eosId = this.tokenToId.get("<|endoftext|>");
    if (eosId == null) {
      throw new Error("Canary vocab is missing <|endoftext|> token.");
    }
    let decoderMems = this.initialMems(batchTokens.length);
    while (batchTokens[0].length < this.maxSequenceLength) {
      const inputIds = decoderMems.dims[2] === 0 ? batchTokens.flat() : batchTokens.map((row) => row[row.length - 1]);
      const sequenceLength = decoderMems.dims[2] === 0 ? batchTokens[0].length : 1;
      const inputTensor = intTensorFor2(this.decoderInputIdType, inputIds, [batchTokens.length, sequenceLength]);
      const decoderOutputs = await this.decoderSession.run({
        [this.decoderInputIdName]: inputTensor,
        [this.decoderEncoderEmbeddingsName]: encoderEmbeddings,
        [this.decoderEncoderMaskName]: encoderMask,
        [this.decoderMemsName]: decoderMems
      });
      const logits = decoderOutputs[this.logitsName];
      const nextMems = decoderOutputs[this.decoderHiddenStatesName];
      if (!logits || !nextMems) {
        throw new Error("Canary decoder outputs are missing logits or decoder state.");
      }
      decoderMems = nextMems;
      const [batchSize, seq, vocab] = logits.dims;
      let allEos = true;
      for (let b = 0; b < batchSize; b += 1) {
        const offset = b * seq * vocab + (seq - 1) * vocab;
        const nextToken = argmaxSlice(logits.data, offset, vocab);
        batchTokens[b].push(nextToken);
        if (nextToken !== eosId) {
          allEos = false;
        }
      }
      if (allEos) {
        break;
      }
    }
    const tokenIds = batchTokens[0].slice(prefixLength).filter((id) => this.tokens[id] && !this.tokens[id].startsWith("<|"));
    return {
      tokenIds,
      tokenFrames: [],
      words: [],
      text: decodeText(this.tokens, tokenIds)
    };
  }
  async transcribeWavBuffer(arrayBuffer, options = {}) {
    const decoded = decodeWav(arrayBuffer);
    return this.transcribeSamples(decoded.samples, decoded.sampleRate, options);
  }
};
export {
  NemoAedModel,
  bind_ort,
  logMelSpectrogram,
  parseVocabulary
};
