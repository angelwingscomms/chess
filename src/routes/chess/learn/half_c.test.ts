import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/routes/+page.svelte'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');

describe('/chess/learn hint highlights', () => {
	it('wires a visible board overlay to the current hint squares', () => {
		expect(page).toContain('hint_squares(');
		expect(page).toContain('data-testid={square.k === \'f\' ? \'hint-square-from\' : \'hint-square-to\'}');
		expect(page).toContain('aria-label={`Hint ${square.l} square ${square.s}`}');
		expect(page).toContain('const hint_from_class = \'bg-amber/70\'');
		expect(page).toContain('const hint_to_class = \'bg-teal/70\'');
		expect(page).toContain('motion-safe:animate-hint-pulse size-[2.7rem] rounded-full place-self-center');
		expect(page).toContain('can_reuse_hints(hints, hint_fen, fen)');
		expect(page).toContain('onclick={() => hideHints()}');
		expect(page).toContain('hideHints(true)');
		expect(page).toContain('hint_fen = fen;');
	});
});


