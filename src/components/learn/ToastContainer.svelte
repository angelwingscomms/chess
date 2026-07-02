<script lang="ts">
	let { toasts }: { toasts: { id: number; msg: string }[] } = $props();
</script>

{#if toasts.length}
	<div class="fixed left-1/2 top-4 z-[99] flex -translate-x-1/2 flex-col items-center gap-2">
		{#each toasts as t (t.id)}
			<div class="rounded-lg px-4 py-2 text-sm text-white shadow-lg" style="background:var(--error)">{t.msg}</div>
		{/each}
	</div>
{/if}
