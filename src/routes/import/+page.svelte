<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { brand } from '$lib/brand';
	import BackButton from '$lib/components/BackButton.svelte';
	import LoadingBanner from '$lib/components/LoadingBanner.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { loadFromJson } from '$lib/schoologyCatalog.svelte';
	import type { SchoologyCourse } from '$lib/schoology';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import BookmarkIcon from '@lucide/svelte/icons/bookmark';
	import FileUpIcon from '@lucide/svelte/icons/file-up';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	let error: string | undefined = $state();
	let working = $state(false);
	let workingMessage = $state('Importing...');
	let bookmarkHref = $state('');
	let pastedJson = $state('');

	function applyCourses(courses: unknown, source: 'import' | 'upload') {
		if (!Array.isArray(courses) || courses.length === 0) {
			throw new Error('No courses found in that data.');
		}
		loadFromJson(courses as SchoologyCourse[], { source });
		void goto('/grades');
	}

	function importFromHash() {
		if (!browser) return false;
		const hash = window.location.hash;
		if (!hash.startsWith('#g=')) return false;
		working = true;
		workingMessage = 'Importing grades from Schoology...';
		try {
			const courses = JSON.parse(decodeURIComponent(hash.slice(3)));
			// Clear the hash so a refresh doesn't re-import.
			history.replaceState(null, '', window.location.pathname);
			applyCourses(courses, 'import');
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

	let htmlFile: HTMLInputElement | undefined = $state();
	let jsonFile: HTMLInputElement | undefined = $state();

	async function handleHtmlFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		working = true;
		workingMessage = 'Parsing saved grades page...';
		error = undefined;
		try {
			const html = await file.text();
			const res = await fetch('/api/grades/parse-html', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ html })
			});
			if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
			applyCourses(await res.json(), 'import');
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			working = false;
			input.value = '';
		}
	}

	async function handleJsonFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			applyCourses(JSON.parse(await file.text()), 'upload');
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			input.value = '';
		}
	}

	function handlePastedJson() {
		try {
			applyCourses(JSON.parse(pastedJson), 'upload');
		} catch (e) {
			error = e instanceof Error ? e.message : 'That is not valid grades JSON.';
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
	<LoadingBanner>{workingMessage}</LoadingBanner>
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
				Uses your existing Schoology login in your own browser. No password is typed here and
				nothing is sent to any server — the data goes straight into this page.
			</p>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<BookmarkIcon class="h-5 w-5" /> Option 1 — One-click bookmarklet (easiest)
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
					<li>
						Click the bookmark. {brand} opens with your grades loaded.
					</li>
				</ol>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<FileUpIcon class="h-5 w-5" /> Option 2 — Upload a saved grades page
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3 text-sm">
				<p>
					On your Schoology grades page, right-click → <strong>Save as</strong> (Webpage,
					Complete), then upload the <code>.html</code> file here.
				</p>
				<input
					bind:this={htmlFile}
					type="file"
					accept="text/html,.html,.htm"
					class="hidden"
					onchange={handleHtmlFile}
				/>
				<Button variant="outline" onclick={() => htmlFile?.click()} disabled={working}>
					<FileUpIcon class="h-4 w-4" /> Choose saved grades HTML
				</Button>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<FileUpIcon class="h-5 w-5" /> Option 3 — Paste or upload grades JSON
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3 text-sm">
				<p>
					Exported from <code>schoology-cli</code> (<code>python grades.py --json</code>) or
					similar tools.
				</p>
				<input
					bind:this={jsonFile}
					type="file"
					accept="application/json,.json"
					class="hidden"
					onchange={handleJsonFile}
				/>
				<div class="flex gap-2">
					<Button variant="outline" onclick={() => jsonFile?.click()} disabled={working}>
						<FileUpIcon class="h-4 w-4" /> Choose grades.json
					</Button>
				</div>
				<Field.Field>
					<Field.Label for="pastedJson">Or paste JSON directly</Field.Label>
					<Textarea
						id="pastedJson"
						bind:value={pastedJson}
						class="font-mono text-xs"
						rows={4}
						placeholder='[{"id": "...", "title": "...", ...}]'
					/>
				</Field.Field>
				<Button variant="card" onclick={handlePastedJson} disabled={working || !pastedJson.trim()}>
					Import pasted JSON
				</Button>
			</Card.Content>
		</Card.Root>
	</main>
</div>
