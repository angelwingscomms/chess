import { Chess } from 'chess.js';

export type Color = 'w' | 'b';

export interface Hint {
	move: string
	score: number
	depth: number
}

export function getHints(fen: string, count = 5, stockfishPath?: string, signal?: AbortSignal, depth?: number, moveTime?: number): Promise<Hint[]> {
	const sp = stockfishPath ?? '/stockfish.js';
	const mt = moveTime ?? 8000;
	let w: Worker | undefined;
	try { w = new Worker(sp); } catch (e) { return Promise.reject(e); }
	const ww = w!;
	return new Promise((res, rej) => {
		if (signal?.aborted) { ww.terminate(); rej(signal.reason); return; }
		const hints: Hint[] = [];
		const t = setTimeout(() => { ww.terminate(); rej(new Error('timeout')); }, mt + 10000);
		signal?.addEventListener('abort', () => { clearTimeout(t); ww.terminate(); rej(signal.reason); }, { once: true });
		ww.addEventListener('message', ({ data }) => {
			const u = data as string;
			if (u === 'uciok') {
				ww.postMessage('setoption name MultiPV value ' + count);
				ww.postMessage('setoption name UCI_LimitStrength value false');
				ww.postMessage('isready');
			} else if (u === 'readyok') {
				ww.postMessage('position fen ' + fen);
				if (depth !== undefined) {
					ww.postMessage(`go depth ${depth} movetime ${mt}`);
				} else {
					ww.postMessage(`go movetime ${mt}`);
				}
			} else if (u.startsWith('info') && u.includes('multipv')) {
				const mpv = parseInt(u.match(/multipv\s+(\d+)/)?.[1] ?? '0');
				const depth = parseInt(u.match(/depth\s+(\d+)/)?.[1] ?? '0');
				const sc = u.match(/score\s+mate\s+([-\d]+)/);
				const sc2 = u.match(/score\s+cp\s+([-\d]+)/);
				let score = 0;
				if (sc) score = parseInt(sc[1]) > 0 ? 100000 : -100000;
				else if (sc2) score = parseInt(sc2[1]);
				const move = u.match(/\bpv\s+(\S+)/)?.[1] ?? '';
				if (move && mpv > 0 && mpv <= count) hints[mpv - 1] = { move, score, depth };
			} else if (u.startsWith('bestmove')) {
				clearTimeout(t);
				ww.terminate();
				res(hints.filter(Boolean));
			}
		});
		ww.postMessage('uci');
	});
}

export interface LearnEngineOpts {
	elo?: number | null
	depth?: number
	moveTime?: number
	color?: Color | 'both' | 'none'
	stockfishPath?: string
	blunder?: number
}

const S = { Un: 'uninitialised', In: 'initialising', Wa: 'waiting', Se: 'searching' } as const;
type St = (typeof S)[keyof typeof S];

// how strong the computer plays, from someone who just learned the moves to full strength.
// stockfish can't play below about 1320, so the easy levels also make a random move now and then
export const LEVELS = [
	{ t: 'learning', d: 'just learned the moves', elo: null, depth: 1, moveTime: 400, blunder: 0.45 },
	{ t: 'easy', d: 'plays for fun', elo: null, depth: 3, moveTime: 500, blunder: 0.2 },
	{ t: 'medium', d: 'knows the basics', elo: 1320, depth: 10, moveTime: 700, blunder: 0.05 },
	{ t: 'hard', d: 'a strong club player', elo: 1900, depth: 16, moveTime: 1000, blunder: 0 },
	{ t: 'strongest', d: 'the computer at full power', elo: null, depth: 22, moveTime: 1500, blunder: 0 }
];

export const HINT_PRESETS = [
	{ depth: 4,  moveTime: 500  },
	{ depth: 6,  moveTime: 1000 },
	{ depth: 8,  moveTime: 1500 },
	{ depth: 10, moveTime: 2000 },
	{ depth: 14, moveTime: 3000 },
	{ depth: 18, moveTime: 4000 },
	{ depth: 22, moveTime: 5000 },
	{ depth: 28, moveTime: 6000 },
	{ depth: 34, moveTime: 7000 },
	{ depth: 40, moveTime: 8000 },
];

export class LearnEngine {
	private w: Worker | undefined;
	private st: St = S.Un;
	private mt: number;
	private dp: number;
	private el: number | null;
	private co: Color | 'both' | 'none';
	private sp: string;
	private bl: number;
	// true when the last move came from the easy levels' dice, not from thinking
	random = false;
	private tm: ReturnType<typeof setTimeout> | undefined;
	private uciCb: ((s: string) => void) | undefined;
	private onReady: (() => void) | undefined;
	private onBM: ((s: string) => void) | undefined;

	constructor(o: LearnEngineOpts = {}) {
		this.mt = o.moveTime ?? 2000;
		this.dp = o.depth ?? 40;
		this.el = o.elo ?? null;
		this.co = o.color ?? 'b';
		this.sp = o.stockfishPath ?? '/stockfish.js';
		this.bl = o.blunder ?? 0;
	}

	init(): Promise<void> {
		return new Promise((res) => {
			this.st = S.In;
			this.w = new Worker(this.sp);
			this.w.addEventListener('message', (e) => this._onMsg(e));
			let sentOpts = false;
			this.onReady = () => {
				if (this.st !== S.In) return;
				if (!sentOpts) {
					sentOpts = true;
					this.w!.postMessage(`setoption name UCI_LimitStrength value ${this.el !== null}`);
					if (this.el !== null) this.w!.postMessage(`setoption name UCI_Elo value ${this.el}`);
					this.w!.postMessage('isready');
					return;
				}
				this.st = S.Wa;
				this.onReady = undefined;
				res();
			};
			this.w.postMessage('uci');
		});
	}

	private _onMsg({ data }: { data: string }) {
		const u = data;
		if (this.onReady && (u === 'uciok' || u === 'readyok')) { this.onReady(); }
		if (this.onBM && u.startsWith('bestmove')) { this.onBM(u); }
		if (this.uciCb) { this.uciCb(u); }
	}

	setUciCallback(cb: (s: string) => void) { this.uciCb = cb; }

	getMove(fen: string): Promise<string> {
		return new Promise((res) => {
			if (!this.w) throw Error('Engine not initialised');
			if (this.st !== S.Wa) throw Error(`Engine not ready (state: ${this.st})`);
			this.st = S.Se;
			const t0 = performance.now();
			// a short pause even when the search is instant, so the computer seems to think
			const done = (lan: string) => {
				this.tm = setTimeout(() => {
					this.tm = undefined;
					this.st = S.Wa;
					res(lan);
				}, Math.max(0, 500 - (performance.now() - t0)));
			};
			const all = this.bl && Math.random() < this.bl ? new Chess(fen).moves({ verbose: true }) : [];
			this.random = all.length > 0;
			if (all.length) {
				const m = all[Math.floor(Math.random() * all.length)];
				return done(m.from + m.to + (m.promotion ?? ''));
			}
			this.w.postMessage(`position fen ${fen}`);
			this.w.postMessage(`go depth ${this.dp} movetime ${this.mt}`);
			this.onBM = (u: string) => {
				this.onBM = undefined;
				done(u.split(' ')[1]);
			};
		});
	}

	getColor() { return this.co; }
	setColor(c: Color | 'both' | 'none') { this.co = c; }
	isSearching() { return this.st === S.Se; }

	stopSearch(): Promise<void> {
		return new Promise((res) => {
			if (!this.w) throw Error('Engine not initialised');
			if (this.st !== S.Se) { res(); return; }
			// only the thinking pause is left: drop the move, like a stopped search
			if (!this.onBM) { clearTimeout(this.tm); this.st = S.Wa; res(); return; }
			this.onBM = () => { this.st = S.Wa; this.onBM = undefined; res(); };
			this.w.postMessage('stop');
		});
	}
}

// one warm engine for the coach's checks: the best move, the moves after it, and who is ahead.
// s centipawns from white's side; k mate in k moves, positive when white mates, 0 when there is none
export type Check = { m: string; s: number; k: number; pv: string[] };

let warm: Promise<Worker> | undefined;
let queue: Promise<unknown> = Promise.resolve();

function coach_engine() {
	warm ??= new Promise<Worker>((ok, no) => {
		const w = new Worker('/stockfish.js');
		const t = setTimeout(() => no(new Error('engine timeout')), 20000);
		w.onmessage = ({ data }: MessageEvent<string>) => {
			if (data === 'uciok') w.postMessage('isready');
			else if (data === 'readyok') {
				clearTimeout(t);
				w.onmessage = null;
				ok(w);
			}
		};
		w.postMessage('uci');
	}).catch((e) => {
		warm = undefined;
		throw e;
	});
	return warm;
}

async function think(fen: string, ms: number): Promise<Check | null> {
	const w = await coach_engine();
	const sign = fen.split(' ')[1] === 'b' ? -1 : 1;
	return new Promise((ok) => {
		let best: Check | null = null;
		const t = setTimeout(() => w.postMessage('stop'), ms + 3000);
		w.onmessage = ({ data }: MessageEvent<string>) => {
			if (data.startsWith('info') && data.includes(' pv ')) {
				const mate = data.match(/score mate (-?\d+)/);
				const cp = data.match(/score cp (-?\d+)/);
				const pv = data.split(' pv ')[1].trim().split(' ');
				best = { m: pv[0], s: cp ? sign * +cp[1] : 0, k: mate ? sign * +mate[1] : 0, pv };
			} else if (data.startsWith('bestmove')) {
				clearTimeout(t);
				w.onmessage = null;
				const m = data.split(' ')[1];
				ok(!m || m === '(none)' ? null : best?.m === m ? best : { m, s: best?.s ?? 0, k: best?.k ?? 0, pv: [m] });
			}
		};
		w.postMessage(`position fen ${fen}`);
		w.postMessage(`go movetime ${ms}`);
	});
}

// one check at a time, in order
export function check_position(fen: string, ms = 1200): Promise<Check | null> {
	const job = queue.then(() => think(fen, ms)).catch(() => null);
	queue = job;
	return job;
}
