// a live call with the coach, as in rope and pilotspan: the mic stays open, a pause ends your turn, the answer is spoken.
// listening (stt.worker.ts) and speaking (tts.worker.ts) both run in the browser; only the words go to the coach.
import { prefetch } from './speech_files';

const RATE = 16000;
const FRAME_MS = 20;
const TURN_MS = 1440; // silence that ends your turn: a normal pause for thought survives it, a reply still feels quick
const ECHO_MS = 400; // the mic stays deaf this long after an answer, for the room's echo of its last words
const SILENCE_MS = 270; // a pause this long cuts a piece to transcribe while you go on talking
const MAX_PIECE_MS = 25000;
const MIN_SPEECH_MS = 200;
const PREROLL = 10;
const TAIL = 10;
const HELLO = 'hi! ask me anything about chess.';

// s: '' off, 'l' getting the voice ready, 'h' listening, 't' the coach is thinking, 's' speaking.
// v mic level 0..1, g first download 0..1, q what it heard so far, m mic muted, o speaker muted
export const vc = $state({ s: '' as '' | 'l' | 'h' | 't' | 's', v: 0, g: 0, q: '', m: false, o: false });

// made on the first call: the server that renders the page has no object urls
const worklet = () =>
	URL.createObjectURL(
	new Blob(
		[
			`registerProcessor('e4-pcm', class extends AudioWorkletProcessor {
	b = new Float32Array(Math.round(sampleRate * ${FRAME_MS / 1000})); n = 0;
	process(i) {
		const c = i[0]?.[0];
		if (c) for (const x of c) { this.b[this.n++] = x; if (this.n === this.b.length) { this.port.postMessage(this.b.slice()); this.n = 0; } }
		return true;
	}
});`
		],
		{ type: 'text/javascript' }
	)
);

let worklet_url: string | undefined;
let stt: Worker | undefined;
let tts: Worker | undefined;
let job = 0;
const jobs = new Map<number, { ok: (t: string) => void; no: (e: Error) => void }>();

function transcribe(pcm: Int16Array) {
	stt ??= Object.assign(new Worker(new URL('./stt.worker.ts', import.meta.url), { type: 'module' }), {
		onmessage: ({ data }: MessageEvent<{ i: number; t?: string; e?: string }>) => {
			const j = jobs.get(data.i);
			jobs.delete(data.i);
			if (data.e) j?.no(new Error(data.e));
			else j?.ok(data.t ?? '');
		}
	});
	const i = ++job;
	return new Promise<string>((ok, no) => {
		jobs.set(i, { ok, no });
		stt!.postMessage({ i, pcm }, [pcm.buffer]);
	});
}

// one call at a time: n bumps on every start and end, so late results from an old call are dropped
type Live = {
	stream: MediaStream;
	mic: AudioContext;
	out: AudioContext;
	gain: GainNode; // the speaker, so it can be muted
	mix: MediaStreamAudioDestinationNode; // both voices, for a screen recording
	ask: (q: string) => Promise<string>;
	heard: string[];
	pending: number;
	chain: Promise<void>;
	sources: AudioBufferSourceNode[];
	next_at: number;
	deaf_until: number;
	say: number;
	hum: AudioBufferSourceNode | null;
};
let live: Live | null = null;
let n = 0;

export function end_call() {
	n++;
	vc.s = '';
	vc.q = '';
	vc.v = 0;
	if (!live) return;
	live.stream.getTracks().forEach((t) => t.stop());
	void live.mic.close();
	void live.out.close();
	tts?.postMessage({ c: live.say });
	live = null;
}

// what the call sounds like, both voices mixed, for a screen recording
export const call_audio = () => live?.mix.stream ?? null;

export function toggle_mic() {
	vc.m = !vc.m;
	live?.stream.getAudioTracks().forEach((t) => (t.enabled = !vc.m));
}

export function toggle_speaker() {
	vc.o = !vc.o;
	if (live) live.gain.gain.value = vc.o ? 0 : 1;
}

// runs inside the tap, so the browser lets audio play. ask sends what was heard to the coach and resolves with its answer
export async function start_call(ask: (q: string) => Promise<string>, fail: (msg: string) => void) {
	const me = ++n;
	stop_reading();
	const out = new AudioContext({ sampleRate: 24000 });
	vc.s = 'l';
	vc.q = '';
	const stream = await navigator.mediaDevices
		.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
		.catch(() => null);
	if (me !== n || !stream) {
		void out.close();
		stream?.getTracks().forEach((t) => t.stop());
		if (me !== n) return;
		end_call();
		return fail('no microphone, or it was blocked. allow the mic for this site and try again.');
	}
	let warming: Promise<string> | undefined;
	try {
		await prefetch((f) => (vc.g = f), () => {
			if (me === n) {
				warming = transcribe(new Int16Array(0));
				void warming.catch(() => {});
			}
		});
	} catch {
		void out.close();
		stream.getTracks().forEach((t) => t.stop());
		if (me !== n) return;
		end_call();
		return fail('the voice couldn’t download. check your connection and try again.');
	}
	if (me !== n) {
		void out.close();
		stream.getTracks().forEach((t) => t.stop());
		return;
	}
	tts ??= new Worker(new URL('./tts.worker.ts', import.meta.url), { type: 'module' });
	tts.postMessage({}); // warm the voice while the mic opens
	let mic: AudioContext;
	let src: MediaStreamAudioSourceNode;
	try {
		mic = new AudioContext({ sampleRate: RATE });
		src = mic.createMediaStreamSource(stream);
	} catch {
		// some browsers refuse a 16 kHz context for a mic at another rate
		mic = new AudioContext();
		src = mic.createMediaStreamSource(stream);
	}
	const gain = out.createGain();
	gain.gain.value = vc.o ? 0 : 1;
	const mix = out.createMediaStreamDestination();
	gain.connect(out.destination);
	gain.connect(mix);
	out.createMediaStreamSource(stream).connect(mix);
	floor = 0.005;
	seg = null;
	pre = [];
	onset = silent = voiced = quiet = 0;
	live = { stream, mic, out, gain, mix, ask, heard: [], pending: 0, chain: Promise.resolve(), sources: [], next_at: 0, deaf_until: 0, say: 0, hum: null };
	await mic.audioWorklet.addModule((worklet_url ??= worklet()));
	if (me !== n) return;
	const node = new AudioWorkletNode(mic, 'e4-pcm', { numberOfOutputs: 0 });
	node.port.onmessage = ({ data }) => hear(data as Float32Array);
	src.connect(node);
	// the first transcription loads the model; an empty one does it now, before you speak
	(warming ?? transcribe(new Int16Array(0))).then(
		() => {
			if (me !== n || vc.s !== 'l' || !live) return;
			vc.s = 'h';
			speak(live, HELLO);
		},
		(e: Error) => {
			if (me !== n) return;
			end_call();
			fail('voice: ' + e.message);
		}
	);
}

// speaks a typed answer too while a call is on
export function say(text: string) {
	if (live && (vc.s === 'h' || vc.s === 't')) speak(live, text);
}

const rms = (f: Float32Array) => Math.sqrt(f.reduce((s, x) => s + x * x, 0) / f.length);

// cuts the mic into pieces at short pauses: speech starts after two loud frames, with pre-roll; the floor adapts in quiet
let floor = 0.005,
	pre: Float32Array[] = [],
	seg: Float32Array[] | null = null,
	onset = 0,
	silent = 0,
	voiced = 0,
	quiet = 0;

function hear(f: Float32Array) {
	if (!live || !vc.s) return;
	const level = vc.m ? 0 : rms(f);
	vc.v = Math.min(1, level / 0.08);
	// you can start talking while the voice loads: pieces wait in the worker for the model
	if (vc.m || vc.s === 't' || vc.s === 's' || performance.now() < live.deaf_until) return;
	const loud = level > Math.max(0.01, floor * 4);
	quiet = loud ? 0 : quiet + 1;
	if (!seg) {
		if (!loud) floor = Math.max(0.002, floor * 0.95 + level * 0.05);
		pre.push(f);
		if (pre.length > PREROLL) pre.shift();
		onset = loud ? onset + 1 : 0;
		if (onset >= 2) {
			seg = pre;
			voiced = onset;
			silent = 0;
		}
	} else {
		seg.push(f);
		if (loud) {
			silent = 0;
			voiced++;
		} else silent++;
		if (silent * FRAME_MS >= SILENCE_MS || seg.length * FRAME_MS >= MAX_PIECE_MS) cut();
	}
	if (!seg && live.heard.length && !live.pending && quiet * FRAME_MS >= TURN_MS) void turn();
}

function cut() {
	const l = live!;
	if (seg && voiced * FRAME_MS >= MIN_SPEECH_MS) {
		const pcm = to16k(seg.slice(0, seg.length - Math.max(0, silent - TAIL)), l.mic.sampleRate);
		l.pending++;
		l.chain = l.chain
			.then(() => transcribe(pcm))
			.then(
				(t) => t && l.heard.push(t),
				() => {}
			)
			.then(() => {
				l.pending--;
				if (l === live) vc.q = l.heard.join(' ');
			});
	}
	seg = null;
	pre = [];
	onset = silent = voiced = 0;
}

// linear interpolation to 16 kHz int16
function to16k(frames: Float32Array[], rate: number) {
	const pcm = new Float32Array(frames.reduce((s, f) => s + f.length, 0));
	frames.reduce((o, f) => (pcm.set(f, o), o + f.length), 0);
	const out = new Int16Array(Math.floor((pcm.length * RATE) / rate));
	for (let i = 0; i < out.length; i++) {
		const x = (i * rate) / RATE,
			j = x | 0,
			k = x - j;
		const v = pcm[j] * (1 - k) + (pcm[j + 1] ?? pcm[j]) * k;
		out[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32768)));
	}
	return out;
}

async function turn() {
	const l = live!;
	const q = l.heard.join(' ');
	l.heard = [];
	vc.s = 't';
	vc.q = q;
	hum(l, true);
	let a: string;
	try {
		a = await l.ask(q);
	} catch {
		a = 'sorry, i couldn’t answer that. try again.';
	}
	if (l !== live) return;
	speak(l, a || 'sorry, i couldn’t answer that. try again.');
}

// a soft low hum while the coach thinks, so silence never feels like a dropped call
let hum_buf: AudioBuffer | null = null;
function hum(l: Live, on: boolean) {
	if (!on) {
		l.hum?.stop(l.out.currentTime + 0.3);
		l.hum = null;
		return;
	}
	if (l.hum) return;
	const rate = l.out.sampleRate;
	if (!hum_buf || hum_buf.sampleRate !== rate) {
		hum_buf = l.out.createBuffer(1, Math.round(rate * 1.9), rate);
		const d = hum_buf.getChannelData(0);
		let lp = 0;
		for (let i = 0; i < d.length; i++) {
			const t = i / rate;
			const env = t < 0.45 ? Math.sin((t / 0.45) * Math.PI * 0.5) ** 2 : Math.exp(-(t - 0.45) * 3.2);
			const w = Math.sin(2 * Math.PI * 130.81 * t) + 0.3 * Math.sin(4 * Math.PI * 130.81 * t) + 0.08 * Math.sin(6 * Math.PI * 130.81 * t);
			lp += (w * env - lp) * 0.12;
			d[i] = lp * 0.22;
		}
	}
	const s = l.out.createBufferSource();
	s.buffer = hum_buf;
	s.loop = true;
	s.connect(l.gain);
	s.start();
	l.hum = s;
}

// the mic goes deaf only once the voice is actually heard; until then the hum (or the quiet) carries on
function speak(l: Live, text: string) {
	const i = ++job;
	l.say = i;
	const back = () => {
		if (l !== live || l.say !== i) return;
		hum(l, false);
		l.deaf_until = performance.now() + ECHO_MS;
		quiet = 0;
		vc.s = 'h';
	};
	let done = false;
	tts!.onmessage = ({ data }: MessageEvent<{ i: number; a?: Float32Array; d?: 1; e?: string }>) => {
		if (data.i !== i || l !== live) return;
		if (data.d || data.e) {
			done = true;
			if (!l.sources.length) back();
		}
		if (!data.a) return;
		if (vc.s !== 's') {
			vc.s = 's';
			hum(l, false);
		}
		const b = l.out.createBuffer(1, data.a.length, 24000);
		// the model speaks quietly; double it, clipped
		b.getChannelData(0).set(data.a.map((x) => Math.max(-1, Math.min(1, x * 2))));
		const s = l.out.createBufferSource();
		s.buffer = b;
		s.connect(l.gain);
		s.onended = () => {
			l.sources = l.sources.filter((x) => x !== s);
			if (done && !l.sources.length) back();
		};
		// a small lead keeps the first clause from stuttering while the next one is made
		l.next_at = Math.max(l.next_at, l.out.currentTime + 0.25);
		s.start(l.next_at);
		l.next_at += b.duration;
		l.sources.push(s);
	};
	const spoken = text
		.replace(/[*_`#>~|[\]]|\p{Extended_Pictographic}/gu, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (spoken) tts!.postMessage({ i, t: spoken });
	else back();
}

// read aloud: one reply spoken on a tap, outside a call. k is the reply being read (-1 none), l true while the voice loads
export const ra = $state({ k: -1, l: false });
let ra_out: AudioContext | null = null;
let ra_job = 0;

export function stop_reading() {
	if (ra_job) tts?.postMessage({ c: ra_job });
	ra_job = 0;
	ra.k = -1;
	ra.l = false;
	void ra_out?.close();
	ra_out = null;
}

// runs inside the tap, so the browser lets audio play; a second tap on the same reply stops it
export function read_aloud(k: number, text: string) {
	const again = ra.k === k;
	stop_reading();
	if (again || live) return;
	const out = (ra_out = new AudioContext({ sampleRate: 24000 }));
	const i = (ra_job = ++job);
	ra.k = k;
	ra.l = true;
	let next_at = 0,
		playing = 0,
		done = false;
	const finish = () => {
		if (ra_job === i) stop_reading();
	};
	tts ??= new Worker(new URL('./tts.worker.ts', import.meta.url), { type: 'module' });
	tts.onmessage = ({ data }: MessageEvent<{ i: number; a?: Float32Array; d?: 1; e?: string }>) => {
		if (data.i !== i || ra_job !== i) return;
		if (data.d || data.e) {
			done = true;
			if (!playing) finish();
		}
		if (!data.a) return;
		ra.l = false;
		const b = out.createBuffer(1, data.a.length, 24000);
		b.getChannelData(0).set(data.a.map((x) => Math.max(-1, Math.min(1, x * 2))));
		const s = out.createBufferSource();
		s.buffer = b;
		s.connect(out.destination);
		s.onended = () => {
			playing--;
			if (done && !playing) finish();
		};
		next_at = Math.max(next_at, out.currentTime + 0.15);
		s.start(next_at);
		next_at += b.duration;
		playing++;
	};
	const spoken = text
		.replace(/[*_`#>~|[\]]|\p{Extended_Pictographic}/gu, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (spoken) tts.postMessage({ i, t: spoken });
	else finish();
}
