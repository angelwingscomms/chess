import type { ParamMatcher } from '@sveltejs/kit';
import { info } from '$lib/info';

export const match: ParamMatcher = (p) => Object.hasOwn(info, p);
