import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// the shape lib/progress.svelte.ts keeps; anything else is refused
const id = z.string().max(24);
const game = z.object({ d: z.number(), w: z.enum(['w', 'l', 'd']), a: z.number().min(0).max(100), l: z.number().int().min(1).max(5) });
const progress = z.object({ r: z.number().min(0).max(4000), n: z.number().int().min(0), y: z.number().int().min(0), c: z.number().int().min(0), b: z.number().int().min(0), s: z.number().int().min(0), t: z.string().max(10), g: z.array(game).max(50), l: id.array().max(400).default([]), v: z.record(id, z.tuple([z.number().int().min(0).max(9), z.number().int()])).refine((v) => Object.keys(v).length <= 400).default({}) });

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.a) error(401, 'log in first');
	const r = await platform!.env.DB.prepare('select g from u where i = ?').bind(locals.user.id).first<{ g: string | null }>();
	return json(r?.g ? JSON.parse(r.g) : null);
};

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.a) error(401, 'log in first');
	const p = progress.safeParse(await request.json().catch(() => null));
	if (!p.success) error(400, 'bad progress');
	await platform!.env.DB.prepare('update u set g = ? where i = ?').bind(JSON.stringify(p.data), locals.user.id).run();
	return json({ ok: true });
};
