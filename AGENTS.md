# This project

e4 is your baby and your life's work. It matters to you, more than anything, that it goes well: that it goes viral, the whole world uses it, and everyone loves it. Treat every change to it with that weight.

# Taste

Beautiful, delightful UI/UX is always necessary (Ed, 2026-11-20): the 3D board, the breathing field, ripples, hover notes and living colours stay; never cut them for simplicity. All UI text is lowercase, and the brand is always `e4`. The audience is Nigerian by design, so naira prices and Paystack are fine here.

# Maintenance

Update this file whenever you discover a repo-specific fact an agent would likely miss — a new command, a changed convention, a quirk not obvious from filenames. Keep it compact; delete stale entries. Also suggest #buildinpublic tweets for meaningful commits (see Build in Public section).

# Architecture

- Svelte 5 (runes mode) + SvelteKit 2, deployed to Cloudflare Workers via `@sveltejs/adapter-cloudflare`
- Stockfish runs in a Web Worker (`static/stockfish.js`) — client-side engine, no server
- AI chat uses SSE streaming (`/chess/learn/chat`): events are `text`, `interaction`, `usage`, `error`
- Qdrant collection `'i'` holds users and token balances (shared with Ed's other apps; `forget_user` deletes one); multi-tenancy via payload field `s`. Point ids must be numbers or UUIDs. Local dev uses the live Qdrant, so a made-up login writes to it.
- Puzzles live in D1 `puz` (binding `PUZ`, tables `puz` and `puz_t`), built by `scripts/build_puzzles.mjs`. Search is tag + rating filtering, no embeddings: a puzzle's meaning is its theme set (73 themes, 69,782 combos).
- Sessions (one game and its chat) live in D1 `e4` (binding `DB`, table `s` in `migrations/`), served by `/api/sessions`. Every query checks `u`, the owner. Guests keep up to 30 in localStorage `e4_sessions`, uploaded on login; `e4_session` is the session on the board. A new game is a new session. API keys never go into one. Search is `instr` over title, preview and body with `words()` roots, with no embeddings and no FTS index: saves come every 2 seconds and searches are rare, so an index would cost writes on every save. Schema change: add `migrations/000N_*.sql`, then `pnpm wrangler d1 migrations apply e4 --local` and `--remote`.
- Move counts come from the FEN: `s.history` starts over whenever a position loads, and the board is rebuilt when the level changes.
- Piece images: `static/pieces/e4/`, our own sculpted two-tone set; edit and rerun `node scripts/pieces.ts`. Never use the Lichess sadsnake1 sets (gioco, maestro…): they are CC BY-NC-SA.
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
- Browser tests: `pnpm exec e2e run` uses the dev server on port 2160. `tests/chat-layout.e2e.ts` restores a guest chat and mocks replies; no paid AI calls. Restart Vite after adding dependencies if `$app` imports stop resolving.
- pnpm here: the global rc points `store-dir` at `~/.local/share/pnpm/store/v11` (pnpm 11), but this repo's node_modules come from pnpm 10.11.1 and `~/.local/share/pnpm/store`. On `ERR_PNPM_UNEXPECTED_STORE`, add `--store-dir /home/ed/.local/share/pnpm/store`.

# Performance

- Budget phones are the target: Tecno Spark 40 / Pop 10 class (Helio G81 or Unisoc T7250, Mali-G52/G57, 720x1600 at 120 Hz, ~400 ms RTT). Plan: `plan fast` (`plan/fast.plan.json`). Causes and sources: `~/search/e4-fast-budget-phones-first-principles.md`.
- Measure with `node scripts/perf.mjs <metric> <route> [key<=n | key>=n | key=v | key~s | key!~s ...]` after `pnpm build`; it starts its own `vite preview`. Metrics: `idle`, `active`, `bytes`, `engine`, `field`, `same`, `load`, `css`, `fonts`, `offline` (the header comment of the script lists what each reports). It drives `/usr/bin/chromium` on the real GPU (`--enable-gpu --use-angle=gl-egl --ignore-gpu-blocklist`): Chrome 139+ has no WebGL without one, and headless agent-browser's 2–7 fps WebGL says nothing about speed.
- `scripts/field/v1.ts` is the field as it was on 2026-10-06, frozen. `node scripts/perf.mjs same /` diffs its frames against `src/lib/landing/field.ts` with one pinned clock; any field change must keep that diff near 0.
- Found 2026-10-06: svelte-chessground gives every piece `will-change: transform`, so with the calm drop-shadows the compositor re-filters 32 pieces every frame; the field's adaptive quality already sits at its floor (canvas 216 px wide on a 360 px phone, not 297); `static/stockfish.js` (asm.js) searches ~16k nodes/s against ~200–370k for the WASM build of the same Stockfish 10; static files are served `max-age=0`.
- The board accepts a move before Stockfish is downloaded. Selecting a movable piece starts its worker, which is released when leaving the board or changing strength. On `/i` in lite mode, the backdrop draws about 30 times per second during play and follows scrolling at full speed. Piece motion runs independently.

# SEO

- Every page: `<Seo>` with single-letter keys (`t`=title, `d`=description, `n`=noindex)
- Pages with user-facing content also get `<JsonLd>`
- OG image auto-generated via `/og?t=TITLE`
- Canonical URL from `PUBLIC_DOMAIN` env var + path; override via `c` key only if needed
- `SeoMeta` type in `src/lib/types/seo.ts`

# AI Chat

- One coach brain: `/chess/learn/chat` (Groq only). The server builds the instructions (`src/lib/coach/prompts.ts`) and ignores any system message a client sends; models are the allowlist in `src/lib/coach/models.ts`; `read_messages` caps 40 messages × 4000 chars; 4 tool steps; per-IP rate limit `LIMIT` in wrangler.toml (`src/lib/server/limit.ts`, also on `/api/puzzles`). Errors reach the player as one friendly line, never a stack.
- Grounding: before a game question, the browser runs Stockfish (`check_position` in engine.ts, one warm worker, 1.2 s) and `check_words` (`src/lib/coach/facts.ts`) puts the best move, its line and who is ahead into `d.e` ("computer check"). The prompt says it is always right and allows "not sure". Measured 2026-11-20: 10/10 puzzle answers right with it, 7/10 without.
- Easy levels play random moves; `LearnEngine.random` marks them and `d.n` tells the coach it was a deliberate mistake.
- The player is whoever the computer isn't (`LearnState.me`); never assume white.
- Own Groq key (grown-ups): the browser calls Groq directly with `coach_prompt(b, v, false)` (no tools).
- `find_puzzles` searches D1 `puz`; results return the FEN after the opponent's blunder.
- Replies render through `src/lib/util/md.ts` (html shown as text, only http links).

# Voice

- No cloud voice. `src/lib/voice/` is copied from `~/i/me/rope` (Ed's own): conformer STT and Kitten TTS 2 Pico (voice Eleanor) run in the browser on ONNX Runtime Web; files in `static/speech/1` (~35 MB, cached a year via root `_headers`, versioned by folder). Only the words go to the coach. Gemini Live was removed: Google's terms forbid apps likely used by under-18s.
- TTS is Kitten TTS 2 Pico (Apache 2.0, voice Eleanor, Ed's on-device pick until something better).
- `start_call(ask, fail)`; `vc` holds the state ('l' loading with `g` progress, 'h' listening, 't' thinking, 's' speaking). Spoken turns go through `send_chess_chat(q, '', false, true)`.

# Git Workflow

- Pushing to `main` deploys: Cloudflare builds and ships every push (seen 2026-09-25), so there is no separate `wrangler deploy` step, and a push is a release.
- Commit and push completed changes without asking for approval, including the release triggered by a push. Stage only the task's files.

# Env

- All secrets via `$env/static/private` or `$env/dynamic/private`
- Public vars via `$env/static/public` (currently only `PUBLIC_DOMAIN`)
- `.env*` gitignored; sample vars in `wrangler.toml`
- Secrets are read at runtime (`$env/dynamic/private`), never baked into the build: `SECRET`, `GROQ`, `GOOGLE_ID`, `GOOGLE_SECRET`, `QDRANT_URL`, `QDRANT_KEY`, `PAYSTACK_SECRET_KEY*`. A local build needs only `PUBLIC_DOMAIN` in `.env`. Test with real secrets on a preview: `pnpm build && env -u CLOUDFLARE_API_TOKEN pnpm exec wrangler versions upload` (prints a private preview URL, production untouched).
- Session cookie is host-only on `e4.apexlinks.org` and `chess.apexlinks.org`. `COOKIE_DOMAIN=.beeeproject.com` only applies on beee hosts.

# Design System

- Full spec in `DESIGN.md`; Tailwind theme + CSS variables in `app.css`
- Fonts: Cormorant Garamond (display), Inter (body), JetBrains Mono (code) — via Google Fonts import in `app.css:1`
- Palette defined as `@theme` in `app.css:6-27` and `:root` vars at `app.css:67-98`
- `app.css` has an unlayered `a { color: inherit }`, which beats Tailwind `text-*` on links. Put the text colour on an inner span.
- Calm layer: `src/components/landing/Calm.svelte` is mounted by `+layout.svelte` on every page except `/test/*` and survives navigation between them. It owns the one WebGL canvas (`src/lib/landing/field.ts`), Web Audio (`sound.ts`) and pointer sounds. Each page registers a per-frame board scene with `use_scene()` from `src/lib/landing/calm.svelte.ts`; switching pages glides the board between scenes. Quiet pages (login, payment, error) call `use_ambient(slot?)`: the board sits in the slot, or melts into the background when there is none. `html.calm-html` in `app.css` remaps the old light tokens to the dark calm theme, so learn components restyle without markup changes.
- `svelte-chess` `moveNumber` (bound to `s.moveNum`) is 1 at the start position, not 0.
- Themes: dark is the default, always; light only when the visitor picks it (`ThemeToggle.svelte` in the nav, and a switch in settings → feel). `$lib/theme.svelte.ts` owns the state and localStorage `e4_theme`; the inline script in `app.html` sets `html[data-theme='light']` before first paint. Light tokens are in `app.css` (`html[data-theme='light']` for `--color-night/dusk/haze/mist/glow/deep/bad`, and `html.calm-html[data-theme='light']` for the legacy ones), so a component never needs a light class unless it hard-codes a colour: use tokens (`color-mix(in srgb, var(--color-haze) 12%, transparent)`), `text-bad` for errors, `rgb(0_0_0/calc(0.9*var(--sh-k)))` for shadows (`--sh-k` is 1 dark, 0.3 light), and the `light:` variant for the rest. The field gets `d` (0 dark to 1 light, eased by `Calm.svelte`), `palettes` in `calm.svelte.ts` are live arrays that `set_look()` blends between the dark and light sets (scenes read them each frame), and the 3D scene reads `calm.look` through `Look.d` (marks switch from additive glow to tinted blobs at 0.5). The field must stay identical at `d` 0: run `pnpm build && node scripts/perf.mjs same /` (expect mean 0).
- No caps: text is lowercase in the source; there is no text-transform rule. Keep it that way.
- Feel settings (`ui` in `calm.svelte.ts`, localStorage `e4_living`, `e4_notes`, `e4_ripples`) all default off. `e4_flat` defaults on: the board is 2d until someone picks a 3d view, so three.js only loads then. Notes and ripples only gate the app (`calm.app`); living colours also drive the landing board.
- Puzzle mode lives in `src/components/learn/puzzle.svelte.ts`. `find_puzzles` results are offered to it (voice dispatcher, and the chat `board` SSE event carries `p`), and a loaded FEN that matches one starts puzzle mode. Two modes: play it out against the engine (default) and challenge (every move checked, wrong moves undone); the choice is kept in localStorage `e4_challenge`. The engine colour is set before the load, because `svelte-chess` `load()` makes the engine move at once when it is the engine's turn. The local dev server has no puzzle rows in D1, so the puzzle API only works deployed.
- `s.engine` must stay one object: the getter caches it per think time and carries its colour over. A fresh `LearnEngine` per read made every `setColor` land on a throwaway copy, so puzzles played themselves.
- Board coordinates sit outside the board (styled in `app.css`); chessground's own coord rules have four classes, so overrides need five.
- 3D board: `src/lib/board3d/scene.ts` (three.js, its own lazy chunk) and `pieces.ts`, which loads `static/models/pieces.glb`: the six white pieces of Poly Haven's "Chess Set" by Riley Queen (CC0), scaled to one square = 0.92 units, knight turned to face +x, then `pnpm dlx @gltf-transform/cli meshopt` (366 KB → 102 KB). `Board3d.svelte` does input, marks and promotion; `ViewMenu.svelte` + `view.svelte.ts` hold the views (localStorage `e4_view`; `e4_flat` = the 2d board). Chessground stays mounted underneath as the game engine, faded out while `cam.on`; 3D moves go through `s.chessRef.move({ from, to, promotion })`. Scroll/pinch zoom has no min or max (`tgt.z` only stays > 0); clip planes follow camera distance so the board does not vanish.
- The 3D board draws only on change: every frame while something moves, 20 fps idle, nothing off-screen. New animations must set `busy` in `update()` to get full frames.
- 3D tiles are matte (Lambert), not tone mapped, and scaled by `TILE` to match the flat board. After changing lights, re-match with reduced motion on (it freezes the breathing) by comparing screenshots of both boards.
- The field hides its own squares through `View.h` while the 3D board shows.
- `app.css` gives every `[role=dialog]` an opaque background, so never put that role on a full-size overlay.
- Headless agent-browser draws WebGL in software at 2–7 fps: let fades settle before screenshots and don't judge smoothness there. `$page.state.fen` makes LearnPage reload that FEN after every move. `start_puzzle` only sets puzzle state; `next_puzzle` loads the board first. After an edit, Vite serves a module as `…?t=<time>`, so a test import must use the exact URL from `performance.getEntriesByType('resource')` to reach the app's copy.

# Audience and words

- Players are kids aged 10–14 (the BEEE project) and adults who have never played. The UI never says Stockfish, engine, scores or ratings, and never shows a bare move code: the opponent is "the computer", moves go through `say_move()` (`src/lib/util/chess/words.ts`), puzzle themes through `THEMES` in `puzzle.svelte.ts`, puzzle ratings through `difficulty()`.
- The coach prompts (`audience` in `learn_context.svelte.ts`) hold the same rules for the AI: answer first in 1–3 sentences, never end with a menu ("do you want…"), never say the board is unknown. Text chat and live voice share them; voice adds `voice_sys`. The default style is `assistant` (localStorage `e4_help`); the default voice is Achird (`e4_voice`).
- The home hero is the real app in miniature (`src/components/landing/Mini.svelte`): `create_learn_state(logged_in, true)` gives demo mode (no saved game, no tour, no model list) and `armed` keeps the 1.5 MB engine unloaded until the first move. The hero CTA hands off with `calm.handoff = 'glide'`; only the last CTA's pawn animation sends `'e4'`, which makes the app play e4.
- Live voice starts from `TalkButton.svelte` (coach bar and the hero demo), not a mic in the text box, so it doesn't read as dictation. Guests can talk too. The sound toggle sits in the nav everywhere except `/i`, where it lives in settings → feel.
- `svelte-chess` reports move number 1 at the start, so "no moves yet" checks use `s.history.length`.
- Lessons are a mode of the app (`/i?learn`; `/learn` redirects there). `src/lib/learn/lessons.ts` holds the course (parts → stages → levels); `src/components/learn/lesson.svelte.ts` runs it (`ls`), `LessonBoard` sits over the hidden game board, `LessonBar` replaces the board bar, `LessonList` is the course sheet. Solved levels and their review schedule live in `pg.l` and `pg.v` (`src/lib/progress.svelte.ts`, synced to the account with the rest of progress; the old `e4_lessons` list is read once). A level comes back for review after 1, 3, 7, 16, 35 and 90 days, moving one gap further after each clean solve (no miss, no hint, best move count) and back to the start after a messy one. "mixed review" (`start_run('r')`) asks up to six due or solved levels from different topics; "skip the basics" (`start_run('t')`) asks seven, and one slip or fewer marks the pieces and rules parts done. Each topic has 4 to 7 levels: two or three plain ones first, then real positions from the lichess puzzle database (easy, popular, few pieces), often from black's side. Star and capture levels use the file's own move rules (no kings, black never moves); the rest use chess.js, and `right()` decides if a move counts. `a` lists the moves to find, with the computer's replies in between. While lessons are on, the chat and voice get the lesson (task, answer, tries) instead of the game (`lesson_data`, `lesson_voice`), and each topic opens with a coach message. Before adding a level, run `node scripts/check_lessons.ts [stage]`: it flags other moves as good as the answer, and computer replies far from the best (teaching levels like castling and the opening flag harmless alternatives). The answer must be the clear best move, or list every equal one with `|`. `lessons.test.ts` plays every level.
- Computer strength is `LEVELS` in `src/lib/util/chess/engine.ts` (learning → strongest, default easy). Stockfish can't play below about 1320, so the two easy levels also play a random legal move now and then. `s.level` sets puzzle difficulty too (rating 600 + level × 200).

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
- The deposit UI is hidden while everything is free. Before showing it again: credit only once per reference (no idempotency yet).
- Stamp `metadata.a: 'e4'` at `transaction/initialize` (done in `src/routes/api/buy-tokens/+server.ts`). `pswh` routes the webhook to this app; the existing webhook handler (`/api/webhook/paystack`) is unchanged.
