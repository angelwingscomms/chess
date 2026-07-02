<script lang="ts">
	import { NGN_USD } from '$lib/util/rates';
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();

	let show_token_modal = $derived(s.show_token_modal);
	let total_cost = $derived(s.total_cost);
</script>

{#if show_token_modal}
	<div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm" role="presentation" onkeydown={(e) => e.key === 'Escape' && (s.show_token_modal = false)} onclick={() => s.show_token_modal = false}>
		<div class="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas text-body shadow-[0_24px_80px_rgba(20,20,19,0.22)]" role="dialog" aria-modal="true" aria-labelledby="bal-title" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (s.show_token_modal = false)} onclick={(e) => e.stopPropagation()}>
			<div class="shrink-0 border-b border-hairline bg-surface-soft px-6 py-5">
				<p class="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-primary">Usage</p>
				<h2 id="bal-title" class="font-display text-2xl font-medium text-ink">Usage</h2>
			</div>
			<div class="grid gap-4 p-6">
				{#if total_cost > 0}
					<div class="rounded-lg bg-surface-card p-4">
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted">Cost (NGN)</span>
							<span class="font-medium text-primary">₦{(total_cost * NGN_USD).toFixed(2)}</span>
						</div>
					</div>
				{:else}
					<p class="text-sm text-muted text-center py-6">No usage yet.</p>
				{/if}
			</div>
			<div class="shrink-0 flex justify-end border-t border-hairline bg-surface-soft px-6 py-4">
				<button class="button-primary" onclick={() => s.show_token_modal = false}>Close</button>
			</div>
		</div>
	</div>
{/if}
