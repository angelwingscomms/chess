import { SECRET } from '$env/static/private';

function b64(buf: Uint8Array): string {
  let s = '';
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ub64(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const raw = atob(s);
  const b = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) b[i] = raw.charCodeAt(i);
  return b;
}

async function get_key(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secret = enc.encode(SECRET).slice(0, 32);
  return crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function encode_session(data: { id: string; name: string; picture?: string; email?: string }): Promise<string> {
  const p = { u: data.id, n: data.name, p: data.picture, m: data.email, e: Date.now() + 604800000 };
  const raw = b64(new TextEncoder().encode(JSON.stringify(p)));
  const k = await get_key();
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw));
  return raw + '.' + b64(new Uint8Array(sig));
}

export async function decode_session(c: string | undefined | null): Promise<{ user: { id: string; name: string; picture?: string; email?: string } } | null> {
  if (!c) return null;
  const [raw, sig] = c.split('.');
  if (!raw || !sig) return null;
  try {
    const k = await get_key();
    const sig_bytes = ub64(sig).buffer as ArrayBuffer;
    if (!await crypto.subtle.verify('HMAC', k, sig_bytes, new TextEncoder().encode(raw))) return null;
    const p = JSON.parse(new TextDecoder().decode(ub64(raw)));
    if (p.e < Date.now()) return null;
    return { user: { id: p.u, name: p.n, picture: p.p, email: p.m } };
  } catch { return null; }
}
