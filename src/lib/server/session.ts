import { env } from '$env/dynamic/private';

export type SessionUser = { id: string; name: string; picture?: string; email?: string; a?: boolean };

// host-only, so chess.apexlinks.org's login never leaks to another site
export const SESSION_COOKIE = { path: '/', httpOnly: true, secure: true, maxAge: 604800, sameSite: 'lax' } as const;
export const SESSION_COOKIE_DELETE = { path: '/' };

const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ub64 = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));

const key = () => crypto.subtle.importKey('raw', new TextEncoder().encode(env.SECRET).slice(0, 32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

// payload keys: u id, n name, p picture, m email, a a grown-up said yes, e expires (ms)
export async function encode_session(d: SessionUser): Promise<string> {
	const raw = b64(JSON.stringify({ u: d.id, n: d.name, p: d.picture, m: d.email, a: d.a ? 1 : 0, e: Date.now() + 604800000 }));
	const sig = await crypto.subtle.sign('HMAC', await key(), new TextEncoder().encode(raw));
	return raw + '.' + b64(String.fromCharCode(...new Uint8Array(sig)));
}

export async function decode_session(c: string | undefined | null): Promise<SessionUser | null> {
	const [raw, sig] = c?.split('.') ?? [];
	if (!raw || !sig) return null;
	try {
		const ok = await crypto.subtle.verify('HMAC', await key(), Uint8Array.from(ub64(sig), (x) => x.charCodeAt(0)), new TextEncoder().encode(raw));
		const p = ok && JSON.parse(ub64(raw));
		// sessions from before consent existed carry no a, so they go through the grown-up question once
		return p && p.e > Date.now() ? { id: p.u, name: p.n, picture: p.p, email: p.m, a: p.a === 1 } : null;
	} catch {
		return null;
	}
}
