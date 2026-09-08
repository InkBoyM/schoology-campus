import type { Category, RealAssignment } from '$lib/grades/assignments';

// ---------------------------------------------------------------------------
// Types matching schoology-cli grades.py output (see schoology-cli README).
// ---------------------------------------------------------------------------

export interface SchoologyItem {
	id: string; // e.g. "I-123412341234"
	title: string;
	grade: string | null; // e.g. "10 / 10" or null when ungraded
	due_date: string | null; // e.g. "8/19/26" or "8/21/26 11:59pm"
	comment: string | null;
	url: string | null; // e.g. "/assignment/123412341234"
	// Optional enrichment from assignments.py detail fetch.
	description?: string | null;
}

export interface SchoologyCategory {
	id: string;
	title: string; // e.g. "Assignments"
	weight: string | null; // e.g. "15%"
	grade: string | null; // e.g. "A+ ( 99.07% )"
	items: SchoologyItem[];
}

export interface SchoologyPeriod {
	id: string;
	title: string; // e.g. "26-27 T1"
	weight: string | null;
	grade: string | null;
	categories: SchoologyCategory[];
}

export interface SchoologyCourse {
	id: string;
	title: string;
	grade: string | null; // overall, e.g. "A+ ( 99.07% )"
	periods: SchoologyPeriod[];
}

// ---------------------------------------------------------------------------
// Grade string parsing.
// Schoology grade strings look like:
//   course/category: "A+ ( 99.07% )" | "100%" | null
//   item:            "10 / 10" | null
//   weight:          "15%" | null
// ---------------------------------------------------------------------------

export interface ParsedCourseGrade {
	letter: string;
	percentage: number;
}

const LETTER_PCT_RE = /^([A-F][+-]?)\s*\(\s*([\d.]+)%\s*\)$/i;
const PCT_ONLY_RE = /^([\d.]+)%$/;
const POINTS_RE = /(-?[\d.]+)\s*\/\s*(-?[\d.]+)/;
const PCT_ANY_RE = /(-?[\d.]+)\s*%/;

/** Tokens that always mean "no usable score", matched against the whole string. */
const UNGRADED_TOKENS = new Set([
	'—',
	'–',
	'-',
	'none',
	'n/a',
	'na',
	'not graded',
	'ungraded',
	'no grade',
	'missing',
	'excused',
	'incomplete',
	'exempt',
	'collected',
	'draft',
	'late',
	'not submitted',
	'not turned in'
]);

function isUngradedToken(t: string): boolean {
	return t === '' || UNGRADED_TOKENS.has(t.toLowerCase());
}

export function letterForPercentage(pct: number): string {
	if (pct >= 97) return 'A+';
	if (pct >= 93) return 'A';
	if (pct >= 90) return 'A-';
	if (pct >= 87) return 'B+';
	if (pct >= 83) return 'B';
	if (pct >= 80) return 'B-';
	if (pct >= 77) return 'C+';
	if (pct >= 73) return 'C';
	if (pct >= 70) return 'C-';
	if (pct >= 67) return 'D+';
	if (pct >= 63) return 'D';
	if (pct >= 60) return 'D-';
	return 'F';
}

/** Parse "A+ ( 99.07% )" or "100%" into {letter, percentage}. */
export function parseCourseGradeString(grade: string | null | undefined): ParsedCourseGrade | undefined {
	if (!grade) return undefined;
	const t = grade.trim().replace(/\s+/g, ' ');
	if (isUngradedToken(t)) return undefined;

	const mLetter = t.match(LETTER_PCT_RE);
	if (mLetter) {
		return { letter: (mLetter[1] ?? '').toUpperCase(), percentage: parseFloat(mLetter[2] ?? '') };
	}
	const mPct = t.match(PCT_ONLY_RE);
	if (mPct) {
		const pct = parseFloat(mPct[1] ?? '');
		if (isNaN(pct)) return undefined;
		return { letter: letterForPercentage(pct), percentage: pct };
	}
	// Bare letter (rare) — no percentage available.
	if (/^[A-F][+-]?$/i.test(t)) return { letter: t.toUpperCase(), percentage: NaN };
	return undefined;
}

/** Parse "10 / 10" (or "10/10", "Score: 10 / 10", ...) into {earned, possible}.
 * Falls back to a trailing "95%" as {earned: 95, possible: 100}.
 * Returns undefined when ungraded. Points are preferred over any status words
 * (e.g. "0 / 20" counts as a zero even if marked missing). */
export function parseItemPoints(
	grade: string | null | undefined
): { earned: number; possible: number } | undefined {
	if (!grade) return undefined;
	const t = grade.trim().replace(/\s+/g, ' ');
	if (isUngradedToken(t)) return undefined;
	const m = t.match(POINTS_RE);
	if (m) {
		const earned = parseFloat(m[1] ?? '');
		const possible = parseFloat(m[2] ?? '');
		if (!isNaN(earned) && !isNaN(possible)) return { earned, possible };
	}
	const p = t.match(PCT_ANY_RE);
	if (p) {
		const pct = parseFloat(p[1] ?? '');
		if (!isNaN(pct)) return { earned: pct, possible: 100 };
	}
	return undefined;
}

/** Parse "15%" into 15. */
export function parseWeight(weight: string | null | undefined): number | undefined {
	if (!weight) return undefined;
	const m = weight.trim().match(/^([\d.]+)%$/);
	if (!m) return undefined;
	const v = parseFloat(m[1] ?? '');
	return isNaN(v) ? undefined : v;
}

/** Parse Schoology due dates like "8/19/26" or "8/21/26 11:59pm". */
export function parseSchoologyDate(due: string | null | undefined): Date {
	if (!due) return new Date();
	const t = due.trim();
	// Normalize "8/21/26 11:59pm" -> "8/21/26 11:59 pm" for Date parsing.
	const normalized = t.replace(/(\d)(am|pm)$/i, '$1 $2');
	const d = new Date(normalized);
	return isNaN(d.getTime()) ? new Date() : d;
}

// ---------------------------------------------------------------------------
// Period handling. Schoology periods are per-course (unlike Synergy's global
// report periods), so we collect the union of period titles across courses
// and treat each unique title as a "report period" for the switcher UI.
// ---------------------------------------------------------------------------

export function getSchoologyPeriodTitles(courses: SchoologyCourse[]): string[] {
	const titles: string[] = [];
	for (const c of courses) {
		for (const p of c.periods ?? []) {
			if (!titles.includes(p.title)) titles.push(p.title);
		}
	}
	return titles;
}

/** Pick the period of a course matching the active title, else best fallback. */
export function getCourseActivePeriod(
	course: SchoologyCourse,
	activeTitle: string | undefined
): SchoologyPeriod | undefined {
	const periods = course.periods ?? [];
	if (periods.length === 0) return undefined;
	if (activeTitle) {
		const match = periods.find((p) => p.title === activeTitle);
		if (match) return match;
	}
	// Fallback: first period that has any grade, else first period.
	return periods.find((p) => p.grade) ?? periods[0];
}

export function getSchoologyCourseGrade(
	course: SchoologyCourse,
	activeTitle: string | undefined
): ParsedCourseGrade | undefined {
	const period = getCourseActivePeriod(course, activeTitle);
	return (
		parseCourseGradeString(period?.grade) ?? parseCourseGradeString(course.grade) ?? undefined
	);
}

// ---------------------------------------------------------------------------
// Mapping to GradeCompass calculator model (same UI components reused).
// ---------------------------------------------------------------------------

export function getSchoologyCategories(
	course: SchoologyCourse,
	activeTitle: string | undefined
): Category[] | undefined {
	const period = getCourseActivePeriod(course, activeTitle);
	if (!period) return undefined;
	const cats = period.categories ?? [];
	if (cats.length === 0) return undefined;

	// If no category carries a weight, return undefined so calculators use totals.
	const anyWeight = cats.some((c) => parseWeight(c.weight) !== undefined);
	if (!anyWeight) return undefined;

	return cats.map((c) => {
		let pointsEarned = 0;
		let pointsPossible = 0;
		for (const item of c.items ?? []) {
			const pts = parseItemPoints(item.grade);
			if (pts) {
				pointsEarned += pts.earned;
				pointsPossible += pts.possible;
			}
		}
		const parsed = parseCourseGradeString(c.grade);
		const pct = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : 0;
		return {
			name: c.title,
			weightPercentage: parseWeight(c.weight) ?? 0,
			pointsEarned,
			pointsPossible,
			weightedPercentage: ((parsed?.percentage ?? pct) * (parseWeight(c.weight) ?? 0)) / 100,
			gradeLetter: parsed?.letter ?? letterForPercentage(pct)
		} satisfies Category;
	});
}

export function parseSchoologyItem(
	item: SchoologyItem,
	categoryName: string,
	courseId: string,
	uniqueId: string
): RealAssignment {
	const pts = parseItemPoints(item.grade);
	return {
		name: item.title,
		id: uniqueId,
		pointsEarned: pts?.earned,
		pointsPossible: pts?.possible,
		unscaledPoints: undefined,
		extraCredit: false,
		gradePercentageChange: undefined,
		notForGrade: false,
		hidden: false,
		category: categoryName,
		date: parseSchoologyDate(item.due_date),
		newHypothetical: false,
		description: item.description ?? undefined,
		comments: item.comment ?? undefined
	};
}

export function getSchoologyAssignments(
	course: SchoologyCourse,
	activeTitle: string | undefined
): RealAssignment[] {
	const period = getCourseActivePeriod(course, activeTitle);
	if (!period) return [];
	// Schoology rows don't always carry unique ids (some lack data-id, and the
	// same assignment can appear twice), but the UI keys lists by assignment id.
	// Guarantee uniqueness deterministically so keys are stable across reloads.
	const seen = new Set<string>();
	let n = 0;
	const uniqueId = (raw: string | null | undefined): string => {
		const base = raw?.trim() ? `${course.id}:${raw.trim()}` : `${course.id}:row`;
		if (!seen.has(base)) {
			seen.add(base);
			return base;
		}
		let candidate: string;
		do {
			candidate = `${base}#${n++}`;
		} while (seen.has(candidate));
		seen.add(candidate);
		return candidate;
	};
	return (period.categories ?? []).flatMap((cat) =>
		(cat.items ?? []).map((item) => parseSchoologyItem(item, cat.title, course.id, uniqueId(item.id)))
	);
}

/** "Course Name (P)" -> "Course Name", same helper as Synergy version. */
export function cleanCourseName(name: string): string {
	return name.replace(/ \([A-Z]+\)$/, '');
}
