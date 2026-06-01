import { describe, it, expect, vi, beforeEach } from 'vitest';

let mock_env: Record<string, string | undefined> = {};
let mock_dev = false;

vi.mock('$env/dynamic/private', () => ({
	get env() {
		return mock_env;
	}
}));

vi.mock('$app/environment', () => ({
	get dev() {
		return mock_dev;
	}
}));

import { get_secret_key } from './paystack';

describe('Paystack Key Selection Logic', () => {
	beforeEach(() => {
		mock_env = {};
		mock_dev = false;
		vi.resetModules();
	});

	it('should use TEST key if PAYSTACK_TEST is dot "."', () => {
		mock_env = {
			PAYSTACK_TEST: '.',
			PAYSTACK_SECRET_KEY_TEST: 'sk_test_123',
			PAYSTACK_SECRET_KEY_LIVE: 'sk_live_456'
		};
		expect(get_secret_key()).toBe('sk_test_123');
	});

	it('should use LIVE key if PAYSTACK_TEST is empty string ""', () => {
		mock_env = {
			PAYSTACK_TEST: '',
			PAYSTACK_SECRET_KEY_TEST: 'sk_test_123',
			PAYSTACK_SECRET_KEY_LIVE: 'sk_live_456'
		};
		expect(get_secret_key()).toBe('sk_live_456');
	});

	it('should fallback to dev check if PAYSTACK_TEST is undefined (dev = true => test key)', () => {
		mock_dev = true;
		mock_env = {
			PAYSTACK_SECRET_KEY_TEST: 'sk_test_123',
			PAYSTACK_SECRET_KEY_LIVE: 'sk_live_456'
		};
		expect(get_secret_key()).toBe('sk_test_123');
	});

	it('should fallback to dev check if PAYSTACK_TEST is undefined (dev = false => live key)', () => {
		mock_dev = false;
		mock_env = {
			PAYSTACK_SECRET_KEY_TEST: 'sk_test_123',
			PAYSTACK_SECRET_KEY_LIVE: 'sk_live_456'
		};
		expect(get_secret_key()).toBe('sk_live_456');
	});
});
