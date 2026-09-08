import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { SchoologyCourse } from '$lib/schoology';
import { getSchoologyPeriodTitles } from '$lib/schoology';
import { toast } from 'svelte-sonner';
import { saveSeenAssignmentsToLocalStorage } from './grades/seenAssignments';
import { seenAssignmentIDs } from './grades/seenAssignments.svelte';

export type SchoologySource = 'backend' | 'upload' | 'demo' | 'import';

interface SchoologyPersisted {
	courses: SchoologyCourse[];
	lastRefresh: number;
	backendUrl: string;
	baseUrl: string;
	source: SchoologySource;
	activePeriodIndex?: number;
}

const LS_KEY = 'schoology-compass-1';
const SEEN_KEY = 'schoology-seen-ids-1';

export const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';
export const DEFAULT_BASE_URL = 'https://fuhsd.schoology.com';

export const schoologyState = $state({
	courses: undefined as SchoologyCourse[] | undefined,
	periodTitles: [] as string[],
	activePeriodIndex: 0 as number,
	defaultPeriodIndex: 0 as number,
	loading: false as boolean,
	loadingError: undefined as unknown,
	lastRefresh: undefined as number | undefined,
	backendUrl: DEFAULT_BACKEND_URL as string,
	baseUrl: DEFAULT_BASE_URL as string,
	source: undefined as SchoologySource | undefined
});

export const getActivePeriodTitle = () =>
	schoologyState.periodTitles[schoologyState.activePeriodIndex];

function persist() {
	if (!browser || !schoologyState.courses) return;
	const data: SchoologyPersisted = {
		courses: schoologyState.courses,
		lastRefresh: schoologyState.lastRefresh ?? Date.now(),
		backendUrl: schoologyState.backendUrl,
		baseUrl: schoologyState.baseUrl,
		source: schoologyState.source ?? 'backend',
		activePeriodIndex: schoologyState.activePeriodIndex
	};
	try {
		localStorage.setItem(LS_KEY, JSON.stringify(data));
	} catch {
		// storage full or unavailable — non-fatal
	}
}

function applyCourses(
	courses: SchoologyCourse[],
	meta: { backendUrl: string; baseUrl: string; source: SchoologySource; lastRefresh?: number }
) {
	schoologyState.courses = courses;
	schoologyState.periodTitles = getSchoologyPeriodTitles(courses);
	schoologyState.backendUrl = meta.backendUrl;
	schoologyState.baseUrl = meta.baseUrl;
	schoologyState.source = meta.source;
	schoologyState.lastRefresh = meta.lastRefresh ?? Date.now();

	// Default period = the one with the most graded courses.
	let best = 0;
	let bestCount = -1;
	schoologyState.periodTitles.forEach((title, i) => {
		let count = 0;
		for (const c of courses) {
			const p = (c.periods ?? []).find((p) => p.title === title);
			if (p?.grade) count++;
		}
		if (count > bestCount) {
			bestCount = count;
			best = i;
		}
	});
	schoologyState.defaultPeriodIndex = schoologyState.periodTitles.length > 0 ? best : 0;
	if (schoologyState.activePeriodIndex >= schoologyState.periodTitles.length) {
		schoologyState.activePeriodIndex = schoologyState.defaultPeriodIndex;
	}

	persist();
}

function markAllSeen(courses: SchoologyCourse[]) {
	for (const c of courses) {
		for (const p of c.periods ?? []) {
			for (const cat of p.categories ?? []) {
				for (const item of cat.items ?? []) {
					seenAssignmentIDs.add(`${c.id}:${item.id}`);
				}
			}
		}
	}
	try {
		localStorage.setItem(SEEN_KEY, JSON.stringify([...seenAssignmentIDs]));
	} catch {
		// ignore
	}
	saveSeenAssignmentsToLocalStorage(seenAssignmentIDs);
}

export function loadSchoologyFromLocalStorage(): boolean {
	if (!browser) return false;
	try {
		const raw = localStorage.getItem(LS_KEY);
		if (!raw) return false;
		const data = JSON.parse(raw) as SchoologyPersisted;
		if (!Array.isArray(data.courses)) return false;
		applyCourses(data.courses, {
			backendUrl: data.backendUrl ?? DEFAULT_BACKEND_URL,
			baseUrl: data.baseUrl ?? DEFAULT_BASE_URL,
			source: data.source ?? 'backend',
			lastRefresh: data.lastRefresh
		});
		if (typeof data.activePeriodIndex === 'number') {
			schoologyState.activePeriodIndex = data.activePeriodIndex;
		}
		// Restore seen ids
		try {
			const seenRaw = localStorage.getItem(SEEN_KEY);
			if (seenRaw) {
				for (const id of JSON.parse(seenRaw) as string[]) seenAssignmentIDs.add(id);
			}
		} catch {
			// ignore
		}
		return true;
	} catch {
		return false;
	}
}

export function hasSchoologySession(): boolean {
	if (!browser) return false;
	return (
		schoologyState.courses !== undefined || localStorage.getItem(LS_KEY) !== null
	);
}

let initialized = false;

export async function initializeSchoologyCatalog() {
	if (initialized || !browser) return;
	initialized = true;
	if (schoologyState.courses) return;
	loadSchoologyFromLocalStorage();
}

export async function fetchFromBackend(opts?: {
	backendUrl?: string;
	baseUrl?: string;
	headless?: boolean;
}) {
	const backendUrl = (opts?.backendUrl ?? schoologyState.backendUrl ?? DEFAULT_BACKEND_URL).replace(
		/\/$/,
		''
	);
	const baseUrl = opts?.baseUrl ?? schoologyState.baseUrl ?? DEFAULT_BASE_URL;
	schoologyState.loading = true;
	schoologyState.loadingError = undefined;
	try {
		const res = await fetch(`${backendUrl}/api/grades/fetch`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ base_url: baseUrl, headless: opts?.headless ?? true })
		});
		if (!res.ok) {
			const detail = await res.text();
			throw new Error(`Backend ${res.status}: ${detail}`);
		}
		const courses = (await res.json()) as SchoologyCourse[];
		applyCourses(courses, { backendUrl, baseUrl, source: 'backend' });
		if (seenAssignmentIDs.size === 0) markAllSeen(courses);
		toast.success(`Loaded ${courses.length} courses from Schoology`);
	} catch (error) {
		schoologyState.loadingError = error;
		throw error;
	} finally {
		schoologyState.loading = false;
	}
}

export function loadFromJson(
	courses: SchoologyCourse[],
	meta?: { baseUrl?: string; source?: SchoologySource }
) {
	if (!Array.isArray(courses)) throw new Error('Invalid grades JSON: expected an array of courses');
	applyCourses(courses, {
		backendUrl: schoologyState.backendUrl,
		baseUrl: meta?.baseUrl ?? schoologyState.baseUrl,
		source: meta?.source ?? 'upload'
	});
	if (seenAssignmentIDs.size === 0) markAllSeen(courses);
	persist();
}

export async function loadDemo() {
	const mod = await import('$lib/demo/schoology-demo.json');
	const courses = (mod.default ?? mod) as SchoologyCourse[];
	applyCourses(courses, {
		backendUrl: schoologyState.backendUrl,
		baseUrl: 'https://demo.schoology.com',
		source: 'demo'
	});
	if (seenAssignmentIDs.size === 0) markAllSeen(courses);
}

export function switchSchoologyPeriod(index: number) {
	schoologyState.activePeriodIndex = index;
	persist();
}

export function resetSchoologyPeriod() {
	schoologyState.activePeriodIndex = schoologyState.defaultPeriodIndex;
	persist();
}

export function logOutSchoology() {
	if (!browser) return;
	localStorage.removeItem(LS_KEY);
	schoologyState.courses = undefined;
	schoologyState.periodTitles = [];
	schoologyState.source = undefined;
	schoologyState.loadingError = undefined;
	void goto('/login');
}
