import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { words } from '$lib/sessions';

const sess = z.object({
	i: z.string().min(8).max(64),
	t: z.string().max(200),
	p: z.string().max(300),
	f: z.string().max(100),
	d: z.number().int(),
	b: z.string().max(1_000_000)
});

// ?i= gives one session with its body; otherwise the newest 50, filtered by ?q=
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) error(401, 'log in first');
	const db = platform!.env.DB;
	const i = url.searchParams.get('i');
	if (i) return json(await db.prepare('select i, t, p, f, d, b from s where i = ? and u = ?').bind(i, locals.user.id).first());
	const w = words(url.searchParams.get('q') ?? '');
	const { results } = await db
		.prepare(`select i, t, p, f, d from s where u = ?${" and instr(lower(t || ' ' || p || ' ' || b), ?) > 0".repeat(w.length)} order by d desc limit 50`)
		.bind(locals.user.id, ...w)
		.all();
	return json(results);
};

// saves sessions; the where clause keeps anyone from writing over someone else's
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, 'log in first');
	const all = z.array(sess).min(1).max(50).safeParse(await request.json().catch(() => null));
	if (!all.success) error(400, 'bad session');
	const db = platform!.env.DB;
	await db.batch(
		all.data.map((x) =>
			db
				.prepare('insert into s (i, u, t, p, f, d, b) values (?, ?, ?, ?, ?, ?, ?) on conflict (i) do update set t = excluded.t, p = excluded.p, f = excluded.f, d = excluded.d, b = excluded.b where s.u = excluded.u')
				.bind(x.i, locals.user!.id, x.t, x.p, x.f, x.d, x.b)
		)
	);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) error(401, 'log in first');
	await platform!.env.DB.prepare('delete from s where i = ? and u = ?').bind(url.searchParams.get('i'), locals.user.id).run();
	return json({ ok: true });
};
