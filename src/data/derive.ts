import type { DayKey, Exercise, SetRecord } from './types.ts'

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date (`YYYY-MM-DD`) of a clock value in ms. */
export function dayKey(ms: number): DayKey {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Sets started on the given local day, in input order. */
export function setsForDay(sets: readonly SetRecord[], day: DayKey) {
  return sets.filter((s) => dayKey(s.startedAt) === day)
}

/** Number of sets per exercise id. */
export function countsByExercise(
  sets: readonly SetRecord[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const s of sets) {
    counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1)
  }
  return counts
}

/** Most recently used first, at most `limit`. Ties keep input order. */
export function recentExercises(
  exercises: readonly Exercise[],
  limit = 6,
): Exercise[] {
  return [...exercises]
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, Math.max(0, limit))
}

/** The set with the latest `startedAt` for an exercise, if any. */
export function latestSet(
  sets: readonly SetRecord[],
  exerciseId: string,
): SetRecord | undefined {
  let latest: SetRecord | undefined
  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue
    if (!latest || s.startedAt >= latest.startedAt) latest = s
  }
  return latest
}

/** The sets of one local day. */
export interface DayGroup {
  readonly day: DayKey
  /** In input order. */
  readonly sets: SetRecord[]
}

/** Sets grouped by local day, newest day first. Days without sets are absent. */
export function groupSetsByDay(sets: readonly SetRecord[]): DayGroup[] {
  const byDay = new Map<DayKey, SetRecord[]>()
  for (const s of sets) {
    const day = dayKey(s.startedAt)
    const list = byDay.get(day)
    if (list) list.push(s)
    else byDay.set(day, [s])
  }
  return [...byDay]
    .map(([day, sets]) => ({ day, sets }))
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
}

/** Sets for one exercise, with its display name. */
export interface ExerciseCount {
  readonly exerciseId: string
  /** The exercise's name, or a placeholder if it no longer exists. */
  readonly name: string
  readonly count: number
}

export const UNKNOWN_EXERCISE = 'Unknown exercise'

/** Per-exercise counts of `sets`, most sets first, then by name. */
export function exerciseCounts(
  sets: readonly SetRecord[],
  exercises: readonly Exercise[],
): ExerciseCount[] {
  const names = new Map(exercises.map((e) => [e.id, e.name]))
  return [...countsByExercise(sets)]
    .map(([exerciseId, count]) => ({
      exerciseId,
      name: names.get(exerciseId) ?? UNKNOWN_EXERCISE,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** One day's totals: what the Today screen and each History row show. */
export interface DaySummary {
  readonly day: DayKey
  readonly total: number
  readonly exercises: ExerciseCount[]
}

/** Per-day, per-exercise counts, newest day first. */
export function daySummaries(
  sets: readonly SetRecord[],
  exercises: readonly Exercise[],
): DaySummary[] {
  return groupSetsByDay(sets).map((g) => ({
    day: g.day,
    total: g.sets.length,
    exercises: exerciseCounts(g.sets, exercises),
  }))
}
