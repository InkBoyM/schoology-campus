<script lang="ts">
	import { brand } from '$lib/brand';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import InfoIcon from '@lucide/svelte/icons/info';
</script>

<svelte:head>
	<title>Mail - {brand}</title>
</svelte:head>

<div class="m-4 flex justify-center">
	<Alert.Root class="w-fit max-w-xl">
		<InfoIcon />
		<Alert.Title>Mail aren''t available for Schoology</Alert.Title>
		<Alert.Description>
			{brand} supports grades and the grade calculator. Schoology Mail aren''t exposed by
			the backend.
		</Alert.Description>
		<Button href="/grades" variant="outline" class="mt-2">Back to grades</Button>
	</Alert.Root>
</div>
