<script lang="ts">
	import { page } from '$app/state';
	import { LocalStorageKey, numberFlowDefaultEasing, tailwindColors } from '$lib';
	import { brand } from '$lib/brand';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import {
		calculateAssignmentGPCs,
		calculateAssignmentGPCsFromCategories,
		calculateAssignmentGPCsFromTotals,
		calculateCourseGradePercentageFromCategories,
		calculateCourseGradePercentageFromTotals,
		type Category,
		type Flowed,
		getCalculableAssignments,
		getCalculableAssignmentsWithCategories,
		getHiddenAssignmentsFromCategories,
		getPointsByCategory,
		getPointsByCategoryMap,
		gradesMatch,
		type HiddenAssignment,
		type NewHypotheticalAssignment,
		randomAssignmentID,
		type ReactiveAssignment,
		type RealAssignment
	} from '$lib/grades/assignments';
	import {
		cleanCourseName,
		getSchoologyAssignments,
		getSchoologyCategories,
		getSchoologyCourseGrade
	} from '$lib/schoology';
	import { getActivePeriodTitle, getOrderedCourses } from '$lib/schoologyCatalog.svelte';
	import { saveSeenAssignmentsToLocalStorage } from '$lib/grades/seenAssignments';
	import { seenAssignmentIDs } from '$lib/grades/seenAssignments.svelte';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import Columns3CogIcon from '@lucide/svelte/icons/columns-3-cog';
	import Grid2x2PlusIcon from '@lucide/svelte/icons/grid-2x2-plus';
	import InfoIcon from '@lucide/svelte/icons/info';
	import RotateCCWIcon from '@lucide/svelte/icons/rotate-ccw';
	import NumberFlow from '@number-flow/svelte';
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import AssignmentTabs from './AssignmentTabs.svelte';
	import CalculationError from './CalculationError.svelte';
	import GradeCategoryTable from './GradeCategoryTable.svelte';
	import GradeChart from './GradeChart.svelte';
	import TargetGradeCalculator from './TargetGradeCalculator.svelte';

	const courseIndex = $derived(
		page.params.index !== undefined ? parseInt(page.params.index) : undefined
	);

	const schoologyCourse = $derived(
		courseIndex !== undefined ? getOrderedCourses()[courseIndex] : undefined
	);

	const activeTitle = $derived(getActivePeriodTitle());

	const courseName = $derived(schoologyCourse ? cleanCourseName(schoologyCourse.title) : '');

	const schoologyGrade = $derived(
		schoologyCourse ? getSchoologyCourseGrade(schoologyCourse, activeTitle) : undefined
	);

	const synergyGradePercentage = $derived(schoologyGrade?.percentage ?? NaN);

	const categories: Category[] | undefined = $derived(
		schoologyCourse ? getSchoologyCategories(schoologyCourse, activeTitle) : undefined
	);

	const gradeCategories = $derived(categories?.filter((category) => category.name !== 'TOTAL'));

	const schoologyAssignments: RealAssignment[] = $derived(
		schoologyCourse ? getSchoologyAssignments(schoologyCourse, activeTitle) : []
	);

	const realAssignments = $derived(
		calculateAssignmentGPCs(schoologyAssignments, gradeCategories)
	);

	const hiddenAssignments = $derived(
		categories
			? getHiddenAssignmentsFromCategories(
					categories,
					getPointsByCategory(getCalculableAssignments(realAssignments))
				)
			: []
	);

	const assignments: (RealAssignment | Flowed<RealAssignment | HiddenAssignment>)[] = $derived([
		...hiddenAssignments,
		...realAssignments
	]);

	let hypotheticalMode = $state(false);

	let calculatedGrade = $state(NaN);
	let hypotheticalGrade = $state(NaN);
	let rawGradeCalcMatches = $derived(
		// Schoology's displayed grade may use server-side rounding; only flag
		// a mismatch when both sides are real numbers.
		isNaN(synergyGradePercentage) || isNaN(calculatedGrade)
			? true
			: gradesMatch(calculatedGrade, synergyGradePercentage)
	);

	let reactiveAssignments: ReactiveAssignment[] = $state([]);

	function initReactiveAssignments() {
		reactiveAssignments = assignments.map((assignment) => {
			const reactiveAssignment: ReactiveAssignment = $state({ ...assignment, reactive: true });

			return reactiveAssignment;
		});

		const calculable = getCalculableAssignments(assignments);

		calculatedGrade = gradeCategories
			? calculateCourseGradePercentageFromCategories(
					getPointsByCategory(calculable),
					gradeCategories
				)
			: calculateCourseGradePercentageFromTotals(calculable);

		hypotheticalGrade = calculatedGrade;

		showTargetGradeCalculator = false;
	}

	// Initialize reactive assignments and re-initialize them when assignments change
	$effect(() => {
		void assignments;

		untrack(initReactiveAssignments);
	});

	function recalculateGradePercentage() {
		if (gradeCategories === undefined) {
			reactiveAssignments = calculateAssignmentGPCsFromTotals(reactiveAssignments);

			const calculable = getCalculableAssignments(reactiveAssignments);

			hypotheticalGrade = calculateCourseGradePercentageFromTotals(calculable);
		} else {
			reactiveAssignments = calculateAssignmentGPCsFromCategories(
				reactiveAssignments,
				gradeCategories
			);

			const calculable = getCalculableAssignmentsWithCategories(reactiveAssignments);

			hypotheticalGrade = calculateCourseGradePercentageFromCategories(
				getPointsByCategory(calculable),
				gradeCategories
			);
		}
	}

	const pointsByCategory = $derived(
		getPointsByCategoryMap(getCalculableAssignmentsWithCategories(reactiveAssignments))
	);

	const hasChartData = $derived.by(() =>
		hypotheticalMode
			? getCalculableAssignments(reactiveAssignments).length > 0
			: getCalculableAssignments(realAssignments).length > 0
	);

	function addHypotheticalAssignment() {
		const newHypotheticalAssignment: NewHypotheticalAssignment = $state({
			name: 'Hypothetical Assignment',
			id: randomAssignmentID(),
			pointsEarned: undefined,
			pointsPossible: undefined,
			unscaledPoints: undefined,
			extraCredit: false,
			gradePercentageChange: undefined,
			notForGrade: false,
			hidden: false,
			category: undefined,
			newHypothetical: true,
			date: new Date(),
			reactive: true
		});

		reactiveAssignments = [newHypotheticalAssignment, ...reactiveAssignments];
	}

	const prefix = $derived(hypotheticalMode ? '' : `${schoologyGrade?.letter ?? ''} `);

	const grade = $derived(
		hypotheticalMode
			? hypotheticalGrade / 100
			: schoologyGrade && !isNaN(schoologyGrade.percentage)
				? schoologyGrade.percentage / 100
				: undefined
	);
	const unseenAssignments = $derived(
		realAssignments.filter(({ id }) => !seenAssignmentIDs.has(id))
	);

	let pinChart = $state(false);

	let showTargetGradeCalculator = $state(false);
	function toggleTargetGradeCalculator() {
		showTargetGradeCalculator = !showTargetGradeCalculator;
	}
	const gradeCategoryWeightProportions: Map<string, number> | undefined = $derived(
		gradeCategories
			? new Map(gradeCategories.map(({ name, weightPercentage }) => [name, weightPercentage / 100]))
			: undefined
	);

	const roundedGradePercentage = $derived(
		grade !== undefined ? Math.round(grade * 100 * 1000) / 1000 : undefined
	);

	const assignmentCategoryNames = $derived(
		new Set(realAssignments.map((assignment) => assignment.category).toSorted())
	);

	const assignmentCategoryColors = $derived(
		new Map(
			[...assignmentCategoryNames].map((name, i) => [
				name,
				tailwindColors[(i * 4) % tailwindColors.length]!
			])
		)
	);

	let showCategoryTable = $state(false);

	function markSeenAssignments() {
		realAssignments.forEach(({ id }) => seenAssignmentIDs.add(id));
		saveSeenAssignmentsToLocalStorage(seenAssignmentIDs);
	}

	let triedHypotheticalMode = $state(
		localStorage.getItem(LocalStorageKey.triedHypotheticalMode) === 'true'
	);
	function markHypotheticalModeTried() {
		triedHypotheticalMode = true;
		localStorage.setItem(LocalStorageKey.triedHypotheticalMode, 'true');
	}
</script>

<svelte:head>
	<title>{courseName} - {brand}</title>
</svelte:head>

{#if schoologyCourse}
	<div
		class={[
			'bg-background sticky top-10 z-10 transition-all md:top-0',
			!pinChart && 'md:bg-transparent'
		]}
	>
		<div class="flex justify-between rounded-b-lg">
			<div class="bg-background flex items-center truncate rounded-br-xl px-4 py-2">
				<span class="truncate text-xl sm:text-2xl">{courseName}</span>
			</div>

			<div
				class="bg-background flex shrink-0 items-center rounded-bl-xl px-4 py-2 text-xl sm:text-2xl"
			>
				{#if hypotheticalMode && !categories && !rawGradeCalcMatches}
					<CircleAlertIcon class="mr-2 h-5 w-5" />
				{/if}
				{#if grade !== undefined}
					<NumberFlow
						{prefix}
						value={grade}
						format={{ style: 'percent', maximumFractionDigits: 3 }}
						spinTiming={{ duration: 400, easing: numberFlowDefaultEasing }}
					/>
				{/if}
			</div>
		</div>
		{#if pinChart}
			{@render chart()}
		{/if}
	</div>

	{#if !rawGradeCalcMatches}
		<div class="m-4 flex justify-center" in:fade>
			<CalculationError
				{hypotheticalMode}
				officialPercentage={synergyGradePercentage}
				calculatedPercentage={calculatedGrade}
			/>
		</div>
	{/if}

	{#if !pinChart}
		{@render chart()}
	{/if}

	{#snippet chart()}
		{#if hasChartData}
			<GradeChart
				assignments={hypotheticalMode ? reactiveAssignments : realAssignments}
				{gradeCategories}
				animate={!hypotheticalMode}
				error={!rawGradeCalcMatches}
			/>
		{:else}
			<div class="m-4 flex justify-center">
				<Alert.Root class="mx-4 w-fit">
					<InfoIcon />
					<Alert.Title class="line-clamp-none">Not enough graded assignments to draw the chart yet.</Alert.Title>
					<Alert.Description>
						Once Schoology shows scores for this course, your grade history will appear here.
					</Alert.Description>
				</Alert.Root>
			</div>
		{/if}
	{/snippet}

	<div class="m-4 flex min-h-9 flex-wrap items-center gap-4">
		<div class="flex items-center gap-2">
			<Checkbox
				bind:checked={hypotheticalMode}
				onclick={markHypotheticalModeTried}
				id="hypothetical-mode"
				title="Hypothetical mode allows you to see what your grade would be if you got a certain score on an assignment."
			/>
			<Label for="hypothetical-mode">Hypothetical Mode</Label>
		</div>

		{#if categories && gradeCategories}
			<div class="flex items-center gap-2">
				<Checkbox bind:checked={showCategoryTable} id="show-category-breakdown" />
				<Label for="show-category-breakdown">Show category breakdown</Label>
			</div>
		{/if}

		<div class="hidden items-center gap-2 sm:flex">
			<Checkbox bind:checked={pinChart} id="pin-chart" />
			<Label for="pin-chart">Pin chart to top of screen</Label>
		</div>

		{#if hypotheticalMode}
			<div transition:fade={{ duration: 200 }} class="ml-auto flex flex-wrap gap-1">
				<Button variant="card" onclick={initReactiveAssignments}>
					<RotateCCWIcon class="mr-2 h-4 w-4" />
					Reset
				</Button>

				{#if !showTargetGradeCalculator}
					<div transition:fade={{ duration: 200 }}>
						<Button variant="card" onclick={toggleTargetGradeCalculator}>
							<Columns3CogIcon class="mr-2 h-4 w-4" />
							Target Grade Calculator
						</Button>
					</div>
				{/if}

				<Button variant="card" onclick={addHypotheticalAssignment}>
					<Grid2x2PlusIcon class="mr-2 h-4 w-4" />
					Add Hypothetical Assignment
				</Button>
			</div>
		{/if}
	</div>

	{#if categories && gradeCategories && showCategoryTable}
		<div class="m-4 flex justify-center" transition:fade={{ duration: 200 }}>
			<GradeCategoryTable {gradeCategories} {hypotheticalMode} {pointsByCategory} />
		</div>
	{/if}

	{#if hypotheticalMode && showTargetGradeCalculator}
		<div class="m-4" transition:fade={{ duration: 200 }}>
			<TargetGradeCalculator
				initialGradePercentage={roundedGradePercentage}
				assignments={reactiveAssignments}
				categoryColors={assignmentCategoryColors}
				{gradeCategoryWeightProportions}
				onclose={toggleTargetGradeCalculator}
			/>
		</div>
	{/if}

	{#if schoologyAssignments.length > 0 || hypotheticalMode}
		<div transition:fade={{ duration: 200 }}>
			<AssignmentTabs
				{assignments}
				{reactiveAssignments}
				{gradeCategories}
				{assignmentCategoryNames}
				{assignmentCategoryColors}
				{hypotheticalMode}
				{rawGradeCalcMatches}
				{recalculateGradePercentage}
				{seenAssignmentIDs}
			/>
		</div>
	{:else}
		<div class="flex justify-center">
			<Alert.Root class="mx-4 w-fit">
				<CircleXIcon />
				<Alert.Title class="line-clamp-none">
					Looks like this this course doesn't have any assignments yet.
				</Alert.Title>
			</Alert.Root>
		</div>
	{/if}

	{#if unseenAssignments.length > 0 && !hypotheticalMode}
		<div transition:fade={{ duration: 200 }} class="sticky bottom-8 mt-4 flex justify-center">
			<Alert.Root class="flex w-fit items-center gap-4 shadow-lg/30">
				<Alert.Title class="tracking-normal">
					{unseenAssignments.length} new assignment{unseenAssignments.length === 1 ? '' : 's'}
				</Alert.Title>
				<Button onclick={markSeenAssignments}>Mark as seen</Button>
			</Alert.Root>
		</div>
	{/if}
{/if}
