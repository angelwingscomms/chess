<script lang="ts">
	import { untrack } from 'svelte';
	import XIcon from '$lib/components/icons/x-icon.svelte';
	import PlusIcon from '$lib/components/icons/plus-icon.svelte';
	import { get_learn_state } from './learn_context.svelte';
	import Thumb from './Thumb.svelte';
	import { glass } from './ui';

	const s = get_learn_state();
	let q = $state('');
	let sure = $state('');
	const close = () => (s.show_sessions = false);

	function ago(d: number) {
		const m = Math.floor((Date.now() - d) / 60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m} min ago`;
		if (m < 1440) return `${Math.floor(m / 60)} h ago`;
		return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	$effect(() => {
		const v = q;
		if (s.show_sessions) untrack(() => s.list_sessions(v));
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && s.show_sessions && close()} />

{#if s.show_sessions}
	<div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-night/70 p-4 backdrop-blur-sm" role="presentation" onclick={close}>
		<div
			class="calm flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-haze/12 bg-deep/95 font-calm font-light text-haze shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] animate-surface"
			role="dialog"
			aria-modal="true"
			aria-labelledby="games-title"
			tabindex="-1"
			onkeydown={(e) => e.key === 'Escape' && close()}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
				<div>
					<p class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">{s.logged_in ? 'saved to your account' : 'saved on this device'}</p>
					<h2 id="games-title" class="mt-2 text-3xl font-extralight tracking-[-0.03em]">your games</h2>
				</div>
				<button aria-label="Close your games" class={glass} onclick={close}>
					<XIcon size={15} strokeWidth={1.8} />
				</button>
			</div>
			<div class="flex shrink-0 gap-2 px-6 pb-3">
				<input
					type="search"
					bind:value={q}
					placeholder="find a game…"
					aria-label="Find a game or a chat"
					class="min-w-0 flex-1 rounded-full border border-haze/15 bg-haze/5 px-4 py-2 text-sm text-haze outline-none placeholder:text-mist/70 focus:border-glow/60"
				/>
				<button
					class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-haze/15 px-3.5 text-sm text-haze/85 transition duration-300 ease-expo hover:border-glow/60 hover:text-haze"
					onclick={() => {
						s.resetGame();
						close();
					}}
				>
					<PlusIcon size={15} strokeWidth={1.8} />new game
				</button>
			</div>
			{#if s.sessions}
				<ul class="min-h-0 overflow-y-auto px-3 pb-4">
					{#each s.sessions as x (x.i)}
						<li class="flex items-center gap-1 rounded-2xl transition duration-300 ease-expo {x.i === s.sid ? 'bg-glow/10' : 'hover:bg-haze/5'}">
							<button class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 p-3 text-left" aria-current={x.i === s.sid ? 'true' : undefined} onclick={() => s.open_session(x.i)}>
								<Thumb f={x.f} />
								<span class="min-w-0">
									<span class="block truncate text-sm text-haze">{x.t}</span>
									{#if x.p}<span class="mt-0.5 block truncate text-xs text-mist">“{x.p}”</span>{/if}
									<span class="mt-1 block font-calm-mono text-[10px] tracking-[0.12em] text-mist/70">{ago(x.d)}</span>
								</span>
							</button>
							<button
								aria-label={sure === x.i ? 'Yes, delete this game' : 'Delete this game'}
								class="mr-2 grid h-8 min-w-8 shrink-0 cursor-pointer place-items-center rounded-full px-2 text-xs transition duration-300 ease-expo {sure === x.i ? 'bg-glow/15 text-glow' : 'text-mist/60 hover:text-haze'}"
								onclick={() => (sure === x.i ? s.delete_session(x.i) : (sure = x.i))}
							>
								{#if sure === x.i}delete?{:else}<XIcon size={14} strokeWidth={1.8} />{/if}
							</button>
						</li>
					{:else}
						<li class="px-3 py-10 text-center text-sm text-mist">{q.trim() ? `nothing found for “${q.trim()}”` : 'no games yet. make a move and it saves by itself.'}</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}
