# Beee Chess

Chess training app where you play against Stockfish, get AI coaching via Groq, and buy tokens via Paystack.

## Stack

Svelte 5 + SvelteKit 2, TypeScript, Tailwind CSS 4, Cloudflare Workers (KV for token balances), Qdrant (vector DB), Google OAuth, Groq + Gemini AI, Paystack.

## Routes

| Route | What it does |
|---|---|---|
| `/` | Main chess board vs Stockfish (10 difficulty presets), hint overlay, AI chat/analysis |
| `/login` | Sign in with Google |
| `/api/me` | Current user |
| `/api/buy-tokens` | Paystack payment init (POST) |
| `/payment/callback` | Paystack redirect — verifies tx + credits tokens |
| `/api/webhook/paystack` | Paystack async webhook (POST, signature-verified) |
| `/chess/learn/chat` | SSE stream — AI chat via Groq |
| `/chess/learn/models` | Available Groq models |

## AI Chat

Board context (FEN, move history, last moves) is injected as hidden `[board_context]` into the user message — not the system prompt. The server streams text by SSE (`text`, `interaction`, `error` events). Falls back to `generateContentStream` if Interactions API fails.

## Testing

`pnpm test` — Vitest with unit + static e2e tests.
