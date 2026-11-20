import { generateText } from 'ai';
import type { createGroq } from '@ai-sdk/groq';

// gpt-oss-safeguard on groq reads the player's newest message against this policy and answers one word
// (llama guard 4 was retired by groq in 2026)
export const GUARD = 'openai/gpt-oss-safeguard-20b';
const POLICY = `You check messages that players, often children aged 10 to 14, type or say to a chess coaching app.
Answer with exactly one word and nothing else:
harm - the player may hurt themselves, wants to die, is being hurt or abused, or is in danger
unsafe - sexual content, how to make weapons or drugs, threats or hate against people, or asking the app to do something harmful
ok - anything else, including chess, rude or silly messages, and chess words like attack, kill, capture or sacrifice`;

const HELP = 'that sounds really hard, and you matter. please tell a parent, a teacher or another adult you trust right now. if you might hurt yourself, call your local emergency number. i’m only a chess coach, but i’m here for chess whenever you want.';
const NO = 'i can only help with chess. if something is wrong, please tell a parent, a teacher or another adult you trust.';

// the words to send instead of the coach's answer, or '' when the message is fine; a guard failure lets the coach answer,
// since the coach's own instructions also keep it to chess
export async function guard(groq: ReturnType<typeof createGroq>, text: string, signal: AbortSignal) {
	try {
		const { text: v } = await generateText({ model: groq(GUARD), system: POLICY, messages: [{ role: 'user', content: text }], abortSignal: signal, maxRetries: 0 });
		return verdict(v);
	} catch (e) {
		console.error('[guard]', e instanceof Error ? e.message : e);
		return '';
	}
}

export function verdict(v: string) {
	const t = v.trim().toLowerCase();
	return t.startsWith('harm') ? HELP : t.startsWith('unsafe') ? NO : '';
}
