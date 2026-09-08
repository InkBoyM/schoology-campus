<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { brand, repoLink, upstreamLink } from '$lib/brand';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { loadSchoologyFromLocalStorage } from '$lib/schoologyCatalog.svelte';
	import CalculatorIcon from '@lucide/svelte/icons/calculator';
	import ChartLineIcon from '@lucide/svelte/icons/chart-line';
	import FolderLockIcon from '@lucide/svelte/icons/folder-lock';
	import GithubIcon from '@lucide/svelte/icons/github';
	import ImportIcon from '@lucide/svelte/icons/import';

	if (browser && localStorage.getItem('schoology-compass-1') !== null) {
		loadSchoologyFromLocalStorage();
		void goto('/grades');
	}

	function goImport() {
		void goto('/import');
	}

	const features = [
		{
			icon: ChartLineIcon,
			title: 'Grade Chart',
			description:
				'See how your grade changed over time, how each assignment moved your grade, how categories break down, and which assignments are new.'
		},
		{
			icon: CalculatorIcon,
			title: 'Grade Calculator',
			description: `${brand}'s Hypothetical Mode calculates what your grade would be with a score on an assignment, what you need on your final, and much more.`
		},
		{
			icon: ImportIcon,
			title: 'Schoology powered',
			description: `One-click import from your Schoology grades page. No password, nothing sent to any server.`
		},
		{
			icon: FolderLockIcon,
			title: 'Private by design',
			description: `Your grades stay on your device. The backend runs on your own computer and talks to Schoology from there.`,
			link: { href: '/privacy', text: 'Learn more' }
		}
	];
</script>

<svelte:head>
	<title>{brand} - An advanced grade calculator for Schoology</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center">
	<div class="m-4 flex grow flex-col items-center gap-4">
		<div
			class="xs:gap-0 flex flex-col-reverse items-center gap-4 perspective-normal xl:m-8 xl:my-16 xl:flex-row xl:gap-4"
		>
			<main
				class="xs:relative xs:-top-16 xs:-mb-16 z-10 flex flex-col items-center gap-4 xl:static xl:top-0 xl:z-0 xl:mb-0"
			>
				<Card.Root class="xs:shadow-lg max-w-sm xl:shadow-sm">
					<Card.Header>
						<Card.Title class="mx-auto flex items-center gap-2 text-2xl font-bold tracking-tight">
							<img src="/favicon.svg" class="h-8 w-8" alt="{brand} icon" />
							{brand}
						</Card.Title>
					</Card.Header>

					<Card.Content class="space-y-2">
						<p>An advanced grade calculator for Schoology.</p>
						<p class="text-muted-foreground text-sm">
							Same UI and calculators as
							<a href={upstreamLink} target="_blank" rel="noreferrer" class="underline"
								>GradeCompass</a
							>, rebuilt for Schoology data.
						</p>
					</Card.Content>

					<Card.Footer class="flex gap-2">
						<Button size="lg" variant="card" class="flex-1" onclick={goImport}>
							<ImportIcon class="h-5 w-5" /> Import from Schoology
						</Button>
					</Card.Footer>
				</Card.Root>

				<Button href={repoLink} target="_blank" variant="outline">
					<GithubIcon class="h-5 w-5" /> Open Source
				</Button>
			</main>

			<div
				class="border-primary-foreground xs:rotate-x-1 max-w-4xl flex-1 overflow-hidden rounded-xl border-2 shadow-sm xl:max-w-4xl xl:-translate-x-6 xl:scale-90 xl:rotate-x-1 xl:-rotate-y-5 xl:shadow-lg"
			>
				{#snippet demoImage(dark: boolean)}
					<img
						src="/demo_{dark ? 'dark' : 'light'}.webp"
						class={dark ? 'hidden dark:block' : 'dark:hidden'}
						width="2268"
						height="1620"
						alt="SchoologyCompass class page demonstrating hypothetical mode"
					/>
				{/snippet}

				{@render demoImage(false)}
				{@render demoImage(true)}
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
			{#each features as { icon: Icon, title, description, link } (title)}
				<Card.Root class="max-w-sm">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-xl">
							<Icon class="h-5 w-5" />
							{title}
						</Card.Title>
					</Card.Header>
					<Card.Content class="text-tertiary-foreground">
						{description}
						{#if link}
							<a href={link.href} class="text-foreground underline">{link.text}</a>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</div>
</div>
