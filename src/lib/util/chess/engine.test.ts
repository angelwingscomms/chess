import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LearnEngine } from './engine';

const workers: TestWorker[] = [];

class TestWorker {
	onmessage: ((event: { data: string }) => void) | null = null;
	postMessage = vi.fn();
	terminate = vi.fn();

	constructor() {
		workers.push(this);
	}

	reply(move: string) {
		this.onmessage?.({ data: `bestmove ${move}` });
	}
}

beforeEach(() => {
	vi.stubGlobal('Worker', TestWorker);
	vi.useFakeTimers();
});

afterEach(() => {
	workers.length = 0;
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

it('initialises the board before making a worker, then reuses the worker started on intent', async () => {
	const engine = new LearnEngine({ skill: 3, depth: 2, moveTime: 100 });
	await engine.init();
	expect(workers).toHaveLength(0);

	engine.prepare();
	const move = engine.getMove('position after e4');
	expect(workers).toHaveLength(1);
	expect(workers[0].postMessage.mock.calls.flat()).toEqual([
		'uci', 'setoption name Skill Level value 3', 'isready',
		'position fen position after e4', 'go depth 2 movetime 100'
	]);
	workers[0].reply('d7d5');
	await vi.advanceTimersByTimeAsync(500);
	await expect(move).resolves.toBe('d7d5');
});

it('drops a pending or delayed reply when the player changes the position', async () => {
	const engine = new LearnEngine();
	const stale = vi.fn();
	void engine.getMove('first position').then(stale);
	await engine.stopSearch();
	expect(workers[0].terminate).toHaveBeenCalledOnce();
	expect(engine.isSearching()).toBe(false);

	void engine.getMove('second position').then(stale);
	workers[0].reply('d7d5');
	workers[1].reply('e7e5');
	expect(engine.isSearching()).toBe(true);
	await engine.stopSearch();

	const move = engine.getMove('third position');
	workers[1].reply('c7c5');
	await vi.advanceTimersByTimeAsync(500);
	await expect(move).resolves.toBe('c7c5');
	expect(stale).not.toHaveBeenCalled();
	expect(workers).toHaveLength(2);

	engine.dispose();
	expect(workers[1].terminate).toHaveBeenCalledOnce();
});
