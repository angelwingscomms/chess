import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GEMINI } from '$env/static/private';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

function build_prompt(fen: string, move: string, score: number, depth: number): string {
	const score_str = score > 90000 ? 'Mate' : score < -90000 ? '-Mate' : (score / 100).toFixed(2);
	return [
		'You are a chess coach analyzing a position. Write a concise analysis (2-3 short sentences).',
		'',
		`Position (FEN): ${fen}`,
		`Stockfish recommends: ${move}`,
		`Evaluation: ${score_str}`,
		`Depth searched: ${depth}`,
		'',
		'Cover: what the move does concretely, the pattern or principle at play, and a follow-up thought. Keep it brief but instructive.',
	].join('\n');
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || !body.fen || !body.move) {
		console.log('[explain] missing fen or move');
		return json({ error: 'Missing fen or move' }, { status: 400 });
	}

	const { fen, move, score = 0, depth = 0, m } = body;
	console.log(`[explain] request: fen=${fen} move=${move} score=${score} depth=${depth} model=${m || 'gemma-4-31b-it'}`);

	const ai = new GoogleGenAI({ apiKey: GEMINI });

	const stream = new ReadableStream({
		async start(controller) {
			try {
				const prompt = build_prompt(fen, move, score, depth);
				console.log('[explain] calling generateContentStream');
				const response = await ai.models.generateContentStream({
					model: m || 'gemma-4-31b-it',
					contents: prompt,
					config: {
						thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
					},
				});
				let chunks = 0;
				for await (const chunk of response) {
					if (request.signal.aborted) break;
					if (chunk.text) {
						chunks++;
						controller.enqueue(new TextEncoder().encode(chunk.text));
					}
				}
				console.log(`[explain] stream done: chunks=${chunks} aborted=${request.signal.aborted}`);
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error';
				console.log(`[explain] error: ${msg}`);
				if (!request.signal.aborted) {
					controller.enqueue(new TextEncoder().encode('\n[Analysis error: ' + msg + ']'));
				}
			} finally {
				if (!request.signal.aborted) controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
