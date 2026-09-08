<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { brand } from '$lib/brand';
	import BackButton from '$lib/components/BackButton.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import BookmarkIcon from '@lucide/svelte/icons/bookmark';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LogInIcon from '@lucide/svelte/icons/log-in';

	if (browser && localStorage.getItem('schoology-compass-1') !== null) {
		void goto('/grades');
	}

	function goImport() {
		void goto('/import');
	}
</script>

<svelte:head>
	<title>Log In - {brand}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<main class="flex grow items-center justify-center">
		<div class="m-4 flex w-full max-w-md flex-col gap-4">
			<BackButton />

			<div class="mb-2 flex flex-col items-center gap-2">
				<img src="/favicon.svg" class="h-8 w-8" alt={brand} />

				<h1 class="text-xl font-bold">Log in to {brand}</h1>
				<p class="text-muted-foreground text-center text-sm">
					Same GradeCompass grade calculator, powered by Schoology data.
				</p>
			</div>

			<Button size="lg" variant="card" class="w-full" onclick={goImport}>
				<LogInIcon class="h-4 w-4" /> Import from Schoology
			</Button>

			<Alert.Root>
				<BookmarkIcon />
				<Alert.Title class="line-clamp-none">One click, no password</Alert.Title>
				<Alert.Description>
					Install the bookmarklet once, then click it on your Schoology grades page. It
					reads the grades already open in your browser — nothing is sent to any server.
				</Alert.Description>
			</Alert.Root>

			<Alert.Root>
				<InfoIcon />
				<Alert.Title class="line-clamp-none">Your grades stay on this device</Alert.Title>
				<Alert.Description>
					Imported grades are stored only in this browser. Clearing site data logs you out.
				</Alert.Description>
			</Alert.Root>
		</div>
	</main>
</div>
