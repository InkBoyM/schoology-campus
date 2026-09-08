<script lang="ts">
	import { brand } from '$lib/brand';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import InfoIcon from '@lucide/svelte/icons/info';

	const title = 'Attendance';
</script>

<svelte:head>
	<title>{title} - {brand}</title>
</svelte:head>

<div class="m-4 flex justify-center">
	<Alert.Root class="w-fit max-w-xl">
		<InfoIcon />
		<Alert.Title>{title} isn't available for Schoology</Alert.Title>
		<Alert.Description>
			{brand} supports grades and the grade calculator. Schoology attendance isn't exposed by
			the backend.
		</Alert.Description>
		<Button href="/grades" variant="outline" class="mt-2">Back to grades</Button>
	</Alert.Root>
</div>
