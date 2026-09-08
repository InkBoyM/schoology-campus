<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { schoologyState } from '$lib/schoologyCatalog.svelte';

	const json = $derived(
		schoologyState.courses ? JSON.stringify(schoologyState.courses, null, 2) : ''
	);
</script>

<div class="m-4 flex h-full flex-col items-center gap-4">
	{#if json}
		<Textarea value={json} class="h-full font-mono text-xs" readonly />
	{/if}
</div>
