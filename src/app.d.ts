declare global {
	namespace App {
		interface Locals {
			user: { id: string; name: string; picture?: string; email?: string } | null;
		}
		interface Platform {
			env: { PUZ: import('@cloudflare/workers-types').D1Database };
			context: { waitUntil(promise: Promise<unknown>): void };
			caches: CacheStorage;
		}
	}
	type D1Database = import('@cloudflare/workers-types').D1Database;
}
export {};
