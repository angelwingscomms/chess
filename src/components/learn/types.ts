export type ChatContext = { f: string; p: string; u: string; a: string; };
export type ChatData = { f?: string; p?: string; u?: string; a?: string; h?: string; e?: string; t?: number };
export type ChatUsage = { p: number; c: number; cost: number };
export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string; d?: ChatData; u?: ChatUsage };
