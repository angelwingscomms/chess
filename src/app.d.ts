declare global {
  namespace App {
    interface Locals {
      user: { id: string; name: string; picture?: string; email?: string; tokens?: number } | null;
    }

    interface Platform {
      env: {
        TOKEN_BALANCE: KVNamespace;
      };
    }
  }
}
export {};
