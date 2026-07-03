<script lang="ts">
	import { page } from '$app/stores';
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';

	let features = [
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>`,
			title: 'Pick your AI model',
			desc: 'Choose from Groq, OpenRouter, Google, or Bynara. Switch anytime.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0zM9 12h6M12 9v6"/>`,
			title: 'Board control',
			desc: 'Undo, redo, flip the board, or switch sides mid-game.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94A9.316 9.316 0 0112 3.75a9.316 9.316 0 013.744.732A9.75 9.75 0 0118 14.25M12 3.75v18m-6.75-6h13.5"/>`,
			title: 'Custom settings',
			desc: 'Adjust think time, hint timing, and coaching style.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
			title: 'Pay per use',
			desc: 'Only pay for AI answers you use. No subscriptions.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>`,
			title: 'Instant analysis',
			desc: 'Every move evaluated. Ask about any position or plan.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/>`,
			title: 'Cross-device sync',
			desc: 'Sign in with Google to save games and sync progress.'
		},
	];
</script>

{#if $page.data.user}
	<Seo meta={{t:'Beee Chess - Train against an AI coach',d:'Play chess against Stockfish with adaptive difficulty, real-time hints, and an AI coach that explains every move.'}} />
	<JsonLd data={{'@context':'https://schema.org','@type':'SoftwareApplication','name':'Beee Chess','applicationCategory':'GameApplication','operatingSystem':'Web','description':'Play chess against Stockfish AI with interactive hints and AI analysis','offers':{'@type':'Offer','price':'0','priceCurrency':'USD'}}} />

	<main class="page-shell" style="background: url(/cosmic-chess-bg.webp) center/cover fixed; position: relative;">
		<div class="absolute inset-0 bg-surface-dark/60"></div>
		<div class="container min-h-[calc(100dvh-64px)] grid place-items-center relative">
			<div class="mx-auto w-full max-w-2xl space-y-8 py-16 text-center">
				<h1 class="display-lg text-balance text-on-dark">Beee Chess</h1>
				<p class="text-lg leading-relaxed text-on-dark/70">Welcome back, {$page.data.user.name}</p>
				<a href="/i" class="button-primary inline-flex min-w-[200px] items-center justify-center px-8 py-3 text-base">Play</a>
			</div>
		</div>
	</main>
{:else}
	<Seo meta={{t:'Beee Chess - Train with an AI coach that explains every move',d:'Play Stockfish at your level. Get hints when stuck. Ask the AI why any move works. Voice commands, cloud saves, and more. No sign-up needed.'}} />
	<JsonLd data={{'@context':'https://schema.org','@type':'SoftwareApplication','name':'Beee Chess','applicationCategory':'GameApplication','operatingSystem':'Web','description':'Play chess against Stockfish AI with adaptive difficulty, AI coaching, hints, voice interface, and cloud saves','offers':{'@type':'Offer','price':'0','priceCurrency':'USD'}}} />

	<main class="page-shell">
		<!-- Hero -->
		<section class="min-h-[100dvh] relative overflow-hidden" style="background: url(/cosmic-chess-bg.webp) center/cover fixed;">
			<div class="absolute inset-0 bg-surface-dark/60"></div>
			<div class="container relative z-10 min-h-[100dvh] flex items-center justify-center pt-24 pb-16">
				<div class="max-w-2xl text-center">
					<h1 class="display-lg text-on-dark mb-5">
						Train chess with an AI coach that explains every move
					</h1>
					<p class="text-lg leading-relaxed text-on-dark/70 max-w-lg mx-auto mb-8">
						Play Stockfish at your level. Get hints when you're stuck.
						Ask the AI why any move works.
					</p>
					<div class="flex flex-wrap gap-3 justify-center">
						<a href="/i" class="inline-flex min-w-[180px] items-center justify-center rounded-lg border border-primary/40 bg-primary/15 px-7 py-3 text-sm font-medium backdrop-blur-md transition-all hover:bg-primary/25" style="color:#fff">Start training</a>
						<a href="/login" class="inline-flex min-w-[140px] items-center justify-center rounded-lg border border-on-dark/10 bg-surface-dark/50 px-7 py-3 text-sm font-medium backdrop-blur-sm transition-all hover:bg-surface-dark/70" style="color:#fff">Sign in</a>
					</div>
				</div>
			</div>
		</section>

		<!-- Play the Engine -->
		<section class="section-band">
			<div class="container">
				<div class="mx-auto max-w-2xl text-center">
					<h2 class="display-md mb-4">Plays at your level, always</h2>
					<p class="text-body text-lg leading-relaxed">
						Stockfish adapts to you. The AI can choose how long to think about the best move
						and can think for as long as it likes. Think time and search depth scale with your skill.
						Strong when you want a challenge, room to learn when you don't.
					</p>
				</div>
			</div>
		</section>

		<!-- AI Coach: stacked dark section with full-width chat mockup -->
		<section class="section-dark py-24 lg:py-32">
			<div class="container">
				<div class="mx-auto max-w-2xl text-center mb-14">
					<h2 class="display-md text-on-dark mb-4">An AI coach that teaches</h2>
					<p class="text-base leading-relaxed text-on-dark/60">
						Two coaching styles. Socratic asks questions to build your intuition.
						Assistant gives clear answers when you want them.
					</p>
				</div>
				<div class="rounded-xl bg-surface-dark-elevated border border-on-dark/8 overflow-hidden max-w-2xl mx-auto">
					<div class="p-5 space-y-4">
						<div class="flex items-start gap-3">
							<div class="size-7 rounded-full bg-primary/30 grid place-items-center text-xs text-primary shrink-0 mt-0.5">U</div>
							<div class="rounded-xl rounded-tl-sm bg-surface-dark-soft px-4 py-3 text-sm text-on-dark max-w-[80%]">
								Why is Nf3 better than d4 here?
							</div>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-7 rounded-full bg-teal/30 grid place-items-center text-xs text-teal shrink-0 mt-0.5">AI</div>
							<div class="rounded-xl rounded-tl-sm bg-surface-dark px-4 py-3 text-sm text-on-dark/80 max-w-[90%]">
								Nf3 develops a piece toward the center while keeping castling options open. d4 would block your light-squared bishop. In this position, development with tempo matters more than occupying the center immediately. What do you think black's best response is?
							</div>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-7 rounded-full bg-primary/30 grid place-items-center text-xs text-primary shrink-0 mt-0.5">U</div>
							<div class="rounded-xl rounded-tl-sm bg-surface-dark-soft px-4 py-3 text-sm text-on-dark max-w-[80%]">
								e5 probably
							</div>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-7 rounded-full bg-teal/30 grid place-items-center text-xs text-teal shrink-0 mt-0.5">AI</div>
							<div class="rounded-xl rounded-tl-sm bg-surface-dark px-4 py-3 text-sm text-on-dark/80 max-w-[90%]">
								Exactly. e5 challenges your center and opens lines for black's pieces. You're thinking like a Socratic student already.
							</div>
						</div>
					</div>
					<div class="border-t border-on-dark/8 px-5 py-3 flex items-center gap-2 text-xs text-on-dark/60">
						<span class="inline-flex items-center gap-1.5"><svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0"/></svg>Cost tracked</span>
						<span class="inline-flex items-center gap-1.5 ml-3"><svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>Hint enabled</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Smart Hints -->
		<section class="section-band">
			<div class="container max-w-4xl">
				<div class="mx-auto max-w-2xl">
					<h2 class="display-md mb-4">Hints when you need them</h2>
					<p class="text-body text-lg leading-relaxed">
						See the best move highlighted on the board. Ask the AI why it's the right
						choice in plain language. Every position analyzed in real time.
					</p>
				</div>
			</div>
		</section>

		<!-- Voice + Cloud Save: two-card grid -->
		<section class="section-band section-soft">
			<div class="container">
				<div class="mx-auto max-w-2xl text-center mb-12">
					<h2 class="display-md mb-4">More ways to train</h2>
					<p class="text-body text-lg leading-relaxed">Train your way. Voice commands or keyboard. On any device.</p>
				</div>
				<div class="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
					<div class="feature-card min-h-0">
						<svg class="size-8 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/></svg>
						<h3 class="text-lg font-medium text-ink mb-2">Talk to your coach</h3>
						<p class="text-body text-sm leading-relaxed">
							Use voice commands or Gemini Live. Ask questions, get spoken analysis.
							Hands-free chess training.
						</p>
					</div>
					<div class="feature-card min-h-0">
						<svg class="size-8 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
						<h3 class="text-lg font-medium text-ink mb-2">Your games, everywhere</h3>
						<p class="text-body text-sm leading-relaxed">
							Sign in with Google to save games to the cloud.
							Switch devices and pick up where you left off.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Everything else: bento grid -->
		<section class="section-band">
			<div class="container">
				<div class="mx-auto max-w-2xl text-center mb-12">
					<h2 class="display-md mb-4">Everything you need to improve</h2>
					<p class="text-body text-lg leading-relaxed">
						From model selection to move history. Every tool a developing player needs.
					</p>
				</div>
				<div class="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
					{#each features as f, i}
						{@const grid_class = i === 0 ? 'md:col-span-2 md:row-span-1' : i === 5 ? 'md:col-span-2' : ''}
						<div class="feature-card {grid_class}">
							<svg class="size-7 text-primary mb-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">{@html f.icon}</svg>
							<h3 class="text-base font-medium text-ink mb-1.5">{f.title}</h3>
							<p class="text-body text-sm leading-relaxed">{f.desc}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- CTA: coral band -->
		<section class="py-20 lg:py-28">
			<div class="container">
				<div class="rounded-xl bg-primary text-white px-8 py-16 lg:py-20 text-center">
					<h2 class="display-md mb-4 text-white">Ready to improve your game?</h2>
					<p class="text-base leading-relaxed text-white/80 max-w-lg mx-auto mb-8">
						No sign-up required. Start playing in seconds.
					</p>
					<a href="/i" class="inline-flex min-w-[200px] items-center justify-center rounded-lg bg-white px-8 py-3 text-sm font-medium text-primary transition-all hover:bg-white/90">
						Start training
					</a>
				</div>
			</div>
		</section>
	</main>
{/if}
