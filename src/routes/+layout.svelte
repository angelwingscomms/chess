<script lang="ts">
  import '../app.css';
  import Seo from '$lib/components/seo/Seo.svelte';
  import JsonLd from '$lib/components/seo/JsonLd.svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import Calm from '$components/landing/Calm.svelte';
  import { calm, ui } from '$lib/landing/calm.svelte';
  import type { LayoutProps } from './$types';
  let { data, children }: LayoutProps = $props();
  const calm_route = $derived(!page.url.pathname.startsWith('/test'));
  let user = $derived(data.user);
  const item = 'flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-left text-sm text-haze/90 transition duration-300 ease-expo hover:bg-haze/10 hover:text-haze focus-visible:bg-haze/10 focus-visible:outline-none';
  let open = $state(false);
  let wrap: HTMLDivElement | undefined = $state();
  let img_err = $state(false);
  let show_profile = $state(false);
  let token_balance = $state(data.balance);
  let date_joined = $state(data.date_joined);
  let bal_ver = $state(0);
	let buy_amount = $state(10_000);
	let buy_loading = $state(false);
	let buy_input = $state('');
  const MIN_KOBO = 10_000;
	$effect(() => {
		if (bal_ver === 0) return;
		fetch('/api/balance').then(r => r.json()).then(d => { token_balance = d.balance; }).catch(() => {});
	});
	$effect(() => {
		if (!browser) return;
		function handler(e: Event) { token_balance = (e as CustomEvent).detail; }
		window.addEventListener('balance-update', handler);
		return () => window.removeEventListener('balance-update', handler);
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
        alert(d.error || 'payment couldn’t start. please try again.');
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
      else { alert('no connection. please try again.'); buy_loading = false; }
    }
  }
  async function logout() {
    await fetch('/logout', { method: 'POST' });
    open = false;
    location.href = '/';
  }
</script>

<Seo meta={{t:'e4 — learn chess with an ai coach',d:'learn chess from your first move with an ai coach that explains every move in plain words and talks with you out loud. free to start, no account needed.'}} />
<JsonLd data={{'@context':'https://schema.org','@type':'WebSite','name':'e4','url':'https://chess.apexlinks.org'}} />

{#if calm_route}
  <Calm />
{/if}
<nav class="top-nav" class:calm-nav={calm_route}>
  <div class="container nav-inner">
    <a href="/">
      <img src="/logo.svg" alt="e4" class="nav-logo" />
    </a>
    <div class="nav-end">
      {#if calm_route && page.url.pathname !== '/i'}
        <button type="button" data-sound onclick={() => { calm.sound.set(!calm.sound.on); ui.sound = calm.sound.on; }} aria-pressed={ui.sound} title={ui.sound ? 'sound on' : 'sound off'} class="flex h-9 w-9 cursor-pointer items-center justify-center gap-[3px] rounded-full border border-haze/15 bg-haze/5 backdrop-blur-md transition duration-500 ease-expo hover:border-haze/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow">
          <span class="sr-only">sound</span>
          {#each ['[animation-delay:0s]', '[animation-delay:0.2s]', '[animation-delay:0.4s]', '[animation-delay:0.1s]'] as d}
            <span class="block h-3.5 w-[2px] rounded-full bg-haze/80 transition-transform duration-500 ease-expo {ui.sound ? `animate-bar ${d}` : 'scale-y-[0.2]'}"></span>
          {/each}
        </button>
      {/if}
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
              <button role="menuitem" onclick={() => { show_profile = true; open = false; }} class={item}>your account</button>
              <button role="menuitem" onclick={logout} class={item}>log out</button>
            </div>
          {/if}
        </div>
      {:else if page.url.pathname !== '/login'}
        <a href="/login" class="rounded-full border border-haze/20 bg-haze/5 px-5 py-2 text-sm text-haze backdrop-blur-md transition duration-500 ease-expo hover:border-glow/60 hover:bg-glow/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow">log in</a>
      {/if}
    </div>
  </div>
</nav>

{#if show_profile}
  <div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-night/70 p-4 backdrop-blur-sm" role="presentation" onkeydown={(e) => e.key === 'Escape' && (show_profile = false)} onclick={() => show_profile = false}>
    <div class="calm flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-haze/12 bg-deep/95 font-calm font-light text-haze shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] animate-surface" role="dialog" aria-modal="true" aria-labelledby="profile-title" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (show_profile = false)} onclick={(e) => e.stopPropagation()}>
      <div class="px-6 pt-6 pb-2">
        <p class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">your account</p>
        <h2 id="profile-title" class="mt-2 text-3xl font-extralight tracking-[-0.03em]">{(user?.name || 'hello').split(' ')[0].toLowerCase()}</h2>
      </div>
      <div class="grid gap-6 overflow-y-auto px-6 py-4">
        <div class="divide-y divide-haze/8 text-sm [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-4 [&>div]:py-3">
          {#if user?.email}
            <div><span class="text-mist">email</span><span class="min-w-0 truncate">{user.email}</span></div>
          {/if}
          {#if date_joined}
            <div><span class="text-mist">joined</span><span>{new Date(date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toLowerCase()}</span></div>
          {/if}
          <div><span class="text-mist">coach credit</span><span class="text-glow tabular-nums">₦{(token_balance / 100).toFixed(2)}</span></div>
        </div>
        <div class="grid gap-3">
          <p class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">add credit</p>
          <div class="relative">
            <span class="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-mist">₦</span>
            <input type="number" min={MIN_KOBO / 100} bind:value={buy_input} placeholder="100" aria-label="amount in naira" class="min-h-11 w-full rounded-xl border border-haze/15 bg-night/60 py-2.5 pr-3.5 pl-8 text-sm text-haze outline-none transition duration-300 ease-expo placeholder:text-mist/60 focus:border-glow/60" />
          </div>
          <p class="text-xs text-mist">the smallest top-up is ₦100.</p>
          <button class="min-h-11 w-full cursor-pointer rounded-full bg-glow px-6 text-sm transition duration-500 ease-expo hover:shadow-[0_0_30px_rgba(233,164,124,0.6)] disabled:cursor-default disabled:opacity-40 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow" onclick={() => deposit(parseInt(buy_input) * 100 || MIN_KOBO)} disabled={buy_loading || !buy_input || parseInt(buy_input) <= 0}>
            <span class="text-night">{buy_loading ? 'opening payment…' : `add ₦${(parseInt(buy_input) * 100 || MIN_KOBO) / 100}`}</span>
          </button>
        </div>
      </div>
      <div class="flex justify-end border-t border-haze/10 px-6 py-4">
        <button class="cursor-pointer text-sm text-mist transition hover:text-haze" onclick={() => show_profile = false}>close</button>
      </div>
    </div>
  </div>
{/if}

<div>
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
    border: 1px solid rgba(250,249,245,0.12);
    background: rgba(250,249,245,0.08);
    cursor: pointer;
    display: grid;
    place-items: center;
    overflow: hidden;
    padding: 0;
    backdrop-filter: blur(8px);
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
    color: var(--on-dark);
    background: var(--surface-dark-elevated);
  }
  .user-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 200px;
    border-radius: 16px;
    border: 1px solid rgb(236 231 241 / 0.12);
    background: rgb(20 18 31 / 0.95);
    box-shadow: 0 30px 80px -20px rgb(0 0 0 / 0.8);
    backdrop-filter: blur(18px);
    padding: 6px;
    display: grid;
    gap: 2px;
    z-index: 70;
  }
  .nav-logo {
    display: block;
    height: 36px;
    width: auto;
    filter: brightness(0) invert(1);
  }
  .nav-end {
    display: flex;
    align-items: center;
    gap: 22px;
    color: var(--on-dark);
    font-size: 14px;
    font-weight: 500;
  }

</style>
