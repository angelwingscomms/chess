import { describe, expect, it } from 'vitest';
import { md } from './md';

describe('md', () => {
	it('keeps markdown but shows html as text', () => {
		const out = md.parse('**fork** <img src=x onerror=alert(1)>', { async: false }) as string;
		expect(out).toContain('<strong>fork</strong>');
		expect(out).not.toContain('<img');
	});

	it('drops links that are not web links', () => {
		expect(md.parse('[tap](javascript:alert(1))', { async: false })).not.toContain('href');
		expect(md.parse('[lichess](https://lichess.org)', { async: false })).toContain('href="https://lichess.org"');
	});
});
