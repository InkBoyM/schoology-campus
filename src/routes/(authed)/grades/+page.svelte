<script lang="ts">
	import { onMount } from 'svelte';
	import { cleanCourseName, getSchoologyCourseGrade } from '$lib/schoology';
	import {
		courseKey,
		getActivePeriodTitle,
		getOrderedCourses,
		initializeSchoologyCatalog,
		isCustomOrder,
		moveOrderedCourse,
		resetCourseOrder,
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
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import CourseButton from './CourseButton.svelte';
	import ReportPeriodSwitcher from './ReportPeriodSwitcher.svelte';

	onMount(() => {
		initializeSchoologyCatalog();
	});

	const courses = $derived(getOrderedCourses());
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

	let dragFrom: number | undefined = $state();
	let pressOnHandle = false;

	function onPress(event: PointerEvent) {
		// dragstart targets the draggable <li>, not the grabbed child, so the
		// grab origin must be recorded here on pointerdown instead.
		pressOnHandle = !!(event.target as HTMLElement).closest?.('[data-drag-handle]');
	}

	function onDragStart(event: DragEvent, index: number) {
		// Only the grip handle starts a drag; anything else behaves as a click.
		if (!pressOnHandle) {
			event.preventDefault();
			return;
		}
		dragFrom = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			try {
				event.dataTransfer.setData('text/plain', String(index));
			} catch {
				// ignore
			}
		}
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
	}

	function onDrop(event: DragEvent, index: number) {
		event.preventDefault();
		if (dragFrom !== undefined && dragFrom !== index) moveOrderedCourse(dragFrom, index);
		dragFrom = undefined;
	}

	function onDragEnd() {
		dragFrom = undefined;
		pressOnHandle = false;
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
			{#each courses as course, index (courseKey(course, schoologyState.courses?.indexOf(course) ?? index))}
				{@const grade = getSchoologyCourseGrade(course, activeTitle)}
				{@const unseen = getSchoologyAssignments(course, activeTitle).filter(({ id }) => !seenAssignmentIDs.has(id)).length}
				<li
					class={['flex w-full max-w-3xl items-stretch gap-1', dragFrom === index && 'opacity-50']}
					draggable="true"
					onpointerdown={onPress}
					ondragstart={(e) => onDragStart(e, index)}
					ondragover={onDragOver}
					ondrop={(e) => onDrop(e, index)}
					ondragend={onDragEnd}
				>
					<span
						data-drag-handle
						title="Drag to reorder"
						class="text-muted-foreground flex cursor-grab items-center px-1 active:cursor-grabbing"
					>
						<GripVerticalIcon class="h-5 w-5" />
					</span>
					<div class="min-w-0 flex-1">
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
					</div>
				</li>
			{/each}
		</ol>

		{#if isCustomOrder()}
			<div class="flex justify-center">
				<Button variant="ghost" size="sm" onclick={resetCourseOrder}>Reset class order</Button>
			</div>
		{/if}

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
