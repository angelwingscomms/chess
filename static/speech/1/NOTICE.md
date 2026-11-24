# speech files

the ai call listens and speaks in the browser with these. they ship with the app, so nothing downloads from elsewhere and no server hears the audio.

- `conformer-small-w4g32.onnx`: NVIDIA NeMo `stt_en_conformer_ctc_small`, CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/). changed: exported to ONNX by sherpa-onnx, weights quantized to 4 bits in blocks of 32, conv weights stored as fp16, an all-true attention mask shrunk. `tokens.txt` is its vocabulary.
- `kitten-pico-en-int4.onnx`, `kitten-eleanor.f32`, `kitten.json`: Kitten TTS 2 Pico by KittenML (https://huggingface.co/KittenML/kitten-tts-2-pico), Apache-2.0. int4 English model, the voice Eleanor's style vectors (float32, 510 x 256) and its token ids.
- `phonemizer.js`: phonemizer 1.2.1, see `LICENSE.phonemizer`; it bundles espeak-ng, GPL-3.0, see `COPYING.espeak-ng`.
- `ort.wasm.min.mjs`, `ort-wasm-simd-threaded.mjs`, `ort-wasm-simd-threaded.wasm`: ONNX Runtime Web 1.31.1, MIT, Copyright (c) Microsoft Corporation. both models share it.
