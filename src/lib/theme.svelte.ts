import { browser } from '$app/environment';

export type Theme = 'dark' | 'light';

const KEY = 'e4_theme';

// dark unless the visitor chose light; app.html sets data-theme before first paint so the page already shows it
export const theme = $state<{ mode: Theme }>({ mode: browser && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' });

let fade = 0;

function apply(mode: Theme) {
	const root = document.documentElement;
	root.classList.add('theme-fade');
	clearTimeout(fade);
	fade = window.setTimeout(() => root.classList.remove('theme-fade'), 600);
	root.dataset.theme = mode;
	theme.mode = mode;
}

export function set_theme(mode: Theme) {
	try {
		localStorage.setItem(KEY, mode);
	} catch {}
	apply(mode);
}
