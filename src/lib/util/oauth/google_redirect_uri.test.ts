import { describe, expect, it } from 'vitest';
import { google_redirect_uri } from './google_redirect_uri';

describe('google_redirect_uri', () => {
	it('uses the current request origin', () => {
		expect(google_redirect_uri('http://localhost:2160')).toBe(
			'http://localhost:2160/login/google/callback'
		);
		expect(google_redirect_uri('https://beee.example')).toBe(
			'https://beee.example/login/google/callback'
		);
	});
});
