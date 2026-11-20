declare global {
	namespace App {
		interface Locals {
			user: import('$lib/server/session').SessionUser | null;
		}
		interface Platform {
			env: { PUZ: D1Database; DB: D1Database; LIMIT?: import('@cloudflare/workers-types').RateLimit };
			context: { waitUntil(promise: Promise<unknown>): void };
			caches: CacheStorage;
		}
	}
	type D1Database = import('@cloudflare/workers-types').D1Database;
}
export {};
