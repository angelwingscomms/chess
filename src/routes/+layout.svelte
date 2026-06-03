<script lang="ts">
  import '../app.css';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/seo/Seo.svelte';
  import JsonLd from '$lib/components/seo/JsonLd.svelte';
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

<Seo meta={{t:'Chess AI',d:'Play chess against Stockfish AI with interactive hints and AI analysis. Train your skills, analyze positions, and improve your game.'}} />
<JsonLd data={{'@context':'https://schema.org','@type':'WebSite','name':'Chess AI','url':'https://chess.apexlinks.org'}} />

<div class="fixed right-4 top-4 z-50 flex items-center gap-2">
  {#if user}
    <span class="hidden sm:inline text-sm text-muted">{user.name}</span>
    <button onclick={logout} class="button-secondary-dark !min-h-8 !px-3 !py-1 text-xs">Logout</button>
  {:else}
    <a href="/login" class="button-primary !min-h-8 !px-3 !py-1 text-xs">Login</a>
  {/if}
</div>

{@render children()}
