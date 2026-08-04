import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { find_login_user } from '$lib/server/user';
import { encode_session, SESSION_COOKIE } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { email, password } = await request.json();
  if (!email || !password) {
    return json({ error: 'Email and password required' }, { status: 400 });
  }
  const existing = await find_login_user(email);
  if (!existing || !existing.hash) {
    return json({ error: existing && !existing.hash ? 'Try signing in with Google' : 'Invalid email or password' }, { status: 401 });
  }
  const match = await bcrypt.compare(password, existing.hash);
  if (!match) {
    return json({ error: 'Invalid email or password' }, { status: 401 });
  }
  const session = await encode_session({ id: existing.i, name: existing.n ?? '', picture: existing.pic, email });
  cookies.set('session', session, SESSION_COOKIE);
  return json({ success: true, user: { id: existing.i, email, name: existing.n, picture: existing.pic } });
};
