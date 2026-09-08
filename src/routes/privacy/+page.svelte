<script lang="ts">
	import { browser } from '$app/environment';
	import { brand, contactEmail } from '$lib/brand';
	import BackButton from '$lib/components/BackButton.svelte';
	import * as Card from '$lib/components/ui/card';

	let email = $state('[email protected]');
	if (browser) email = contactEmail;
</script>

<svelte:head>
	<title>Privacy - {brand}</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center">
	<main class="flex grow items-center">
		<div class="m-4 max-w-xl space-y-2">
			<BackButton />

			<Card.Root>
				<Card.Header>
					<Card.Title>About the privacy of {brand}</Card.Title>
				</Card.Header>

				<Card.Content class="text-tertiary-foreground space-y-4">
					<p>
						{brand} is designed to keep students' information private.
					</p>

					<p>
						Live Schoology mode runs a backend on your own computer. Your browser talks to
						that backend, and the backend talks to Schoology from your machine — grades never
						go through anyone else's server.
					</p>

					<p>
						Upload mode never touches the network at all: the grades.json file you export
						from schoology-cli is parsed locally in your browser and cached in localStorage
						on your device.
					</p>

					<p>
						One-click import (bookmarklet) also stays local: it reads the Schoology grades
						page already open in your own browser tab and passes the data directly to this
						app. Our servers never see your Schoology password, session, or grades, and
						nothing is stored server-side — every visitor's data lives only in their own
						browser.
					</p>

					<p>
						If you have questions or concerns about {brand}, you can contact us at
						<a href="mailto:{email}" class="underline">{email}</a>.
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	</main>
</div>
