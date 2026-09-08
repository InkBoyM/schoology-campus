<script lang="ts">
	import { onMount } from 'svelte';
	import { cleanCourseName, getSchoologyCourseGrade } from '$lib/schoology';
	import {
		getActivePeriodTitle,
		initializeSchoologyCatalog,
		resetSchoologyPeriod,
		schoologyState,
		switchSchoologyPeriod
	} from '$lib/schoologyCatalog.svelte';
	import { brand } from '$lib/brand';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { saveSeenAssignmentsToLocalStorage } from '$lib/grades/seenAssignments';
	import { seenAssignmentIDs } from '$lib/grades/seenAssignments.svelte';
	import { getSchoologyAssignments } from '$lib/schoology';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import CourseButton from './CourseButton.svelte';
	import ReportPeriodSwitcher from './ReportPeriodSwitcher.svelte';

	onMount(() => {
		initializeSchoologyCatalog();
	});

	const courses = $derived(schoologyState.courses);
	const periodTitles = $derived(schoologyState.periodTitles);
	const activeIndex = $derived(schoologyState.activePeriodIndex);
	const activeTitle = $derived(getActivePeriodTitle());

	const hasNoGrades = $derived(
		courses
			?.map((course) => getSchoologyCourseGrade(course, activeTitle)?.letter ?? 'N/A')
			.every((score) => score === 'N/A') ?? false
	);

	const totalUnseenAssignments = $derived(
		courses?.reduce((total, course) => {
			const count = getSchoologyAssignments(course, activeTitle).filter(
				({ id }) => !seenAssignmentIDs.has(id)
			).length;
			return total + count;
		}, 0) ?? 0
	);

	function clearAllUnseen() {
		courses?.forEach((course) => {
			getSchoologyAssignments(course, activeTitle).forEach(({ id }) =>
				seenAssignmentIDs.add(id)
			);
		});
		saveSeenAssignmentsToLocalStorage(seenAssignmentIDs);
	}
</script>

<svelte:head>
	<title>Grades - {brand}</title>
</svelte:head>

{#if courses && activeTitle !== undefined}
	<div class="m-4 space-y-4">
		<ReportPeriodSwitcher
			activeName={activeTitle}
			activeIndex={activeIndex}
			reportPeriods={periodTitles.map((title, i) => ({
				_GradePeriod: title,
				_Index: String(i),
				_StartDate: '',
				_EndDate: ''
			}))}
			switchReportPeriod={(index) => switchSchoologyPeriod(index)}
			disabled={schoologyState.loading}
			defaultIndex={schoologyState.defaultPeriodIndex}
		/>

		{#if hasNoGrades}
			<Alert.Root class="mx-auto flex w-fit items-center">
				<CircleXIcon class="shrink-0" />
				It looks like you don't have any grades yet in {activeTitle}.

				{#if activeIndex > 0}
					<Button onclick={() => switchSchoologyPeriod(activeIndex - 1)} variant="outline">
						View {periodTitles[activeIndex - 1]}
					</Button>
				{/if}
			</Alert.Root>
		{/if}

		<ol class="flex flex-col items-center gap-4">
			{#each courses as course, index (course.id + ':' + index)}
				{@const grade = getSchoologyCourseGrade(course, activeTitle)}
				{@const unseen = getSchoologyAssignments(course, activeTitle).filter(({ id }) => !seenAssignmentIDs.has(id)).length}
				<li class="w-full max-w-3xl">
					<CourseButton
						{index}
						name={cleanCourseName(course.title)}
						period={activeTitle}
						room={`ID ${course.id}`}
						teacher=""
						teacherEmail=""
						unseenAssignmentsCount={unseen}
						grade={grade ? { letter: grade.letter, percentage: grade.percentage } : undefined}
					/>
				</li>
			{/each}
		</ol>

		{#if courses && totalUnseenAssignments > 0}
			<Alert.Root class="mx-auto flex w-fit items-center gap-4 shadow-lg/30">
				<Alert.Title class="tracking-normal">
					{totalUnseenAssignments} new assignment{totalUnseenAssignments === 1 ? '' : 's'}
				</Alert.Title>
				<Button variant="outline" onclick={clearAllUnseen}>Mark as seen</Button>
			</Alert.Root>
		{/if}
	</div>
{/if}
