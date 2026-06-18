const TOKEN_RATE = 1;
const local_store = new Map<string, number>();

function get_kv(event: { platform?: App.Platform }): KVNamespace | null {
	return event.platform?.env?.TOKEN_BALANCE ?? null;
}

function get_store(event: { platform?: App.Platform }): KVNamespace | Map<string, number> {
	return get_kv(event) ?? local_store;
}

export async function credit(event: { platform?: App.Platform }, user_id: string, amount_kobo: number): Promise<number> {
	const tokens = Math.floor(amount_kobo / TOKEN_RATE);
	const store = get_store(event);
	let cur = 0;

	if (store instanceof Map) {
		cur = store.get(user_id) ?? 0;
		cur += tokens;
		store.set(user_id, cur);
	} else {
		const raw = await store.get(user_id);
		cur = raw ? parseInt(raw, 10) : 0;
		cur += tokens;
		await store.put(user_id, String(cur));
	}

	return cur;
}

export async function get_balance(event: { platform?: App.Platform }, user_id: string): Promise<number> {
	const store = get_store(event);
	if (store instanceof Map) {
		return store.get(user_id) ?? 0;
	}
	const raw = await store.get(user_id);
	return raw ? parseInt(raw, 10) : 0;
}

export async function deduct(event: { platform?: App.Platform }, user_id: string, amount: number): Promise<number> {
	const store = get_store(event);
	let cur = 0;

	if (store instanceof Map) {
		cur = store.get(user_id) ?? 0;
		cur = Math.max(0, cur - amount);
		store.set(user_id, cur);
	} else {
		const raw = await store.get(user_id);
		cur = raw ? parseInt(raw, 10) : 0;
		cur = Math.max(0, cur - amount);
		await store.put(user_id, String(cur));
	}

	return cur;
}

export function tokens_per_kobo(): number {
	return TOKEN_RATE;
}
