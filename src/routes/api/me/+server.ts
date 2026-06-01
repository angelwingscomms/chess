import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function GET(event: RequestEvent): Response {
  return json({ user: event.locals.user ?? null });
}
