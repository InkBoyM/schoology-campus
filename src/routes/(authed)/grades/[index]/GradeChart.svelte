<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { buildChartPoints } from '$lib/grades/chartData';
	import type { Assignment, Category } from '$lib/grades/assignments';
	import { cn } from '$lib/utils';
	import { Area, AreaChart, LinearGradient, Points } from 'layerchart';

	interface Props {
		assignments: Assignment[];
		gradeCategories?: Category[];
		animate: boolean;
		error?: boolean;
	}
	let { assignments, gradeCategories, error = false }: Props = $props();

	interface DataPointMetadata {
		assignmentsOnDate: Assignment[];
	}

	const points = $derived(buildChartPoints(assignments, gradeCategories));

	const sequential = $derived(points.length > 0 && points[0]?.sequential === true);

	const chartData = $derived(
		points.map((p) => ({
			x: p.sequential ? p.x : new Date(p.x),
			grade: p.grade,
			metadata: { assignmentsOnDate: p.assignmentsOnDate } satisfies DataPointMetadata
		}))
	);

	const dayFormatter = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});

	const seqFormatter = (value: unknown) => `Assignment ${Number(value) + 1}`;

	const percentFormatter = new Intl.NumberFormat('en-US', {
		style: 'percent',
		maximumFractionDigits: 3
	});
</script>

<Chart.Container config={{}} class="m-4 aspect-auto h-64">
	<AreaChart data={chartData} x="x" y="grade" yDomain={null}>
		{#snippet tooltip()}
			<Chart.Tooltip
				labelFormatter={sequential ? seqFormatter : dayFormatter.format}
				hideIndicator={true}
			>
				{#snippet formatter({ value, item })}
					<div>
						<p>{percentFormatter.format(Number(value) / 100)}</p>
						{#each (item.payload.metadata as DataPointMetadata).assignmentsOnDate as assignment (assignment.id)}
							<p>{assignment.name}</p>
						{/each}
					</div>
				{/snippet}
			</Chart.Tooltip>
		{/snippet}

		{#snippet marks()}
			<LinearGradient
				stops={['var(--tw-gradient-from)', 'var(--tw-gradient-via)', 'var(--tw-gradient-to)']}
				class={error
					? 'from-chart-bg-error/50 via-chart-bg-error/15 to-chart-bg-error/1'
					: 'from-chart-bg/50 via-chart-bg/15 to-chart-bg/1'}
				vertical
			>
				{#snippet children({ gradient })}
					<Area
						line={{ class: cn(['stroke-2', error ? 'stroke-chart-error' : 'stroke-chart']) }}
						fill={gradient}
					/>
				{/snippet}
			</LinearGradient>

			<Points r={4} class={error ? 'fill-chart-error' : 'fill-chart'} />
		{/snippet}
	</AreaChart>
	{#if sequential}
		<p class="text-muted-foreground mt-1 text-center text-xs">
			In listed order — Schoology gave no dates for this work.
		</p>
	{/if}
</Chart.Container>
