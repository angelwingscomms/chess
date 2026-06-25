<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/seo/Seo.svelte';
	let { data } = $props();
	let countdown = $state(10);

	onMount(() => {
		const t = setInterval(() => {
			countdown--;
			if (countdown <= 0) { clearInterval(t); goto('/i', { replaceState: true }); }
		}, 1000);
	});
</script>

<Seo meta={{ t: `Payment ${data.success ? 'Successful' : 'Failed'}`, d: 'Payment callback', n: true }} />

<div class="fixed inset-0 grid place-items-center bg-canvas p-4">
	<div class="max-w-sm text-center space-y-4">
		{#if data.success}
			<div class="mx-auto size-16 rounded-full bg-green-500/10 grid place-items-center">
				<svg class="size-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
			</div>
			<h1 class="font-display text-2xl font-medium text-ink">Payment Successful</h1>
			<p class="text-sm text-muted">₦{(data.balance / 100).toFixed(2)} has been added to your account.</p>
			<p class="text-xs text-muted/60">New balance: ₦{(data.balance / 100).toFixed(2)}</p>
		{:else}
			<div class="mx-auto size-16 rounded-full bg-red-500/10 grid place-items-center">
				<svg class="size-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
			</div>
			<h1 class="font-display text-2xl font-medium text-ink">Payment {data.message}</h1>
			<p class="text-sm text-muted">{data.message}</p>
		{/if}
		<p class="text-xs text-muted/40">Redirecting in {countdown}s...</p>
	</div>
</div>
