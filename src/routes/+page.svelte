<script lang="ts">
	import Seo from '$lib/components/seo/Seo.svelte';
	import JsonLd from '$lib/components/seo/JsonLd.svelte';
</script>

<Seo meta={{t:'Beee Chess — Train with an AI coach',d:'Play chess against Stockfish with adaptive difficulty, real-time hints, and an AI coach that explains every move. No sign-up needed.'}} />
<JsonLd data={{'@context':'https://schema.org','@type':'SoftwareApplication','name':'Beee Chess','applicationCategory':'GameApplication','operatingSystem':'Web','description':'Play chess against Stockfish AI with interactive hints and AI analysis','offers':{'@type':'Offer','price':'0','priceCurrency':'USD'}}} />

<main class="page-shell">
	<div class="container min-h-[calc(100dvh-64px)] grid place-items-center">
		<div class="mx-auto w-full max-w-4xl space-y-10 py-16 text-center">
			<div class="space-y-5">
				<h1 class="display-lg text-balance">
					Train chess against an adaptive AI coach<br />
					that explains every move
				</h1>
				<p class="mx-auto max-w-2xl text-lg leading-relaxed text-muted text-balance">
					Play against Stockfish at your level. Get hints when you're stuck.
					Ask the AI why any move works — and actually understand it.
				</p>
			</div>

			<div class="flex flex-wrap items-center justify-center gap-4">
				<a href="/i" class="button-primary min-w-[200px] justify-center text-base">Start training</a>
				<a href="/login" class="button-secondary-dark min-w-[160px] justify-center text-base">Sign in</a>
			</div>

			<div class="grid grid-cols-1 gap-4 pt-8 sm:grid-cols-3">
				<div class="rounded-xl border border-hairline bg-surface-card/60 p-5 text-left">
					<div class="mb-2 size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
						<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg>
					</div>
					<h3 class="mb-1 text-sm font-semibold text-ink">Adaptive difficulty</h3>
					<p class="text-xs leading-relaxed text-muted">Stockfish adjusts to your level — think time and depth scale with you.</p>
				</div>
				<div class="rounded-xl border border-hairline bg-surface-card/60 p-5 text-left">
					<div class="mb-2 size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
						<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>
					</div>
					<h3 class="mb-1 text-sm font-semibold text-ink">AI-powered hints</h3>
					<p class="text-xs leading-relaxed text-muted">See the best move highlighted on the board. Ask the AI why it works in plain language.</p>
				</div>
				<div class="rounded-xl border border-hairline bg-surface-card/60 p-5 text-left">
					<div class="mb-2 size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
						<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
					</div>
					<h3 class="mb-1 text-sm font-semibold text-ink">Instant analysis</h3>
					<p class="text-xs leading-relaxed text-muted">Every move analyzed. Ask questions about the position, your plan, or your opponent's threats.</p>
				</div>
			</div>
		</div>
	</div>
</main>
