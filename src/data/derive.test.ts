import { describe, expect, it } from 'vitest'
import {
  countsByExercise,
  dayKey,
  daySummaries,
  exerciseCounts,
  groupSetsByDay,
  latestSet,
  UNKNOWN_EXERCISE,
  recentExercises,
  setsForDay,
} from './derive.ts'
import type { Exercise, SetRecord } from './types.ts'

// Local-time constructors keep these tests independent of the machine's TZ.
const at = (y: number, mo: number, d: number, h = 12, mi = 0, s = 0, ms = 0) =>
  new Date(y, mo - 1, d, h, mi, s, ms).getTime()

const set = (id: string, exerciseId: string, startedAt: number): SetRecord => ({
  id,
  exerciseId,
  startedAt,
  durationS: 60,
})

describe('dayKey', () => {
  it('is the local calendar date, zero padded', () => {
    expect(dayKey(at(2026, 1, 5))).toBe('2026-01-05')
    expect(dayKey(at(2026, 11, 25))).toBe('2026-11-25')
  })

  it('splits at local midnight', () => {
    expect(dayKey(at(2026, 3, 9, 23, 59, 59, 999))).toBe('2026-03-09')
    expect(dayKey(at(2026, 3, 10, 0, 0, 0, 0))).toBe('2026-03-10')
  })
})

describe('setsForDay', () => {
  it('keeps only sets started on that local day, in order', () => {
    const sets = [
      set('a', 'x', at(2026, 3, 9, 23, 59)),
      set('b', 'x', at(2026, 3, 10, 0, 1)),
      set('c', 'y', at(2026, 3, 10, 18)),
      set('d', 'x', at(2026, 3, 11, 7)),
    ]
    expect(setsForDay(sets, '2026-03-10').map((s) => s.id)).toEqual(['b', 'c'])
    expect(setsForDay(sets, '2026-01-01')).toEqual([])
  })
})

describe('countsByExercise', () => {
  it('counts sets per exercise id', () => {
    const sets = [set('a', 'x', 1), set('b', 'y', 2), set('c', 'x', 3)]
    const counts = countsByExercise(sets)
    expect(counts.get('x')).toBe(2)
    expect(counts.get('y')).toBe(1)
    expect(counts.get('z')).toBeUndefined()
    expect(countsByExercise([]).size).toBe(0)
  })
})

describe('recentExercises', () => {
  const ex = (id: string, lastUsed: number): Exercise => ({
    id,
    name: id,
    lastUsed,
  })

  it('orders by lastUsed desc and limits', () => {
    const list = [ex('a', 1), ex('b', 3), ex('c', 2), ex('d', 5)]
    expect(recentExercises(list, 3).map((e) => e.id)).toEqual(['d', 'b', 'c'])
    expect(recentExercises(list).map((e) => e.id)).toEqual(['d', 'b', 'c', 'a'])
    expect(recentExercises(list, 0)).toEqual([])
  })

  it('does not mutate its input', () => {
    const list = [ex('a', 1), ex('b', 2)]
    recentExercises(list)
    expect(list.map((e) => e.id)).toEqual(['a', 'b'])
  })
})

describe('latestSet', () => {
  it('returns the latest set for the exercise', () => {
    const sets = [set('a', 'x', 5), set('b', 'x', 9), set('c', 'y', 20)]
    expect(latestSet(sets, 'x')?.id).toBe('b')
    expect(latestSet(sets, 'z')).toBeUndefined()
  })
})

const ex = (id: string, name: string): Exercise => ({ id, name, lastUsed: 0 })

describe('groupSetsByDay', () => {
  it('is empty for no sets', () => {
    expect(groupSetsByDay([])).toEqual([])
  })

  it('groups by local day, newest day first, sets in input order', () => {
    const a = set('a', 'x', at(2026, 11, 3, 9))
    const b = set('b', 'y', at(2026, 11, 5, 0, 0))
    const c = set('c', 'x', at(2026, 11, 3, 23, 59, 59, 999))
    const d = set('d', 'x', at(2026, 10, 30, 18))
    const e = set('e', 'y', at(2026, 11, 4, 23, 59))
    expect(groupSetsByDay([a, b, c, d, e])).toEqual([
      { day: '2026-11-05', sets: [b] },
      { day: '2026-11-04', sets: [e] },
      { day: '2026-11-03', sets: [a, c] },
      { day: '2026-10-30', sets: [d] },
    ])
  })

  it('orders across years', () => {
    const days = groupSetsByDay([
      set('a', 'x', at(2025, 12, 31)),
      set('b', 'x', at(2026, 1, 1)),
    ]).map((g) => g.day)
    expect(days).toEqual(['2026-01-01', '2025-12-31'])
  })
})

describe('exerciseCounts', () => {
  const exercises = [ex('b', 'Bench'), ex('s', 'Squat'), ex('r', 'Row')]

  it('counts per exercise, most sets first, ties by name', () => {
    const sets = [
      set('1', 's', 1),
      set('2', 'r', 2),
      set('3', 's', 3),
      set('4', 'b', 4),
    ]
    expect(exerciseCounts(sets, exercises)).toEqual([
      { exerciseId: 's', name: 'Squat', count: 2 },
      { exerciseId: 'b', name: 'Bench', count: 1 },
      { exerciseId: 'r', name: 'Row', count: 1 },
    ])
  })

  it('names a missing exercise with a placeholder', () => {
    expect(exerciseCounts([set('1', 'gone', 1)], exercises)).toEqual([
      { exerciseId: 'gone', name: UNKNOWN_EXERCISE, count: 1 },
    ])
  })

  it('is empty for no sets', () => {
    expect(exerciseCounts([], exercises)).toEqual([])
  })
})

describe('daySummaries', () => {
  it('gives each day its total and per-exercise counts, newest first', () => {
    const exercises = [ex('b', 'Bench'), ex('s', 'Squat')]
    const sets = [
      set('1', 'b', at(2026, 11, 4, 10)),
      set('2', 's', at(2026, 11, 5, 10)),
      set('3', 's', at(2026, 11, 4, 11)),
      set('4', 's', at(2026, 11, 4, 12)),
    ]
    expect(daySummaries(sets, exercises)).toEqual([
      {
        day: '2026-11-05',
        total: 1,
        exercises: [{ exerciseId: 's', name: 'Squat', count: 1 }],
      },
      {
        day: '2026-11-04',
        total: 3,
        exercises: [
          { exerciseId: 's', name: 'Squat', count: 2 },
          { exerciseId: 'b', name: 'Bench', count: 1 },
        ],
      },
    ])
  })
})
