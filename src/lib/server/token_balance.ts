// coach credit: the sum of the account's paystack payments. a reference counts once,
// so the callback page, verify-payment and the webhook may all report the same payment safely
export async function credit(db: D1Database, user_id: string, ref: string, amount_kobo: number) {
	await db.prepare('insert into p (r, u, a, d) values (?, ?, ?, ?) on conflict (r) do nothing').bind(ref, user_id, Math.floor(amount_kobo), Date.now()).run();
	return get_balance(db, user_id);
}

export async function get_balance(db: D1Database, user_id: string) {
	return (await db.prepare('select coalesce(sum(a), 0) t from p where u = ?').bind(user_id).first<{ t: number }>())?.t ?? 0;
}
