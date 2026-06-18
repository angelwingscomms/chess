import { describe, it, expect } from 'vitest';
import { tokens_per_kobo } from './token_balance';

describe('token_balance', () => {
	it('should return positive token rate', () => {
		expect(tokens_per_kobo()).toBeGreaterThan(0);
	});
});
