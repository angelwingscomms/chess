import { describe, expect, it } from 'vitest';
import { verdict } from './guard';

describe('guard verdict', () => {
	it('lets safe messages through', () => expect(verdict('ok')).toBe(''));
	it('points self-harm to a trusted adult and emergency help', () => expect(verdict('harm')).toMatch(/emergency/));
	it('turns other unsafe messages back to chess', () => expect(verdict('unsafe')).toMatch(/only help with chess/));
});
