<script lang="ts">
  import '../app.css';
  import Seo from '$lib/components/seo/Seo.svelte';
  import JsonLd from '$lib/components/seo/JsonLd.svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import Calm from '$components/landing/Calm.svelte';
  import ThemeToggle from '$components/ThemeToggle.svelte';
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
  let joined = $state(0);
  let forget = $state(0); // 0 not asked, 1 asked to confirm, 2 deleting
  $effect(() => {
    if (!show_profile || joined) return;
    fetch('/api/me').then((r) => r.json()).then((d) => (joined = d?.user?.d || 0)).catch(() => {});
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
  // deletes the account and every saved game, then signs out
  async function delete_me() {
    if (forget !== 1) return void (forget = 1);
    forget = 2;
    const r = await fetch('/api/me', { method: 'DELETE' }).catch(() => null);
    if (r?.ok) location.href = '/';
    else forget = 0;
  }
  async function logout() {
    await fetch('/logout', { method: 'POST' });
    open = false;
    location.href = '/';
  }
</script>

<Seo meta={{t:'e4 — learn chess with an ai coach',d:'learn chess from your first move. play a friendly computer, then ask your coach why, by typing or out loud. free, with no account needed.'}} />
<JsonLd data={{'@context':'https://schema.org','@type':'WebSite','name':'e4','url':'https://chess.apexlinks.org'}} />

{#if calm_route}
  <Calm />
{/if}
<nav class="top-nav" class:calm-nav={calm_route}>
  <div class="container nav-inner">
    <a href="/">
      <img src="/logo.svg" alt="e4" class="nav-logo brightness-0 invert light:invert-0" />
    </a>
    <div class="nav-end">
      {#if calm_route}
        <ThemeToggle />
      {/if}
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
          <button onclick={toggle} class="user-btn" aria-label="user menu">
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
    <div class="calm flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-haze/12 bg-deep/95 font-calm font-light text-haze shadow-[0_40px_120px_-30px_rgb(0_0_0/calc(0.9*var(--sh-k)))] animate-surface" role="dialog" aria-modal="true" aria-labelledby="profile-title" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (show_profile = false)} onclick={(e) => e.stopPropagation()}>
      <div class="px-6 pt-6 pb-2">
        <p class="font-calm-mono text-[11px] tracking-[0.16em] text-mist">your account</p>
        <h2 id="profile-title" class="mt-2 text-3xl font-extralight tracking-[-0.03em]">{(user?.name || 'hello').split(' ')[0]}</h2>
      </div>
      <div class="grid gap-6 overflow-y-auto px-6 py-4">
        <div class="divide-y divide-haze/8 text-sm [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-4 [&>div]:py-3">
          {#if user?.email}
            <div><span class="text-mist">email</span><span class="min-w-0 truncate">{user.email}</span></div>
          {/if}
          {#if joined}
            <div><span class="text-mist">joined</span><span>{new Date(joined).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }).toLowerCase()}</span></div>
          {/if}
        </div>
        <div class="grid gap-2">
          <button class="min-h-11 w-full cursor-pointer rounded-full border px-6 text-sm transition duration-500 ease-expo disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow {forget ? 'border-bad/70 text-bad' : 'border-haze/15 text-mist hover:border-bad/60 hover:text-bad'}" onclick={delete_me} disabled={forget === 2}>
            {forget === 2 ? 'deleting…' : forget ? 'tap again to delete everything' : 'delete my account and games'}
          </button>
          {#if forget === 1}
            <p class="text-xs text-mist">your account and every saved game go for good.</p>
          {/if}
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
    border: 1px solid color-mix(in srgb, var(--color-haze) 12%, transparent);
    background: color-mix(in srgb, var(--color-haze) 8%, transparent);
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
    border: 1px solid color-mix(in srgb, var(--color-haze) 12%, transparent);
    background: color-mix(in srgb, var(--color-deep) 95%, transparent);
    box-shadow: 0 30px 80px -20px rgb(0 0 0 / calc(0.8 * var(--sh-k)));
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
