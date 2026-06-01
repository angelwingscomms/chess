<script lang="ts">
  import '../app.css';
  import { browser } from '$app/environment';
  let { children } = $props();
  let user = $state<{ id: string; name: string; picture?: string } | null>(null);
  $effect(() => {
    if (!browser) return;
    fetch('/api/me').then(r => r.ok && r.json().then(d => user = d.user)).catch(() => {});
  });
  async function logout() {
    await fetch('/logout', { method: 'POST' });
    user = null;
  }
</script>

<svelte:head>
  <title>Chess — Learn & Play</title>
  <meta name="description" content="Play chess against Stockfish AI with interactive hints and analysis" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="fixed right-4 top-4 z-50 flex items-center gap-2">
  {#if user}
    <span class="hidden sm:inline text-sm text-muted">{user.name}</span>
    <button onclick={logout} class="button-secondary-dark !min-h-8 !px-3 !py-1 text-xs">Logout</button>
  {:else}
    <a href="/login" class="button-primary !min-h-8 !px-3 !py-1 text-xs">Login</a>
  {/if}
</div>

{@render children()}
