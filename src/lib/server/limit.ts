// per-ip request budgets, from the LIMIT rate limiter in wrangler.toml; without it (local dev) nothing is limited
export async function over_limit(platform: App.Platform | undefined, k: string, request: Request) {
	const l = platform?.env.LIMIT;
	if (!l) return false;
	return !(await l.limit({ key: `${k}:${request.headers.get('cf-connecting-ip') ?? 'x'}` })).success;
}
