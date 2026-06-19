<script lang="ts">
  import '../app.css';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/seo/Seo.svelte';
  import JsonLd from '$lib/components/seo/JsonLd.svelte';
  let { children } = $props();
  let user = $state<{ id: string; name: string; picture?: string } | null>(null);
  let open = $state(false);
  let wrap: HTMLDivElement | undefined = $state();
  $effect(() => {
    if (!browser) return;
    fetch('/api/me').then(r => r.ok && r.json().then(d => user = d.user)).catch(() => {});
  });
  $effect(() => {
    if (!open) return;
    function listener(e: MouseEvent) {
      if (wrap && !wrap.contains(e.target as Node)) open = false;
    }
    window.addEventListener('click', listener);
    return () => window.removeEventListener('click', listener);
  });
  function toggle() { open = !open; }
  async function logout() {
    await fetch('/logout', { method: 'POST' });
    user = null;
    open = false;
  }
</script>

<Seo meta={{t:'Chess AI',d:'Play chess against Stockfish AI with interactive hints and AI analysis. Train your skills, analyze positions, and improve your game.'}} />
<JsonLd data={{'@context':'https://schema.org','@type':'WebSite','name':'Chess AI','url':'https://chess.apexlinks.org'}} />

<nav class="top-nav">
  <div class="container nav-inner">
    <a href="/" class="brand-lockup">
      <span class="spike-mark" />
      Chess AI
    </a>
    <div class="nav-actions">
      {#if user}
        <div class="user-menu-wrap" bind:this={wrap}>
          <button onclick={toggle} class="user-btn" aria-label="User menu">
            {#if user.picture}
              <img src={user.picture} alt={user.name} class="user-avatar" />
            {:else}
              <span class="user-fallback">{(user.name || '?')[0]}</span>
            {/if}
          </button>
          {#if open}
            <div class="user-menu" role="menu">
              <div class="user-menu-header">
                {#if user.picture}
                  <img src={user.picture} alt={user.name} class="user-avatar large" />
                {:else}
                  <span class="user-fallback large">{(user.name || '?')[0]}</span>
                {/if}
                <div>
                  <div class="user-name">{user.name}</div>
                </div>
              </div>
              <button onclick={logout} class="button-secondary-dark !min-h-8 !px-3 !py-1 text-xs w-full">Logout</button>
            </div>
          {/if}
        </div>
      {:else}
        <a href="/login" class="button-primary !min-h-8 !px-3 !py-1 text-xs">Login</a>
      {/if}
    </div>
  </div>
</nav>

<div style="padding-top: 64px;">
  {@render children()}
</div>

<style>
  .user-menu-wrap {
    position: relative;
  }
  .user-btn {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid var(--hairline);
    background: var(--canvas);
    cursor: pointer;
    display: grid;
    place-items: center;
    overflow: hidden;
    padding: 0;
  }
  .user-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .user-avatar.large {
    width: 44px;
    height: 44px;
  }
  .user-fallback {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
    background: var(--surface-card);
  }
  .user-fallback.large {
    font-size: 18px;
  }
  .user-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 220px;
    border-radius: 12px;
    border: 1px solid var(--hairline);
    background: var(--canvas);
    box-shadow: var(--shadow-soft);
    padding: 12px;
    display: grid;
    gap: 12px;
    z-index: 70;
  }
  .user-menu-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .user-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
  }
</style>
