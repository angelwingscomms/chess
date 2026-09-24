import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, any>();

vi.mock('$env/static/private', () => ({ QDRANT_URL: 'http://x', QDRANT_KEY: 'k' }));

vi.mock('@qdrant/js-client-rest', () => {
	return {
		QdrantClient: class {
			async retrieve(_c: string, { ids }: any) {
				return ids.map((id: string) => ({ id, payload: store.get(id) ?? null })).filter((p: any) => p.payload);
			}
			async upsert(_c: string, { points }: any) {
				for (const p of points) store.set(p.id, { ...p.payload, i: p.payload.i });
				return {};
			}
		}
	};
});

beforeEach(() => store.clear());

describe('openai live daily trial', () => {
	it('opens until three minutes then blocks', async () => {
		const m = await import('./openai_live_trial');
		const first = await m.open_openai_live_trial('u1', 'live_a');
		expect(first.ok).toBe(true);
		expect(first.left).toBe(180);
		const mid = await m.note_openai_live_trial('u1', 'live_a', 180);
		expect(mid.stop).toBe(true);
		expect(mid.left).toBe(0);
		const again = await m.open_openai_live_trial('u1', 'live_b');
		expect(again.ok).toBe(false);
		expect(again.left).toBe(0);
	});

	it('keeps leftover time after a short close', async () => {
		const m = await import('./openai_live_trial');
		await m.open_openai_live_trial('u2', 'live_c');
		const closed = await m.close_openai_live_trial('u2', 'live_c', 60);
		expect(closed.left).toBe(120);
		const next = await m.open_openai_live_trial('u2', 'live_d');
		expect(next.ok).toBe(true);
		expect(next.left).toBe(120);
		expect(next.prev).toBe('');
	});
});
