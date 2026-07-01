export type Color = 'w' | 'b';

export interface Hint {
	move: string
	score: number
	depth: number
}

export type EvalResult = {
	best_move: string;
	best_score: number;
	best_depth: number;
	best_pv: string[];
	multi_pv: { move: string; score: number; depth: number; pv: string[] }[];
};

export function getHints(fen: string, count = 5, stockfishPath?: string, signal?: AbortSignal, depth?: number, moveTime?: number): Promise<Hint[]> {
	const sp = stockfishPath ?? '/stockfish.js';
	const mt = moveTime ?? 8000;
	let w: Worker | undefined;
	try { w = new Worker(sp); } catch (e) { return Promise.reject(e); }
	const ww = w!;
	return new Promise((res, rej) => {
		if (signal?.aborted) { ww.terminate(); rej(signal.reason); return; }
		const hints: Hint[] = [];
		const t = setTimeout(() => { ww.terminate(); rej(new Error('timeout')); }, 30000);
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
}

const S = { Un: 'uninitialised', In: 'initialising', Wa: 'waiting', Se: 'searching' } as const;
type St = (typeof S)[keyof typeof S];

export function analyzePosition(fen: string, multiPv = 3, stockfishPath?: string, signal?: AbortSignal, moveTime = 3000): Promise<EvalResult> {
	const sp = stockfishPath ?? '/stockfish.js';
	const log = (msg: string) => console.log(`[engine] ${msg}`);
	log(`analyzePosition called fen=${fen.slice(0, 40)}... multiPv=${multiPv} moveTime=${moveTime}`);
	let w: Worker | undefined;
	try { w = new Worker(sp); } catch (e) { log(`Worker creation failed: ${e}`); return Promise.reject(e); }
	const ww = w!;
	return new Promise((res, rej) => {
		if (signal?.aborted) { log('aborted before start'); ww.terminate(); rej(signal.reason); return; }
		const lines: EvalResult['multi_pv'] = [];
		let best_move = '';
		let best_score = 0;
		let best_depth = 0;
		let pv_buf: string[] = [];
		let uciok = false;
		let readyok = false;
		let info_count = 0;
		const t = setTimeout(() => { log('TIMEOUT after 60000ms — terminating worker'); ww.terminate(); rej(new Error('timeout')); }, 60000);
		signal?.addEventListener('abort', () => { log('abort signal received'); clearTimeout(t); ww.terminate(); rej(signal.reason); }, { once: true });
		ww.addEventListener('message', ({ data }) => {
			const u = data as string;
			if (u === 'uciok') {
				uciok = true;
				log('uciok -> setting MultiPV');
				ww.postMessage(`setoption name MultiPV value ${multiPv}`);
				ww.postMessage('setoption name UCI_LimitStrength value false');
				ww.postMessage('isready');
			} else if (u === 'readyok') {
				readyok = true;
				log(`readyok -> starting search position=${fen.slice(0, 40)}...`);
				ww.postMessage('position fen ' + fen);
				ww.postMessage(`go movetime ${moveTime}`);
			} else if (u.startsWith('info') && u.includes('multipv')) {
				info_count++;
				const mpv = parseInt(u.match(/multipv\s+(\d+)/)?.[1] ?? '0');
				const depth = parseInt(u.match(/depth\s+(\d+)/)?.[1] ?? '0');
				const sc = u.match(/score\s+mate\s+([-\d]+)/);
				const sc2 = u.match(/score\s+cp\s+([-\d]+)/);
				let score = 0;
				if (sc) score = parseInt(sc[1]) > 0 ? 100000 : -100000;
				else if (sc2) score = parseInt(sc2[1]);
				const pv_match = u.match(/\bpv\s+(.+)/);
				const pv = pv_match ? pv_match[1].split(' ') : [];
				const move = pv[0] ?? '';
				if (move && mpv > 0 && mpv <= multiPv) {
					lines[mpv - 1] = { move, score, depth, pv };
				}
				if (mpv === 1 && move) {
					best_move = move;
					best_score = score;
					best_depth = depth;
					pv_buf = pv;
				}
				if (info_count === 1) log(`first info: mpv=${mpv} depth=${depth} score=${score} move=${move}`);
			} else if (u.startsWith('bestmove')) {
				const bm = u.split(' ')[1];
				log(`bestmove=${bm} best_move=${best_move} lines=${lines.filter(Boolean).length} info_count=${info_count} uciok=${uciok} readyok=${readyok}`);
				clearTimeout(t);
				ww.terminate();
				if (!best_move) log('WARNING: best_move is empty — Stockfish may not have produced any info lines');
				res({
					best_move,
					best_score,
					best_depth,
					best_pv: pv_buf,
					multi_pv: lines.filter(Boolean),
				});
			} else if (u.startsWith('info')) {
				// non-multipv info lines from Stockfish — ignore
			} else {
				log(`unhandled message: ${u.slice(0, 100)}`);
			}
		});
		ww.postMessage('uci');
	});
}

export const DIFFICULTY_PRESETS = [
	{ elo: 800,  depth: 4,  moveTime: 500  },
	{ elo: 1000, depth: 6,  moveTime: 750  },
	{ elo: 1200, depth: 8,  moveTime: 1000 },
	{ elo: 1400, depth: 10, moveTime: 1250 },
	{ elo: 1600, depth: 12, moveTime: 1500 },
	{ elo: 1800, depth: 14, moveTime: 1750 },
	{ elo: 2000, depth: 16, moveTime: 2000 },
	{ elo: 2200, depth: 20, moveTime: 2500 },
	{ elo: 2500, depth: 24, moveTime: 3000 },
	{ elo: null, depth: 40, moveTime: 5000 },
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
	private uciCb: ((s: string) => void) | undefined;
	private onReady: (() => void) | undefined;
	private onBM: ((s: string) => void) | undefined;

	constructor(o: LearnEngineOpts = {}) {
		this.mt = o.moveTime ?? 2000;
		this.dp = o.depth ?? 40;
		this.el = o.elo ?? null;
		this.co = o.color ?? 'b';
		this.sp = o.stockfishPath ?? '/stockfish.js';
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
					this.w!.postMessage('setoption name UCI_LimitStrength value true');
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
			this.w.postMessage(`position fen ${fen}`);
			this.w.postMessage(`go depth ${this.dp} movetime ${this.mt}`);
			this.onBM = (u: string) => {
				const lan = u.split(' ')[1];
				this.st = S.Wa;
				this.onBM = undefined;
				res(lan);
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
			this.onBM = () => { this.st = S.Wa; this.onBM = undefined; res(); };
			this.w.postMessage('stop');
		});
	}
}
