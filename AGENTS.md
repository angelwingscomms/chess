# Maintenance

Update this file whenever you discover a repo-specific fact an agent would likely miss — a new command, a changed convention, a quirk not obvious from filenames. Keep it compact; delete stale entries. Also suggest #buildinpublic tweets for meaningful commits (see Build in Public section).

# Architecture

- Svelte 5 (runes mode) + SvelteKit 2, deployed to Cloudflare Workers via `@sveltejs/adapter-cloudflare`
- Stockfish runs in a Web Worker (`static/stockfish.js`) — client-side engine, no server
- AI chat uses SSE streaming (`/chess/learn/chat`): events are `text`, `interaction`, `usage`, `error`
- Qdrant single collection `'i'` for token balances; multi-tenancy via payload field `s`
- Qdrant collection `'puz'` holds all 6,014,381 lichess puzzles — **vectorless** (`vectors: {}`, points upserted with `vector: {}`), payload-only. Search is tag + rating filtering, no embeddings: a puzzle's meaning is its theme set, and only 73 themes / 69,782 theme-combos exist, so per-puzzle vectors would cost ~98 GB to buy nothing. Payload indexes on `t` (keyword), `r`/`v` (integer) — the instance runs strict mode, so filtering an unindexed field fails. Re-ingest with `node scripts/ingest_puzzles.mjs [csv]` (idempotent: point id = base62-decoded PuzzleId)
- Piece images: `static/pieces/gioco/` — solid CSS background-image references in `app.css:569-589`
- `svelte-chess` uses legacy (non-runes) mode — `dynamicCompileOptions` in `svelte.config.js:15-20`

# Commands

| Command | What |
|---|---|
| `pnpm dev` | Dev server on port **2160** |
| `pnpm test` | `vitest run --pool=threads` — unit + static e2e |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm check` | `svelte-kit sync && svelte-check` — full Svelte diagnostics |

# Code Conventions

- Tailwind utilities only — no inline styles or `<style>` blocks
- No raw CSS values — use CSS variables from `app.css` (e.g. `var(--primary)` for primary color)
- `$lib` → `src/lib/`, `$components` → `src/components/`

# Testing

- Unit tests co-located with modules as `*.test.ts`
- E2E tests in `src/routes/chess/learn/` — these are **static** (string-matching source files, no browser)

# SEO

- Every page: `<Seo>` with single-letter keys (`t`=title, `d`=description, `n`=noindex)
- Pages with user-facing content also get `<JsonLd>`
- OG image auto-generated via `/og?t=TITLE`
- Canonical URL from `PUBLIC_DOMAIN` env var + path; override via `c` key only if needed
- `SeoMeta` type in `src/lib/types/seo.ts`

# AI Chat

- Board context (FEN, move history, last moves) injected into **user messages**, not system prompt
- User can set a Groq API key in localStorage — bypasses server, calls `@ai-sdk/groq` directly from browser
- Token cost tracking per-message (`calc_cost` in `src/lib/util/ai/pricing/`)
- Model list fetched from OpenRouter API; fallback hardcoded list in `+page.svelte`
- `find_puzzles` tool searches the `puz` collection. Two AI surfaces share one description (`PUZZLE_TOOL_DESCRIPTION` in `src/lib/types/puzzle.ts`, client-safe): the SSE chat wires the AI SDK tool directly, the Gemini Live dispatcher POSTs `/api/puzzles`. Results return the FEN *after* the opponent's blunder — the position the user actually solves — so the AI can pass it straight to `set_state`

# Git Workflow

- Every single change, no matter how trivial: `git add .` + detailed commit + `git push`
- Do not skip commits — commit and push after every file edit, creation, or deletion

# Env

- All secrets via `$env/static/private` or `$env/dynamic/private`
- Public vars via `$env/static/public` (currently only `PUBLIC_DOMAIN`)
- `.env*` gitignored; sample vars in `wrangler.toml`
- Required: `SECRET`, `GROQ`, `GEMINI`, `OPENROUTER_KEY`, `GOOGLE_ID`, `GOOGLE_SECRET`, `QDRANT_URL`, `QDRANT_KEY`, `PAYSTACK_SECRET_KEY*`

# Design System

- Full spec in `DESIGN.md`; Tailwind theme + CSS variables in `app.css`
- Fonts: Cormorant Garamond (display), Inter (body), JetBrains Mono (code) — via Google Fonts import in `app.css:1`
- Palette defined as `@theme` in `app.css:6-27` and `:root` vars at `app.css:67-98`

# Build in Public / Auto-Tweet

After every meaningful commit, the agent should consider whether the change is tweet-worthy for the chess/dev X community. If so, suggest a tweet.

**Best formats for this project** (chess training app built with Svelte+Stockfish+AI chat):
- Ship post with a surprise: *"shipped [feature]. took [N] iterations. what surprised me: [specific thing]"*
- Cost transparency: *"[tool] spend $[N]. shipped [N] features this week."*
- Behind-the-scenes: a specific decision, bug, or learning from the commit
**Format rules**: specific numbers, one surprising detail, no vague "working on something". Failure/struggle posts outperform wins 2-5x. Aim for 4-7 posts/week, post during peak hours (8-10am ET weekdays, 6-8pm ET evenings).

Chess community responds to: behind-the-scenes of tool building, honest cost/revenue transparency.

# Svelte MCP

Use `svelte-autofixer` on all Svelte code before sending. Use `list-sections` / `get-documentation` for Svelte/Kit API questions.

# Paystack webhooks

- All Paystack webhooks route through the shared `pswh` worker (one Paystack account for every app). Contract + onboarding: `~/i/pswh/README.md`.
- Stamp `metadata.a: 'e4'` at `transaction/initialize` (done in `src/routes/api/buy-tokens/+server.ts`). `pswh` routes the webhook to this app; the existing webhook handler (`/api/webhook/paystack`) is unchanged.
