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
	private mt: number;
	private dp: number;
	private sk: number;
	private co: Color | 'both' | 'none';
	private tm: ReturnType<typeof setTimeout> | undefined;
	private uci_cb: ((s: string) => void) | undefined;
	private on_best: ((s: string) => void) | undefined;

	constructor(o: LearnEngineOpts = {}) {
		this.mt = o.moveTime ?? 2000;
		this.dp = o.depth ?? 40;
		this.sk = o.skill ?? 20;
		this.co = o.color ?? 'b';
	}

	init(): Promise<void> {
		// svelte-chess enables legal moves when init resolves. Only the reply needs Stockfish.
		return Promise.resolve();
	}

	prepare() {
		if (this.w) return this.w;
		const worker = new Worker(ENGINE);
		this.w = worker;
		worker.onmessage = ({ data }: MessageEvent<string>) => {
			if (data.startsWith('bestmove')) this.on_best?.(data.split(' ')[1]);
			this.uci_cb?.(data);
		};
		// This Stockfish worker runs queued commands in order once its WASM has loaded.
		worker.postMessage('uci');
		worker.postMessage(`setoption name Skill Level value ${this.sk}`);
		worker.postMessage('isready');
		return worker;
	}

	setUciCallback(cb: (s: string) => void) { this.uci_cb = cb; }

	getMove(fen: string): Promise<string> {
		return new Promise((res) => {
			if (this.isSearching()) throw Error('Engine is already searching');
			const t0 = performance.now();
			const worker = this.prepare();
			// a short pause even when the search is instant, so the computer seems to think
			this.on_best = (lan) => {
				this.on_best = undefined;
				this.tm = setTimeout(() => {
					this.tm = undefined;
					res(lan);
				}, Math.max(0, 500 - (performance.now() - t0)));
			};
			worker.postMessage(`position fen ${fen}`);
			worker.postMessage(`go depth ${this.dp} movetime ${this.mt}`);
		});
	}

	getColor() { return this.co; }
	setColor(c: Color | 'both' | 'none') { this.co = c; }
	isSearching() { return !!this.on_best || this.tm !== undefined; }

	stopSearch(): Promise<void> {
		// Cancel even when the worker is still loading. A replacement search can start immediately.
		if (this.on_best) this.release_worker();
		this.on_best = undefined;
		clearTimeout(this.tm);
		this.tm = undefined;
		return Promise.resolve();
	}

	private release_worker() {
		if (!this.w) return;
		this.w.onmessage = null;
		this.w.terminate();
		this.w = undefined;
	}

	dispose() {
		void this.stopSearch();
		this.release_worker();
		this.uci_cb = undefined;
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
