export type Color = 'w' | 'b';

// stockfish 10 in webassembly: ~10x the speed of the old asm.js build at a quarter of the bytes
export const ENGINE = '/engine/10/stockfish.js';

export interface Hint {
	move: string
	score: number
	depth: number
}

export interface LearnEngineOpts {
	depth?: number
	moveTime?: number
	color?: Color | 'both' | 'none'
	skill?: number
}

const S = { Un: 'uninitialised', In: 'initialising', Wa: 'waiting', Se: 'searching' } as const;
type St = (typeof S)[keyof typeof S];

// how strong the computer plays, from someone who just learned the moves to full strength.
// stockfish's skill level (0-20) makes it choose a weaker move among its best few, the way lichess's easy bots do,
// so its mistakes are human-looking misses, never random moves with no idea behind them
export const LEVELS = [
	{ t: 'learning', d: 'just learned the moves', skill: 0, depth: 1, moveTime: 50 },
	{ t: 'easy', d: 'plays for fun', skill: 3, depth: 2, moveTime: 100 },
	{ t: 'medium', d: 'knows the basics', skill: 8, depth: 5, moveTime: 300 },
	{ t: 'hard', d: 'a strong club player', skill: 15, depth: 12, moveTime: 800 },
	{ t: 'strongest', d: 'the computer at full power', skill: 20, depth: 22, moveTime: 1500 }
];

export class LearnEngine {
	private w: Worker | undefined;
	private st: St = S.Un;
	private mt: number;
	private dp: number;
	private sk: number;
	private co: Color | 'both' | 'none';
	private tm: ReturnType<typeof setTimeout> | undefined;
	private uciCb: ((s: string) => void) | undefined;
	private onReady: (() => void) | undefined;
	private onBM: ((s: string) => void) | undefined;

	constructor(o: LearnEngineOpts = {}) {
		this.mt = o.moveTime ?? 2000;
		this.dp = o.depth ?? 40;
		this.sk = o.skill ?? 20;
		this.co = o.color ?? 'b';
	}

	init(): Promise<void> {
		return new Promise((res) => {
			this.st = S.In;
			this.w = new Worker(ENGINE);
			this.w.addEventListener('message', (e) => this._onMsg(e));
			let sentOpts = false;
			this.onReady = () => {
				if (this.st !== S.In) return;
				if (!sentOpts) {
					sentOpts = true;
					this.w!.postMessage(`setoption name Skill Level value ${this.sk}`);
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
		const w = new Worker(ENGINE);
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

// one check at a time, in order, all on the one warm worker: the coach's facts, hints and the mistake watch
export function check_position(fen: string, ms = 1000): Promise<Check | null> {
	const job = queue.then(() => think(fen, ms)).catch(() => null);
	queue = job;
	return job;
}
