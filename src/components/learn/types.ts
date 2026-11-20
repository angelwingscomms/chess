import type { ChatData } from '$lib/coach/context';
export type { ChatData };
export type ChatContext = { f: string; p: string; u: string; a: string };
export type ChatUsage = { p: number; c: number; cost: number };
export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string; d?: ChatData; u?: ChatUsage };
