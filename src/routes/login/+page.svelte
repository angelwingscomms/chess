<script lang="ts">
  import Seo from '$lib/components/seo/Seo.svelte';
</script>

<Seo meta={{t:'Sign in — Chess AI',d:'Sign in to your Chess AI account to track progress and unlock features.'}} />
<main class="page-shell">
  <div class="container py-4">
    <div class="mx-auto max-w-sm space-y-4 text-center">
      <h1 class="display-sm">Sign in</h1>
      <p class="text-muted text-sm">Sign in with your Google account.</p>
      <a href="/login/google" class="button-primary mt-4 inline-block">Sign in with Google</a>
    </div>
  </div>
</main>
