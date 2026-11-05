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
