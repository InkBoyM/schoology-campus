<script lang="ts">
	import BoundaryFailure from '$lib/components/BoundaryFailure.svelte';
	import RefreshIndicator from '$lib/components/RefreshIndicator.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Item from '$lib/components/ui/item';
	import {
		fetchFromBackend,
		getActivePeriodTitle,
		initializeSchoologyCatalog,
		resetSchoologyPeriod,
		schoologyState
	} from '$lib/schoologyCatalog.svelte';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import GradebookLoadingBanner from './GradebookLoadingBanner.svelte';

	let { children } = $props();

	const loadingError = $derived(schoologyState.loadingError);
	const loading = $derived(schoologyState.loading);
	const hasCourses = $derived(schoologyState.courses !== undefined);
	const activeTitle = $derived(getActivePeriodTitle());

	const isDefaultPeriod = $derived(
		schoologyState.activePeriodIndex === schoologyState.defaultPeriodIndex
	);

	const defaultPeriodName = $derived(
		schoologyState.periodTitles[schoologyState.defaultPeriodIndex]
	);

	async function refreshGrades() {
		if (schoologyState.source === 'backend') {
			await fetchFromBackend();
		} else {
			// Upload/demo data is static; just bump the timestamp.
			schoologyState.lastRefresh = Date.now();
		}
	}

	onMount(() => {
		initializeSchoologyCatalog();
	});
</script>

{#if (!hasCourses || loading) && loadingError === undefined}
	<div class="flex justify-center" in:fade out:fly={{ y: '-50%' }}>
		<GradebookLoadingBanner
			loadingReportPeriodName={activeTitle}
			status={hasCourses ? 'Receiving' : 'Pending'}
		/>
	</div>
{/if}

{#if schoologyState.lastRefresh !== undefined}
	<RefreshIndicator
		canRefresh={!loading && schoologyState.source === 'backend'}
		lastRefresh={schoologyState.lastRefresh}
		refresh={refreshGrades}
	/>
{/if}

{#if loadingError !== undefined}
	<Alert.Root variant="destructive" class="mx-auto w-fit min-w-sm">
		<AlertCircleIcon />
		<Alert.Title>An error occurred while loading grades.</Alert.Title>
		<Alert.Description>
			{loadingError instanceof Error ? loadingError.message : String(loadingError)}
		</Alert.Description>
	</Alert.Root>
{/if}

{#if hasCourses && !isDefaultPeriod && activeTitle}
	<div class="m-4 flex justify-center">
		<Item.Root variant="outline" size="sm" class="w-full max-w-3xl">
			<Item.Media>
				<HistoryIcon class="size-5" />
			</Item.Media>

			<Item.Content>
				<Item.Title class="whitespace-nowrap">
					<span>
						Viewing grades from
						<span class="font-bold">
							{activeTitle}
						</span>
					</span>
				</Item.Title>
			</Item.Content>

			<Item.Actions>
				<Button onclick={resetSchoologyPeriod} variant="outline">
					Return to {defaultPeriodName}
				</Button>
			</Item.Actions>
		</Item.Root>
	</div>
{/if}

<svelte:boundary>
	{@render children()}

	{#snippet failed(error, reset)}
		<BoundaryFailure {error} {reset} />
	{/snippet}
</svelte:boundary>
