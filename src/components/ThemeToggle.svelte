<script lang="ts">
	import { onMount } from 'svelte';
	import { set_theme, theme } from '$lib/theme.svelte';

	let ready = $state(false);
	const light = $derived(ready && theme.mode === 'light');
	const icon = 'absolute size-[18px] transition duration-500 ease-expo';

	onMount(() => (ready = true));
</script>

<!-- data-sound: like the sound button, a click here is not the first touch that turns sound on -->
<button
	type="button"
	data-sound
	onclick={() => set_theme(theme.mode === 'light' ? 'dark' : 'light')}
	aria-pressed={ready ? light : undefined}
	aria-label="Light theme"
	title={light ? 'Switch to the dark theme' : 'Switch to the light theme'}
	class="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-haze/15 bg-haze/5 text-haze backdrop-blur-md transition duration-500 ease-expo before:absolute before:-inset-1.5 before:content-[''] hover:border-haze/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow"
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="{icon} light:scale-50 light:-rotate-90 light:opacity-0" aria-hidden="true">
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
	</svg>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="{icon} scale-50 rotate-90 opacity-0 light:scale-100 light:rotate-0 light:opacity-100" aria-hidden="true">
		<path d="M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z" />
	</svg>
</button>
