import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { close_openai_live_trial, hangup_openai_live, note_openai_live_trial } from '$lib/server/openai_live_trial';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user?.id) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json().catch(() => ({}));
	const seconds = body?.s;
	const id = typeof body?.i === 'string' ? body.i.trim() : '';
	const done = body?.d === true;
	if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
		return json({ error: 'Invalid seconds' }, { status: 400 });
	}
	if (!id) return json({ error: 'missing session' }, { status: 400 });

	const rec = done
		? await close_openai_live_trial(locals.user.id, id, seconds)
		: await note_openai_live_trial(locals.user.id, id, seconds);
	if (rec.stop || rec.left <= 0) {
		await hangup_openai_live(id, env.OPENAI_KEY || '');
		return json({ left: 0, stop: true });
	}
	return json({ left: rec.left, stop: false });
};
