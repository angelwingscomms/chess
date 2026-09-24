import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (m) => {
	console.error(m);
	process.exit(1);
};
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const exists = (p) => existsSync(resolve(root, p));

function walk(dir, acc = []) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, acc);
		else acc.push(p);
	}
	return acc;
}

const mode = process.argv[2];
if (!mode) fail('need mode');

if (mode === 'gemini-primary') {
	const ctx = read('src/components/learn/learn_context.svelte.ts');
	const settings = read('src/components/learn/SettingsModal.svelte');
	if (!ctx.includes("@google/genai")) fail('missing @google/genai');
	if (!ctx.includes('gemini-3.8-live')) fail('missing gemini live model');
	if (!ctx.includes("voice_provider = $state") && !ctx.includes("voice_provider=$state")) fail('missing voice_provider');
	if (!ctx.includes("'gemini'") && !ctx.includes('"gemini"')) fail('missing gemini provider value');
	if (!/voice_provider[^\n]*gemini/.test(ctx) && !ctx.includes("|| 'gemini'") && !ctx.includes('|| "gemini"')) fail('gemini is not the default provider');
	if (!ctx.includes('toggleGeminiLive')) fail('missing toggleGeminiLive');
	if (!settings.includes('gemini')) fail('settings missing gemini');
	if (ctx.includes("from '@openai/agents")) fail('must not use openai agents sdk');
	console.log('gemini-primary passed');
	process.exit(0);
}

if (mode === 'openai-session') {
	const session = read('src/routes/api/voice/openai-live/session/+server.ts');
	const ctx = read('src/components/learn/learn_context.svelte.ts');
	const helpers = read('src/lib/util/voice/openai_live.ts');
	if (session.includes('openrouter.ai')) fail('session route talks to openrouter');
	if (!session.includes('https://api.openai.com/v1/live/sessions')) fail('missing openai live sessions url');
	if (!session.includes('gpt-live-1')) fail('missing gpt-live-1');
	if (!session.includes("type: 'webrtc'") && !session.includes('type: "webrtc"')) fail('missing webrtc transport');
	if (!helpers.includes('OPENAI_LIVE_TRIAL_S = 180')) fail('missing 180s daily trial');
	if (!session.includes('peek_openai_live_trial')) fail('session missing daily trial gate');
	if (!ctx.includes('/api/voice/openai-live/session')) fail('client missing session post');
	if (!ctx.includes('RTCPeerConnection')) fail('client missing webrtc');
	if (!ctx.includes('oai-events')) fail('client missing oai-events channel');
	if (!ctx.includes('end_openai_trial')) fail('client missing trial cutoff');
	console.log('openai-session passed');
	process.exit(0);
}

if (mode === 'openai-delegation') {
	const session = read('src/routes/api/voice/openai-live/session/+server.ts');
	const ctx = read('src/components/learn/learn_context.svelte.ts');
	if (!session.includes("type: 'client'") && !session.includes('type: "client"')) fail('missing client delegation');
	if (!ctx.includes('session.delegation.created')) fail('missing delegation handler');
	if (!ctx.includes('session.commentary.append')) fail('missing commentary append');
	if (!ctx.includes('dispatch_tool_call')) fail('missing tool dispatch');
	console.log('openai-delegation passed');
	process.exit(0);
}

if (mode === 'dead-removed') {
	if (exists('src/routes/api/voice/stt/+server.ts')) fail('stt route still exists');
	if (exists('src/routes/api/voice/tts/+server.ts')) fail('tts route still exists');
	if (exists('src/lib/util/voice/timestamps.ts')) fail('timestamps still exists');
	if (exists('src/lib/util/voice/timestamps.test.ts')) fail('timestamps test still exists');
	const src = resolve(root, 'src');
	for (const p of walk(src)) {
		if (p.endsWith('.test.ts')) continue;
		const t = readFileSync(p, 'utf8');
		if (t.includes('/api/voice/stt') || t.includes('/api/voice/tts')) fail(`stale voice route ref in ${p}`);
	}
	console.log('dead-removed passed');
	process.exit(0);
}

fail(`unknown mode ${mode}`);
