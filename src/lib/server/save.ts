import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';
import type { SaveData } from '$lib/types/save';

const C = 'i';
const local = new Map<string, SaveData>();
let q: QdrantClient | null = null;

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

function pid(id: string): string {
	return 's_' + id;
}

export async function save_game(_event: unknown, id: string, data: SaveData): Promise<void> {
	try {
		await client().upsert(C, { points: [{ id: pid(id), payload: data as unknown as Record<string, unknown> }] });
	} catch {
		local.set(pid(id), data);
	}
}

export async function load_game(_event: unknown, id: string): Promise<SaveData | null> {
	try {
		const r = await client().retrieve(C, { ids: [pid(id)] });
		const p = r[0]?.payload as Record<string, unknown> | undefined;
		if (!p || p.s !== 'g') return null;
		return {
			s: 'g',
			f: p.f as string,
			h: p.h as string,
			m: p.m as number,
			o: p.o as 'w' | 'b',
			u: p.u as string,
			a: p.a as string,
			r: p.r as string,
			v: p.v as boolean,
			x: p.x as string,
			g: p.g as string,
			l: p.l as number,
			c: p.c as string,
			d: p.d as number
		};
	} catch {
		return local.get(pid(id)) || null;
	}
}
