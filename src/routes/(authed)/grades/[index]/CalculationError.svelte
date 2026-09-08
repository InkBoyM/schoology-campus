<script lang="ts">
	import { brand } from '$lib/brand';
	import * as Alert from '$lib/components/ui/alert';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';

	interface Props {
		hypotheticalMode?: boolean;
		/** Schoology's official percentage (when known) */
		officialPercentage?: number;
		/** Grade recomputed from visible assignments (when known) */
		calculatedPercentage?: number;
	}
	let { hypotheticalMode = false, officialPercentage, calculatedPercentage }: Props = $props();

	const showNumbers = $derived(
		officialPercentage !== undefined &&
			!isNaN(officialPercentage) &&
			calculatedPercentage !== undefined &&
			!isNaN(calculatedPercentage)
	);

	const round = (n: number) => Math.round(n * 100) / 100;
</script>

<Alert.Root variant="destructive" class="max-w-3xl">
	<AlertCircleIcon />

	<Alert.Title>
		{#if hypotheticalMode}
			Grade calculations in Hypothetical Mode are inaccurate
		{:else}
			Grade calculation differs from Schoology
		{/if}
	</Alert.Title>

	<Alert.Description>
		{#if showNumbers}
			<p>
				Schoology reports <strong>{round(officialPercentage!)}%</strong>, but the assignments
				visible here recompute to <strong>{round(calculatedPercentage!)}%</strong>.
			</p>
		{:else}
			<p>
				{brand}'s calculations don't match your official grade percentage. Your official grade
				shown at the top is still correct, but {brand}'s calculations and charts might be off.
			</p>
		{/if}
	</Alert.Description>
</Alert.Root>
