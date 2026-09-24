<script lang="ts">
	import StepperInput from '$components/stepper-input.svelte';
	import { get_learn_state, openai_voice_options, voice_options } from './learn_context.svelte';
	import { set_feel, ui } from '$lib/landing/calm.svelte';

	const feel = [
		{ k: 'living', t: 'living colours', d: 'squares drift through colour. off keeps a clear two-tone board.' },
		{ k: 'notes', t: 'hover notes', d: 'soft piano notes as you move over squares.' },
		{ k: 'ripples', t: 'ripples', d: 'water ripples on moves and taps.' }
	] as const;
	const s = get_learn_state();

	let show_settings = $derived(s.show_settings);
	let computer_think_time = $derived(s.computer_think_time);
	let hint_think_time = $derived(s.hint_think_time);
	let model = $derived(s.model);
	let model_options = $derived(s.model_options);
	let show_model_menu = $derived(s.show_model_menu);
	let groq_api_key = $derived(s.groq_api_key);
	let voice_provider = $derived(s.voice_provider);
	let voice_name = $derived(s.voice_name);
	let live_voices = $derived(voice_provider === 'openai' ? openai_voice_options : voice_options);
	let show_voice_menu = $derived(s.show_voice_menu);
	let autoexplain = $derived(s.autoexplain);
	let auto_hint = $derived(s.auto_hint);
	let hint_on_start = $derived(s.hint_on_start);
	let quiet = $derived(s.quiet);
	let noise_suppression = $derived(s.noise_suppression);
	let vibe = $derived(s.vibe);
	let show_vibe_menu = $derived(s.show_vibe_menu);
</script>

{#if show_settings}
	<div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-night/70 p-4 backdrop-blur-sm" role="presentation" onkeydown={(e) => e.key === 'Escape' && (s.show_settings = false)} onclick={() => s.show_settings = false}>
		<div
			data-testid="learn-settings-modal"
			class="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas text-body shadow-[0_24px_80px_rgba(20,20,19,0.22)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-title"
			tabindex="-1"
			onkeydown={(e) => e.key === 'Escape' && (s.show_settings = false)}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="shrink-0 border-b border-hairline bg-surface-soft px-6 py-5">
				<p class="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-primary">Preferences</p>
				<h2 id="settings-title" class="font-display text-2xl font-medium text-ink">Settings</h2>
			</div>
			<div class="grid min-h-0 gap-3 overflow-y-auto p-6">
				<section class="rounded-lg bg-surface-card px-4 py-2" data-tour-feel>
					<p class="pt-2 pb-1 font-calm-mono text-xs tracking-[0.14em] text-mist">feel</p>
					{#each feel as f}
						<label class="flex cursor-pointer items-center justify-between gap-4 py-2.5">
							<span>
								<span class="block text-sm text-ink">{f.t}</span>
								<span class="mt-0.5 block text-xs leading-5 text-muted">{f.d}</span>
							</span>
							<input type="checkbox" checked={ui[f.k]} onchange={(e) => set_feel(f.k, e.currentTarget.checked)} class="peer sr-only" aria-label={f.t} />
							<span class="relative h-6 w-10 shrink-0 rounded-full border border-haze/20 bg-haze/5 transition duration-500 ease-expo peer-checked:border-glow peer-checked:bg-glow/25 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-glow after:absolute after:top-1/2 after:left-1 after:size-4 after:-translate-y-1/2 after:rounded-full after:bg-haze/60 after:transition after:duration-500 after:ease-expo peer-checked:after:translate-x-4 peer-checked:after:bg-glow"></span>
						</label>
					{/each}
				</section>
				<section class="grid gap-3 rounded-lg bg-surface-card p-4" data-testid="settings-difficulty">
					<div class="flex items-center justify-between gap-3">
						<h3 class="text-sm font-medium text-ink">Computer think time (seconds)</h3>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-xs text-muted">Fast</span>
						<StepperInput bind:value={s.computer_think_time} min={0.5} step={0.5} />
						<span class="text-xs text-muted">Deep</span>
					</div>
				</section>
				<section class="grid gap-2 rounded-lg bg-surface-card p-4" data-testid="settings-hint-think-time">
					<div class="flex items-center justify-between gap-3">
						<h3 class="text-sm font-medium text-ink">Hint think time (seconds)</h3>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-xs text-muted">Quick</span>
						<StepperInput bind:value={s.hint_think_time} min={1} step={0.5} />
						<span class="text-xs text-muted">Deep</span>
					</div>
				</section>
				<section class="relative grid gap-2 rounded-lg bg-surface-card p-4">
					<h3 class="text-sm font-medium text-ink" id="model-label">Analysis model</h3>
					<button
						type="button"
						class="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-left text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
						role="combobox"
						aria-labelledby="model-label"
						aria-haspopup="listbox"
						aria-controls="model-listbox"
						aria-expanded={show_model_menu}
						onclick={() => s.show_model_menu = !s.show_model_menu}
						onkeydown={(e) => { if (e.key === 'Escape') s.show_model_menu = false; }}
					>
						<span>
							<span class="block font-medium">{model_options.find((o) => o.v === model)?.l ?? model}</span>
							<span class="mt-0.5 flex items-center gap-1.5 text-xs text-muted">{(model_options.find((o) => o.v === model)?.d) ?? 'Custom model'}{#if model_options.find((o) => o.v === model)?.r}<span class="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">Recommended</span>{/if}</span>
						</span>
						<span class="text-primary">⌄</span>
					</button>
					{#if show_model_menu}
						<div id="model-listbox" class="absolute left-4 right-4 top-[calc(100%-10px)] z-10 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-[0_16px_48px_rgba(20,20,19,0.16)]" role="listbox" aria-labelledby="model-label">
							{#each model_options as option (option.v)}
								<button
									type="button"
									class={option.v === model ? 'grid w-full gap-0.5 bg-surface-soft px-3.5 py-2.5 text-left text-sm text-ink' : 'grid w-full gap-0.5 px-3.5 py-2.5 text-left text-sm text-muted hover:bg-surface-soft hover:text-ink'}
									role="option"
									aria-selected={option.v === model}
									onclick={() => { s.model = option.v; s.show_model_menu = false; }}
								>
									<span class="font-medium">{option.l}</span>
									<span class="flex items-center gap-1.5 text-xs text-muted">{option.d}{#if option.r}<span class="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">Recommended</span>{/if}</span>
								</button>
							{/each}
						</div>
					{/if}
				</section>
				<div class="grid gap-3 rounded-lg bg-primary/5 p-4">
					<p class="text-xs leading-5 text-muted">Use AI features for free by using your own API keys. Requests go directly from your browser &mdash; nothing passes through our server.</p>
				</div>
				<section class="grid gap-2 rounded-lg bg-surface-card p-4">
					<label class="text-sm font-medium text-ink" for="groq-api-key">Groq API key</label>
					<input
						id="groq-api-key"
						type="password"
						bind:value={s.groq_api_key}
						placeholder="gsk_..."
						class="min-h-[40px] w-full rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
					/>
					<p class="text-xs leading-5 text-muted">
						Get your free Groq API key @
						<a class="text-primary underline-offset-2 hover:underline" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a>
					</p>
				</section>
				<section class="grid gap-2 rounded-lg bg-surface-card p-4">
					<label class="text-sm font-medium text-ink" for="openai-api-key">OpenAI API key</label>
					<input
						id="openai-api-key"
						type="password"
						bind:value={s.openai_api_key}
						placeholder="sk-..."
						class="min-h-[40px] w-full rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
					/>
					<p class="text-xs leading-5 text-muted">
						logged-in users get 3 minutes a day on the server key. after that, paste your own.
						Get a key @
						<a class="text-primary underline-offset-2 hover:underline" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">platform.openai.com/api-keys</a>
					</p>
				</section>
				<section class="grid gap-2 rounded-lg bg-surface-card p-4">
					<label class="text-sm font-medium text-ink" for="gemini-api-key">Gemini API key</label>
					<input
						id="gemini-api-key"
						type="password"
						bind:value={s.gemini_api_key}
						placeholder="AIza..."
						class="min-h-[40px] w-full rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
					/>
					<p class="text-xs leading-5 text-muted">
						Get your free Gemini API key @
						<a class="text-primary underline-offset-2 hover:underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>
					</p>
				</section>
				<!--
				<section class="relative grid gap-2 rounded-lg bg-surface-card p-4">
					<h3 class="text-sm font-medium text-ink" id="voice-provider-label">Voice provider</h3>
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							class={voice_provider === 'gemini' ? 'rounded-lg border border-primary bg-surface-soft px-3 py-2 text-left text-sm text-ink' : 'rounded-lg border border-hairline bg-canvas px-3 py-2 text-left text-sm text-muted'}
							onclick={() => { s.voice_provider = 'gemini'; if (!voice_options.find(o => o.v === s.voice_name)) s.voice_name = 'Kore'; }}
						>
							<span class="block font-medium">Gemini</span>
							<span class="text-xs text-muted">default</span>
						</button>
						<button
							type="button"
							class={voice_provider === 'openai' ? 'rounded-lg border border-primary bg-surface-soft px-3 py-2 text-left text-sm text-ink' : 'rounded-lg border border-hairline bg-canvas px-3 py-2 text-left text-sm text-muted'}
							onclick={() => { s.voice_provider = 'openai'; if (!openai_voice_options.find(o => o.v === s.voice_name)) s.voice_name = 'marin'; }}
						>
							<span class="block font-medium">OpenAI live</span>
							<span class="text-xs text-muted">3 min / day</span>
						</button>
					</div>
				</section>
				-->
				<section class="relative grid gap-2 rounded-lg bg-surface-card p-4">
					<h3 class="text-sm font-medium text-ink" id="voice-label">{voice_provider === 'openai' ? 'OpenAI live voice' : 'Gemini live voice'}</h3>
					<button
						type="button"
						class="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-left text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
						role="combobox"
						aria-labelledby="voice-label"
						aria-haspopup="listbox"
						aria-controls="voice-listbox"
						aria-expanded={show_voice_menu}
						onclick={() => s.show_voice_menu = !s.show_voice_menu}
						onkeydown={(e) => { if (e.key === 'Escape') s.show_voice_menu = false; }}
					>
						<span>
							<span class="block font-medium">{live_voices.find((o) => o.v === voice_name)?.l ?? voice_name}</span>
							<span class="mt-0.5 flex items-center gap-1.5 text-xs text-muted">{(live_voices.find((o) => o.v === voice_name)?.d) ?? ''}</span>
						</span>
						<span class="text-primary">⌄</span>
					</button>
					{#if show_voice_menu}
						<div id="voice-listbox" class="absolute left-4 right-4 top-[calc(100%-10px)] z-10 max-h-60 overflow-y-auto rounded-lg border border-hairline bg-canvas shadow-[0_16px_48px_rgba(20,20,19,0.16)]" role="listbox" aria-labelledby="voice-label">
							{#each live_voices as option (option.v)}
								<button
									type="button"
									class={option.v === voice_name ? 'grid w-full gap-0.5 bg-surface-soft px-3.5 py-2.5 text-left text-sm text-ink' : 'grid w-full gap-0.5 px-3.5 py-2.5 text-left text-sm text-muted hover:bg-surface-soft hover:text-ink'}
									role="option"
									aria-selected={option.v === voice_name}
									onclick={() => { s.voice_name = option.v; s.show_voice_menu = false; }}
								>
									<span class="font-medium">{option.l}</span>
									<span class="text-xs text-muted">{option.d}</span>
								</button>
							{/each}
						</div>
					{/if}
				</section>
				<section class="rounded-lg border border-hairline bg-canvas p-4">
					<label class="flex cursor-pointer items-center justify-between gap-4">
						<span>
							<span class="block text-sm font-medium text-ink">Auto-explain hint</span>
							<span class="mt-1 block text-xs leading-5 text-muted">Start analysis when a hint appears.</span>
						</span>
						<span class="grid size-5 place-items-center rounded-full border border-primary">
							<input type="checkbox" bind:checked={s.autoexplain} class="sr-only" aria-label="Auto-explain hint" />
							<span class={autoexplain ? 'size-3 rounded-full bg-primary' : 'size-3 rounded-full bg-transparent'}></span>
						</span>
					</label>
				</section>
				<section class="rounded-lg border border-hairline bg-canvas p-4">
					<label class="flex cursor-pointer items-center justify-between gap-4">
						<span>
							<span class="block text-sm font-medium text-ink">Auto hint</span>
							<span class="mt-1 block text-xs leading-5 text-muted">Get a hint after the computer moves.</span>
						</span>
						<span class="grid size-5 place-items-center rounded-full border border-primary">
							<input type="checkbox" bind:checked={s.auto_hint} class="sr-only" aria-label="Auto hint" />
							<span class={auto_hint ? 'size-3 rounded-full bg-primary' : 'size-3 rounded-full bg-transparent'}></span>
						</span>
					</label>
				</section>
				<section class="rounded-lg border border-hairline bg-canvas p-4">
					<label class="flex cursor-pointer items-center justify-between gap-4">
						<span>
							<span class="block text-sm font-medium text-ink">Hint on start</span>
							<span class="mt-1 block text-xs leading-5 text-muted">Get a hint when this page opens.</span>
						</span>
						<span class="grid size-5 place-items-center rounded-full border border-primary">
							<input type="checkbox" bind:checked={s.hint_on_start} class="sr-only" aria-label="Hint on start" />
							<span class={hint_on_start ? 'size-3 rounded-full bg-primary' : 'size-3 rounded-full bg-transparent'}></span>
						</span>
					</label>
				</section>
				<section class="rounded-lg border border-hairline bg-canvas p-4">
					<label class="flex cursor-pointer items-center justify-between gap-4">
						<span>
							<span class="block text-sm font-medium text-ink">Quiet voice</span>
							<span class="mt-1 block text-xs leading-5 text-muted">Only speak when spoken to.</span>
						</span>
						<span class="grid size-5 place-items-center rounded-full border border-primary">
							<input type="checkbox" bind:checked={s.quiet} class="sr-only" aria-label="Quiet voice" />
							<span class={quiet ? 'size-3 rounded-full bg-primary' : 'size-3 rounded-full bg-transparent'}></span>
						</span>
					</label>
				</section>
				<section class="rounded-lg border border-hairline bg-canvas p-4">
					<label class="flex cursor-pointer items-center justify-between gap-4">
						<span>
							<span class="block text-sm font-medium text-ink">Noise suppression</span>
							<span class="mt-1 block text-xs leading-5 text-muted">Filter background noise with RNNoise WASM.</span>
						</span>
						<span class="grid size-5 place-items-center rounded-full border border-primary">
							<input type="checkbox" bind:checked={s.noise_suppression} class="sr-only" aria-label="Noise suppression" />
							<span class={noise_suppression ? 'size-3 rounded-full bg-primary' : 'size-3 rounded-full bg-transparent'}></span>
						</span>
					</label>
				</section>

				<section class="relative grid gap-2 rounded-lg bg-surface-card p-4">
					<h3 class="text-sm font-medium text-ink" id="vibe-label">Coach style</h3>
					<button
						type="button"
						class="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-left text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,120,92,0.15)]"
						role="combobox"
						aria-labelledby="vibe-label"
						aria-haspopup="listbox"
						aria-controls="vibe-listbox"
						aria-expanded={show_vibe_menu}
						onclick={() => s.show_vibe_menu = !s.show_vibe_menu}
						onkeydown={(e) => { if (e.key === 'Escape') s.show_vibe_menu = false; }}
					>
						<span>
							<span class="block font-medium">{vibe === 'socratic' ? 'Socratic' : 'Assistant'}</span>
							<span class="mt-0.5 flex items-center gap-1.5 text-xs text-muted">{vibe === 'socratic' ? 'Questions guide your learning' : 'Best move and why'}</span>
						</span>
						<span class="text-primary">⌄</span>
					</button>
					{#if show_vibe_menu}
						<div id="vibe-listbox" class="absolute left-4 right-4 top-[calc(100%-10px)] z-10 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-[0_16px_48px_rgba(20,20,19,0.16)]" role="listbox" aria-labelledby="vibe-label">
							<button
								type="button"
								class={vibe === 'socratic' ? 'grid w-full gap-0.5 bg-surface-soft px-3.5 py-2.5 text-left text-sm text-ink' : 'grid w-full gap-0.5 px-3.5 py-2.5 text-left text-sm text-muted hover:bg-surface-soft hover:text-ink'}
								role="option"
								aria-selected={vibe === 'socratic'}
								onclick={() => { s.vibe = 'socratic'; s.show_vibe_menu = false; }}
							>
								<span class="font-medium">Socratic</span>
								<span class="text-xs text-muted">Questions guide your learning</span>
							</button>
							<button
								type="button"
								class={vibe === 'assistant' ? 'grid w-full gap-0.5 bg-surface-soft px-3.5 py-2.5 text-left text-sm text-ink' : 'grid w-full gap-0.5 px-3.5 py-2.5 text-left text-sm text-muted hover:bg-surface-soft hover:text-ink'}
								role="option"
								aria-selected={vibe === 'assistant'}
								onclick={() => { s.vibe = 'assistant'; s.show_vibe_menu = false; }}
							>
								<span class="font-medium">Assistant</span>
								<span class="text-xs text-muted">Best move and why</span>
							</button>
						</div>
					{/if}
				</section>
				<section class="flex items-center justify-between gap-3 rounded-lg bg-surface-card p-4">
					<div>
						<h3 class="text-sm font-medium text-ink">Need a refresher?</h3>
						<p class="text-xs leading-5 text-muted">Replay the 11-step walkthrough.</p>
					</div>
					<button class="button-secondary shrink-0" onclick={() => { s.show_settings = false; setTimeout(() => s.show_tour = true, 150); }}>View tutorial</button>
				</section>
			</div>
			<div class="shrink-0 grid grid-cols-2 gap-3 border-t border-hairline bg-surface-soft px-6 py-4">
				<button class="button-secondary" onclick={() => s.show_settings = false}>Cancel</button>
				<button class="button-primary" onclick={() => s.show_settings = false}>Done</button>
			</div>
		</div>
	</div>
{/if}
