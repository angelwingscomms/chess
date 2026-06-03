<script lang="ts">
  let { data }: { data: Record<string, unknown> } = $props();
  let json = $derived(JSON.stringify(data));
</script>

<svelte:head>
  <script type="application/ld+json">{@html json}</script>
</svelte:head>
