const SCALE = [0, 2, 4, 7, 9];

export const note_hz = (i: number) => 196 * 2 ** ((Math.floor(i / 5) * 12 + SCALE[((i % 5) + 5) % 5]) / 12);

export type Sound = ReturnType<typeof make_sound>;

export function make_sound() {
	let ctx: AudioContext | null = null;
	let bus: GainNode | null = null;
	let hiss: AudioBuffer | null = null;
	let on = false;
	let last = 0;

	function boot() {
		if (ctx) return ctx;
		const c = new AudioContext();
		const master = c.createGain();
		master.gain.value = 0;
		const lp = c.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 4200;
		const verb = c.createConvolver();
		const len = c.sampleRate * 2.6;
		const ir = c.createBuffer(2, len, c.sampleRate);
		for (let ch = 0; ch < 2; ch++) {
			const d = ir.getChannelData(ch);
			for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.4;
		}
		verb.buffer = ir;
		const wet = c.createGain();
		wet.gain.value = 0.32;
		master.connect(lp);
		lp.connect(c.destination);
		lp.connect(verb);
		verb.connect(wet);
		wet.connect(c.destination);
		hiss = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
		const h = hiss.getChannelData(0);
		for (let i = 0; i < h.length; i++) h[i] = Math.random() * 2 - 1;
		ctx = c;
		bus = master;
		return c;
	}

	function level(v: number) {
		if (ctx && bus) bus.gain.setTargetAtTime(v, ctx.currentTime, v ? 0.4 : 0.12);
	}

	function set(v: boolean) {
		on = v;
		try {
			localStorage.setItem('e4_sound', v ? '1' : '0');
		} catch {}
		if (v) boot().resume();
		level(v ? 0.9 : 0);
	}

	function pref() {
		try {
			return localStorage.getItem('e4_sound');
		} catch {
			return null;
		}
	}

	function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(peak, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
	}

	function tone(f: number, peak: number, attack: number, decay: number, delay = 0, to = 0) {
		if (!on || !ctx || !bus) return;
		const t = ctx.currentTime + delay;
		const o = ctx.createOscillator();
		o.frequency.setValueAtTime(f, t);
		if (to) o.frequency.exponentialRampToValueAtTime(to, t + decay * 0.5);
		const g = ctx.createGain();
		env(g, t, peak, attack, decay);
		o.connect(g).connect(bus);
		o.start(t);
		o.stop(t + attack + decay + 0.05);
	}

	function breath(f0: number, f1: number, peak: number, attack: number, decay: number, q: number) {
		if (!on || !ctx || !bus || !hiss) return;
		const t = ctx.currentTime;
		const src = ctx.createBufferSource();
		src.buffer = hiss;
		src.loop = true;
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.Q.value = q;
		bp.frequency.setValueAtTime(f0, t);
		bp.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
		const g = ctx.createGain();
		env(g, t, peak, attack, decay);
		src.connect(bp).connect(g).connect(bus);
		src.start(t);
		src.stop(t + attack + decay + 0.05);
	}

	return {
		pref,
		set,
		get on() {
			return on;
		},
		pause: () => level(0),
		chime(i: number, v = 1) {
			if (!on || !ctx) return;
			if (ctx.currentTime - last < 0.045) return;
			last = ctx.currentTime;
			const f = note_hz(i);
			tone(f, 0.05 * v, 0.006, 2.4);
			tone(f * 2, 0.012 * v, 0.004, 1.2);
			tone(f * 3.01, 0.004 * v, 0.003, 0.6);
		},
		drop() {
			tone(760, 0.05, 0.004, 0.32, 0, 260);
			tone(1140, 0.014, 0.004, 0.18, 0.07, 520);
		},
		bowl(i: number) {
			const f = note_hz(i) / 2;
			tone(f, 0.03, 0.3, 6);
			tone(f + 0.8, 0.02, 0.3, 6);
			tone(f * 2.76, 0.008, 0.25, 3.2);
			tone(f * 5.4, 0.003, 0.2, 1.6);
		},
		air(inhale: boolean) {
			breath(inhale ? 320 : 900, inhale ? 900 : 320, 0.012, 1.8, 2.2, 0.7);
		},
		tick() {
			tone(2400, 0.006, 0.002, 0.03);
		},
		nope() {
			tone(196, 0.03, 0.004, 0.09, 0, 180);
			tone(165, 0.026, 0.004, 0.12, 0.11, 150);
		},
		thock(v = 1) {
			tone(250, 0.045 * v, 0.002, 0.05, 0, 170);
			breath(1500, 900, 0.018 * v, 0.001, 0.025, 0.8);
		},
		chord() {
			[5, 7, 9, 10, 12].forEach((n, k) => tone(note_hz(n), 0.04, 0.01, 3, k * 0.11));
		}
	};
}
