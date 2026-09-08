<script lang="ts">
	import { brand, repoLink, upstreamLink } from '$lib/brand';
	import BackButton from '$lib/components/BackButton.svelte';
	import * as Card from '$lib/components/ui/card';
</script>

<svelte:head>
	<title>About {brand}</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center">
	<main class="flex grow items-center">
		<div class="m-4 max-w-xl space-y-2">
			<BackButton />

			<Card.Root>
				<Card.Header>
					<Card.Title>About {brand}</Card.Title>
				</Card.Header>

				<Card.Content class="text-tertiary-foreground space-y-4">
					<p>
						{brand} is a port of
						<a href={upstreamLink} class="underline">GradeCompass</a>
						for Schoology. It reuses the same grade chart, Hypothetical Mode, target-grade
						calculator, and category breakdown UI, but reads grades from Schoology (via a
						backend built on
						<a href={repoLink} class="underline">schoology-cli</a>) instead of StudentVUE.
					</p>

					<p>
						The original GradeCompass is obsolete because the StudentVUE API it used is no
						longer supported. This port keeps its calculator alive for Schoology users.
					</p>

					<p>
						Your grades stay on your device: the backend runs on your own computer, and
						uploaded grades files never leave your browser.
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	</main>
</div>
