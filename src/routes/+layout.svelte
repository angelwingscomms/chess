<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <title>Chess — Learn & Play</title>
  <meta name="description" content="Play chess against Stockfish AI with interactive hints and analysis" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

{@render children()}
