<script lang="ts">
	import { brand } from '$lib/brand';
	import BackButton from '$lib/components/BackButton.svelte';
	import * as Card from '$lib/components/ui/card';
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
						{brand} is based on
						<a
							href="https://github.com/PurelyAnecdotal/gradecompass"
							target="_blank"
							rel="noreferrer"
							class="underline">GradeCompass</a
						>
					</p>

					<p>
						The bookmarklet stays local it works by reading the Schoology grades page
						already open and passes the data directly to the app. Nothing gets sent to
						servers which includes passwords and grades.
					</p>

					<p>This project is open source on Github</p>
				</Card.Content>
			</Card.Root>
		</div>
	</main>
</div>
