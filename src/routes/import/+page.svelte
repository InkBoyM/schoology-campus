<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { brand } from '$lib/brand';
	import BackButton from '$lib/components/BackButton.svelte';
	import LoadingBanner from '$lib/components/LoadingBanner.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { loadFromJson } from '$lib/schoologyCatalog.svelte';
	import type { SchoologyCourse } from '$lib/schoology';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import BookmarkIcon from '@lucide/svelte/icons/bookmark';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	let error: string | undefined = $state();
	let working = $state(false);
	let bookmarkHref = $state('');

	function applyCourses(courses: unknown) {
		if (!Array.isArray(courses) || courses.length === 0) {
			throw new Error('No courses found in that data.');
		}
		loadFromJson(courses as SchoologyCourse[], { source: 'import' });
		void goto('/grades');
	}

	function importFromHash() {
		if (!browser) return false;
		const hash = window.location.hash;
		if (!hash.startsWith('#g=')) return false;
		working = true;
		try {
			const courses = JSON.parse(decodeURIComponent(hash.slice(3)));
			// Clear the hash so a refresh doesn't re-import.
			history.replaceState(null, '', window.location.pathname);
			applyCourses(courses);
			return true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not read the imported data.';
			working = false;
			return true;
		}
	}

	async function buildBookmarklet() {
		try {
			const res = await fetch('bookmarklet.js');
			const code = (await res.text()).replaceAll(
				'__SCHOOLOGY_COMPASS_ORIGIN__',
				window.location.origin
			);
			bookmarkHref = 'javascript:' + encodeURIComponent(code);
		} catch {
			// Non-fatal: manual instructions below still work.
		}
	}

	onMount(() => {
		if (importFromHash()) return;
		buildBookmarklet();
	});
</script>

<svelte:head>
	<title>Import from Schoology - {brand}</title>
</svelte:head>

{#if working}
	<LoadingBanner>Importing grades from Schoology...</LoadingBanner>
{/if}

{#if error}
	<div in:fly={{ y: -50, duration: 200 }} class="fixed top-0 left-0 z-50 flex w-full justify-center p-4">
		<Alert.Root variant="destructive" class="w-fit max-w-xl">
			<AlertCircleIcon />
			<Alert.Title>Import failed</Alert.Title>
			<Alert.Description class="break-words">{error}</Alert.Description>
		</Alert.Root>
	</div>
{/if}

<div class="flex min-h-screen flex-col">
	<main class="mx-auto flex w-full max-w-2xl grow flex-col gap-4 p-4">
		<BackButton />

		<div class="flex flex-col items-center gap-2">
			<img src="/favicon.svg" class="h-8 w-8" alt={brand} />
			<h1 class="text-xl font-bold">Import grades from Schoology</h1>
			<p class="text-muted-foreground text-center text-sm">
				follow the instructions below
			</p>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<BookmarkIcon class="h-5 w-5" /> One-click bookmarklet
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				<ol class="list-decimal space-y-1 pl-5 text-sm">
					<li>
						Drag this link to your bookmarks bar:
						{#if bookmarkHref}
							<a
								href={bookmarkHref}
								class="bg-card rounded border px-2 py-1 font-bold underline"
								onclick={(e) => e.preventDefault()}
								title="Drag me to your bookmarks bar, don't click"
							>
								Import to {brand}
							</a>
						{:else}
							<span class="text-muted-foreground">loading link...</span>
						{/if}
					</li>
					<li>Log into Schoology and open your <strong>Grades</strong> page.</li>
					<li>Click the bookmark. {brand} opens with your grades loaded.</li>
				</ol>
			</Card.Content>
		</Card.Root>
	</main>
</div>
