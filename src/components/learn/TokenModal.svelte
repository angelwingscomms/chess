<script lang="ts">
	import { NGN_USD } from '$lib/util/rates';
	import { get_learn_state } from './learn_context.svelte';
	const s = get_learn_state();
	const close = () => (s.show_token_modal = false);
</script>

{#if s.show_token_modal}
	<div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-night/70 p-4 backdrop-blur-sm" role="presentation" onkeydown={(e) => e.key === 'Escape' && close()} onclick={close}>
		<div class="calm flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-haze/12 bg-deep/95 font-calm font-light text-haze shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] animate-surface" role="dialog" aria-modal="true" aria-labelledby="bal-title" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && close()} onclick={(e) => e.stopPropagation()}>
			<div class="px-6 pt-6 pb-2">
				<p class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">usage</p>
				<h2 id="bal-title" class="mt-2 text-3xl font-extralight tracking-[-0.03em]">what the coach used</h2>
			</div>
			<div class="px-6 py-4">
				{#if s.total_cost > 0 || s.total_p > 0 || s.total_c > 0}
					<div class="divide-y divide-haze/8 text-sm [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:py-3">
						<div><span class="text-mist">text it read</span><span class="tabular-nums">{s.total_p.toLocaleString()}</span></div>
						<div><span class="text-mist">text it wrote</span><span class="tabular-nums">{s.total_c.toLocaleString()}</span></div>
						<div><span class="text-mist">cost</span><span class="text-glow tabular-nums">₦{(s.total_cost * NGN_USD).toFixed(2)}</span></div>
					</div>
					<p class="mt-2 text-xs leading-5 text-mist">text is counted in tokens, small pieces of words.</p>
				{:else}
					<p class="py-6 text-center text-sm text-mist">nothing used yet. ask the coach something!</p>
				{/if}
			</div>
			<div class="flex justify-end border-t border-haze/10 px-6 py-4">
				<button class="cursor-pointer rounded-full bg-glow px-6 py-2.5 text-sm transition duration-500 ease-expo hover:shadow-[0_0_30px_rgba(233,164,124,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow" onclick={close}><span class="text-night">close</span></button>
			</div>
		</div>
	</div>
{/if}
