import type { D1Database } from '@cloudflare/workers-types';

declare global {
  namespace App {
    interface Locals {
      user: { id: string; name: string; picture?: string; email?: string } | null;
    }
    interface Platform {
      env: { PUZ: D1Database };
      context: { waitUntil(promise: Promise<unknown>): void };
      caches: CacheStorage;
    }
  }
}
export {};
