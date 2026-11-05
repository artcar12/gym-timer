// fake-indexeddb installs IndexedDB globals in jsdom, so idb-keyval runs for real.
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { dayKey } from './derive.ts'
import { idbRepository } from './idbRepository.ts'
import { memoryRepository } from './memoryRepository.ts'
import type { Repository } from './repository.ts'
import type { SetRecord } from './types.ts'

let dbCount = 0
const implementations: [string, () => Repository][] = [
  ['memoryRepository', () => memoryRepository()],
  // A fresh database name per test keeps tests independent.
  ['idbRepository', () => idbRepository(`test-${++dbCount}`)],
]

const day = (d: number, h = 12) => new Date(2026, 10, d, h).getTime()
const set = (id: string, exerciseId: string, startedAt: number): SetRecord => ({
  id,
  exerciseId,
  startedAt,
  durationS: 90,
})
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort()

describe.each(implementations)('%s', (_name, make) => {
  it('starts empty', async () => {
    const repo = make()
    expect(await repo.listExercises()).toEqual([])
    expect(await repo.listSets()).toEqual([])
  })

  it('puts exercises and replaces by id', async () => {
    const repo = make()
    await repo.putExercise({ id: 'a', name: 'Bench', lastUsed: 1 })
    await repo.putExercise({ id: 'b', name: 'Squat', lastUsed: 2 })
    await repo.putExercise({ id: 'a', name: 'Bench', lastUsed: 5 })
    const list = await repo.listExercises()
    expect(ids(list)).toEqual(['a', 'b'])
    expect(list.find((e) => e.id === 'a')).toEqual({
      id: 'a',
      name: 'Bench',
      lastUsed: 5,
    })
  })

  it('adds and deletes sets', async () => {
    const repo = make()
    await repo.addSet(set('s1', 'a', day(5)))
    await repo.addSet(set('s2', 'a', day(5)))
    await repo.addSet(set('s3', 'b', day(6)))
    expect(await repo.listSets()).toContainEqual(set('s2', 'a', day(5)))
    await repo.deleteSet('s2')
    await repo.deleteSet('missing')
    expect(ids(await repo.listSets())).toEqual(['s1', 's3'])
  })

  it('stores the selected exercise id, distinguishing null from unset', async () => {
    const repo = make()
    expect(await repo.getSelectedExerciseId()).toBeUndefined()
    await repo.setSelectedExerciseId('a')
    expect(await repo.getSelectedExerciseId()).toBe('a')
    await repo.setSelectedExerciseId(null)
    expect(await repo.getSelectedExerciseId()).toBeNull()
  })

  it('queries sets by local day', async () => {
    const repo = make()
    await repo.addSet(set('late', 'a', day(5, 23)))
    await repo.addSet(set('early', 'a', day(6, 0)))
    await repo.addSet(set('noon', 'b', day(6, 12)))
    expect(ids(await repo.listSetsForDay(dayKey(day(6))))).toEqual([
      'early',
      'noon',
    ])
    expect(ids(await repo.listSetsForDay(dayKey(day(5))))).toEqual(['late'])
    expect(await repo.listSetsForDay('2000-01-01')).toEqual([])
  })
})

describe('idbRepository persistence', () => {
  it('a new instance on the same database sees earlier writes', async () => {
    const name = `test-reload-${++dbCount}`
    const first = idbRepository(name)
    await first.putExercise({ id: 'a', name: 'Row', lastUsed: 3 })
    await first.addSet(set('s1', 'a', day(5)))
    await first.setSelectedExerciseId(null)
    const second = idbRepository(name)
    expect(await second.listExercises()).toEqual([
      { id: 'a', name: 'Row', lastUsed: 3 },
    ])
    expect(await second.listSets()).toEqual([set('s1', 'a', day(5))])
    expect(await second.getSelectedExerciseId()).toBeNull()
  })
})
