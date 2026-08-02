import { decode_session, SESSION_COOKIE_DELETE } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  const session_id = event.cookies.get('session');
  event.locals.user = null;
  if (session_id) {
    console.log('[HOOKS] session cookie found on', path, '- decoding...');
    const s = await decode_session(session_id);
    if (s) {
      console.log('[HOOKS] session valid, user:', s.user.id);
      event.locals.user = s.user;
    } else {
      console.log('[HOOKS] session invalid/expired, deleting cookie');
      event.cookies.delete('session', SESSION_COOKIE_DELETE);
    }
  } else {
    if (path === '/i' || path === '/api/') console.log('[HOOKS] no session cookie on', path);
  }
  return resolve(event);
};
