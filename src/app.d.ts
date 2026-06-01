declare global {
  namespace App {
    interface Locals {
      user: { id: string; name: string; picture?: string } | null;
    }
  }
}
export {};
