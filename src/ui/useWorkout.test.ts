import { act, cleanup, renderHook } from '@testing-library/preact'
import { afterEach, expect, it, vi } from 'vitest'
import { memoryRepository, type Repository } from '../data/index.ts'
import { useWorkout } from './useWorkout.ts'

afterEach(cleanup)

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
}

it('after a failed initial load it is loaded and empty, and create and recording still work', async () => {
  const onError = vi.fn()
  const fail = () => Promise.reject(new Error('blocked'))
  const writes: string[] = []
  const repo: Repository = {
    listExercises: fail,
    listSets: fail,
    listSetsForDay: fail,
    getSelectedExerciseId: fail,
    putExercise: async (e) => void writes.push(`exercise:${e.name}`),
    addSet: async (s) => void writes.push(`set:${s.durationS}`),
    deleteSet: async () => {},
    setSelectedExerciseId: async (id) => void writes.push(`selected:${id}`),
  }
  let n = 0
  const { result } = renderHook(() =>
    useWorkout({ repo, now: () => 1_000, newId: () => `id${++n}`, onError }),
  )
  expect(result.current.loaded).toBe(false)
  await flush()
  expect(onError).toHaveBeenCalledTimes(1)
  expect(result.current.loaded).toBe(true)
  expect(result.current.recent).toEqual([])
  expect(result.current.selected).toBeNull()

  act(() => result.current.create('Lunge'))
  expect(result.current.selected?.name).toBe('Lunge')
  act(() => result.current.recordSet(45_000, 2_000))
  expect(result.current.todayCount).toBe(1)
  await flush()
  expect(writes).toEqual(['exercise:Lunge', 'selected:id1', 'set:45'])
  expect(onError).toHaveBeenCalledTimes(1)
})

const day = (d: number, h: number, mi = 0) =>
  new Date(2026, 10, d, h, mi).getTime()

it('rolls today over at midnight when the page becomes visible or refreshDay is called', async () => {
  let t = day(5, 23, 58)
  const repo = memoryRepository({
    exercises: [{ id: 'a', name: 'Curl', lastUsed: 1 }],
    sets: [{ id: 's1', exerciseId: 'a', startedAt: t, durationS: 60 }],
  })
  const { result } = renderHook(() => useWorkout({ repo, now: () => t }))
  await flush()
  expect(result.current.today).toBe('2026-11-05')
  expect(result.current.todayCount).toBe(1)

  t = day(6, 0, 1)
  // Nothing re-reads the clock until an event says so.
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(result.current.today).toBe('2026-11-06')
  expect(result.current.todayCount).toBe(0)

  t = day(7, 0, 1)
  act(() => result.current.refreshDay())
  expect(result.current.today).toBe('2026-11-07')
})

it('ignores visibilitychange while hidden', async () => {
  let t = day(5, 23, 58)
  const { result } = renderHook(() =>
    useWorkout({ repo: memoryRepository(), now: () => t }),
  )
  await flush()
  const spy = vi
    .spyOn(document, 'visibilityState', 'get')
    .mockReturnValue('hidden')
  t = day(6, 0, 1)
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(result.current.today).toBe('2026-11-05')
  spy.mockRestore()
})

it('a set recorded after midnight counts for the new day at once', async () => {
  let t = day(5, 23, 59)
  const repo = memoryRepository({
    exercises: [{ id: 'a', name: 'Curl', lastUsed: 1 }],
    sets: [{ id: 's1', exerciseId: 'a', startedAt: t, durationS: 60 }],
  })
  const { result } = renderHook(() => useWorkout({ repo, now: () => t }))
  await flush()
  expect(result.current.todayCount).toBe(1)
  t = day(6, 0, 1)
  act(() => result.current.recordSet(60_000))
  expect(result.current.today).toBe('2026-11-06')
  expect(result.current.todayCount).toBe(1)
})

it('create with the name of an exercise outside the chips moves it to the front', async () => {
  const exercises = Array.from({ length: 8 }, (_, i) => ({
    id: `e${i}`,
    name: `Ex ${i}`,
    lastUsed: 100 + i,
  }))
  const repo = memoryRepository({ exercises })
  const { result } = renderHook(() => useWorkout({ repo, now: () => 1_000 }))
  await flush()
  const names = () => result.current.recent.map((e) => e.name)
  expect(names()).toEqual(['Ex 7', 'Ex 6', 'Ex 5', 'Ex 4', 'Ex 3', 'Ex 2'])

  act(() => result.current.create('ex 0'))
  expect(result.current.selected?.id).toBe('e0')
  expect(names()).toEqual(['Ex 0', 'Ex 7', 'Ex 6', 'Ex 5', 'Ex 4', 'Ex 3'])
  expect(result.current.exercises).toHaveLength(8)

  // A name already among the chips selects it without reordering.
  act(() => result.current.create('Ex 5'))
  expect(result.current.selected?.id).toBe('e5')
  expect(names()).toEqual(['Ex 0', 'Ex 7', 'Ex 6', 'Ex 5', 'Ex 4', 'Ex 3'])

  // Even when it is already selected, an off-chip exercise is brought forward.
  act(() => result.current.select('e2'))
  expect(result.current.selected?.id).toBe('e2')
  act(() => result.current.create('Ex 2'))
  expect(names()[0]).toBe('Ex 2')
  expect(result.current.selected?.id).toBe('e2')
})
