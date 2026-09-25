<script lang="ts">
	import StepperInput from '$components/stepper-input.svelte';
	import { get_learn_state, openai_voice_options, voice_options } from './learn_context.svelte';
	import { set_feel, ui } from '$lib/landing/calm.svelte';
	import { LEVELS } from '$lib/util/chess/engine';

	const s = get_learn_state();
	const feel = [
		{ k: 'living', t: 'living colours', d: 'the squares slowly drift through colours. off keeps a clear two-tone board.' },
		{ k: 'notes', t: 'hover notes', d: 'soft piano notes as you move over the squares.' },
		{ k: 'ripples', t: 'ripples', d: 'water ripples when pieces move and when you tap.' }
	] as const;
	const helps = [
		{ v: 'socratic', t: 'asks you questions', d: 'helps you work it out yourself' },
		{ v: 'assistant', t: 'explains the answer', d: 'tells you the move and why' }
	] as const;
	const hints = [
		{ k: 'auto_hint', t: 'a hint after each computer move', d: 'the best move glows on the board.' },
		{ k: 'autoexplain', t: 'explain every hint', d: 'the coach says why the hint is good.' },
		{ k: 'hint_on_start', t: 'a hint when you open e4', d: 'start with a little help.' }
	] as const;
	const voice_opts = [
		{ k: 'quiet', t: 'quiet voice', d: 'the coach only talks when you talk to it.' },
		{ k: 'noise_suppression', t: 'noise filter', d: 'hides background noise while you talk.' }
	] as const;

	const h3 = 'font-calm-mono text-[11px] tracking-[0.16em] text-mist';
	const card = 'rounded-2xl border border-haze/10 bg-haze/[0.03]';
	const field = 'min-h-11 w-full rounded-xl border border-haze/15 bg-night/60 px-3.5 py-2.5 text-sm text-haze outline-none transition duration-300 ease-expo placeholder:text-mist/60 focus:border-glow/60';
	const pick = 'flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-haze/15 bg-night/60 px-3.5 py-2.5 text-left text-sm text-haze transition duration-300 ease-expo hover:border-haze/30 focus-visible:outline-2 focus-visible:outline-glow';
	const menu = 'absolute right-0 left-0 z-10 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-haze/15 bg-deep p-1 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)]';
	const opt = 'grid w-full cursor-pointer gap-0.5 rounded-lg px-3 py-2 text-left text-sm transition duration-200 hover:bg-haze/8';

	let live_voices = $derived(s.voice_provider === 'openai' ? openai_voice_options : voice_options);
	let level = $derived(LEVELS[Math.min(Math.max(s.level, 1), LEVELS.length) - 1]);
	const close = () => (s.show_settings = false);
</script>

{#snippet toggle(on: boolean, t: string, d: string, set: (v: boolean) => void)}
	<label class="flex cursor-pointer items-center justify-between gap-4 py-2.5">
		<span>
			<span class="block text-sm text-haze">{t}</span>
			<span class="mt-0.5 block text-xs leading-5 text-mist">{d}</span>
		</span>
		<input type="checkbox" checked={on} onchange={(e) => set(e.currentTarget.checked)} class="peer sr-only" aria-label={t} />
		<span class="relative h-6 w-10 shrink-0 rounded-full border border-haze/20 bg-haze/5 transition duration-500 ease-expo peer-checked:border-glow peer-checked:bg-glow/25 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-glow after:absolute after:top-1/2 after:left-1 after:size-4 after:-translate-y-1/2 after:rounded-full after:bg-haze/60 after:transition after:duration-500 after:ease-expo peer-checked:after:translate-x-4 peer-checked:after:bg-glow"></span>
	</label>
{/snippet}

<svelte:window onkeydown={(e) => e.key === 'Escape' && s.show_settings && close()} />

{#if s.show_settings}
	<div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-night/70 p-4 backdrop-blur-sm" role="presentation" onkeydown={(e) => e.key === 'Escape' && close()} onclick={close}>
		<div
			data-testid="learn-settings-modal"
			class="calm flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-haze/12 bg-deep/95 font-calm font-light text-haze shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] animate-surface"
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-title"
			tabindex="-1"
			onkeydown={(e) => e.key === 'Escape' && close()}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="shrink-0 px-6 pt-6 pb-4">
				<p class={h3}>settings</p>
				<h2 id="settings-title" class="mt-2 text-3xl font-extralight tracking-[-0.03em]">make it yours</h2>
			</div>
			<div class="grid min-h-0 gap-6 overflow-y-auto px-6 pb-6">
				<section data-testid="settings-difficulty">
					<h3 class={h3}>the computer</h3>
					<p class="mt-2 text-sm text-haze/85">how strong should it play?</p>
					<div class="mt-3 grid grid-cols-5 gap-1 rounded-2xl border border-haze/10 bg-night/40 p-1" role="radiogroup" aria-label="computer strength">
						{#each LEVELS as l, i}
							<button
								role="radio"
								aria-checked={s.level === i + 1}
								class="min-h-10 cursor-pointer rounded-xl px-1 text-xs transition duration-300 ease-expo focus-visible:outline-2 focus-visible:outline-glow {s.level === i + 1 ? 'bg-glow/20 text-glow' : 'text-haze/75 hover:bg-haze/8 hover:text-haze'}"
								onclick={() => (s.level = i + 1)}>{l.t}</button
							>
						{/each}
					</div>
					<p class="mt-2 text-xs text-mist">{level.d}. puzzles match this level too.</p>
				</section>

				<section>
					<h3 class={h3}>your coach</h3>
					<p class="mt-2 text-sm text-haze/85">how should it help?</p>
					<div class="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="coach style">
						{#each helps as h}
							<button
								role="radio"
								aria-checked={s.vibe === h.v}
								class="cursor-pointer rounded-2xl border p-3.5 text-left transition duration-300 ease-expo focus-visible:outline-2 focus-visible:outline-glow {s.vibe === h.v ? 'border-glow/70 bg-glow/10' : 'border-haze/12 hover:border-haze/30'}"
								onclick={() => (s.vibe = h.v)}
							>
								<span class="block text-sm {s.vibe === h.v ? 'text-glow' : 'text-haze'}">{h.t}</span>
								<span class="mt-1 block text-xs leading-5 text-mist">{h.d}</span>
							</button>
						{/each}
					</div>
					<div class="relative mt-4">
						<p id="voice-label" class="mb-2 text-sm text-haze/85">its voice</p>
						<button type="button" class={pick} role="combobox" aria-labelledby="voice-label" aria-haspopup="listbox" aria-controls="voice-listbox" aria-expanded={s.show_voice_menu} onclick={() => (s.show_voice_menu = !s.show_voice_menu)} onkeydown={(e) => e.key === 'Escape' && (s.show_voice_menu = false)}>
							<span>{live_voices.find((o) => o.v === s.voice_name)?.l ?? s.voice_name} <span class="text-mist">· {(live_voices.find((o) => o.v === s.voice_name)?.d ?? '').toLowerCase()}</span></span>
							<span class="text-mist" aria-hidden="true">⌄</span>
						</button>
						{#if s.show_voice_menu}
							<div id="voice-listbox" class={menu} role="listbox" aria-labelledby="voice-label">
								{#each live_voices as o (o.v)}
									<button type="button" role="option" aria-selected={o.v === s.voice_name} class="{opt} {o.v === s.voice_name ? 'text-glow' : 'text-haze/85'}" onclick={() => { s.voice_name = o.v; s.show_voice_menu = false; }}>
										<span>{o.l} <span class="text-mist">· {o.d.toLowerCase()}</span></span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
					<div class="mt-2 divide-y divide-haze/8">
						{#each voice_opts as o}
							{@render toggle(s[o.k], o.t, o.d, (v) => (s[o.k] = v))}
						{/each}
					</div>
				</section>

				<section>
					<h3 class={h3}>hints</h3>
					<div class="mt-1 divide-y divide-haze/8">
						{#each hints as h}
							{@render toggle(s[h.k], h.t, h.d, (v) => (s[h.k] = v))}
						{/each}
					</div>
				</section>

				<section data-tour-feel>
					<h3 class={h3}>feel</h3>
					<div class="mt-1 divide-y divide-haze/8">
						{#each feel as f}
							{@render toggle(ui[f.k], f.t, f.d, (v) => set_feel(f.k, v))}
						{/each}
					</div>
				</section>

				<details class="group {card} px-4">
					<summary class="flex cursor-pointer list-none items-center justify-between py-3.5 text-sm text-haze/85 [&::-webkit-details-marker]:hidden">
						for grown-ups: ai model and keys
						<span class="text-mist transition-transform duration-300 group-open:rotate-180" aria-hidden="true">⌄</span>
					</summary>
					<div class="grid gap-5 pb-5">
						<div class="relative">
							<p id="model-label" class="mb-2 text-sm text-haze/85">ai model for the coach</p>
							<button type="button" class={pick} role="combobox" aria-labelledby="model-label" aria-haspopup="listbox" aria-controls="model-listbox" aria-expanded={s.show_model_menu} onclick={() => (s.show_model_menu = !s.show_model_menu)} onkeydown={(e) => e.key === 'Escape' && (s.show_model_menu = false)}>
								<span class="min-w-0 truncate">{s.model_options.find((o) => o.v === s.model)?.l ?? s.model}</span>
								<span class="text-mist" aria-hidden="true">⌄</span>
							</button>
							{#if s.show_model_menu}
								<div id="model-listbox" class={menu} role="listbox" aria-labelledby="model-label">
									{#each s.model_options as o (o.v)}
										<button type="button" role="option" aria-selected={o.v === s.model} class="{opt} {o.v === s.model ? 'text-glow' : 'text-haze/85'}" onclick={() => { s.model = o.v; s.show_model_menu = false; }}>
											<span>{o.l}{#if o.r}<span class="ml-2 rounded-full bg-glow/15 px-2 py-0.5 text-[10px] text-glow">recommended</span>{/if}</span>
											<span class="text-xs text-mist">{o.d}</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>
						<div class="flex items-center justify-between gap-3">
							<span class="text-sm text-haze/85">hint thinking time <span class="text-mist">(seconds)</span></span>
							<StepperInput bind:value={s.hint_think_time} min={1} step={0.5} />
						</div>
						<p class="text-xs leading-5 text-mist">optional: use your own keys. they stay in this browser and go straight to the provider.</p>
						{#each [{ id: 'groq', t: 'groq key', ph: 'gsk_…', href: 'https://console.groq.com/keys' }, { id: 'gemini', t: 'gemini key', ph: 'AIza…', href: 'https://aistudio.google.com/apikey' }, { id: 'openai', t: 'openai key', ph: 'sk-…', href: 'https://platform.openai.com/api-keys' }] as k}
							<label class="grid gap-2">
								<span class="flex items-center justify-between text-sm text-haze/85">{k.t}<a class="text-xs text-mist underline-offset-2 hover:text-glow hover:underline" href={k.href} target="_blank" rel="noreferrer"><span class="text-mist">get one</span></a></span>
								{#if k.id === 'groq'}
									<input type="password" bind:value={s.groq_api_key} placeholder={k.ph} class={field} />
								{:else if k.id === 'gemini'}
									<input type="password" bind:value={s.gemini_api_key} placeholder={k.ph} class={field} />
								{:else}
									<input type="password" bind:value={s.openai_api_key} placeholder={k.ph} class={field} />
								{/if}
							</label>
						{/each}
					</div>
				</details>
			</div>
			<div class="flex shrink-0 items-center justify-between gap-3 border-t border-haze/10 px-6 py-4">
				<button class="cursor-pointer text-sm text-mist transition hover:text-haze" onclick={() => { close(); setTimeout(() => (s.show_tour = true), 150); }}>show me around again</button>
				<button class="cursor-pointer rounded-full bg-glow px-6 py-2.5 text-sm text-night transition duration-500 ease-expo hover:shadow-[0_0_30px_rgba(233,164,124,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow" onclick={close}><span class="text-night">done</span></button>
			</div>
		</div>
	</div>
{/if}
