import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

for (const [width, height] of [[320, 568], [375, 667], [390, 844], [667, 375], [1440, 900]]) {
	test(`coach messages stay readable at ${width} × ${height}`, async ({ app, browser, screen }) => {
		await browser.setViewport({ width, height });
		await browser.addInitScript(() => {
			localStorage.setItem('e4_tour_done', '1');
			localStorage.setItem('chess_save', JSON.stringify({
				f: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // f: saved board position
				c: JSON.stringify(Array.from({ length: 4 }, () => [ // c: saved chat
					{ r: 'u', c: 'how does the knight move?' }, // r: speaker, c: message
					{ r: 'a', c: 'The knight moves in an L: two squares one way, then one square to the side. It can jump over other pieces.' },
				]).flat()),
			}));
		});
		await browser.route('**/chess/learn/chat', async (route) => {
			await route.fulfill({
				contentType: 'text/event-stream',
				body: 'event: text\ndata: {"t":"The knight moves in an L: two squares one way, then one square to the side. It can jump over other pieces."}\n\n',
			});
		});
		await app.open('/i');
		await expect(browser.locator('.calm-md')).toHaveCount(4);
		await screen.getByRole('textbox').fill('can it jump over a pawn?');
		await screen.getByRole('button', 'Send', { exact: true }).tap();
		await expect(browser.locator('.calm-md')).toHaveCount(5);
		await screen.getByRole('textbox').scrollIntoView();
		const layout = await browser.evaluate(() => {
			const messages = document.querySelector('main aside .overflow-y-auto')!;
			const reply = document.querySelector('main aside .calm-md:last-child')!;
			const input = document.querySelector('main aside textarea')!;
			return {
				h: messages.clientHeight, // h: space for messages
				s: messages.scrollHeight, // s: height of the full conversation
				t: messages.scrollTop, // t: distance scrolled through messages
				r: reply.getBoundingClientRect().toJSON(), // r: latest reply bounds
				b: messages.getBoundingClientRect().toJSON(), // b: message area bounds
				i: input.getBoundingClientRect().toJSON(), // i: input bounds
				f: Number.parseFloat(getComputedStyle(input).fontSize), // f: input text size
				w: document.documentElement.scrollWidth, // w: full page width
				v: innerWidth, // v: screen width
			};
		});
		expect(layout.h).toBeGreaterThanOrEqual(180);
		expect(layout.r.top).toBeGreaterThanOrEqual(layout.b.top - 1);
		expect(layout.r.bottom).toBeLessThanOrEqual(layout.b.bottom + 1);
		expect(layout.i.bottom).toBeLessThanOrEqual(height + 1);
		expect(layout.w).toBeLessThanOrEqual(layout.v);
		if (width < 1024) expect(layout.f).toBeGreaterThanOrEqual(16);
		if (width < 1024) {
			expect(layout.s).toBeGreaterThan(layout.h);
			expect(layout.t).toBeGreaterThan(0);
			await browser.evaluate(() => {
				document.querySelector('main aside .overflow-y-auto')!.scrollTop = 0;
				return 0;
			});
			expect(await browser.evaluate(() => document.querySelector('main aside .overflow-y-auto')!.scrollTop)).toBe(0);
		}
	});
}
