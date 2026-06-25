<script lang="ts">
  import Seo from '$lib/components/seo/Seo.svelte';
  import { browser } from '$app/environment';

  let affiliate_code = $state(browser ? (new URLSearchParams(location.search).get('i') || '') : '');

</script>

<Seo meta={{t:'Sign in — Chess AI',d:'Sign in to your Chess AI account to track progress and unlock features.'}} />
<main class="page-shell">
  <div class="container py-4">
    <div class="mx-auto max-w-sm space-y-4 text-center">
      <h1 class="display-sm">Sign in</h1>
      <p class="text-muted text-sm">Sign in with your Google account.</p>
      <input
        bind:value={affiliate_code}
        placeholder="Affiliate code (optional)"
        class="w-full rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary/40"
      />
      <a href="/login/google?i={encodeURIComponent(affiliate_code)}" class="button-primary mt-4 inline-block">Sign in with Google</a>
    </div>
  </div>
</main>
