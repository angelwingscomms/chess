<script lang="ts">
  import '../app.css';
  import Seo from '$lib/components/seo/Seo.svelte';
  import JsonLd from '$lib/components/seo/JsonLd.svelte';
  import type { LayoutProps } from './$types';
  let { data, children }: LayoutProps = $props();
  let user = $state<{ id: string; name: string; picture?: string } | null>(data.user);
  let open = $state(false);
  let wrap: HTMLDivElement | undefined = $state();
  let img_err = $state(false);
  let show_profile = $state(false);
  let token_balance = $state(data.balance);
  let bal_ver = $state(0);
  let buy_amount = $state(10_000);
  let buy_loading = $state(false);
  const MIN_KOBO = 10_000;
	$effect(() => {
		if (bal_ver === 0) return;
		fetch('/api/balance').then(r => r.json()).then(d => { token_balance = d.balance; }).catch(() => {});
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
  async function deposit(amount_kobo: number) {
    buy_loading = true;
    let auth_url = '';
    try {
      const r = await fetch('/api/buy-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_kobo })
      });
      const d = await r.json();
      if (!d.access_code) {
        alert(d.error || 'Failed to initialize payment');
        buy_loading = false;
        return;
      }
      auth_url = d.authorization_url;
      const PaystackPop = (await import('@paystack/inline-js')).default;
      const popup = new PaystackPop();
      const fb = setTimeout(() => { window.location.href = auth_url; }, 15000);
      popup.resumeTransaction(d.access_code, {
        onLoad: () => clearTimeout(fb),
        onSuccess: (tx: { reference: string }) => {
          clearTimeout(fb);
          fetch('/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: tx.reference }) })
            .then(r => r.json()).then(d => {
              if (d.success) { token_balance = d.balance; bal_ver++; }
              else fetch('/api/balance').then(r => r.json()).then(d => { token_balance = d.balance; bal_ver++; }).catch(() => {});
            })
            .catch(() => fetch('/api/balance').then(r => r.json()).then(d => { token_balance = d.balance; bal_ver++; }).catch(() => {}));
          buy_loading = false;
        },
        onCancel: () => { clearTimeout(fb); buy_loading = false; },
        onError: () => { clearTimeout(fb); window.location.href = auth_url; },
      });
    } catch {
      if (auth_url) window.location.href = auth_url;
      else { alert('Network error'); buy_loading = false; }
    }
  }
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
    <a href="/">
      <img src="/logo.svg" alt="Chess AI" class="nav-logo" />
    </a>
    <div class="nav-end">
      {#if user}
        <div class="user-menu-wrap" bind:this={wrap}>
          <button onclick={toggle} class="user-btn" aria-label="User menu">
            {#if user.picture && !img_err}
              <img src={user.picture} alt={user.name} class="user-avatar" onerror={() => img_err = true} />
            {:else}
              <span class="user-fallback">{(user.name || '')[0] || 'u'}</span>
            {/if}
          </button>
          {#if open}
            <div class="user-menu" role="menu">

              <button onclick={() => { show_profile = true; open = false; }} class="button-secondary-dark !min-h-8 !px-3 !py-1 text-xs w-full">Profile</button>
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

{#if show_profile}
  <div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm" role="presentation" onkeydown={(e) => e.key === 'Escape' && (show_profile = false)} onclick={() => show_profile = false}>
    <div class="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas text-body shadow-[0_24px_80px_rgba(20,20,19,0.22)]" role="dialog" aria-modal="true" aria-labelledby="profile-title" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (show_profile = false)} onclick={(e) => e.stopPropagation()}>
      <div class="shrink-0 border-b border-hairline bg-surface-soft px-6 py-5">
        <h2 id="profile-title" class="font-display text-2xl font-medium text-ink">Profile</h2>
      </div>
      <div class="grid gap-4 p-6">
        <div class="rounded-lg bg-surface-card p-4 space-y-2 border border-hairline">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted">Balance</span>
            <span class="font-medium text-ink">₦{(token_balance / 100).toFixed(2)}</span>
          </div>
        </div>
        <div class="border-t border-hairline pt-4 space-y-3">
          <p class="text-xs font-medium uppercase tracking-[0.12em] text-primary">Deposit</p>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">₦</span>
            <input type="number" min={MIN_KOBO / 100} value={buy_amount / 100} oninput={(e) => { const v = parseInt((e.target as HTMLInputElement).value) * 100 || MIN_KOBO; buy_amount = Math.max(v, MIN_KOBO); }} class="w-full rounded-lg border border-hairline bg-surface-card py-2.5 pl-7 pr-3 text-sm text-ink outline-none transition-colors focus:border-primary" />
          </div>
          <p class="text-[10px] text-muted/60">Min: ₦100</p>
          <button class="button-primary w-full justify-center {buy_loading ? 'opacity-50 pointer-events-none' : ''}" onclick={() => deposit(buy_amount)} disabled={buy_loading}>
            {buy_loading ? 'Processing…' : `Deposit ₦${(buy_amount / 100).toLocaleString()}`}
          </button>
        </div>
      </div>
      <div class="shrink-0 flex justify-end border-t border-hairline bg-surface-soft px-6 py-4">
        <button class="button-primary" onclick={() => show_profile = false}>Close</button>
      </div>
    </div>
  </div>
{/if}

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
  .nav-logo {
    display: block;
    height: 36px;
    width: auto;
  }
  .nav-end {
    display: flex;
    align-items: center;
    gap: 22px;
    color: var(--ink);
    font-size: 14px;
    font-weight: 500;
  }

</style>
