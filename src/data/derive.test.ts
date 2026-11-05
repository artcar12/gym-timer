import { describe, expect, it } from 'vitest'
import {
  countsByExercise,
  dayKey,
  latestSet,
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
