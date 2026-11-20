import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { get_balance } from '$lib/server/token_balance';

export const GET: RequestHandler = async ({ locals, platform }) => json({ balance: locals.user ? await get_balance(platform!.env.DB, locals.user.id) : 0 });
