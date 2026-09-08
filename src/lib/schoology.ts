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
//   item:            "10 / 10" | "1.78 / 2" (+ "89%") | null
//   weight:          "15%" | null
//
// NOTE: grade cells often contain the fraction AND a percent as adjacent
// elements ("1.78 / 2" + "89%"), which scraping can fuse into "1.78 / 289%".
// parseItemPoints detects and repairs that fusion (see below).
// ---------------------------------------------------------------------------

export interface ParsedCourseGrade {
	letter: string;
	percentage: number;
}

const LETTER_PCT_RE = /([A-F][+-]?)\s*\(\s*([\d.]+)%\s*\)/i;
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
	// Letterless fraction ("6.53 / 7", possibly fused with its percent).
	const frac = parseItemPoints(t);
	if (frac && frac.possible > 0) {
		const pct = (frac.earned / frac.possible) * 100;
		return { letter: letterForPercentage(pct), percentage: pct };
	}
	// Bare letter (rare) — no percentage available.
	if (/^[A-F][+-]?$/i.test(t)) return { letter: t.toUpperCase(), percentage: NaN };
	return undefined;
}

/** Parse "10 / 10" (or "10/10", "Score: 10 / 10", ...) into {earned, possible}.
 * Falls back to a trailing "95%" as {earned: 95, possible: 100}.
 * Returns undefined when ungraded. Points are preferred over any status words
 * (e.g. "0 / 20" counts as a zero even if marked missing).
 *
 * Fusion repair: scraping can glue a fraction to its percent ("1.78 / 2" +
 * "89%" -> "1.78 / 289%"). When a stated percent disagrees with the raw
 * fraction, every split of the fused digits is tried ("289" -> "2"|"89%")
 * and the split whose math matches the percent wins. */
export function parseItemPoints(
	grade: string | null | undefined
): { earned: number; possible: number } | undefined {
	if (!grade) return undefined;
	const t = grade.trim().replace(/\s+/g, ' ');
	if (isUngradedToken(t)) return undefined;

	const agrees = (earned: number, possible: number, pct: number) =>
		possible > 0 && Math.abs((earned / possible) * 100 - pct) <= 0.6;

	const m = t.match(POINTS_RE);
	const earned = m ? parseFloat(m[1] ?? '') : NaN;
	const denomRaw = m?.[2] ?? '';
	const possible = m ? parseFloat(denomRaw) : NaN;

	if (m && !isNaN(earned) && !isNaN(possible)) {
		// Collect every percent in the string ("1.78 / 2 89%", "18 / 20 (90%)", ...).
		const pcts: number[] = [];
		const pctRe = new RegExp(PCT_ANY_RE, 'g');
		let pm: RegExpExecArray | null;
		while ((pm = pctRe.exec(t)) !== null) {
			const v = parseFloat(pm[1] ?? '');
			if (!isNaN(v)) pcts.push(v);
		}
		if (pcts.length === 0) return { earned, possible };
		if (pcts.some((p) => agrees(earned, possible, p))) return { earned, possible };

		// Glued fusion? Try every split of a pure-digit denominator ("289" ->
		// "2"|"89", "28"|"9"), longest denominator first.
		if (/^\d+$/.test(denomRaw)) {
			for (let len = denomRaw.length - 1; len >= 1; len--) {
				const b = parseFloat(denomRaw.slice(0, len));
				const p = parseFloat(denomRaw.slice(len));
				if (!isNaN(b) && !isNaN(p) && agrees(earned, b, p)) {
					return { earned, possible: b };
				}
			}
		}
		// Irreconcilable: exclude rather than inject wrong-weighted points.
		return undefined;
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
	return tryParseSchoologyDate(due) ?? new Date();
}

/** Same as parseSchoologyDate, but undefined when there is nothing usable. */
export function tryParseSchoologyDate(due: string | null | undefined): Date | undefined {
	if (!due) return undefined;
	const t = due.trim();
	if (!t) return undefined;
	// Normalize "8/21/26 11:59pm" -> "8/21/26 11:59 pm" for Date parsing.
	const normalized = t.replace(/(\d)(am|pm)$/i, '$1 $2');
	const d = new Date(normalized);
	return isNaN(d.getTime()) ? undefined : d;
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

/** Schoology pads empty comments with an invisible braille-blank "⠇". */
function cleanComment(comment: string | null | undefined): string | undefined {
	if (!comment) return undefined;
	const stripped = comment.replace(/⠇/g, '').trim();
	return stripped ? comment : undefined;
}

/** Schoology leaks button text ("stats. Opens a dialog.") into some titles. */
function cleanTitle(title: string): string {
	return title
		.replace(/\s*stats\.\s*opens a dialog\.?\s*$/i, '')
		.replace(/\s*opens a dialog\.?\s*$/i, '')
		.trim();
}

export function parseSchoologyItem(
	item: SchoologyItem,
	categoryName: string,
	courseId: string,
	uniqueId: string
): RealAssignment {
	const pts = parseItemPoints(item.grade);
	const parsedDate = tryParseSchoologyDate(item.due_date);
	return {
		name: cleanTitle(item.title),
		id: uniqueId,
		pointsEarned: pts?.earned,
		pointsPossible: pts?.possible,
		unscaledPoints: undefined,
		extraCredit: false,
		gradePercentageChange: undefined,
		notForGrade: false,
		hidden: false,
		category: categoryName,
		date: parsedDate ?? new Date(),
		hasDate: parsedDate !== undefined,
		newHypothetical: false,
		description: item.description ?? undefined,
		comments: cleanComment(item.comment)
	};
}

export function getSchoologyAssignments(
	course: SchoologyCourse,
	activeTitle: string | undefined
): RealAssignment[] {
	const period = getCourseActivePeriod(course, activeTitle);
	if (!period) return [];
	// Schoology renders hidden "Add Assignment" action rows inside the report
	// (empty id, no link). They are not real assignments — drop them.
	const isActionRow = (item: SchoologyItem) =>
		item.title.trim().toLowerCase() === 'add assignment' &&
		!item.id?.trim() &&
		!item.url;
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
		(cat.items ?? [])
			.filter((item) => !isActionRow(item))
			.map((item) => parseSchoologyItem(item, cat.title, course.id, uniqueId(item.id)))
	);
}

/** "Course Name (P)" -> "Course Name", same helper as Synergy version. */
export function cleanCourseName(name: string): string {
	return name.replace(/ \([A-Z]+\)$/, '');
}
