<script lang="ts">
  import { PUBLIC_DOMAIN } from '$env/static/public';
  import { page } from '$app/stores';
  import type { SeoMeta } from '$lib/types/seo.js';
  let { meta }: { meta: SeoMeta } = $props();
  let t = $derived(meta.t);
  let d = $derived(meta.d);
  let canon = $derived(meta.c ?? `${PUBLIC_DOMAIN}${$page.url.pathname}`);
  let og_img = $derived(meta.o?.i ?? `${PUBLIC_DOMAIN}/og?t=${encodeURIComponent(t)}`);
  let og_type = $derived(meta.o?.t ?? 'website');
  let og_img_a = $derived(meta.o?.i_a);
  let tw_card = $derived(meta.w?.c ?? 'summary_large_image');
  let tw_img = $derived(meta.w?.i ?? og_img);
  let robots = $derived(meta.n ? 'noindex, nofollow' : 'index, follow');
</script>

<svelte:head>
  <title>{t}</title>
  <meta name="description" content={d} />
  <meta name="robots" content={robots} />
  <link rel="canonical" href={canon} />
  <meta property="og:title" content={t} />
  <meta property="og:description" content={d} />
  <meta property="og:url" content={canon} />
  <meta property="og:type" content={og_type} />
  <meta property="og:site_name" content="sonu" />
  <meta property="og:image" content={og_img} />
  {#if og_img_a}
    <meta property="og:image:alt" content={og_img_a} />
  {/if}
  <meta name="twitter:card" content={tw_card} />
  <meta name="twitter:title" content={t} />
  <meta name="twitter:description" content={d} />
  <meta name="twitter:image" content={tw_img} />
</svelte:head>
