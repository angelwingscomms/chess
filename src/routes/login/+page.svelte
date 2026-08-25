<script lang="ts">
  import Seo from '$lib/components/seo/Seo.svelte';
  import { browser } from '$app/environment';
  import { goto, invalidateAll } from '$app/navigation';

  let em = $state('');
  let pw = $state('');
  let apiError = $state('');
  let isProcessing = $state(false);

  const next = $derived(browser ? (new URLSearchParams(location.search).get('next') || '/i') : '/i');
  let allValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim()) && pw.length >= 8);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!allValid || isProcessing) return;
    isProcessing = true;
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em.trim(), password: pw })
      });
      const d = await r.json();
      if (!r.ok) {
        apiError = d.error || 'Login failed';
        isProcessing = false;
        return;
      }
      isProcessing = false;
      try {
        await invalidateAll();
        await goto(next);
      } catch {
        window.location.href = next;
      }
    } catch {
      apiError = 'Network error. Please try again.';
      isProcessing = false;
    }
  }
</script>

<Seo meta={{t:'Sign in — e4',d:'Sign in to your e4 account to continue chess training, track progress, and sync games across devices.'}} />
<main class="page-shell">
  <div class="container py-4">
    <div class="mx-auto max-w-sm space-y-4 text-center">
      <h1 class="display-sm">Sign in</h1>
      <p class="text-muted text-sm">Sign in with your email or Google account.</p>
      <form onsubmit={handleSubmit} novalidate class="space-y-3 text-left">
        <input bind:value={em} type="email" placeholder="Email" class="w-full rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary/40" />
        <input bind:value={pw} type="password" placeholder="Password" class="w-full rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary/40" />
        {#if apiError}
          <p class="text-sm text-red-600" role="alert">{apiError}</p>
        {/if}
        <button type="submit" class="button-primary mt-4 inline-block w-full" disabled={!allValid || isProcessing}>
          {isProcessing ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p class="text-muted text-sm">or</p>
      <a href="/login/google?next={encodeURIComponent(next)}" class="button-primary mt-4 inline-block">Sign in with Google</a>
    </div>
  </div>
</main>
