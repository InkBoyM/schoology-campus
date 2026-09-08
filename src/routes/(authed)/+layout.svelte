<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { brand } from '$lib/brand';
	import BoundaryFailure from '$lib/components/BoundaryFailure.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { loadSchoologyFromLocalStorage, schoologyState } from '$lib/schoologyCatalog.svelte';
	import AppSidebar from './AppSidebar.svelte';

	let { children } = $props();

	if (browser && schoologyState.courses === undefined) {
		if (!loadSchoologyFromLocalStorage()) {
			void goto('/login');
		}
	}
</script>

<svelte:boundary>
	<Sidebar.Provider>
		<AppSidebar />

		<Sidebar.Inset class="min-w-0">
			<header class="bg-background sticky top-0 z-20 flex shrink-0 items-center p-2 md:hidden">
				<Sidebar.Trigger />
				<a
					href="/grades"
					class="mr-auto ml-1 flex items-center gap-2 text-xl font-semibold tracking-tight whitespace-nowrap"
				>
					<img src="/favicon.svg" class="size-6" alt={brand} />
					<span>
						{brand}
						{#if schoologyState.source === 'demo'}
							<span class="text-muted-foreground">Demo</span>
						{/if}
					</span>
				</a>
			</header>

			<div class="flex flex-1 flex-col">
				<svelte:boundary>
					{@render children()}

					{#snippet pending()}
						<div class="flex min-h-screen w-full items-center justify-center">
							<Spinner class="size-8" />
						</div>
					{/snippet}

					{#snippet failed(error, reset)}
						<BoundaryFailure {error} {reset} />
					{/snippet}
				</svelte:boundary>
			</div>

			<div class="mt-auto w-full text-xs">
				<div class="text-muted-foreground mx-auto w-fit p-4 pb-0">
					Your grades stay on this device. How it works:
					<a href="/privacy" class="text-tertiary-foreground underline">Privacy</a>
				</div>
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>

	{#snippet failed(error, reset)}
		<BoundaryFailure {error} {reset} />
	{/snippet}
</svelte:boundary>
