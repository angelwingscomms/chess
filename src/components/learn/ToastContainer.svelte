<script lang="ts">
	let { toasts }: { toasts: { id: number; msg: string; t: string }[] } = $props();
</script>

{#if toasts.length}
	<div class="fixed top-20 left-1/2 z-[99] flex -translate-x-1/2 flex-col items-center gap-2" role="status">
		{#each toasts as t (t.id)}
			<div class="rounded-full border bg-night/70 px-5 py-2.5 font-calm text-sm text-haze shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-surface {t.t === 'e' ? 'border-[#e78686]/50' : 'border-haze/15'}">{t.msg.toLowerCase()}</div>
		{/each}
	</div>
{/if}
