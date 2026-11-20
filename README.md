# e4

a calm chess coach for beginners: play a friendly computer, then ask why any move works, by typing or out loud.

- live: https://chess.apexlinks.org (a push to main deploys)
- stack: svelte 5 + sveltekit on cloudflare workers, stockfish in the browser, groq for the coach, conformer + leokani speech in the browser, d1 for puzzles and saved games
- run: `pnpm install`, put `PUBLIC_DOMAIN=https://chess.apexlinks.org` in `.env`, `pnpm dev` (port 2160)
- check: `pnpm test`, `pnpm check`, `pnpm build`

how it fits together: AGENTS.md.
