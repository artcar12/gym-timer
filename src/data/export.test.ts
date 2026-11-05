import { describe, expect, it } from 'vitest'
import {
  buildExport,
  EXPORT_SCHEMA_VERSION,
  exportFileName,
  serializeExport,
} from './export.ts'
import type { Exercise, SetRecord } from './types.ts'

const NOW = new Date(2026, 10, 5, 9, 30).getTime()

const exercises: Exercise[] = [
  { id: 's', name: 'Squat', lastUsed: 2 },
  { id: 'b', name: 'Bench', lastUsed: 1 },
]
const sets: SetRecord[] = [
  { id: 'x2', exerciseId: 's', startedAt: 200, durationS: 90 },
  { id: 'x1', exerciseId: 'b', startedAt: 100, durationS: 60 },
]

describe('buildExport', () => {
  it('holds the schema version, export time, all exercises and sets', () => {
    expect(buildExport(exercises, sets, NOW)).toEqual({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date(NOW).toISOString(),
      exercises: [exercises[1], exercises[0]],
      sets: [sets[1], sets[0]],
    })
    expect(EXPORT_SCHEMA_VERSION).toBe(1)
  })

  it('does not mutate its inputs', () => {
    const ex = [...exercises]
    const st = [...sets]
    buildExport(ex, st, NOW)
    expect(ex).toEqual(exercises)
    expect(st).toEqual(sets)
  })

  it('is valid for no data', () => {
    expect(buildExport([], [], NOW)).toMatchObject({ exercises: [], sets: [] })
  })
})

describe('serializeExport', () => {
  it('is JSON that round-trips to the export object', () => {
    const text = serializeExport(exercises, sets, NOW)
    expect(JSON.parse(text)).toEqual(buildExport(exercises, sets, NOW))
    expect(text.endsWith('\n')).toBe(true)
  })

  it('is deterministic for the same data in any order', () => {
    expect(serializeExport(exercises, sets, NOW)).toBe(
      serializeExport([...exercises].reverse(), [...sets].reverse(), NOW),
    )
  })
})

describe('exportFileName', () => {
  it('uses the local date', () => {
    expect(exportFileName(NOW)).toBe('gym-timer-export-2026-11-05.json')
    expect(exportFileName(new Date(2026, 0, 2, 23, 59).getTime())).toBe(
      'gym-timer-export-2026-01-02.json',
    )
  })
})
