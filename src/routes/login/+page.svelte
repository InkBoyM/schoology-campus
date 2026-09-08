<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { brand, repoLink } from '$lib/brand';
	import BackButton from '$lib/components/BackButton.svelte';
	import LoadingBanner from '$lib/components/LoadingBanner.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import {
		DEFAULT_BACKEND_URL,
		DEFAULT_BASE_URL,
		fetchFromBackend,
		loadDemo,
		loadFromJson,
		schoologyState
	} from '$lib/schoologyCatalog.svelte';
	import type { SchoologyCourse } from '$lib/schoology';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LogInIcon from '@lucide/svelte/icons/log-in';
	import PlayIcon from '@lucide/svelte/icons/play';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	if (browser && localStorage.getItem('schoology-compass-1') !== null) {
		void goto('/grades');
	}

	let baseUrl: string = $state(DEFAULT_BASE_URL);
	let backendUrl: string = $state(DEFAULT_BACKEND_URL);
	let showBrowser: boolean = $state(true);
	let loginError: string | undefined = $state();
	let working = $state(false);
	let workingMessage = $state('Connecting to Schoology...');
	let backendStatus: 'unknown' | 'checking' | 'ok' | 'down' = $state('unknown');

	const backendBase = () => backendUrl.replace(/\/$/, '');

	async function checkBackend() {
		backendStatus = 'checking';
		try {
			const res = await fetch(`${backendBase()}/api/health`);
			backendStatus = res.ok ? 'ok' : 'down';
		} catch {
			backendStatus = 'down';
		}
	}

	onMount(() => {
		checkBackend();
	});

	async function connectBackend(event: SubmitEvent) {
		event.preventDefault();
		if (working) return;
		working = true;
		workingMessage = 'Connecting to Schoology via local backend... (first login can take a minute; complete SSO in the popup window)';
		loginError = undefined;
		try {
			await fetchFromBackend({ backendUrl, baseUrl, headless: !showBrowser });
			void goto('/grades');
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (/failed to fetch|networkerror|load failed/i.test(msg)) {
				loginError = `Could not reach the backend at ${backendBase()}. Start it first: open a terminal in the schoology-compass folder and run "uvicorn server:app --app-dir backend --port 8000", then try again. (Technical detail: ${msg})`;
				backendStatus = 'down';
			} else if (/504|timed out|timeout/i.test(msg)) {
				loginError = `Schoology login timed out. Make sure "Show browser window" is checked, press Connect again, and complete the Google SSO login in the browser window that pops up on your computer. (Technical detail: ${msg})`;
			} else {
				loginError = msg;
			}
		} finally {
			working = false;
		}
	}

	async function openDemo() {
		if (working) return;
		working = true;
		workingMessage = 'Loading demo...';
		try {
			await loadDemo();
			void goto('/grades');
		} finally {
			working = false;
		}
	}

	let fileInput: HTMLInputElement | undefined = $state();
	function triggerUpload() {
		fileInput?.click();
	}

	async function handleFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		working = true;
		workingMessage = 'Reading grades file...';
		loginError = undefined;
		try {
			const text = await file.text();
			const courses = JSON.parse(text) as SchoologyCourse[];
			loadFromJson(courses, { baseUrl, source: 'upload' });
			void goto('/grades');
		} catch (error) {
			loginError =
				error instanceof Error ? error.message : 'Could not read that file as grades JSON.';
		} finally {
			working = false;
			input.value = '';
		}
	}
</script>

<svelte:head>
	<title>Log In - {brand}</title>
</svelte:head>

{#if working}
	<LoadingBanner>{workingMessage}</LoadingBanner>
{/if}

{#if loginError}
	<div in:fly={{ y: -50, duration: 200 }} class="fixed top-0 left-0 z-50 flex w-full justify-center p-4">
		<Alert.Root variant="destructive" class="w-fit max-w-xl">
			<AlertCircleIcon />
			<Alert.Title>Couldn't load grades</Alert.Title>
			<Alert.Description class="break-words">{loginError}</Alert.Description>
		</Alert.Root>
	</div>
{/if}

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

			<Button href="/import" variant="card" size="lg" class="w-full">
				<UploadIcon class="h-4 w-4" /> Quick import from Schoology (recommended)
			</Button>
			<p class="-mt-2 text-center text-xs text-muted-foreground">
				One click from your Schoology grades page — no password, works everywhere.
			</p>

			<form onsubmit={connectBackend} class="flex flex-col gap-4">
				<Field.Group>
					<Field.Field>
						<Field.Label for="baseUrl">Your School's Schoology URL</Field.Label>
						<Input
							id="baseUrl"
							type="url"
							bind:value={baseUrl}
							placeholder="https://your-district.schoology.com"
							autocomplete="url"
							required
						/>
						<Field.Description>
							The backend opens Schoology in a browser on <em>your own computer</em>.
							Log in with Google SSO once; the session is reused after that.
						</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label for="backendUrl">Backend URL</Field.Label>
						<div class="flex gap-2">
							<Input
								id="backendUrl"
								type="url"
								bind:value={backendUrl}
								placeholder={DEFAULT_BACKEND_URL}
								autocomplete="off"
							/>
							<Button
								variant="outline"
								onclick={checkBackend}
								disabled={working || backendStatus === 'checking'}
							>
								Test
							</Button>
						</div>
						<Field.Description>
							Run <code>uvicorn server:app --app-dir backend --port 8000</code> first, or
							leave the default for local use.
						</Field.Description>
						{#if backendStatus === 'ok'}
							<p class="flex items-center gap-1 text-xs text-green-600">
								<CircleCheckIcon class="h-3.5 w-3.5" /> Backend reachable — you're good to
								connect.
							</p>
						{:else if backendStatus === 'down'}
							<p class="text-xs text-red-500">
								Backend not reachable. Start it with
								<code>uvicorn server:app --app-dir backend --port 8000</code>
								(run from the schoology-compass folder), then press Test again.
							</p>
						{:else if backendStatus === 'checking'}
							<p class="text-muted-foreground text-xs">Checking backend...</p>
						{/if}
					</Field.Field>

					<Field.Field orientation="horizontal" class="items-center">
						<Checkbox id="showBrowser" bind:checked={showBrowser} />
						<Field.Label for="showBrowser" class="text-xs">
							Show browser window (required for first login — complete Google SSO in the popup;
							uncheck later for faster background sync)
						</Field.Label>
					</Field.Field>

					<Field.Field>
						<Button type="submit" class="w-full" variant="card" disabled={working}>
							<LogInIcon class="h-4 w-4" /> Connect to Schoology
						</Button>
					</Field.Field>
				</Field.Group>
			</form>

			<Alert.Root>
				<InfoIcon />
				<Alert.Title class="line-clamp-none">No backend? Upload a grades file instead.</Alert.Title>
				<Alert.Description>
					Run <code>python grades.py --json &gt; grades.json</code> from
					<a href={repoLink} target="_blank" rel="noreferrer" class="underline">schoology-cli</a>,
					then upload the file here. Nothing leaves your device.
				</Alert.Description>
			</Alert.Root>

			<input
				bind:this={fileInput}
				type="file"
				accept="application/json,.json"
				class="hidden"
				onchange={handleFile}
			/>

			<div class="flex gap-2">
				<Button variant="outline" class="flex-1" onclick={triggerUpload} disabled={working}>
					<UploadIcon class="h-4 w-4" /> Upload grades.json
				</Button>
				<Button variant="outline" class="flex-1" onclick={openDemo} disabled={working}>
					<PlayIcon class="h-4 w-4" /> Try demo
				</Button>
			</div>

			{#if schoologyState.loadingError}
				<p class="text-center text-xs text-red-500">
					Last error: {schoologyState.loadingError instanceof Error
						? schoologyState.loadingError.message
						: String(schoologyState.loadingError)}
				</p>
			{/if}
		</div>
	</main>
</div>
