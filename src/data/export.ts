import { dayKey } from './derive.ts'
import type { Exercise, SetRecord } from './types.ts'

/** Bumped when the export layout changes incompatibly. */
export const EXPORT_SCHEMA_VERSION = 1

export interface ExportFile {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION
  /** ISO 8601 timestamp of the export. */
  exportedAt: string
  exercises: Exercise[]
  sets: SetRecord[]
}

/**
 * Everything stored, as a versioned export. Pure: exercises by name, sets by
 * start time, so the same data always gives the same file.
 */
export function buildExport(
  exercises: readonly Exercise[],
  sets: readonly SetRecord[],
  nowMs: number,
): ExportFile {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date(nowMs).toISOString(),
    exercises: [...exercises].sort(
      (a, b) => a.name.localeCompare(b.name) || cmp(a.id, b.id),
    ),
    sets: [...sets].sort(
      (a, b) => a.startedAt - b.startedAt || cmp(a.id, b.id),
    ),
  }
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** Pretty-printed JSON of {@link buildExport}. */
export function serializeExport(
  exercises: readonly Exercise[],
  sets: readonly SetRecord[],
  nowMs: number,
): string {
  return JSON.stringify(buildExport(exercises, sets, nowMs), null, 2) + '\n'
}

/** `gym-timer-export-YYYY-MM-DD.json`, by local date. */
export function exportFileName(nowMs: number): string {
  return `gym-timer-export-${dayKey(nowMs)}.json`
}
