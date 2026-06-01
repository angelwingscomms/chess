import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const route = readFileSync(resolve(process.cwd(), 'src/routes/login/google/+server.ts'), 'utf8');
const callback = readFileSync(
	resolve(process.cwd(), 'src/routes/google/+server.ts'),
	'utf8'
);
const oauth = readFileSync(resolve(process.cwd(), 'src/lib/server/oauth.ts'), 'utf8');

describe('/login/google route', () => {
	it('builds Google OAuth redirects from the request origin', () => {
		expect(route).toContain('event.url.origin');
		expect(callback).toContain('event.url.origin');
		expect(oauth).not.toContain('localhost:5173');
		expect(oauth).not.toContain('/login/google/callback');
	});
});
