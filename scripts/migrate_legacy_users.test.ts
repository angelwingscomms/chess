import { describe, expect, it } from 'vitest';
import { plan_migration } from './migrate_legacy_users.mjs';

describe('plan_migration', () => {
	it('moves a u_ prefixed point to the unprefixed id and backfills e + pic', () => {
		const plan = plan_migration([{ id: 'u_sub1', payload: { s: 'u', m: 'a@b.com', p: 'http://pic' } }]);
		expect(plan.upserts).toEqual([{ id: 'sub1', payload: { s: 'u', m: 'a@b.com', p: 'http://pic' } }]);
		expect(plan.deletes).toEqual(['u_sub1']);
		expect(plan.payloads).toEqual([{ id: 'u_sub1', payload: { e: 'a@b.com', pic: 'http://pic' } }]);
	});

	it('leaves a plain unprefixed e-keyed point untouched', () => {
		const plan = plan_migration([{ id: 'plain', payload: { s: 'u', e: 'x@y.com' } }]);
		expect(plan.upserts).toEqual([]);
		expect(plan.deletes).toEqual([]);
		expect(plan.payloads).toEqual([]);
	});

	it('does not overwrite an already-set e', () => {
		const plan = plan_migration([{ id: 'x', payload: { s: 'u', m: 'a@b.com', e: 'a@b.com', p: 'http://pic' } }]);
		expect(plan.payloads).toEqual([]);
	});

	it('never copies a bcrypt hash into pic', () => {
		const plan = plan_migration([{ id: 'y', payload: { s: 'u', m: 'a@b.com', p: '$2b$10$abcdefghijklmnopqrstuv' } }]);
		expect(plan.payloads).toEqual([{ id: 'y', payload: { e: 'a@b.com' } }]);
		expect(plan.payloads[0].payload.pic).toBeUndefined();
	});
});
