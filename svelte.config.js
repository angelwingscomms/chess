import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const legacy_svelte_dep = (filename = '') => {
	const path = filename.replaceAll('\\', '/');
	return path.includes('/svelte-chess/') || path.includes('/svelte-chessground/');
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: true
	},
	vitePlugin: {
		dynamicCompileOptions({ filename }) {
			if (legacy_svelte_dep(filename)) {
				return { runes: false, compatibility: { componentApi: 4 } };
			}
		}
	},
	kit: {
		adapter: adapter(),
		alias: {
			$components: 'src/components',
			$lib: 'src/lib'
		}
	}
};

export default config;
