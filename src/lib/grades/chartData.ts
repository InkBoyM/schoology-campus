import {
	calculateCourseGradePercentageFromCategories,
	calculateCourseGradePercentageFromTotals,
	getCalculableAssignments,
	getCalculableAssignmentsWithCategories,
	getPointsByCategory,
	type Assignment,
	type Calculable,
	type CalculableWithCategory,
	type Category
} from './assignments';

export interface ChartPoint {
	/** x value: a timestamp, or a 0-based sequence number when dates are unknown */
	x: number;
	grade: number;
	assignmentsOnDate: Assignment[];
	sequential: boolean;
}

/** Split calculable assignments into dated buckets (sorted) + dateless rest. */
function splitDated<T extends Assignment>(items: T[]): {
	dated: [number, T[]][];
	dateless: T[];
} {
	const byDate = new Map<number, T[]>();
	const dateless: T[] = [];
	for (const a of items) {
		if (a.hasDate === false) {
			dateless.push(a);
			continue;
		}
		const ms = a.date.getTime();
		byDate.set(ms, [...(byDate.get(ms) ?? []), a]);
	}
	const dated = [...byDate.entries()].toSorted(([x], [y]) => x - y);
	return { dated, dateless };
}

/**
 * Build chart points. Dated work plots on its timeline; dateless work joins
 * the most recent dated bucket. When NOTHING has a usable date, points fall
 * back to report order (sequential x) — an honest history without fake dates.
 */
export function buildChartPoints(
	assignments: Assignment[],
	gradeCategories?: Category[]
): ChartPoint[] {
	if (gradeCategories) {
		const calc = getCalculableAssignmentsWithCategories(assignments);
		const { dated, dateless } = splitDated(calc);
		if (dated.length === 0) {
			return cumulativeSequential(dateless, (until) =>
				calculateCourseGradePercentageFromCategories(getPointsByCategory(until), gradeCategories)
			);
		}
		const last = dated[dated.length - 1];
		if (last && dateless.length > 0) last[1].push(...dateless);
		return dated.map(([ms, items], i) => {
			const until = dated
				.slice(0, i + 1)
				.map((e) => e[1])
				.flat();
			return {
				x: ms,
				grade: calculateCourseGradePercentageFromCategories(
					getPointsByCategory(until),
					gradeCategories
				),
				assignmentsOnDate: items,
				sequential: false
			};
		});
	}

	const calc = getCalculableAssignments(assignments);
	const { dated, dateless } = splitDated(calc);
	if (dated.length === 0) {
		return cumulativeSequential(dateless, (until) => calculateCourseGradePercentageFromTotals(until));
	}
	const last = dated[dated.length - 1];
	if (last && dateless.length > 0) last[1].push(...dateless);
	return dated.map(([ms, items], i) => {
		const until = dated
			.slice(0, i + 1)
			.map((e) => e[1])
			.flat();
		return {
			x: ms,
			grade: calculateCourseGradePercentageFromTotals(until),
			assignmentsOnDate: items,
			sequential: false
		};
	});
}

function cumulativeSequential<T extends Calculable<Assignment>>(
	items: T[],
	gradeOf: (until: T[]) => number
): ChartPoint[] {
	const until: T[] = [];
	return items.map((item, i) => {
		until.push(item);
		return { x: i, grade: gradeOf([...until]), assignmentsOnDate: [item], sequential: true };
	});
}
